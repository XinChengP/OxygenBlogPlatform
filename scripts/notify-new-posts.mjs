/**
 * 新文章通知脚本
 *
 * 在推送包含 src/content/blogs/** 的提交后运行（.github/workflows/notify.yml），
 * 检出深度为 2，通过 git diff 找出**新增**的文章并推送通知：
 *   1. Telegram 频道（TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID，sendPhoto 带封面，失败回退纯文本）
 *   2. 邮件订阅者（调用 cloudflare/interactions 的 /notify，Worker 侧按 slug 幂等并遍历订阅者）
 *
 * 设计约束：
 *   - 只通知「新增」(.md 状态 A)；修改既有文章不发通知，避免改错字也打扰读者。
 *   - hidden: true 的文章不通知。
 *   - 任何渠道未配置 secret 时跳过并打印原因，不报错。
 *   - DRY_RUN=1 时只打印将要发送的内容，用于验证。
 *
 * 运行：node scripts/notify-new-posts.mjs
 * 依赖：gray-matter（项目现有依赖）、Node 24 内置 fetch。
 */

import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'src/content/blogs');
const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://blog.xinchengp.cn').replace(/\/+$/, '');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const NEWSLETTER_API_URL = (process.env.NEWSLETTER_API_URL || '').replace(/\/+$/, '');
const NEWSLETTER_ADMIN_TOKEN = process.env.NEWSLETTER_ADMIN_TOKEN || '';
const DRY_RUN = process.env.DRY_RUN === '1';

/** 与 src/utils/blogScanner.ts 完全一致的 slug 规则：相对路径 + / 替换为 - */
function slugFromRelativePath(relativePath) {
  return relativePath.replace(/\.md$/, '').replace(/[\/\\]/g, '-');
}

function escapeHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ---------------------------------------------------------------------------
// 找出本次提交新增的文章
// ---------------------------------------------------------------------------

async function findAddedBlogFiles() {
  // 手动触发且指定 slug：直接定位文件
  const manualSlug = (process.env.NOTIFY_SLUG || '').trim();
  if (manualSlug) {
    const file = await findFileBySlug(manualSlug, CONTENT_DIR);
    if (!file) {
      console.error(`[notify] 未找到 slug 为 ${manualSlug} 的文章`);
      return [];
    }
    return [file];
  }

  let diffOutput = '';
  try {
    diffOutput = execFileSync(
      'git',
      ['diff', '--name-status', 'HEAD^', 'HEAD', '--', 'src/content/blogs'],
      { encoding: 'utf-8' }
    );
  } catch {
    // 首次提交没有 HEAD^，无法 diff
    console.log('[notify] 无法执行 git diff（可能是仓库首次提交），跳过通知');
    return [];
  }

  return diffOutput
    .split('\n')
    .filter((line) => line.startsWith('A\t'))
    .map((line) => line.slice(2).trim())
    .filter((file) => file.endsWith('.md'))
    .map((file) => path.join(process.cwd(), file));
}

async function findFileBySlug(slug, dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const found = await findFileBySlug(slug, fullPath);
      if (found) return found;
    } else if (entry.name.endsWith('.md') && slugFromRelativePath(path.relative(CONTENT_DIR, fullPath)) === slug) {
      return fullPath;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 解析文章元数据
// ---------------------------------------------------------------------------

async function loadPost(filePath) {
  const raw = await readFile(filePath, 'utf-8');
  const { data } = matter(raw);

  // 与博客扫描口径一致：hidden 文章不通知
  if (data.hidden === true || String(data.hidden).toLowerCase() === 'true') return null;

  const slug = slugFromRelativePath(path.relative(CONTENT_DIR, filePath));
  const title = data.title || '无标题';
  const excerpt = (data.excerpt || '').toString().slice(0, 160);
  const url = `${SITE_URL}/blogs/${encodeURIComponent(slug)}/`;
  // 相对封面补全为绝对地址，Telegram / 邮件都需要公网可访问的 URL
  const coverImage = data.coverImage
    ? /^https?:\/\//.test(data.coverImage)
      ? data.coverImage
      : `${SITE_URL}${data.coverImage.startsWith('/') ? '' : '/'}${data.coverImage}`
    : '';

  return { slug, title, excerpt, url, coverImage, tags: data.tags ?? [] };
}

// ---------------------------------------------------------------------------
// 渠道发送
// ---------------------------------------------------------------------------

function buildCaption(post) {
  const lines = [`<b>${escapeHtml(post.title)}</b>`];
  if (post.excerpt) lines.push('', escapeHtml(post.excerpt));
  if (post.tags?.length) lines.push('', post.tags.map((t) => `#${escapeHtml(t)}`).join(' '));
  lines.push('', `🔗 ${post.url}`);
  // Telegram caption 上限 1024 字符
  return lines.join('\n').slice(0, 1024);
}

async function telegramApi(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, ...payload }),
    signal: AbortSignal.timeout(10_000),
  });
  return response.json().catch(() => ({ ok: false }));
}

