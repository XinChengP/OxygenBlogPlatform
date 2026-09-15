'use client';

import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { copyrightConfig } from '@/setting/blogSetting';

/**
 * 功能图标的公共属性
 *
 * 为什么放弃图标库改用内联 SVG：
 * 微博 / QQ空间 / X 三个品牌标志必须是官方轮廓，只能内联 path；
 * 若复制、二维码等按钮继续使用 @heroicons/react，同一块面板里就会并存
 * 「实心品牌图标」与「图标库线框图标」两套体系，线宽与视觉重量无法对齐。
 * 因此这里统一内联为同一规格：viewBox 24×24、线框描边、strokeWidth 2、圆头圆角。
 * 副作用是本组件不再依赖任何图标库，构建体积也随之减少。
 *
 * aria-hidden 固定为 true：这些图标纯装饰，语义由按钮的 aria-label 承担。
 */
const ICON_PROPS = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

/** 链接图标：两节相扣的链条，用于「复制链接」按钮 */
function LinkSvg({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

/** 对勾图标：复制成功的即时反馈 */
function CheckSvg({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/**
 * 二维码图标：三个定位角 + 数枚码点
 * 只保留可辨识的最低信息量，避免在 14px 尺寸下糊成一团黑块。
 */
function QrCodeSvg({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="16" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="16" width="5" height="5" rx="1" />
      <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
      <path d="M12 7v3a2 2 0 0 1-2 2H7" />
      <path d="M12 16v.01" />
      <path d="M16 12h1" />
      <path d="M12 21v-1" />
    </svg>
  );
}

/** 分享图标：三个节点由连线串联，用于面板标题与「更多」按钮 */
function ShareSvg({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.59 13.51l6.83 3.98" />
      <path d="M15.41 6.51L8.59 10.49" />
    </svg>
  );
}

/** 扫码图标：四角取景框加一条扫描线，用于二维码下方提示文案 */
function ScanSvg({ className }: { className?: string }) {
  return (
    <svg {...ICON_PROPS} className={className}>
      <path d="M4 9V6a2 2 0 0 1 2-2h3" />
      <path d="M15 4h3a2 2 0 0 1 2 2v3" />
      <path d="M20 15v3a2 2 0 0 1-2 2h-3" />
      <path d="M9 20H6a2 2 0 0 1-2-2v-3" />
      <path d="M4 12h16" />
    </svg>
  );
}

/**
 * 二维码组件懒加载
 *
 * 原因：qrcode.react 虽体积不大，但二维码只是可选功能，
 * 并非所有读者都会使用。用 lazy 将其拆分为独立 chunk，
 * 仅在用户首次点击「二维码」按钮时才真正下载，避免拖慢文章页首屏。
 *
 * 注意：qrcode.react 是命名导出，需借助 .then 转换为 default 导出，
 * 以满足 React.lazy 对模块结构的要求。
 */
const QRCodeSVG = lazy(() =>
  import('qrcode.react').then((mod) => ({ default: mod.QRCodeSVG }))
);

/**
 * 博客分享面板组件属性接口
 */
interface BlogSharePanelProps {
  /** 文章标题：社交平台分享时用作默认文案 */
  title: string;
  /** 文章 slug：用于拼接文章完整链接 */
  slug: string;
  /** 文章摘要：部分平台（如 QQ 空间）会展示该内容 */
  excerpt?: string;
  /** 自定义类名 */
  className?: string;
  /**
   * 裸模式
   *
   * 开启后不再渲染自身的卡片外壳（背景、边框、圆角、阴影、内边距）与面板标题，
   * 仅保留按钮区与二维码展开区。
   *
   * 使用场景：本面板被文章结尾的「标签/分享/版权」合并卡片收纳时，
   * 若继续保留自带外壳，就会出现「卡片套卡片」的双层边框；
   * 标题也一并交出，由父容器的统一小标题承担，避免出现两个「分享」标题。
   */
  bare?: boolean;
}

/**
 * 社交分享渠道配置
 *
 * 设计说明：
 * 各平台的分享跳转地址拼接规则互不相同，因此统一抽象为「生成函数 + 图标 + 展示样式」的数据结构。
 * 后续新增平台时只需往数组追加一项，渲染逻辑无需改动，避免同构的重复代码。
 */
interface ShareChannelConfig {
  /** 渠道唯一标识，用作列表 key */
  key: string;
  /**
   * 渠道名称
   *
   * 按钮内已不再显示文字，该字段仅用于拼接 aria-label，
   * 保证屏幕阅读器仍能读出「分享到微博」这类完整语义。
   */
  label: string;
  /**
   * 品牌图标的 SVG path 数据
   *
   * 统一使用 viewBox="0 0 24 24" 的官方品牌轮廓，
   * 这样所有图标能套用同一套尺寸与描边规则，视觉上整齐划一。
   * 图标来源：
   * - 微博、X、QQ好友、豆瓣：simple-icons 官方图标库（CC0 协议，可商用、免署名）
   * - QQ空间：SVG Repo 的 Popular Company Logo Icons（CC0 协议，可商用）
   * - 百度贴吧：全网图标库均无「贴吧」专属的填充型品牌图标
   *   （唯一命中项为 arcticons 的描边版，且为 CC BY-SA 4.0 授权，
   *   要求署名并以相同协议共享，对博客而言授权负担偏重），
   *   故改用同为 simple-icons 的百度品牌标志——贴吧系百度旗下产品，
   *   图标风格与授权许可都与其余渠道保持一致。
   */
  iconPath: string;
  /** 按钮容器在悬停时的样式（含平台品牌色） */
  buttonClass: string;
  /** 图标在按钮悬停时的配色，用 group-hover 跟随按钮的悬停状态 */
  iconClass: string;
  /**
   * 生成该平台的分享跳转地址
   * @param payload 文章链接、标题、摘要
   * @returns 可直接在新窗口打开的分享地址
   */
  buildUrl: (payload: { url: string; title: string; summary: string }) => string;
}

/**
 * 社交分享渠道列表
 *
 * 注意：样式类名必须写成完整字面量而非拼接字符串，
 * 否则 Tailwind 在构建期扫描源码时无法识别，会导致样式丢失。
 * 同理，品牌色也不能用内联 style 的动态变量传给 Tailwind 类名。
 */
const SHARE_CHANNELS: ShareChannelConfig[] = [
  {
    key: 'weibo',
    label: '微博',
    // 微博官方标志：圆环状的「眼睛」造型
    iconPath:
      'M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.737 5.439l-.002.004zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.601.622.263.82.972.442 1.592zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.315.36.18.601l.014-.028zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.64 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zm7.563-1.224c-.346-.105-.57-.18-.405-.615.375-.977.42-1.804 0-2.404-.781-1.112-2.915-1.053-5.364-.03 0 0-.766.331-.571-.271.376-1.217.315-2.224-.27-2.809-1.338-1.337-4.869.045-7.888 3.08C1.309 10.87 0 13.273 0 15.348c0 3.981 5.099 6.395 10.086 6.395 6.536 0 10.888-3.801 10.888-6.82 0-1.822-1.547-2.854-2.915-3.284v.01zm1.908-5.092c-.766-.856-1.908-1.187-2.96-.962-.436.09-.706.511-.616.932.09.42.511.691.932.602.511-.105 1.067.044 1.442.465.376.421.466.977.316 1.473-.136.406.089.856.51.992.405.119.857-.105.992-.512.33-1.021.12-2.178-.646-3.035l.03.045zm2.418-2.195c-1.576-1.757-3.905-2.419-6.054-1.968-.496.104-.812.587-.706 1.081.104.496.586.813 1.082.707 1.532-.331 3.185.15 4.296 1.383 1.112 1.246 1.429 2.943.947 4.416-.165.48.106 1.007.586 1.157.479.165.991-.104 1.157-.586.675-2.088.241-4.478-1.338-6.235l.03.045z',
    buttonClass: 'hover:border-[#e6162d]/40 hover:bg-[#e6162d]/10',
    iconClass: 'group-hover:text-[#e6162d]',
    buildUrl: ({ url, title }) =>
      `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
  },
  {
    key: 'qzone',
    label: 'QQ空间',
    // QQ空间官方标志：五角星搭配环绕的弧线
    iconPath:
      'M23.985 9.202c-.032-.099-.127-.223-.334-.258-.207-.036-7.351-1.406-7.351-1.406s-.105-.022-.198-.07c-.092-.047-.127-.167-.127-.167S12.447.956 12.349.77C12.25.583 12.104.532 12 .532c-.104 0-.251.051-.349.238-.098.186-3.626 6.531-3.626 6.531s-.035.12-.128.167c-.092.047-.197.07-.197.07S.556 8.908.348 8.943c-.208.036-.302.16-.333.258a.477.477 0 0 0 .125.449l5.362 5.49s.072.08.119.172c.016.104.005.21.005.21s-1.189 7.242-1.22 7.45.075.369.159.43c.083.062.233.106.421.013.189-.093 6.812-3.261 6.812-3.261s.098-.044.201-.061c.103-.017.201.061.201.061s6.623 3.168 6.812 3.261c.188.094.338.049.421-.013a.463.463 0 0 0 .159-.43c-.021-.14-.93-5.677-.93-5.677.876-.54 1.425-1.039 1.849-1.747-2.594.969-6.006 1.717-9.415 1.866-.915.041-2.41.097-3.473-.015-.678-.071-1.17-.144-1.243-.438-.053-.215.054-.46.545-.831a2640.5 2640.5 0 0 1 2.861-2.155c1.285-.968 3.559-2.47 3.559-2.731 0-.285-2.144-.781-4.037-.781-1.945 0-2.275.132-2.811.168-.488.034-.769.005-.804-.138-.06-.248.183-.389.588-.568.709-.314 1.86-.594 1.984-.626.194-.052 3.082-.805 5.618-.535 1.318.14 3.244.668 3.244 1.276 0 .342-1.721 1.494-3.225 2.597-1.149.843-2.217 1.561-2.217 1.688 0 .342 3.533 1.241 6.689 1.01l.003-.022c.048-.092.119-.172.119-.172l5.362-5.49a.477.477 0 0 0 .127-.449z',
    buttonClass: 'hover:border-[#e6a700]/40 hover:bg-[#e6a700]/10',
    iconClass: 'group-hover:text-[#e6a700]',
    buildUrl: ({ url, title, summary }) =>
      `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}&site=${encodeURIComponent(copyrightConfig.siteName)}`,
  },
  {
    key: 'qq',
    label: 'QQ好友',
    /*
      腾讯 QQ 官方标志：企鹅剪影
      参数说明（来自 connect.qq.com 定向分享组件文档）：
      - url     要分享的网页地址
      - title   分享标题
      - summary 分享摘要（对链接的描述）
      - site    分享来源，用于展示「来自某网站」
      该地址在 PC 端会打开「发送给QQ好友和群组」页面；
      若当前未登录 QQ，腾讯侧会自动退化为扫码弹窗，这是对方的行为，不影响接入。
    */
    iconPath:
      'M21.395 15.035a40 40 0 0 0-.803-2.264l-1.079-2.695c.001-.032.014-.562.014-.836C19.526 4.632 17.351 0 12 0S4.474 4.632 4.474 9.241c0 .274.013.804.014.836l-1.08 2.695a39 39 0 0 0-.802 2.264c-1.021 3.283-.69 4.643-.438 4.673.54.065 2.103-2.472 2.103-2.472 0 1.469.756 3.387 2.394 4.771-.612.188-1.363.479-1.845.835-.434.32-.379.646-.301.778.343.578 5.883.369 7.482.189 1.6.18 7.14.389 7.483-.189.078-.132.132-.458-.301-.778-.483-.356-1.233-.646-1.846-.836 1.637-1.384 2.393-3.302 2.393-4.771 0 0 1.563 2.537 2.103 2.472.251-.03.581-1.39-.438-4.673',
    // QQ 品牌色为亮蓝，与天依蓝接近但更饱和，仍能作为悬停反馈被识别出来
    buttonClass: 'hover:border-[#12b7f5]/40 hover:bg-[#12b7f5]/10',
    iconClass: 'group-hover:text-[#12b7f5]',
    buildUrl: ({ url, title, summary }) =>
      `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(summary)}&site=${encodeURIComponent(copyrightConfig.siteName)}`,
  },
  {
    key: 'tieba',
    label: '百度贴吧',
    /*
      百度官方标志：贴吧无专属填充型品牌图标，故取母公司标志代替
      参数说明：url 为分享链接、title 为帖子标题、pic 为配图
      本组件未拿到文章封面（Props 中无封面字段），故 pic 传空值，
      让贴吧按分享链接自行抓取缩略图，避免传一个无效地址反而覆盖掉自动抓取结果。
    */
    iconPath:
      'M9.154 0C7.71 0 6.54 1.658 6.54 3.707c0 2.051 1.171 3.71 2.615 3.71 1.446 0 2.614-1.659 2.614-3.71C11.768 1.658 10.6 0 9.154 0zm7.025.594C14.86.58 13.347 2.589 13.2 3.927c-.187 1.745.25 3.487 2.179 3.735 1.933.25 3.175-1.806 3.422-3.364.252-1.555-.995-3.364-2.362-3.674a1.218 1.218 0 0 0-.261-.03zM3.582 5.535a2.811 2.811 0 0 0-.156.008c-2.118.19-2.428 3.24-2.428 3.24-.287 1.41.686 4.425 3.297 3.864 2.617-.561 2.262-3.68 2.183-4.362-.125-1.018-1.292-2.773-2.896-2.75zm16.534 1.753c-2.308 0-2.617 2.119-2.617 3.616 0 1.43.121 3.425 2.988 3.362 2.867-.063 2.553-3.238 2.553-3.988 0-.745-.62-2.99-2.924-2.99zm-8.264 2.478c-1.424.014-2.708.925-3.323 1.947-1.118 1.868-2.863 3.05-3.112 3.363-.25.309-3.61 2.116-2.864 5.42.746 3.301 3.365 3.237 3.365 3.237s1.93.19 4.171-.31c2.24-.495 4.17.123 4.17.123s5.233 1.748 6.665-1.616c1.43-3.364-.808-5.109-.808-5.109s-2.99-2.306-4.736-4.798c-1.072-1.665-2.348-2.268-3.528-2.257zm-2.234 3.84l1.542.024v8.197H7.758c-1.47-.291-2.055-1.292-2.13-1.462-.072-.173-.488-.976-.268-2.343.635-2.049 2.447-2.196 2.447-2.196h1.81zm3.964 2.39v3.881c.096.413.612.488.612.488h1.614v-4.343h1.689v5.782h-3.915c-1.517-.39-1.59-1.465-1.59-1.465v-4.317zm-5.458 1.147c-.66.197-.978.708-1.05.928-.076.22-.247.78-.1 1.269.294 1.095 1.248 1.144 1.248 1.144h1.37v-3.34z',
    // 百度品牌蓝较深，与天依蓝区分度足够，悬停时才显现不会干扰日常观感
    buttonClass: 'hover:border-[#2932e1]/40 hover:bg-[#2932e1]/10',
    iconClass: 'group-hover:text-[#2932e1]',
    buildUrl: ({ url, title }) =>
      `https://tieba.baidu.com/f/commit/share/openShareApi?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&pic=`,
  },
  {
    key: 'douban',
    label: '豆瓣',
    /*
      豆瓣官方标志：横向的「豆」字块
      地址说明：旧的 shuo.douban.com/!service/share 与 www.douban.com/recommend
      目前都会 302 跳转到 www.douban.com/share/service，
      这里直接写最终地址，省掉一次跳转、也避免旧地址日后彻底下线带来的失效风险。
      参数说明：href 为分享链接、name 为标题、url/title 为豆瓣新版页面额外兜底字段。
      注意：豆瓣分享页需要登录态，未登录会跳转登录页，这属正常流程而非接口故障。
    */
    iconPath:
      'M.51 3.06h22.98V.755H.51V3.06Zm20.976 2.537v9.608h-2.137l-1.669 5.76H24v2.28H0v-2.28h6.32l-1.67-5.76H2.515V5.597h18.972Zm-5.066 9.608H7.58l1.67 5.76h5.501l1.67-5.76ZM18.367 7.9H5.634v5.025h12.733V7.9Z',
    // 豆瓣品牌绿，与其他渠道的暖色系形成区分
    buttonClass: 'hover:border-[#007722]/40 hover:bg-[#007722]/10',
    iconClass: 'group-hover:text-[#007722]',
    buildUrl: ({ url, title }) =>
      `https://www.douban.com/share/service?href=${encodeURIComponent(url)}&name=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&image=`,
  },
  {
    key: 'x',
    label: 'X',
    // 新版 X 官方标志
    iconPath:
      'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
    /*
      X 的品牌色是纯黑，在暗色模式下会与背景糊在一起。
      因此底色改用 foreground，文字色改用 background 做反色，
      这样亮色模式呈黑底白字、暗色模式呈白底黑字，两种主题下都清晰可见。
    */
    buttonClass: 'hover:border-foreground/40 hover:bg-foreground/10',
    iconClass: 'group-hover:text-foreground',
    buildUrl: ({ url, title }) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
];

/**
 * 按钮容器的公共样式
 *
 * 抽出常量避免在多处按钮中重复书写，降低后续调整时漏改的风险。
 *
 * 结构说明（去掉文字后的纯图标按钮）：
 * - h-9 w-9 固定为正方形，p-0 压掉按钮默认内边距，
 *   使图标真正居中，而不是被内边距挤偏
 * - justify-center 让 svg 在水平方向居中
 * - group 类是关键：它让图标能通过 group-hover 跟随按钮的悬停状态
 */
const BUTTON_BASE =
  'group flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border p-0 transition-all';

/**
 * 按钮内图标的尺寸
 *
 * 从原先的 3.5（14px）提到 5（20px）：
 * 按钮内不再有文字分担视觉重量，图标需相应放大才不显空旷。
 */
const ICON_SIZE = 'h-5 w-5';

/**
 * 图标容器在默认（未悬停）状态下的配色
 */
const ICON_IDLE = 'text-muted-foreground';

/**
 * 图标容器在悬停时的公共形态
 *
 * 各组图标在此之上再套自己的颜色类，因此这里只管「怎么动」，
 * 不管「什么色」，避免同一属性被两处类名争抢。
 */
const ICON_HOVER_BASE = 'group-hover:scale-110';

/**
 * 博客文章分享面板
 *
 * 功能特点：
 * - 一键复制文章链接（含旧浏览器降级方案）
 * - 跳转至微博 / QQ空间 / X 进行分享
 * - 展开二维码，便于手机扫码继续阅读
 * - 支持系统原生分享面板（移动端体验最佳，不支持时自动隐藏）
 * - 完全基于前端实现，不依赖任何服务端接口，适配静态导出部署
 *
 * 能力边界说明：
 * 微信内置浏览器的自定义分享卡片需要微信 JS-SDK 签名，而静态导出站点没有服务端，
 * 因此此处不做微信自定义分享。用户将链接转发到微信后，由微信自动读取页面的
 * Open Graph 元数据生成卡片，效果取决于文章页的 metadata 配置。
 *
 * @param props - 组件属性
 * @returns 分享面板 JSX 元素
 */
export default function BlogSharePanel({
  title,
  slug,
  excerpt = '',
  className = '',
  bare = false,
}: BlogSharePanelProps) {
  /** 复制成功状态，用于按钮文案与图标的临时切换 */
  const [isCopied, setIsCopied] = useState(false);

  /** 二维码面板展开状态 */
  const [showQrcode, setShowQrcode] = useState(false);

  /**
   * 是否支持系统原生分享
   *
   * 初始值为 false，而非直接读取 navigator：
   * 本组件虽为客户端组件，但初始渲染仍会参与服务端预渲染，
   * 此时不存在 navigator，直接读取会导致水合不一致。
   * 因此在 useEffect 中探测，仅在客户端确定结果。
   */
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  /**
   * 文章完整链接
   *
   * 此处刻意复用 copyrightConfig.siteUrl，而非读取 window.location.href：
   * 1. 本地开发时 window.location 为 localhost，复制出去对方无法访问
   * 2. 与版权声明组件中的「本文链接」保持完全一致，避免同一篇文章出现两个不同地址
   */
  const articleUrl = `${copyrightConfig.siteUrl}/blogs/${encodeURIComponent(slug)}`;

  /** 摘要截断，避免部分平台因参数过长而拒绝生成分享卡片 */
  const summary = excerpt.slice(0, 100);

  /**
   * 降级复制方案，兼容不支持 Clipboard API 的旧浏览器或非 HTTPS 环境
   *
   * @param text - 待复制的文本
   * @returns 是否复制成功
   */
  const fallbackCopy = useCallback((text: string): boolean => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // 移出可视区域，防止复制瞬间页面发生滚动跳动
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch {
      document.body.removeChild(textArea);
      return false;
    }
  }, []);

  /**
   * 复制文章链接到剪贴板
   * 优先使用 Clipboard API，失败时自动回退到降级方案
   */
  const handleCopyLink = useCallback(async () => {
    // 已在成功反馈状态中则忽略重复点击，避免定时器被反复重置
    if (isCopied) return;

    let copied = false;

    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(articleUrl);
        copied = true;
      } catch {
        // Clipboard API 调用失败（常见于非 HTTPS 环境或无权限），转为降级方案处理
        copied = false;
      }
    }

    if (!copied) {
      copied = fallbackCopy(articleUrl);
    }

    if (copied) {
      setIsCopied(true);
      // 2 秒后恢复默认文案，与 CodeCopyButton 的反馈节奏保持一致
      setTimeout(() => setIsCopied(false), 2000);
    }
  }, [articleUrl, isCopied, fallbackCopy]);

  /**
   * 打开第三方平台的分享页面
   *
   * @param buildUrl - 该平台的分享地址生成函数
   */
  const handleShare = useCallback(
    (buildUrl: ShareChannelConfig['buildUrl']) => {
      const shareUrl = buildUrl({ url: articleUrl, title, summary });
      // noopener/noreferrer 可阻止新页面通过 window.opener 反向操作当前页面，属于安全防护
      window.open(shareUrl, '_blank', 'noopener,noreferrer,width=620,height=560');
    },
    [articleUrl, title, summary]
  );

  /**
   * 调用系统原生分享面板（主要用于移动端）
   *
   * 用户主动取消分享时，navigator.share 会抛出 AbortError，
   * 这属于正常操作而非异常，必须单独捕获并静默忽略，
   * 否则会在控制台产生无意义的报错干扰排查。
   */
  const handleNativeShare = useCallback(async () => {
    if (!canNativeShare) return;

    try {
      await navigator.share({ title, text: summary, url: articleUrl });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      console.error('[BlogSharePanel] 系统分享失败:', error);
    }
  }, [canNativeShare, title, summary, articleUrl]);

  return (
    <div
      className={
        bare
          ? // 裸模式：只保留定位与裁切上下文，外壳交给父容器，避免双层边框
            `relative overflow-hidden ${className}`
          : `relative overflow-hidden bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-5 ${className}`
      }
    >
      {/*
        顶部品牌色装饰光晕
        纯视觉效果，用天依蓝的径向渐变给面板一点「呼吸感」，
        避免整块面板显得过于死板。pointer-events-none 确保不拦截点击。

        裸模式下跳过：该光晕依赖本组件根节点的 overflow-hidden 裁切，
        而裸模式把外壳（含裁切）交给了父容器，若继续渲染就会溢出到合并卡之外，
        在卡片右上角留下一块突兀的蓝色色块。
      */}
      {!bare && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl"
        />
      )}

      {/* 面板标题：裸模式下由父容器的统一小标题承担，此处跳过 */}
      {!bare && (
        <div className="relative flex items-center gap-2 mb-4">
          <ShareSvg className="h-4 w-4 text-primary/70" />
          <span className="text-sm font-medium text-foreground">分享这篇文章</span>
        </div>
      )}

      {/* 渠道按钮区：移动端自动换行 */}
      <div className="relative flex flex-wrap items-center gap-2">
        {/* 复制链接：主操作，成功后图标切换为对勾 */}
        <motion.button
          type="button"
          onClick={handleCopyLink}
          whileTap={{ scale: 0.97 }}
          className={`${BUTTON_BASE} ${
            isCopied
              ? 'border-green-500/40 bg-green-500/10 text-green-600 dark:text-green-400'
              : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary'
          }`}
          aria-label={isCopied ? '链接已复制' : '复制文章链接'}
        >
          {/*
            图标本身跟随按钮状态换色：
            去掉图标底座后，颜色层级由「底座着色」变为「图标着色」，
            但状态判断仍与按钮容器共用同一套条件，避免边框变绿而图标依旧灰的情况。
          */}
          {isCopied ? (
            <CheckSvg className={ICON_SIZE} />
          ) : (
            <LinkSvg className={`${ICON_SIZE} ${ICON_HOVER_BASE}`} />
          )}
        </motion.button>

        {/* 社交平台跳转按钮：图标采用各平台官方品牌轮廓 */}
        {SHARE_CHANNELS.map((channel) => (
          <motion.button
            key={channel.key}
            type="button"
            onClick={() => handleShare(channel.buildUrl)}
            whileTap={{ scale: 0.97 }}
            className={`${BUTTON_BASE} border-border/50 ${ICON_IDLE} ${channel.buttonClass}`}
            aria-label={`分享到${channel.label}`}
          >
            {/*
              图标使用 24×24 的 viewBox 与 currentColor 填充：
              - viewBox 一致 → 各平台图标视觉重量相当，不会有的显大有的显小
              - currentColor → 颜色完全交由父级文字色控制，无需在 SVG 内写死色值，
                这样悬停变色、暗色模式适配都能自动生效
              fillRule/clipRule 取 evenodd 是为了正确处理品牌标志中的镂空区域
              aria-hidden 标记为装饰性元素，可访问性由按钮的 aria-label 承担
            */}
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              fillRule="evenodd"
              clipRule="evenodd"
              className={`${ICON_SIZE} ${ICON_HOVER_BASE} ${channel.iconClass}`}
              aria-hidden="true"
            >
              <path d={channel.iconPath} />
            </svg>
          </motion.button>
        ))}

        {/* 二维码：点击后在同区域内展开，不额外弹窗，避免遮挡正文 */}
        <motion.button
          type="button"
          onClick={() => setShowQrcode((prev) => !prev)}
          whileTap={{ scale: 0.97 }}
          className={`${BUTTON_BASE} ${
            showQrcode
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary'
          }`}
          aria-label={showQrcode ? '收起二维码' : '显示二维码'}
          aria-expanded={showQrcode}
        >
          <QrCodeSvg className={`${ICON_SIZE} ${ICON_HOVER_BASE}`} />
        </motion.button>

        {/*
          系统原生分享按钮
          仅在浏览器支持 navigator.share 时渲染。
          桌面端 Chrome/Firefox 多数不支持该 API，此时直接隐藏按钮，
          避免出现「点击无反应」的无效交互。
        */}
        {canNativeShare && (
          <motion.button
            type="button"
            onClick={handleNativeShare}
            whileTap={{ scale: 0.97 }}
            className={`${BUTTON_BASE} border-border/50 text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary`}
            aria-label="使用系统分享"
          >
            <ShareSvg className={`${ICON_SIZE} ${ICON_HOVER_BASE}`} />
          </motion.button>
        )}
      </div>

      {/* 二维码展开区 */}
      <AnimatePresence initial={false}>
        {showQrcode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-border/30 flex flex-col items-center gap-3">
              {/*
                二维码配色说明：
                固定使用白底黑码而非主题色。二维码识别的容错率对对比度要求较高，
                暗色模式下若跟随主题反色，部分扫码器会出现识别困难，
                因此这里始终渲染为标准的深色码点 + 白色背景。

                外层再加一圈圆角描边与阴影，让白块从深色卡片上「浮」起来，
                否则暗色模式下会像贴了一块突兀的白纸。
              */}
              <div className="relative rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-transparent p-[1.5px] shadow-lg shadow-primary/5">
                <div className="rounded-[14px] bg-white p-3">
                  <Suspense
                    fallback={
                      <div className="w-[140px] h-[140px] flex items-center justify-center text-xs text-gray-400">
                        生成中...
                      </div>
                    }
                  >
                    <QRCodeSVG
                      value={articleUrl}
                      size={140}
                      level="M"
                      marginSize={0}
                      title={`扫码阅读：${title}`}
                    />
                  </Suspense>
                </div>
              </div>

              {/* 提示文案：加一个扫码图标，比纯文字更像「引导」而非「说明」 */}
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ScanSvg className="h-3.5 w-3.5 text-primary/60" />
                扫码在手机上继续阅读
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
