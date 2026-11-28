/**
 * 百度搜索资源平台「普通收录」主动推送脚本（部署完成后运行）
 *
 * 官方文档：https://ziyuan.baidu.com/college/documentinfo?id=306
 * 接口：POST http://data.zz.baidu.com/urls?site=<站点>&token=<token>
 * 请求体：换行分隔的 URL 列表（text/plain）
 *
 * 重要前提：
 * 1. 站点已在百度搜索资源平台完成验证（本站的 baidu_verify_codeva-keed6R4rq9.html 已在线）；
 * 2. Baiduspider 能正常抓取。Cloudflare 的「托管 robots.txt」会给 Baiduspider
 *    加一条 Disallow: /，这种情况下推送接口即使返回成功，百度也不会来抓。
 *    请先运行 .github/workflows/fix-managed-robots.yml 关闭托管 robots。
 *
 * 环境变量：
 *   BAIDU_PUSH_TOKEN  百度「普通收录 > 推送接口」里的 token（必填，未配置时跳过）
 *   BAIDU_SITE        验证站点，缺省 https://blog.xinchengp.cn
 *   SITEMAP_URL       设置后从线上读取 sitemap；未设置时读 SITEMAP_PATH
 *   SITEMAP_PATH      本地 sitemap，缺省 ./out/sitemap.xml
 *   CHANGED_FILES     'ALL' 或变更文件清单（换行分隔）；增量模式只推受影响页面
 *   BAIDU_DRY_RUN     true 时只打印将要推送的 URL，不发起请求
 *   BAIDU_BATCH_SIZE  每批 URL 数，缺省 10（百度新站每日配额通常很小）
 *
 * 说明：推送成功只代表百度接收了 URL，不保证立刻收录；
 * 收录还取决于抓取、内容质量和站点权重。
 */

import fs from 'node:fs';

/**
 * 规范化站点地址：允许只传域名，统一补 https:// 并去掉末尾斜杠
 *
 * @param {string} value 环境变量传入的站点
 * @returns {string} 规范化后的站点地址
 */
