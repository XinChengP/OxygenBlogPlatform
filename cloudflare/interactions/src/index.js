/**
 * OxygenBlog 互动服务 Worker
 *
 * 职责：
 *   1. 浏览量统计（按「路径 + 天 + 访客哈希」去重）
 *   2. 邮件订阅（Resend 双重确认 + 幂等群发）
 *
 * 设计约定（与前端 src/utils/interactionsApi.ts 对应）：
 *   - 生产环境通过同源路由 blog.xinchengp.cn/api/interactions/* 接入，
 *     前端无需 CORS / CSP 变更；本地开发由 Next dev rewrite 转发到 wrangler dev。
 *   - 访客身份 = SHA-256(IP + User-Agent + VISITOR_SALT)，不存原始 IP。
 *   - 所有写接口：JSON only、体积上限、D1 固定窗口限流、失败静默降级由前端负责。
 */

const PATH_RE = /^\/blogs\/[\w.~-]{1,160}\/$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

/** 允许携带 Origin 头访问的来源；无 Origin（curl/服务端）直接放行 */
const ALLOWED_ORIGINS = new Set([
  'https://blog.xinchengp.cn',
  'http://localhost:7120',
  'http://127.0.0.1:7120',
]);

/** 各写接口的限流：{ 次数, 窗口 ms } */
const RATE_LIMITS = {
  view: { limit: 60, windowMs: 60_000 },
  subscribe: { limit: 5, windowMs: 3_600_000 },
};

/** 浏览去重明细保留天数（每日 cron 清理） */
const PAGE_VIEW_RETENTION_DAYS = 90;

/** Resend 批量发信单批上限（官方上限 100，留余量） */
const RESEND_BATCH_SIZE = 50;

class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

export default {
  async fetch(request, env) {
    try {
      const response = await handle(request, env);
      return withCors(request, response);
    } catch (error) {
      if (error instanceof HttpError) {
        return withCors(request, jsonResponse({ error: error.code, message: error.message }, error.status));
      }
      console.error('unhandled error:', error);
      return withCors(request, jsonResponse({ error: 'internal_error' }, 500));
    }
  },

  /** 每日 cron：清理过期数据 */
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(cleanup(env));
  },
};

/**
 * 给响应补上 CORS 头
 *
 * 线上站点走同源路由，浏览器不做 CORS 检查；但本地后台仪表盘
 * （localhost:7120 直连线上 Worker）属于跨域请求：
 * 预检 OPTIONS 通过后，实际响应若缺少 Access-Control-Allow-Origin，
 * 浏览器仍会拦截（表现为 Failed to fetch）。
 * 因此这里对所有来源合法的请求统一合并 CORS 头。
 */
function withCors(request, response) {
  const headers = corsHeaders(request);
  if (Object.keys(headers).length === 0) return response;

  const merged = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) merged.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  });
}