async function sendTelegram(post) {
  const caption = buildCaption(post);

  // 有封面先尝试 sendPhoto（消息更醒目）；图片无法抓取或超限时回退纯文本
  if (post.coverImage) {
    const photoResult = await telegramApi('sendPhoto', {
      photo: post.coverImage,
      caption,
      parse_mode: 'HTML',
    });
    if (photoResult.ok) return true;
    console.warn(`[notify] sendPhoto 失败，回退纯文本：${photoResult.description ?? ''}`);
  }

  const result = await telegramApi('sendMessage', {
    text: caption,
    parse_mode: 'HTML',
    disable_web_page_preview: false,
  });
  if (!result.ok) {
    console.error(`[notify] Telegram 发送失败：${result.description ?? '未知错误'}`);
  }
  return result.ok;
}

async function sendNewsletter(post) {
  const response = await fetch(`${NEWSLETTER_API_URL}/notify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${NEWSLETTER_ADMIN_TOKEN}`,
    },
    body: JSON.stringify({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      url: post.url,
      coverImage: post.coverImage,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    console.error(`[notify] 邮件通知失败：${response.status} ${detail.slice(0, 200)}`);
    return false;
  }
  const data = await response.json().catch(() => ({}));
  if (data.skipped) {
    console.log(`[notify] 《${post.title}》此前已发送过邮件，跳过`);
  } else {
    console.log(`[notify] 邮件已发送给 ${data.sent ?? 0} 位订阅者`);
  }
  return true;
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

async function main() {
  const files = await findAddedBlogFiles();
  if (files.length === 0) {
    console.log('[notify] 本次提交没有新增文章，无需通知');
    return;
  }

  const posts = (await Promise.all(files.map(loadPost))).filter(Boolean);
  if (posts.length === 0) {
    console.log('[notify] 新增文件均为隐藏文章，无需通知');
    return;
  }

  console.log(`[notify] 检测到 ${posts.length} 篇新文章：${posts.map((p) => p.title).join('、')}`);

  if (DRY_RUN) {
    console.log('[notify] DRY_RUN=1，以下为将要发送的内容：');
    for (const post of posts) {
      console.log(JSON.stringify(post, null, 2));
    }
    return;
  }

  const telegramEnabled = Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID);
  const newsletterEnabled = Boolean(NEWSLETTER_API_URL && NEWSLETTER_ADMIN_TOKEN);
  if (!telegramEnabled) console.log('[notify] 未配置 Telegram secrets，跳过频道推送');
  if (!newsletterEnabled) console.log('[notify] 未配置邮件服务 secrets，跳过邮件通知');

  let hasFailure = false;
  for (const post of posts) {
    if (telegramEnabled) {
      hasFailure = !(await sendTelegram(post)) || hasFailure;
    }
    if (newsletterEnabled) {
      hasFailure = !(await sendNewsletter(post)) || hasFailure;
    }
  }

  if (hasFailure) process.exitCode = 1;
}

main().catch((error) => {
  console.error('[notify] 执行失败：', error);
  process.exitCode = 1;
});
