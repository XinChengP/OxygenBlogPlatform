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
import SearchDialog from "@/components/SearchDialog";
import { enableBackground, backgroundImage } from "@/setting/WebSetting";
import { getAssetPath } from "@/utils/assetUtils";

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
   */
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },

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
        <link rel="preconnect" href="https://giscus.app" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.github.com" crossOrigin="anonymous" />
        {/*
          注：原 Google Fonts 手写字体（Ma Shan Zheng）加载链路已整体移除——
          字体在其目标网络环境下无法从 fonts.gstatic.com 下载（92 个分片 0 成功），
          全站也从未有 CSS 规则引用它，属于纯无效请求。
        */}

        {/* DNS预解析 - 加速第三方资源加载 */}
        <link rel="dns-prefetch" href="https://giscus.app" />

        {/* RSS订阅自动发现 - 让浏览器和RSS阅读器能够发现博客订阅 */}
        <link rel="alternate" type="application/rss+xml" title="歆橙的博客 RSS" href={`${BASE_URL}/rss.xml`} />

        {/* 背景图片预加载
            BackgroundLayer 会在客户端挂载后才设置背景图 URL，若不在此预加载，
            背景要等 JS 水合后才开始下载，拖慢全站最大内容元素（LCP）。
            仅在背景功能开启且配置了图片时输出，避免无效请求。 */}
        {enableBackground && backgroundImage && (
          <link rel="preload" as="image" href={getAssetPath(`/${backgroundImage}`)} />
        )}



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
            - smooth-navigation.js 通过Script组件加载，不需要预加载
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

            必须内联执行：若把这段兜底逻辑也打成独立分块，它自身会先因分块加载失败而失效。 */}
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

        {/* 主题初始化脚本 - 外部文件减少 HTML 体积（须同步执行以避免主题闪烁） */}
        <script src="/js/theme-init.js" />

        {/* 动态标题脚本 - 非关键功能，defer 延迟执行不阻塞解析 */}
        <script src="/js/dynamic-title.js" defer />
      </head>
      <body
        className="antialiased text-foreground transition-colors duration-300"
        style={{
          colorScheme: 'light dark',
        }}
        suppressHydrationWarning
      >
        {/* 平滑导航脚本 - 使用普通script标签 */}
        <script src="/js/smooth-navigation.js" defer />
        {/* 安全保护提供者 - 提供CSP、防劫持、完整性检测等安全功能 */}
        <SecurityProvider
          enableCSP={true}
          enableHijackingProtection={true}
          enableIntegrityCheck={true}
        >
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange={false}
            storageKey="theme"
          >
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
                {/* 站内搜索弹窗 - Ctrl+K 或导航栏按钮唤起 */}
                <SearchDialog />
              </SmoothScrollProvider>
            </NavigationVisibilityProvider>
          </ThemeProvider>
        </SecurityProvider>
        {/* 51la 网站统计 - 用于追踪访客数据 */}
        <Analytics />
        {/* Live2D 看板娘 - 放在 layout 中保持跨页面挂载 */}
        <Live2DDynamicLoader />
        {/* 音乐播放器 - 放在 layout 中保持跨页面挂载 */}
        <MusicPlayerController />
      </body>
    </html>
  );
}
