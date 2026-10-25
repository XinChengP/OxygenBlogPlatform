import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BackgroundLayer from "@/components/BackgroundLayer";
import ConditionalComponents from "@/components/ConditionalComponents";
import { ThemeProvider } from "@/components/ThemeProvider";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";

import { NavigationVisibilityProvider } from "@/contexts/NavigationVisibilityContext";
import Analytics from "@/components/Analytics";
import SecurityProvider from "@/components/security/SecurityProvider";
import ExternalLinkGuard from "@/components/security/ExternalLinkGuard";
import Live2DDynamicLoader from "@/components/Live2DDynamicLoader";
import MusicPlayerController from "@/components/MusicPlayerController";
import LazySearchDialog from "@/components/LazySearchDialog";
import ServiceWorkerRegistrar from "@/components/ServiceWorkerRegistrar";
import { getAssetPath } from "@/utils/assetUtils";
import { generateCSPString, productionCSP, developmentCSP } from "@/utils/cspConfig";

/**
 * 站点基础URL配置
 * 根据部署环境自动选择正确的域名
 */
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blog.xinchengp.cn';

/**
 * 全局元数据配置
 *
 * 优化目标：
 * 1. 提升搜索引擎收录率
 * 2. 优化社交媒体分享效果
 * 3. 提供完整的站点信息
 *
 * 支持的搜索引擎：
 * - 百度搜索
 * - Google搜索
 * - 必应搜索
 * - 搜狗搜索
 * - 360搜索
 */