function normalizeSite(value) {
  const raw = (value || 'https://blog.xinchengp.cn').trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

const SITE = normalizeSite(process.env.BAIDU_SITE);
const SITE_ORIGIN = new URL(SITE).origin;
const TOKEN = (process.env.BAIDU_PUSH_TOKEN || '').trim();
const SITEMAP_URL = process.env.SITEMAP_URL || '';
const SITEMAP_PATH = process.env.SITEMAP_PATH || './out/sitemap.xml';
const CHANGED_FILES = (process.env.CHANGED_FILES || 'ALL').trim();
const DRY_RUN = String(process.env.BAIDU_DRY_RUN || '').toLowerCase() === 'true';

// 百度新站每日配额通常只有 10 条左右，默认按 10 条一批，避免一次请求被整批拒绝
const parsedBatchSize = Number(process.env.BAIDU_BATCH_SIZE || 10);
const BATCH_SIZE =
  Number.isFinite(parsedBatchSize) && parsedBatchSize > 0
    ? Math.min(2000, Math.floor(parsedBatchSize))
    : 10;

/**
 * 把变更文件路径映射为需要通知百度的页面 URL
 *
 * 与 submit-indexnow.mjs 的映射口径保持一致：
 * - 博客文章按 .md 路径生成 slug；
 * - 动态/更新日志聚合成单页；
 * - 页面/嵌套布局按路由映射；
 * - 只有根布局、站点配置、robots、sitemap/Next 配置才全量。
 *
 * @param {string[]} files 变更文件相对路径列表
 * @returns {{ urls: string[], full: boolean }}
 */
function resolveChangedUrls(files) {
  const urls = new Set();
  let full = false;

  for (const rawFile of files) {
    const file = rawFile.replace(/\\/g, '/').trim();
    if (!file) continue;

    // 博客文章：文件路径即 slug（子目录用连字符拼接，与站点扫描逻辑一致）
    if (file.startsWith('src/content/blogs/') && file.endsWith('.md')) {
      const slug = file
        .slice('src/content/blogs/'.length)
        .replace(/\.md$/, '')
        .replace(/\//g, '-');
      urls.add(`${SITE_ORIGIN}/blogs/${slug}/`);
      continue;
    }

    // 动态与更新日志都聚合在单页展示
    if (file.startsWith('src/content/moments/')) {
      urls.add(`${SITE_ORIGIN}/moments/`);
      continue;
    }
    if (file.startsWith('src/content/changelogs/')) {
      urls.add(`${SITE_ORIGIN}/changelogs/`);
      continue;
    }

    // 会影响全站页面的结构性改动才全量推送
    if (
      file === 'src/app/layout.tsx' ||
      file === 'src/app/sitemap.ts' ||
      file.startsWith('src/setting/') ||
      file === 'public/robots.txt' ||
      file === 'next.config.ts' ||
      file === 'package.json'
    ) {
      full = true;
      continue;
    }

    // 页面与嵌套布局按路由精确映射
    if (file.startsWith('src/app/') && (file.endsWith('/page.tsx') || file.endsWith('/layout.tsx'))) {
      const route = file
        .slice('src/app/'.length)
        .replace(/(^|\/)(page|layout)\.tsx$/, '');

      if (!route) {
        urls.add(`${SITE_ORIGIN}/`);
      } else if (!route.includes('[') && !route.includes('(')) {
        urls.add(`${SITE_ORIGIN}/${route}/`);
      }
    }
  }

  return { urls: [...urls], full };
}

/**
 * 读取 sitemap 文本
 *
 * @returns {Promise<string|null>} sitemap 内容，读取失败返回 null
 */
async function readSitemap() {
  if (SITEMAP_URL) {
    try {
      const response = await fetch(SITEMAP_URL, { redirect: 'follow' });
      if (!response.ok) {
        console.warn(`[baidu] 拉取线上 sitemap 失败（HTTP ${response.status}），跳过推送`);
        return null;
      }
      return await response.text();
    } catch (error) {
      console.warn(`[baidu] 拉取线上 sitemap 出错：${error.message}，跳过推送`);
      return null;
    }
  }

  if (!fs.existsSync(SITEMAP_PATH)) {
    console.warn(`[baidu] 本地 sitemap 不存在：${SITEMAP_PATH}，跳过推送`);
    return null;
  }
  return fs.readFileSync(SITEMAP_PATH, 'utf8');
}

/**
 * 推送一批 URL
 *
 * @param {string[]} batch 本批 URL
 * @param {number} batchIndex 批次序号（从 1 开始）
 * @returns {Promise<{ok: boolean, hard?: boolean, quota?: boolean, remain?: number}>}
 */
async function pushBatch(batch, batchIndex) {
  const endpoint =
    `http://data.zz.baidu.com/urls?site=${encodeURIComponent(SITE_ORIGIN)}` +
    `&token=${encodeURIComponent(TOKEN)}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
    body: batch.join('\n'),
  });

  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // 百度在 token 错误等场景可能返回纯文本/HTML，下面统一按失败处理
  }

  if (!response.ok) {
    console.error(`[baidu] 第 ${batchIndex} 批失败（HTTP ${response.status}）：${text.slice(0, 300)}`);
    return { ok: false, hard: true };
  }

  if (!data || Number(data.success) !== 1) {
    const message = data?.message || text.slice(0, 300);
    // 配额不足是常态（新站每日 10 条左右），不算脚本错误
    if (/quota|over|limit|剩余|额度|超出|上限/i.test(message)) {
      console.warn(`[baidu] 第 ${batchIndex} 批未推送：${message}`);
      return { ok: false, quota: true };
    }
    console.error(`[baidu] 第 ${batchIndex} 批失败：${message}`);
    return { ok: false, hard: true };
  }

  console.log(`[baidu] 第 ${batchIndex} 批成功：${batch.length} 条，剩余额度 ${data.remain}`);

  if (Array.isArray(data.not_same_site) && data.not_same_site.length > 0) {
    console.warn(`[baidu] 非本站 URL：${data.not_same_site.slice(0, 5).join(', ')}`);
  }
  if (Array.isArray(data.not_valid) && data.not_valid.length > 0) {
    console.warn(`[baidu] 无效 URL：${data.not_valid.slice(0, 5).join(', ')}`);
  }

  return { ok: true, remain: Number(data.remain) };
}

/**
 * 主流程
 *
 * 刻意不使用 process.exit()：Windows 下 fetch 之后强制退出可能触发
 * libuv 的 UV_HANDLE_CLOSING 断言，改用 process.exitCode 标记结果。
 */
async function main() {
  if (!TOKEN && !DRY_RUN) {
    console.log('[baidu] 未配置 BAIDU_PUSH_TOKEN，跳过主动推送');
    console.log(
      '::warning::百度主动推送未配置 BAIDU_PUSH_TOKEN，请在百度站长平台「普通收录 > 推送接口」获取 token 并配置到仓库 Secrets。'
    );
    return;
  }

  const xml = await readSitemap();
  if (!xml) {
    return;
  }

  // 只保留本站 URL，避免 sitemap 里混入外部地址导致百度整批拒绝
  const sitemapUrls = [...new Set(
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim())
  )].filter((url) => url.startsWith(`${SITE_ORIGIN}/`));

  if (sitemapUrls.length === 0) {
    console.log('[baidu] sitemap 中没有本站 URL，跳过');
    return;
  }

  const changed = resolveChangedUrls(CHANGED_FILES === 'ALL' ? [] : CHANGED_FILES.split(/\r?\n/));
  let targets;

  if (CHANGED_FILES === 'ALL' || changed.full) {
    targets = sitemapUrls;
    console.log(
      `[baidu] 推送模式：全量（${CHANGED_FILES === 'ALL' ? '未提供变更清单' : '改动涉及全站结构'}）`
    );
  } else {
    const knownUrls = new Set(sitemapUrls);
    targets = changed.urls.filter((url) => knownUrls.has(url));
    if (targets.length === 0) {
      console.log('[baidu] 本次没有需要推送的页面变更，跳过推送');
      return;
    }
    console.log(`[baidu] 推送模式：增量，共 ${targets.length} 条变更 URL`);
  }

  /*
    文章优先：百度新站每日配额通常只有 10 条左右，
    如果按 sitemap 顺序推，配额会先被首页/工具页吃掉，文章反而排不上。
    这里把 /blogs/ 的 URL 排到前面。
  */
  targets = [...targets].sort(
    (a, b) => Number(b.includes('/blogs/')) - Number(a.includes('/blogs/'))
  );

  if (DRY_RUN) {
    console.log(`[baidu] 试运行模式：共 ${targets.length} 条，每批 ${BATCH_SIZE} 条`);
    for (const url of targets) {
      console.log(`  ${url}`);
    }
    return;
  }

  console.log(`[baidu] 共 ${targets.length} 条，每批 ${BATCH_SIZE} 条`);

  for (let index = 0; index < targets.length; index += BATCH_SIZE) {
    const batch = targets.slice(index, index + BATCH_SIZE);
    const batchIndex = Math.floor(index / BATCH_SIZE) + 1;

    const result = await pushBatch(batch, batchIndex);

    if (result.hard) {
      process.exitCode = 1;
      return;
    }

    if (result.quota) {
      console.warn('[baidu] 当日额度不足，剩余 URL 留到明天再推');
      return;
    }

    if (result.remain === 0 && index + BATCH_SIZE < targets.length) {
      console.warn('[baidu] 当日额度已用完，剩余 URL 留到明天再推');
      return;
    }

    // 批次之间稍作停顿，避免连续请求被百度限流
    if (index + BATCH_SIZE < targets.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  console.log('[baidu] 全部推送完成');
}

main().catch((error) => {
  console.error(`[baidu] 脚本执行异常：${error.message}`);
  process.exitCode = 1;
});
