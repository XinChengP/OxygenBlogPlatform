/**
 * CSP 外部来源白名单（全站唯一数据源）
 *
 * 【为什么需要这个文件】
 * 本站的内容安全策略（CSP）需要在三个位置下发，过去它们各自硬编码了一份白名单：
 *   1. next.config.ts                —— 开发服务器的 HTTP 响应头
 *   2. src/utils/cspConfig.ts        —— 线上实际生效（SecurityProvider 注入 meta 标签）
 *   3. src/utils/securityHeaders.ts  —— 备用响应头配置（当前未启用）
 *
 * 三份白名单长期不同步，例如：
 *   - Google Analytics 域名只在 next.config.ts 被清理，cspConfig.ts 里却一直留着；
 *   - https://*.github.io 的 frame-src 只在 cspConfig.ts 出现。
 * 新增一个域名时极易漏改某一处，导致线上请求被浏览器拦截
 * （例如 rocotnt.xinchengp.cn 禁赛接口曾因 cspConfig.ts 未放行而失败）。
 *
 * 【如何维护】
 * 新增外部资源时，只需在下面 EXTERNAL_SOURCES 数组追加一条记录，
 * 并用 directives 声明它需要放行哪些 CSP 指令，上述三个文件会自动同步。
 *
 * 【重要约束】
 * 本文件必须保持“零依赖”：不 import 任何模块，也不使用浏览器/Node API。
 * 因为它会被 next.config.ts 在 Node 构建环境中直接引用。
 */

/**
 * CSP 指令名称
 * 仅列举本白名单会用到的连接类指令，其余指令（如 media-src）不含特定域名
 */
export type CspDirectiveName =
  | 'script-src'      // 脚本来源
  | 'style-src'       // 样式来源
  | 'img-src'         // 图片来源
  | 'font-src'        // 字体来源
  | 'connect-src'     // XHR / fetch / WebSocket 连接来源
  | 'frame-src'       // 本页可嵌入的 iframe 来源
  | 'frame-ancestors'; // 允许嵌入本页的来源（仅响应头可用）

/**
 * 单条外部来源声明
 */
export interface ExternalSource {
  /** 来源地址，CSP 语法，可包含通配符（如 https://*.github.io） */
  origin: string;
  /** 中文用途说明，便于日后判断该条是否还有保留价值 */
  desc: string;
  /** 该来源需要被放行的 CSP 指令列表 */
  directives: CspDirectiveName[];
}

/**
 * Twikoo 评论后端地址（去掉结尾斜杠）
 *
 * 这里直接读环境变量、不 import src/setting/CommentSetting.ts，
 * 是为了守住本文件的「零依赖」约束（见文件头说明）。
 * 两处读的是同一个 NEXT_PUBLIC_TWIKOO_ENV_ID，改动时需一起确认。
 *
 * 未配置时为空串，下方不登记该来源 —— 避免往 CSP 里写进一个空串，
 * 那会让整个指令串变得不可解析。
 */
const TWIKOO_ORIGIN = (process.env.NEXT_PUBLIC_TWIKOO_ENV_ID || '').replace(/\/+$/, '');

/**
 * 全站外部来源白名单
 *
 * 说明：'self'、data:、blob:、https:、http: 这类“通用来源”不在此登记，
 * 它们由各 CSP 指令的基础模板负责拼装，这里只登记具体的特定域名。
 */
