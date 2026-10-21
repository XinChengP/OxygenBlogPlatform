/**
 * Cloudflare 缓存 purge 脚本（在 CI 部署完成后运行）
 *
 * 为什么需要：
 * 站点通过 Cloudflare 代理，HTML 配置了 4 小时边缘 + 浏览器缓存以提高回访速度。
 * 静态资源（_next/static、/Blogabout 等）使用内容哈希/内容版本，部署后旧资源
 * 即便留在边缘缓存里也无障碍；但 HTML 如果被边缘节点缓存住，新版本可能要
 * 最长达 4 小时才对用户可见。因此每次部署后主动 purge 掉 HTML 页面列表。
 *
 * 从环境变量读取配置（未配置时静默跳过，不影响部署）：
 *   CLOUDFLARE_ZONE_ID     Cloudflare Zone ID
 *   CLOUDFLARE_API_TOKEN   具备 "Cache Purge" 权限的 API Token
 *   SITEMAP_PATH           本地 sitemap 路径，缺省 ./out/sitemap.xml
 *   SITEMAP_URL            可选；设置后改从线上 URL 拉取 sitemap
 *                          （用于部署完成后读取最新页面清单）
 *
 * API 参考：https://developers.cloudflare.com/api/operations/zone-purge
 * files 数组单次最多 30 条，脚本会自动分批。
 */

import fs from 'node:fs';

const ZONE_ID = process.env.CLOUDFLARE_ZONE_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const SITEMAP_PATH = process.env.SITEMAP_PATH || './out/sitemap.xml';
const SITEMAP_URL = process.env.SITEMAP_URL || '';
const BATCH_SIZE = 30;

if (!ZONE_ID || !API_TOKEN) {
  console.log('[purge] 未配置 CLOUDFLARE_ZONE_ID / CLOUDFLARE_API_TOKEN，跳过 purge');
  process.exit(0);
}

let xml;
if (SITEMAP_URL) {
  const response = await fetch(SITEMAP_URL, { redirect: 'follow' });
  if (!response.ok) {
    console.warn(`[purge] 拉取 sitemap 失败（HTTP ${response.status}），跳过 purge`);
    process.exit(0);
  }
  xml = await response.text();
} else {
  if (!fs.existsSync(SITEMAP_PATH)) {
    console.warn(`[purge] 站点地图不存在：${SITEMAP_PATH}，跳过 purge`);
    process.exit(0);
  }
  xml = fs.readFileSync(SITEMAP_PATH, 'utf8');
}

const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

if (urls.length === 0) {
  console.log('[purge] sitemap 中没有可 purge 的 URL，跳过');
  process.exit(0);
}

console.log(`[purge] 共 ${urls.length} 个 HTML 页面待 purge`);

const endpoint = `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache`;

for (let index = 0; index < urls.length; index += BATCH_SIZE) {
  const files = urls.slice(index, index + BATCH_SIZE);
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ files }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(
      `[purge] 第 ${index / BATCH_SIZE + 1} 批失败（HTTP ${response.status}）：${text.slice(0, 500)}`
    );
    process.exit(1);
  }

  const result = await response.json();
  if (!result.success) {
    console.error(
      `[purge] 第 ${index / BATCH_SIZE + 1} 批失败：${JSON.stringify(result.errors).slice(0, 500)}`
    );
    process.exit(1);
  }

  console.log(`[purge] 第 ${index / BATCH_SIZE + 1} 批（${files.length} 个 URL）purge 成功`);
}