async function handle(request, env) {
  const url = new URL(request.url);

  // 兼容两种路径：生产路由 /api/interactions/<action>，wrangler dev 直连 /<action>
  let pathname = url.pathname.replace(/\/+$/, '');
  const prefix = '/api/interactions';
  if (pathname.startsWith(prefix)) {
    pathname = pathname.slice(prefix.length) || '/';
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  if (pathname === '/health' && request.method === 'GET') {
    return jsonResponse({ ok: true, time: new Date().toISOString() });
  }

  if (pathname === '/view' && request.method === 'POST') return handleView(request, env);
  if (pathname === '/stats' && request.method === 'GET') return handleStats(url, env);

  if (pathname === '/subscribe' && request.method === 'POST') return handleSubscribe(request, env);
  if (pathname === '/confirm' && request.method === 'GET') return handleConfirm(url, env);
  if (pathname === '/unsubscribe' && request.method === 'GET') return handleUnsubscribe(url, env);
  if (pathname === '/notify' && request.method === 'POST') return handleNotify(request, env);
  if (pathname === '/admin/stats' && request.method === 'GET') return handleAdminStats(request, env);

  return jsonResponse({ error: 'not_found' }, 404);
}

// ---------------------------------------------------------------------------
// 浏览量
// ---------------------------------------------------------------------------

async function handleView(request, env) {
  const body = await readJson(request);
  const path = validatePath(body.path);

  const visitor = await visitorHash(env, request);
  await enforceRateLimit(env, visitor, 'view');

  const day = beijingDay();
  const inserted = await env.DB.prepare(
    'INSERT OR IGNORE INTO page_view (path, day, visitor, created) VALUES (?, ?, ?, ?)'
  ).bind(path, day, visitor, Date.now()).run();

  const counted = (inserted.meta?.changes ?? 0) > 0;
  if (counted) {
    await env.DB.prepare(
      `INSERT INTO page_total (path, views, updated) VALUES (?, 1, ?)
       ON CONFLICT(path) DO UPDATE SET views = views + 1, updated = excluded.updated`
    ).bind(path, Date.now()).run();
  }

  const total = await env.DB.prepare('SELECT views FROM page_total WHERE path = ?')
    .bind(path).first('views');

  return jsonResponse({ views: total ?? 0, counted });
}

// ---------------------------------------------------------------------------
// 统计查询（单条 / 批量）
// ---------------------------------------------------------------------------

async function handleStats(url, env) {
  const single = url.searchParams.get('path');
  const multi = url.searchParams.get('paths');

  if (single) {
    const path = validatePath(single);
    const total = await env.DB.prepare('SELECT views FROM page_total WHERE path = ?')
      .bind(path).first('views');
    return jsonResponse({ path, views: total ?? 0 }, 200, {
      'Cache-Control': 'public, max-age=30',
    });
  }

  if (multi) {
    const paths = [...new Set(multi.split(',').map((p) => p.trim()).filter(Boolean))];
    if (paths.length === 0) return jsonResponse({ items: {} });
    if (paths.length > 50) throw new HttpError(400, 'too_many_paths', '一次最多查询 50 个路径');
    for (const p of paths) validatePath(p);

    const placeholders = paths.map(() => '?').join(', ');
    const totals = await env.DB.prepare(
      `SELECT path, views FROM page_total WHERE path IN (${placeholders})`
    ).bind(...paths).all();

    const items = {};
    for (const p of paths) items[p] = { views: 0 };
    for (const row of totals.results ?? []) {
      if (items[row.path]) items[row.path].views = row.views;
    }

    return jsonResponse({ items }, 200, { 'Cache-Control': 'public, max-age=30' });
  }

  throw new HttpError(400, 'missing_path', '缺少 path 或 paths 参数');
}

// ---------------------------------------------------------------------------
// 邮件订阅
// ---------------------------------------------------------------------------

async function handleSubscribe(request, env) {
  const body = await readJson(request, 2048);

  // 蜜罐字段：正常用户不会填写，命中即伪装成功，不给爬虫反馈
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return jsonResponse({ ok: true, message: '确认邮件已发送，请查收并点击确认' });
  }

  if (!isNewsletterConfigured(env)) {
    throw new HttpError(503, 'newsletter_disabled', '邮件订阅暂未开放');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!EMAIL_RE.test(email)) {
    throw new HttpError(400, 'invalid_email', '邮箱格式不正确');
  }

  const visitor = await visitorHash(env, request);
  await enforceRateLimit(env, visitor, 'subscribe');

  const token = randomToken();
  const existing = await env.DB.prepare(
    'SELECT id, confirmed, unsubscribed FROM subscriber WHERE email = ?'
  ).bind(email).first();

  if (existing && existing.confirmed && !existing.unsubscribed) {
    // 已在列表中：返回成功但不重复发信，避免被用来骚扰他人邮箱
    return jsonResponse({ ok: true, message: '这个邮箱已经订阅过啦' });
  }

  if (existing) {
    await env.DB.prepare(
      'UPDATE subscriber SET token = ?, confirmed = 0, unsubscribed = 0 WHERE id = ?'
    ).bind(token, existing.id).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO subscriber (email, token, confirmed, unsubscribed, created) VALUES (?, ?, 0, 0, ?)'
    ).bind(email, token, Date.now()).run();
  }

  await sendResendEmail(env, {
    to: email,
    subject: '确认订阅 OxygenBlog 更新',
    html: renderConfirmEmail(env, token),
    headers: {},
  });

  return jsonResponse({ ok: true, message: '确认邮件已发送，请查收并点击确认' });
}

async function handleConfirm(url, env) {
  const token = url.searchParams.get('token') || '';
  const result = token
    ? await env.DB.prepare(
        'UPDATE subscriber SET confirmed = 1, confirmed_at = ? WHERE token = ? AND confirmed = 0'
      ).bind(Date.now(), token).run()
    : { meta: { changes: 0 } };

  const status = (result.meta?.changes ?? 0) > 0 ? 'confirmed' : 'invalid';
  return redirectTo(`${publicSiteUrl(env)}/subscribe/?status=${status}`);
}

async function handleUnsubscribe(url, env) {
  const token = url.searchParams.get('token') || '';
  const result = token
    ? await env.DB.prepare(
        'UPDATE subscriber SET unsubscribed = 1 WHERE token = ? AND unsubscribed = 0'
      ).bind(token).run()
    : { meta: { changes: 0 } };

  const status = (result.meta?.changes ?? 0) > 0 ? 'unsubscribed' : 'invalid';
  return redirectTo(`${publicSiteUrl(env)}/subscribe/?status=${status}`);
}