export const EXTERNAL_SOURCES: ExternalSource[] = [
  // ===== GitHub 相关 =====
  {
    origin: 'https://*.github.io',
    /*
      历史 GitHub Pages 域名，仅保留图片放行。
      当前站点已使用自定义域名，不需要从 github.io 加载脚本、嵌入 iframe，
      也不允许 github.io 页面嵌入本站，避免任意 GitHub Pages 用户获得脚本执行或点击劫持入口。
    */
    desc: 'GitHub Pages 历史图片资源（仅图片，不再放行脚本与 iframe）',
    directives: ['img-src'],
  },
  {
    origin: 'https://*.githubusercontent.com',
    desc: 'GitHub 用户内容（raw 图片等）',
    directives: ['img-src'],
  },
  {
    origin: 'https://api.github.com',
    desc: 'GitHub API（后台推送、仓库信息读取）',
    directives: ['connect-src'],
  },
  {
    origin: 'https://*.github.com',
    desc: 'GitHub 页面 iframe 嵌入',
    directives: ['frame-src'],
  },

  // ===== 评论系统 =====
  // Twikoo 后端（Cloudflare Workers）。
  // 与 giscus 不同，Twikoo 只需要放行 connect-src 一个方向：
  //   - 前端脚本自托管在 /js/twikoo.min.js，同源，由 'self' 覆盖；
  //   - Twikoo 直接渲染在当前页面 DOM 中，不使用 iframe，无需 frame-src。
  // 地址未配置时不登记任何来源。
  ...(TWIKOO_ORIGIN
    ? [{
        origin: TWIKOO_ORIGIN,
        desc: 'Twikoo 评论后端（Cloudflare Workers）',
        directives: ['connect-src'] as CspDirectiveName[],
      }]
    : []),
  {
    // Twikoo 表情面板的数据源（OwO JSON，颜文字/Emoji/B站小电视三组）。
    // 该请求不带 crossorigin 属性，但 fetch 默认走 cors 模式，仍受 connect-src 约束。
    // 曾因漏登此域名导致表情按钮点不开：表情 JSON 被 CSP 静默拦截（控制台仅有一条
    // 极简短的 "Failed to fetch"），OwO 面板初始化中断，按钮成为空壳 div。
    // 若将来在管理面板把 EMOTION_CDN 改成其他地址，这里必须同步替换。
    origin: 'https://owo.imaegoo.com',
    desc: 'Twikoo 表情面板数据源（OwO 表情 JSON，默认公开源）',
    directives: ['connect-src'] as CspDirectiveName[],
  },

  // ===== 统计与监控 =====
  // 注：Google Analytics 已确认未接入（源码中无 gtag.js 加载代码），
  //     故此处不再登记 www.google-analytics.com / www.googletagmanager.com。
  //     将来若接入 GA，在此追加两条记录即可。
  {
    origin: 'https://v6.51.la',
    desc: '51.la 网站统计主域',
    directives: ['script-src', 'connect-src'],
  },
  {
    origin: 'https://sdk.51.la',
    desc: '51.la 统计 SDK',
    directives: ['script-src', 'connect-src'],
  },
  {
    origin: 'https://collect-v6.51.la',
    desc: '51.la 统计数据收集上报',
    directives: ['connect-src'],
  },
  {
    origin: 'https://static.cloudflareinsights.com',
    desc: 'Cloudflare Web Analytics 脚本',
    directives: ['script-src'],
  },
  {
    origin: 'https://cloudflareinsights.com',
    desc: 'Cloudflare Web Analytics 数据上报',
    directives: ['connect-src'],
  },

  // ===== 字体 =====
  {
    origin: 'https://fonts.googleapis.com',
    desc: 'Google Fonts 样式表',
    directives: ['style-src'],
  },
  {
    origin: 'https://fonts.gstatic.com',
    desc: 'Google Fonts 字体文件',
    directives: ['font-src'],
  },

  // ===== 本站业务接口 =====
  {
    origin: 'https://v1.hitokoto.cn',
    desc: '一言 API（Live2D 看板娘随机句子）',
    directives: ['connect-src'],
  },
  {
    origin: 'https://api.qijieya.cn',
    desc: '网易云音乐歌单 Meting API（主用：playlist 接口返回完整歌单）',
    directives: ['connect-src'],
  },
  {
    origin: 'https://api.injahow.cn',
    desc: '网易云音乐歌单 Meting API（备用：playlist 接口有服务端缓存，可能少歌）',
    directives: ['connect-src'],
  },
  {
    origin: 'https://rocotnt.xinchengp.cn',
    desc: '洛克王国天梯赛每周禁赛数据接口（roco-team 阵容模拟器）',
    directives: ['connect-src'],
  },
  {
    origin: 'https://img.xinchengp.cn',
    desc: '画廊图床（Workers Static Assets）：manifest 清单 fetch + 图片直出',
    directives: ['img-src', 'connect-src'],
  },

  // ===== 第三方嵌入 =====
  {
    origin: 'https://player.bilibili.com',
    desc: 'B 站视频播放器 iframe',
    directives: ['frame-src'],
  },

  // ===== 本地开发 =====
  {
    origin: 'http://localhost:*',
    desc: '本地开发 HTTP 连接（开发服务器、后台管理接口）',
    directives: ['connect-src'],
  },
  {
    origin: 'ws://localhost:*',
    desc: '本地开发 WebSocket（热更新、Turbopack 通信）',
    directives: ['connect-src'],
  },
];

/**
 * 按指令聚合白名单来源
 * @param directive 目标 CSP 指令
 * @returns 该指令下所有需要放行的外部来源（保持登记顺序）
 */
export function getSourcesForDirective(directive: CspDirectiveName): string[] {
  return EXTERNAL_SOURCES
    .filter((source) => source.directives.includes(directive))
    .map((source) => source.origin);
}
