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
import Live2DDynamicLoader from "@/components/Live2DDynamicLoader";
import MusicPlayerController from "@/components/MusicPlayerController";

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
   * 规范URL配置和替代格式
   * 防止重复内容问题，告诉搜索引擎哪个是首选URL
   * 同时提供RSS订阅地址
   */
  alternates: {
    canonical: BASE_URL,
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
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://giscus.app" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.github.com" crossOrigin="anonymous" />

        {/* DNS预解析 - 加速第三方资源加载 */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://giscus.app" />

        {/* RSS订阅自动发现 - 让浏览器和RSS阅读器能够发现博客订阅 */}
        <link rel="alternate" type="application/rss+xml" title="歆橙的博客 RSS" href={`${BASE_URL}/rss.xml`} />

        {/* 注意：背景图片由 BackgroundLayer 组件动态加载，不预加载以避免浏览器警告
            BackgroundLayer 会在客户端挂载后根据主题设置加载图片，预加载可能导致资源浪费
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
            - smooth-navigation.js 通过Script组件加载，不需要预加载
        */}

        {/* 主题初始化脚本 */}
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

                  // 立即应用blue主题色，避免闪烁
                  var isDark = resolvedTheme === 'dark';
                  var root = document.documentElement;

                  // blue主题配置
                  var themeColors = {
                    primary: "#66ccff",
                    secondary: "#1e40af", 
                    accent: "#06b6d4"
                  };

                  // 十六进制转RGB
                  function hexToRgb(hex) {
                    // 使用正则匹配十六进制颜色值，\d 表示数字，[a-f] 表示小写十六进制字母
                    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                    return result ? {
                      r: parseInt(result[1], 16),
                      g: parseInt(result[2], 16),
                      b: parseInt(result[3], 16)
                    } : { r: 0, g: 0, b: 0 };
                  }

                  // 调整亮度
                  function adjustBrightness(hex, factor) {
                    var rgb = hexToRgb(hex);
                    var adjust = function(value) {
                      return Math.max(0, Math.min(255, Math.round(value * factor)));
                    };

                    var newR = adjust(rgb.r).toString(16);
                    var newG = adjust(rgb.g).toString(16);
                    var newB = adjust(rgb.b).toString(16);

                    // 确保十六进制字符串长度为2
                    newR = newR.length === 1 ? '0' + newR : newR;
                    newG = newG.length === 1 ? '0' + newG : newG;
                    newB = newB.length === 1 ? '0' + newB : newB;

                    return '#' + newR + newG + newB;
                  }

                  // 根据模式调整颜色
                  var primaryColor = isDark
                    ? adjustBrightness(themeColors.primary, 1.3)
                    : adjustBrightness(themeColors.primary, 0.8);
                  var accentColor = isDark
                    ? adjustBrightness(themeColors.accent, 1.2)
                    : adjustBrightness(themeColors.accent, 0.9);
                  var secondaryColor = isDark
                    ? adjustBrightness(themeColors.secondary, 1.4)
                    : themeColors.secondary;

                  // 设置 CSS 变量
                  root.style.setProperty('--theme-primary', primaryColor);
                  root.style.setProperty('--theme-accent', accentColor);
                  root.style.setProperty('--theme-secondary', secondaryColor);
                  root.style.setProperty('--primary', primaryColor);
                  root.style.setProperty('--primary-foreground', isDark ? '#0f0f0f' : '#ffffff');
                  root.style.setProperty('--accent', accentColor);
                  root.style.setProperty('--accent-foreground', isDark ? '#0f0f0f' : '#ffffff');
                  root.style.setProperty('--secondary', secondaryColor);
                  root.style.setProperty('--secondary-foreground', isDark ? '#f0f0f0' : '#1f1f1f');

                  // 设置初始化标记
                  root.style.setProperty('--theme-initialized', '1');
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* 注意：Script组件不能在head中使用，已移动到body中 */}

        {/* 动态标题脚本 - 使用普通script标签 */}
        <script dangerouslySetInnerHTML={{__html:`
          (function(){
            var OriginTitile=document.title,titleTime;
            // 使用单引号包裹字符串，避免转义问题
            var titleLeave='请你留下，不要离开QAQ';
            var titleBack='还有我，在你身边说我爱你啊awa';
            document.addEventListener("visibilitychange",function(){
              if(document.hidden){
                document.title=titleLeave;
                clearTimeout(titleTime);
              }else{
                document.title=titleBack;
                titleTime=setTimeout(function(){document.title=OriginTitile},2000);
              }
            });
          })();
        `}} />
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