export const metadata: Metadata = {
  /**
   * 页面标题模板
   * %s 会被替换为具体页面的标题
   */
  title: {
    default: "心想事成的个人博客 | 记录技术与生活",
    template: "%s | 心想事成的个人博客",
  },

  /**
   * 页面描述
   * 用于搜索引擎结果页展示，建议150字以内
   */
  description: "心想事成的个人博客，记录前端开发技术、VOCALOID相关内容、生活感悟与学习笔记。（反正就是日常发癫）",

  /**
   * 关键词
   * 帮助搜索引擎理解网站内容主题
   */
  keywords: [
    "心想事成",
    "洛天依",
    "个人博客",
    "技术博客",
    "Next.js",
    "React",
    "前端开发",
    "VOCALOID",
    "锦依卫",
    "生活记录",
  ],

  /**
   * 作者信息
   */
  authors: [
    { name: "心想事成", url: BASE_URL },
  ],

  /**
   * 创建者信息
   */
  creator: "心想事成",

  /**
   * 发布者信息
   */
  publisher: "心想事成",

  /**
   * 网站图标配置
   *
   * PNG 图标由 scripts/generate-pwa-icons.mjs 从站点头像生成，
   * 与 public/manifest.webmanifest 的 icons 保持一致（PWA 安装用）。
   */
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },

  /**
   * PWA manifest：配合 public/sw.js 的离线缓存，站内页面可安装到桌面/主屏幕
   */
  manifest: '/manifest.webmanifest',

  /**
   * 替代格式配置
   *
   * 注意：这里刻意不设置 alternates.canonical。
   * 根布局的 metadata 会被所有子页面继承，若在此处写死 canonical，
   * 每篇导出的文章/列表页都会输出「指向首页」的 canonical，
   * 等于告诉搜索引擎全站都是首页的重复内容，可能导致收录被合并。
   * 各页面的规范地址由各自页面级 metadata 声明
   * （如博客详情页在 generateMetadata 中输出自身 URL）。
   */
  alternates: {
    types: {
      'application/rss+xml': `${BASE_URL}/rss.xml`,
    },
  },

  /**
   * 机器人爬虫配置
   * 控制搜索引擎如何抓取和索引网站
   */
  robots: {
    index: true,          // 允许索引
    follow: true,         // 允许跟随链接
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  /**
   * Open Graph 配置
   * 用于社交媒体分享（微信、Facebook、LinkedIn等）
   */
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: BASE_URL,
    siteName: "心想事成的个人博客",
    title: "心想事成的个人博客 | 记录技术与生活",
    description: "心想事成的个人博客，以洛天依为主题，记录前端开发技术、VOCALOID相关内容、生活感悟与学习笔记。",
    images: [
      {
        url: `${BASE_URL}/LTY_Picture/og-image.png`,
        width: 1200,
        height: 630,
        alt: "心想事成的个人博客",
      },
    ],
  },

  /**
   * Twitter Card 配置
   * 用于 Twitter/X 平台分享
   */
  twitter: {
    card: 'summary_large_image',
    title: "心想事成的个人博客 | 记录技术与生活",
    description: "心想事成的个人博客，以洛天依为主题，记录前端开发技术、VOCALOID相关内容、生活感悟与学习笔记。",
    images: [`${BASE_URL}/LTY_Picture/og-image.png`],
    creator: "@xinchengp",
  },

  /**
   * 搜索引擎验证配置
   * 用于百度、Google等搜索引擎的网站验证
   *
   * 使用方法：
   * 1. 在百度站长平台获取验证代码，替换 baidu-site-verification 的值
   * 2. 在 Google Search Console 获取验证代码，替换 google-site-verification 的值
   * 3. 在 Bing Webmaster Tools 获取验证代码，替换 msvalidate.01 的值
   */
  verification: {
    // Google Search Console 验证
    // 获取地址：https://search.google.com/search-console
    google: 'XZMqWkzpBfk49Af2iDe-zp7x0Ff429Xf8gtb0teqRUM',

    // 百度站长验证 + Bing Webmaster Tools 验证
    // 百度获取地址：https://ziyuan.baidu.com/site/index
    // Bing 获取地址：https://www.bing.com/webmasters
    other: {
      'baidu-site-verification': 'codeva-uVAjEluW1M',
      'msvalidate.01': '7F971987BE778887C6A2E389DD7DCF48',
    },
  },

  /**
   * 分类和标签
   */
  category: "个人博客",

  /**
   * 其他元数据
   */
  other: {
    // 百度站长平台自动推送（可选）
    // 'baidu-site-verification': 'your-code',

    // 360站长平台验证（可选）
    // '360-site-verification': 'your-code',

    // 搜狗站长平台验证（可选）
    // 'sogou_site_verification': 'your-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* ============================================
            关键资源预加载 - 性能优化
            ============================================ */}

        {/* 预连接到关键域名 - 提前建立连接减少延迟 */}
        {/*
          Twikoo 评论后端（Cloudflare Workers）。
          地址是构建期注入的环境变量，未配置时不输出该标签，避免发出无效请求。
          用 crossOrigin="anonymous" 而非带凭据的预连接：Twikoo 的登录态通过请求体里的
          accessToken 传递、不使用 Cookie，对应的 XHR 属于匿名 CORS 请求，
          只有落在同一个连接池里预连接才真正省下握手时间。
        */}
        {/*
          静态导出的 HTML 中没有 HTTP 响应头，CSP 必须在构建期写入 meta，
          否则要等 JS 水合后才由 SecurityProvider 注入，期间页面没有策略保护。

          这里必须按环境选择策略：
          - 生产环境用 productionCSP（严格，已移除 unsafe-eval）；
          - 开发环境用 developmentCSP（额外放行 unsafe-eval）。
          若开发环境也写入 productionCSP，会与 next.config.ts 下发的开发服务器响应头
          取交集，把 dev 必需的 eval 能力裁掉，导致 React 调试功能直接报
          “eval() is not supported in this environment”（错误发生在水合之前，
          SecurityProvider 的事后覆盖来不及生效）。
        */}
        <meta
          httpEquiv="Content-Security-Policy"
          content={generateCSPString(
            process.env.NODE_ENV === 'development' ? developmentCSP : productionCSP
          )}
        />

        {/*
          第三方资源连接提示按页面下发，不在全局 head 挂载：
          原先每个页面都会对 twikoo / api.github.com / img.xinchengp.cn
          提前建连（DNS + TLS 握手），即使页面根本不用它们。
          现在由实际用到的页面通过 src/components/RouteResourceHints.tsx 按需输出。
        */}
        {/*
          注：原 Google Fonts 手写字体（Ma Shan Zheng）加载链路已整体移除——
          字体在其目标网络环境下无法从 fonts.gstatic.com 下载（92 个分片 0 成功），
          全站也从未有 CSS 规则引用它，属于纯无效请求。
        */}

        {/* RSS订阅自动发现 - 让浏览器和RSS阅读器能够发现博客订阅 */}
        <link rel="alternate" type="application/rss+xml" title="歆橙的博客 RSS" href={`${BASE_URL}/rss.xml`} />

        {/*
          背景图 preload 不再手动输出：
          - React 19 会依据 <img fetchPriority="high" srcSet> 自动提升探测并下发 preload，
            原先这里的手写 link 与之重复（首页 HTML 中出现了两条相同 preload）；
          - 非首页由 BackgroundLayer 把 fetchPriority 降为 low，不与文章首图/标题抢带宽。
        */}

        {/* 字体预加载 - 使用font-display: swap避免FOIT */}
        <style dangerouslySetInnerHTML={{__html:`
          /* 系统字体栈 - 确保快速渲染 */
          @font-face {
            font-family: 'System UI';
            src: local('-apple-system'), local('BlinkMacSystemFont'), local('Segoe UI'), local('Roboto');
            font-display: swap;
          }

          /* 关键CSS内联 - 避免额外请求 */
          :root {
            --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            --font-mono: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
          }
        `}} />

        {/* 注意：移除不必要的预加载以避免浏览器警告
            - favicon.ico 不需要预加载，浏览器会自动请求
            - 滚动位置管理统一由 SmoothScrollProvider/scrollManager 负责，
              不再额外加载 public/js/smooth-navigation.js
        */}

        {/* 分块（chunk）加载失败自动恢复脚本

            背景：本站为静态导出（output: export），HTML 中引用的 JS 分块文件名带内容哈希。
            每次重新部署都会生成一批新的哈希文件名并删除旧的，若访客仍停留在部署前的
            旧页面（浏览器缓存的 HTML 或已打开的标签页），后续跳转就会请求已被删除的旧分块，
            webpack 抛出 ChunkLoadError，页面只能落到错误兜底页上。

            处理：捕获 ChunkLoadError（包括同步 error 与 promise rejection 两种形态）后
            自动刷新页面；刷新会重新拉取最新 HTML 与当前真实存在的分块，从而自愈。
            为防止分块真的缺失时陷入无限刷新，同一会话内最多自动刷新 2 次，
            并且只有在上次刷新距今 60 秒内才继续计数（超时则重新计数）。

            必须内联执行：若把这段兜底逻辑也打成独立分块，它自身会先因分块加载失败而失效。

            注：开发环境 React 19 会打印 "Encountered a script tag while rendering
            React component"，这是内联 <script> 的已知提示，生产构建不输出。
            不要改用 next/script：它的 beforeInteractive 只是把脚本推进 __next_s 队列，
            由 app-bootstrap 分块（next/dist/client/app-bootstrap.js）按序执行，
            也就是要等主包加载成功才生效——恰好在本脚本要兜底的场景里完全失效。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                // 会话级重试状态键与阈值
                var KEY = '__chunkLoadRetry__';
                var MAX_RETRY = 2;        // 同一窗口内最多自动刷新次数
                var WINDOW_MS = 60000;    // 计数窗口（毫秒）

                // 判断错误信息是否属于分块加载失败
                function isChunkLoadError(message) {
                  if (!message) return false;
                  return /ChunkLoadError/i.test(message) ||
                    /Loading (CSS )?chunk .* failed/i.test(message);
                }

                // 触发一次自动刷新（带次数限制，避免无限刷新）
                function recover() {
                  var state = null;
                  try {
                    state = JSON.parse(sessionStorage.getItem(KEY) || 'null');
                  } catch (e) {
                    state = null;
                  }
                  var now = Date.now();
                  // 状态缺失、结构异常或已超出计数窗口时，重新开始计数
                  if (!state || typeof state.count !== 'number' || now - state.ts > WINDOW_MS) {
                    state = { count: 0, ts: now };
                  }
                  if (state.count >= MAX_RETRY) return;
                  state.count += 1;
                  state.ts = now;
                  try {
                    sessionStorage.setItem(KEY, JSON.stringify(state));
                  } catch (e) {
                    // 隐私模式下 sessionStorage 可能不可写，忽略即可
                  }
                  location.reload();
                }

                // 同步抛出：webpack 加载分块失败会以 error 事件冒泡到 window
                window.addEventListener('error', function (event) {
                  var message = (event && (event.message || (event.error && event.error.message))) || '';
                  if (isChunkLoadError(message)) recover();
                });

                // 异步抛出：React.lazy / next/dynamic 的加载失败表现为未处理的 promise rejection
                window.addEventListener('unhandledrejection', function (event) {
                  var reason = event && event.reason;
                  var message = reason ? (reason.message || String(reason)) : '';
                  if (isChunkLoadError(message)) recover();
                });
              })();
            `,
          }}
        />

        {/*
          主题初始化脚本 - 内联执行以避免主题闪烁。

          原实现是外链 /js/theme-init.js：它是全 head 唯一的同步外链脚本，
          任何页面首帧渲染都要先等一次完整 RTT 才能继续解析，
          高延迟网络下把整个页面的首屏时间直接后移一个 RTT。
          脚本本体只有约 700 字节，内联的成本远小于一次 RTT。
          内容必须与 public/js/theme-init.js 保持一致（两者同步修改）。
          同样必须内联：改成 next/script 会推迟到主包加载后才执行，首屏就会闪一下主题。
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme') || 'system';
                  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  var resolvedTheme = theme === 'system' ? systemTheme : theme;
                  if (resolvedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />

        {/* 动态标题脚本 - 非关键功能，defer 延迟执行不阻塞解析 */}
        <script src={getAssetPath('/js/dynamic-title.js')} defer />
      </head>
      <body
        className="antialiased text-foreground transition-colors duration-300"
        style={{
          colorScheme: 'light dark',
        }}
        suppressHydrationWarning
      >
        {/* 安全保护提供者 - 提供 CSP、防劫持与网络请求检查。
            完整性检测脚本默认关闭：5 秒定时 + 全文档 MutationObserver 的常驻开销
            对静态博客收益有限；需要时把 enableIntegrityCheck 改为 true。 */}
        <SecurityProvider
          enableCSP={true}
          enableHijackingProtection={true}
          enableIntegrityCheck={false}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange={false}
            storageKey="theme"
          >
            {/*
              不再用 MotionConfig 包整个应用：它会静态引入 framer-motion，
              把 41KB(gzip) 的动画库塞进每一页的首载包。
              减少动态效果统一交给 globals.css 的 prefers-reduced-motion 规则；
              仍需 JS 动画的页面（首页、about 等）各自按路由加载 framer-motion。
            */}
            <NavigationVisibilityProvider>
              <SmoothScrollProvider>
                <BackgroundLayer />
                <Navigation />
                <main className="min-h-screen transition-colors duration-300 relative">
                  {children}
                </main>
                <Footer />
                <ConditionalComponents />
                {/* 外部链接跳转提醒 - 拦截全站外链点击并弹出安全提示 */}
                <ExternalLinkGuard />
                {/* 站内搜索弹窗 - Ctrl+K 或导航栏按钮唤起（首次唤起时才加载代码） */}
                <LazySearchDialog />
              </SmoothScrollProvider>
            </NavigationVisibilityProvider>
          </ThemeProvider>
        </SecurityProvider>
        {/* 51la 网站统计 - 用于追踪访客数据 */}
        <Analytics />
        {/* Service Worker 注册（仅生产环境启用，开发模式不生效） */}
        <ServiceWorkerRegistrar />
        {/* Live2D 看板娘 - 放在 layout 中保持跨页面挂载 */}
        <Live2DDynamicLoader />
        {/* 音乐播放器 - 放在 layout 中保持跨页面挂载 */}
        <MusicPlayerController />
      </body>
    </html>
  );
}
