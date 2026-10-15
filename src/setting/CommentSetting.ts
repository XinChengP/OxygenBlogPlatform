/**
 * 评论系统配置（Twikoo）
 *
 * 【为什么单独建这个文件】
 * 评论相关的配置分散在三处会出问题：
 *   1. 前端组件要用后端地址（envId）；
 *   2. CSP 白名单要放行后端域名；
 *   3. 评论路径规则（path）决定了「哪条评论属于哪篇文章」，
 *      将来从 giscus 迁移历史数据时，导入脚本必须用完全相同的规则，
 *      否则迁移过来的评论会挂到错误的文章下。
 * 因此把路径规则集中在这里，作为唯一事实来源，供组件与迁移脚本共用。
 *
 * 注意：CSP 白名单在 src/utils/cspSources.ts 中自行读取环境变量，
 * 没有 import 本文件 —— 因为那个文件被 next.config.ts 在 Node 构建环境中引用，
 * 必须保持零依赖。两处读的是同一个环境变量，改动时需一起确认。
 */

/**
 * Twikoo 后端地址（Cloudflare Workers）
 *
 * 形如 https://twikoo.xinchengp.cn，必须带 https:// 前缀。
 *
 * 这是 NEXT_PUBLIC_ 前缀的变量，会在**构建时**内联进前端产物，
 * 不是运行时读取，因此改完必须重新构建部署才生效。
 */
export const TWIKOO_ENV_ID = process.env.NEXT_PUBLIC_TWIKOO_ENV_ID || '';

/**
 * 后端是否已配置
 *
 * 未配置时组件会显示一段明确的提示而不是静默空白，
 * 便于在本地开发（后端还没部署）时区分「没配」和「配错了」。
 */
export const isTwikooConfigured = TWIKOO_ENV_ID !== '';

/**
 * Twikoo 前端脚本的存放路径
 *
 * 选择自托管而非 CDN：jsDelivr / unpkg 在国内的可用性时好时坏，
 * 而评论区是每个页面都要加载的组件，依赖外部 CDN 会把「国内可访问」这个目标
 * 交给一个不受控的第三方。
 *
 * 版本必须与后端配对：本文件对应 Twikoo 前端 1.7.24，后端 twikoo-func 由
 * cloudflare/twikoo/package.json 的 `^1.6.44` 解析到 1.7.24，两者同为 1.7 线。
 * 升级其中一侧时另一侧要一起升，前后端协议版本不一致会出现难以定位的异常。
 */
export const TWIKOO_SCRIPT_PATH = '/js/twikoo.min.js';

/** 评论区的两种用途 */
export type CommentType = 'blog' | 'guestbook';

/** 留言板的评论路径（固定值，与页面 URL 无关） */
const GUESTBOOK_PATH = '/guestbook/';

/**
 * 计算某篇文章 / 留言板的评论路径
 *
 * 【迁移相关，改动需谨慎】
 * 这个函数定义了「评论挂在哪个 key 下」，是与历史数据对齐的关键。
 *
 * 文章：沿用 giscus 原先的 pathname 映射规则，即浏览器地址栏路径。
 *   本站 next.config.ts 设置了 trailingSlash: true，所以路径恒定是
 *   `/blogs/<slug>/` 这种带尾斜杠的形态，不会出现同一篇文章两种写法的问题。
 *   这里刻意不手工拼 `/blogs/${slug}`，而是取 location.pathname：
 *   万一将来调整了文章路由，评论归属会自动跟着走，不需要改代码。
 *
 * 留言板：giscus 时代用的是固定的讨论区词条 guestbook。
 *   迁移脚本需要把它映射到这里的 /guestbook/，因此写死为常量而非取自 URL，
 *   避免留言板页面将来挪到别的路由时，已有留言与新的 key 对不上。
 *
 * @param type - 评论区用途
 * @param slug - 文章 slug，仅 type 为 blog 时使用
 */
export function getCommentPath(type: CommentType, slug?: string): string {
  if (type === 'guestbook') return GUESTBOOK_PATH;

  // 服务端渲染阶段拿不到 window，此时返回空串；
  // 组件在客户端挂载后才会调用本函数，因此实际不会走到这个分支。
  if (typeof window === 'undefined') return slug ? `/blogs/${slug}/` : '';
  return window.location.pathname;
}
