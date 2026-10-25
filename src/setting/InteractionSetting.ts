/**
 * 互动服务配置（浏览量 / 热门榜）
 *
 * 后端是 cloudflare/interactions（Cloudflare Worker + D1），见该目录 README。
 *
 * 与 CommentSetting.ts 的思路一致：把地址与规则集中在这里作为唯一事实来源。
 * 生产环境走同源路由 /api/interactions/*（由 Worker route 接管），
 * 本地开发由 next.config.ts 的 rewrite 转发到 wrangler dev（127.0.0.1:8787），
 * 因此默认值不需要任何环境变量。
 *
 * 如果将来把 Worker 迁到独立域名，设置 NEXT_PUBLIC_INTERACTIONS_API_URL 即可，
 * 同时记得在 src/utils/cspSources.ts 的 connect-src 登记该域名。
 */

export const INTERACTIONS_API_URL = (
  process.env.NEXT_PUBLIC_INTERACTIONS_API_URL || '/api/interactions'
).replace(/\/+$/, '');

/** 与后端一致的路径规则：/blogs/<slug>/，带尾斜杠（与 Twikoo 评论路径同口径） */
export function blogInteractionPath(slug: string): string {
  return `/blogs/${encodeURIComponent(slug)}/`;
}

/** 浏览量的口语化格式：超过一万显示「x.x万」 */
export function formatViewCount(views: number): string {
  if (views >= 10000) {
    const wan = views / 10000;
    return `${wan >= 10 ? Math.round(wan) : wan.toFixed(1)}万`;
  }
  return views.toLocaleString('zh-CN');
}
