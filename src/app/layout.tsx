import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BackgroundLayer from "@/components/BackgroundLayer";
import ConditionalComponents from "@/components/ConditionalComponents";
import { ThemeProvider } from "@/components/ThemeProvider";
import SmoothScrollProvider from "@/components/SmoothScrollProvider";
import ClientRouterWrapper from "@/components/ClientRouterWrapper";
import { NavigationVisibilityProvider } from "@/contexts/NavigationVisibilityContext";
import Analytics from "@/components/Analytics";

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
    default: "\u5fc3\u60f3\u4e8b\u6210 \u7684 Blog - \u6d1b\u5929\u4f9d\u4e3b\u9898\u4e2a\u4eba\u535a\u5ba2",
    template: "%s | \u5fc3\u60f3\u4e8b\u6210 \u7684 Blog",
  },
  
  /**
   * 页面描述
   * 用于搜索引擎结果页展示，建议150字以内
   */
  description: "\u5fc3\u60f3\u4e8b\u6210\u7684\u4e2a\u4eba\u535a\u5ba2\uff0c\u4ee5\u6d1b\u5929\u4f9d\u4e3a\u4e3b\u9898\uff0c\u5206\u4eab\u6280\u672f\u5b66\u4e60\u3001\u751f\u6d3b\u611f\u609f\u3001\u97f3\u4e50\u7b80\u8c31\u7b49\u5185\u5bb9\u3002\u4f7f\u7528 Next.js \u548c Tailwind CSS \u6784\u5efa\uff0c\u652f\u6301\u6df1\u8272\u6a21\u5f0f\u3001\u54cd\u5e94\u5f0f\u8bbe\u8ba1\u3002",
  
  /**
   * 关键词
   * 帮助搜索引擎理解网站内容主题
   */
  keywords: [
    "\u5fc3\u60f3\u4e8b\u6210",
    "\u6d1b\u5929\u4f9d",
    "\u4e2a\u4eba\u535a\u5ba2",
    "\u6280\u672f\u535a\u5ba2",
    "Next.js",
    "React",
    "\u7b80\u8c31",
    "VOCALOID",
    "\u751f\u6d3b\u8bb0\u5f55",
    "\u524d\u7aef\u5f00\u53d1",
  ],
  
  /**
   * 作者信息
   */
  authors: [
    { name: "\u5fc3\u60f3\u4e8b\u6210", url: BASE_URL },
  ],
  
  /**
   * 创建者信息
   */
  creator: "\u5fc3\u60f3\u4e8b\u6210",
  
  /**
   * 发布者信息
   */
  publisher: "\u5fc3\u60f3\u4e8b\u6210",
  
  /**
   * 网站图标配置
   */
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  
  /**
   * 规范URL配置
   * 防止重复内容问题，告诉搜索引擎哪个是首选URL
   */
  alternates: {
    canonical: BASE_URL,
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
    siteName: "\u5fc3\u60f3\u4e8b\u6210 \u7684 Blog",
    title: "\u5fc3\u60f3\u4e8b\u6210 \u7684 Blog - \u6d1b\u5929\u4f9d\u4e3b\u9898\u4e2a\u4eba\u535a\u5ba2",
    description: "\u5fc3\u60f3\u4e8b\u6210\u7684\u4e2a\u4eba\u535a\u5ba2\uff0c\u4ee5\u6d1b\u5929\u4f9d\u4e3a\u4e3b\u9898\uff0c\u5206\u4eab\u6280\u672f\u5b66\u4e60\u3001\u751f\u6d3b\u611f\u609f\u3001\u97f3\u4e50\u7b80\u8c31\u7b49\u5185\u5bb9\u3002",
    images: [
      {
        url: `${BASE_URL}/LTY_Picture/og-image.png`,
        width: 1200,
        height: 630,
        alt: "\u5fc3\u60f3\u4e8b\u6210 \u7684 Blog - \u6d1b\u5929\u4f9d\u4e3b\u9898\u4e2a\u4eba\u535a\u5ba2",
      },
    ],
  },
  
  /**
   * Twitter Card 配置
   * 用于 Twitter/X 平台分享
   */
  twitter: {
    card: 'summary_large_image',
    title: "\u5fc3\u60f3\u4e8b\u6210 \u7684 Blog - \u6d1b\u5929\u4f9d\u4e3b\u9898\u4e2a\u4eba\u535a\u5ba2",
    description: "\u5fc3\u60f3\u4e8b\u6210\u7684\u4e2a\u4eba\u535a\u5ba2\uff0c\u4ee5\u6d1b\u5929\u4f9d\u4e3a\u4e3b\u9898\uff0c\u5206\u4eab\u6280\u672f\u5b66\u4e60\u3001\u751f\u6d3b\u611f\u609f\u3001\u97f3\u4e50\u7b80\u8c31\u7b49\u5185\u5bb9\u3002",
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
    // 百度站长验证（需要替换为实际验证码）
    // 获取地址：https://ziyuan.baidu.com/site/index
    // other: {
    //   'baidu-site-verification': 'your-baidu-code',
    // },
    
    // Google Search Console 验证
    // 获取地址：https://search.google.com/search-console
    google: 'XZMqWkzpBfk49Af2iDe-zp7x0Ff429Xf8gtb0teqRUM',
    
    // Bing Webmaster Tools 验证
    // 获取地址：https://www.bing.com/webmasters
    other: {
      'msvalidate.01': '7F971987BE778887C6A2E389DD7DCF48',
    },
  },
  
  /**
   * 分类和标签
   */
  category: "\u4e2a\u4eba\u535a\u5ba2",
  
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
        
        {/* 预加载关键背景图片 - 首页背景图 */}
        <link 
          rel="preload" 
          href="/LTY_Picture/光与影.png" 
          as="image" 
          type="image/png"
          fetchPriority="high"
        />
        
        {/* 预加载关键CSS - 避免渲染阻塞 */}
        <link 
          rel="preload" 
          href="/css/aplayer-theme.css" 
          as="style"
        />
        
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
                    var result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
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
            var titleLeave="\\u8bf7\\u4f60\\u7559\\u4e0b\\uff0c\\u4e0d\\u8981\\u79bb\\u5f00QAQ";
            var titleBack="\\u8fd8\\u6709\\u6211\\uff0c\\u5728\\u4f60\\u8eab\\u8fb9\\u8bf4\\u6211\\u7231\\u4f60\\u554awawa";
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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="theme"
        >
          <NavigationVisibilityProvider>
            <ClientRouterWrapper>
              <SmoothScrollProvider>
                <BackgroundLayer />
                <Navigation />
                <main className="min-h-screen transition-colors duration-300 relative">
                  {children}
                </main>
                <Footer />
                <ConditionalComponents />
              </SmoothScrollProvider>
            </ClientRouterWrapper>
          </NavigationVisibilityProvider>
        </ThemeProvider>
        {/* 51la 网站统计 - 用于追踪访客数据 */}
        <Analytics />
      </body>
    </html>
  );
}