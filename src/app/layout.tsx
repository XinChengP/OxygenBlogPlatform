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

// 使用Unicode转义序列避免服务端渲染时的编码问题
// "心想事成 的 Blog" -> \\u5fc3\\u60f3\\u4e8b\\u6210 \\u7684 Blog
// "个人博客" -> \\u4e2a\\u4eba\\u535a\\u5ba2
export const metadata: Metadata = {
  title: "\u5fc3\u60f3\u4e8b\u6210 \u7684 Blog",
  description: "\u4e2a\u4eba\u535a\u5ba2",
  icons: {
    icon: '/favicon.ico',
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