async function handleNotify(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const expected = env.ADMIN_TOKEN || '';
  if (!expected || !safeEqual(auth.replace(/^Bearer\s+/i, ''), expected)) {
    throw new HttpError(401, 'unauthorized', '无权调用');
  }
  if (!isNewsletterConfigured(env)) {
    throw new HttpError(503, 'newsletter_disabled', '邮件订阅暂未开放');
  }

  const body = await readJson(request, 4096);
  const slug = typeof body.slug === 'string' ? body.slug.slice(0, 200) : '';
  const title = typeof body.title === 'string' ? body.title.slice(0, 300) : '';
  if (!PATH_RE.test(`/blogs/${slug}/`) || !title) {
    throw new HttpError(400, 'invalid_post', 'slug 或 title 不合法');
  }

  const inserted = await env.DB.prepare(
    'INSERT OR IGNORE INTO sent_post (slug, sent_at) VALUES (?, ?)'
  ).bind(slug, Date.now()).run();
  if ((inserted.meta?.changes ?? 0) === 0) {
    return jsonResponse({ ok: true, skipped: true, reason: 'already_sent' });
  }

  const subscribers = await env.DB.prepare(
    'SELECT email, token FROM subscriber WHERE confirmed = 1 AND unsubscribed = 0'
  ).all();

  const recipients = subscribers.results ?? [];
  if (recipients.length === 0) {
    return jsonResponse({ ok: true, sent: 0 });
  }

  try {
    for (let i = 0; i < recipients.length; i += RESEND_BATCH_SIZE) {
      const batch = recipients.slice(i, i + RESEND_BATCH_SIZE).map((sub) => {
        const unsubscribeUrl = `${publicSiteUrl(env)}/api/interactions/unsubscribe?token=${sub.token}`;
        return {
          from: env.RESEND_FROM,
          to: sub.email,
          subject: `新文章：${title}`,
          html: renderPostEmail(env, body, unsubscribeUrl),
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
          },
        };
      });
      await resendRequest(env, 'https://api.resend.com/emails/batch', batch);
    }
  } catch (error) {
    // 发送失败时回收幂等标记，允许下次重试
    await env.DB.prepare('DELETE FROM sent_post WHERE slug = ?').bind(slug).run();
    throw error;
  }

  return jsonResponse({ ok: true, sent: recipients.length });
}

// ---------------------------------------------------------------------------
// 管理端统计（Bearer ADMIN_TOKEN）
// ---------------------------------------------------------------------------

/**
 * 浏览量统计：全站总览 + 每个路径的累计浏览量（降序，最多 200 条）。
 * 供本地后台仪表盘读取；生产站点的 admin 是本地专用，不存在公开暴露面。
 */
async function handleAdminStats(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const expected = env.ADMIN_TOKEN || '';
  if (!expected || !safeEqual(auth.replace(/^Bearer\s+/i, ''), expected)) {
    throw new HttpError(401, 'unauthorized', '无权调用');
  }

  const [pagesResult, subscriberResult] = await Promise.all([
    env.DB.prepare(
      'SELECT path, views FROM page_total ORDER BY views DESC, path ASC LIMIT 200'
    ).all(),
    env.DB.prepare(
      'SELECT COUNT(*) AS count FROM subscriber WHERE confirmed = 1 AND unsubscribed = 0'
    ).first('count'),
  ]);

  const pages = pagesResult.results ?? [];
  const totalViews = pages.reduce((sum, page) => sum + page.views, 0);

  return jsonResponse({
    totalViews,
    subscribers: subscriberResult ?? 0,
    pages,
    updatedAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// 邮件渲染
// ---------------------------------------------------------------------------

function renderConfirmEmail(env, token) {
  const link = `${publicSiteUrl(env)}/api/interactions/confirm?token=${token}`;
  return renderEmailShell(
    '确认订阅',
    `<p>你好！有人用这个邮箱订阅了 <strong>OxygenBlog</strong> 的新文章通知。</p>
     <p>如果是你本人操作，请点击下面的按钮完成确认；不是的话忽略本邮件即可，不会添加任何订阅。</p>`,
    { label: '确认订阅', href: link }
  );
}

function renderPostEmail(env, post, unsubscribeUrl) {
  const excerpt = typeof post.excerpt === 'string' ? post.excerpt.slice(0, 200) : '';
  const cover = typeof post.coverImage === 'string' && /^https?:\/\//.test(post.coverImage)
    ? `<img src="${escapeHtml(post.coverImage)}" alt="" style="max-width:100%;border-radius:12px;margin:16px 0;" />`
    : '';
  const excerptHtml = excerpt
    ? `<p style="color:#555;line-height:1.7;">${escapeHtml(excerpt)}</p>`
    : '';
  return renderEmailShell(
    '新文章上线',
    `<h2 style="margin:0 0 8px;font-size:20px;">${escapeHtml(post.title)}</h2>
     ${cover}
     ${excerptHtml}`,
    { label: '阅读全文', href: post.url || `${publicSiteUrl(env)}/blogs/${post.slug}/` },
    unsubscribeUrl
  );
}

function renderEmailShell(title, bodyHtml, button, unsubscribeUrl) {
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f5f7fa;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;">
    <p style="margin:0 0 4px;color:#66ccff;font-weight:700;letter-spacing:2px;">OXYGENBLOG</p>
    <h1 style="margin:0 0 16px;font-size:18px;color:#333;">${escapeHtml(title)}</h1>
    ${bodyHtml}
    <p style="margin:24px 0 8px;">
      <a href="${button.href}" style="display:inline-block;background:#66ccff;color:#ffffff;
         text-decoration:none;padding:10px 24px;border-radius:10px;font-weight:600;">${escapeHtml(button.label)}</a>
    </p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    ${unsubscribeUrl
      ? `<p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
           这封邮件由 OxygenBlog 自动发送。如果不想再收到，请
           <a href="${unsubscribeUrl}" style="color:#66ccff;">点此退订</a>。
         </p>`
      : `<p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
           这封邮件由 OxygenBlog 自动发送。你没有操作过的话，忽略本邮件即可。
         </p>`}
  </div>
</body></html>`;
}

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

async function visitorHash(env, request) {
  const ip = request.headers.get('CF-Connecting-IP') || '';
  const ua = request.headers.get('User-Agent') || '';
  const salt = env.VISITOR_SALT || 'dev-insecure-salt';
  const data = new TextEncoder().encode(`${ip}|${ua}|${salt}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function enforceRateLimit(env, visitor, action) {
  const { limit, windowMs } = RATE_LIMITS[action];
  const bucket = `${visitor}:${action}`;
  const now = Date.now();

  const row = await env.DB.prepare('SELECT count, expires FROM rate_limit WHERE bucket = ?')
    .bind(bucket).first();

  if (!row || row.expires <= now) {
    await env.DB.prepare(
      `INSERT INTO rate_limit (bucket, count, expires) VALUES (?, 1, ?)
       ON CONFLICT(bucket) DO UPDATE SET count = 1, expires = excluded.expires`
    ).bind(bucket, now + windowMs).run();
    return;
  }

  if (row.count >= limit) {
    throw new HttpError(429, 'rate_limited', '请求太频繁，请稍后再试');
  }

  await env.DB.prepare('UPDATE rate_limit SET count = count + 1 WHERE bucket = ?').bind(bucket).run();
}

function validatePath(input) {
  if (typeof input !== 'string' || !PATH_RE.test(input)) {
    throw new HttpError(400, 'invalid_path', '路径格式不正确');
  }
  return input;
}

function beijingDay() {
  // 站点受众以 UTC+8 为主，按东八区切「天」
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
}

async function readJson(request, maxBytes = 1024) {
  const text = await request.text();
  if (text.length > maxBytes) throw new HttpError(413, 'payload_too_large', '请求体过大');
  if (!text) throw new HttpError(400, 'empty_body', '请求体为空');
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new HttpError(400, 'invalid_json', 'JSON 解析失败');
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new HttpError(400, 'invalid_json', '请求体必须是 JSON 对象');
  }
  return data;
}

function isNewsletterConfigured(env) {
  return Boolean(env.RESEND_API_KEY);
}

function publicSiteUrl(env) {
  return (env.PUBLIC_SITE_URL || 'https://blog.xinchengp.cn').replace(/\/+$/, '');
}

function randomToken() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function cleanup(env) {
  const cutoff = Date.now() - PAGE_VIEW_RETENTION_DAYS * 86_400_000;
  await env.DB.prepare('DELETE FROM page_view WHERE created < ?').bind(cutoff).run();
  await env.DB.prepare('DELETE FROM rate_limit WHERE expires < ?').bind(Date.now()).run();
}

// ---------------------------------------------------------------------------
// 响应与 Resend
// ---------------------------------------------------------------------------

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  });
}

function redirectTo(location) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: location,
      'Cache-Control': 'no-store',
    },
  });
}

async function sendResendEmail(env, payload) {
  await resendRequest(env, 'https://api.resend.com/emails', payload);
}

async function resendRequest(env, endpoint, payload) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new HttpError(502, 'email_send_failed', `Resend 发信失败：${response.status} ${detail.slice(0, 200)}`);
  }
  return response.json().catch(() => ({}));
}
