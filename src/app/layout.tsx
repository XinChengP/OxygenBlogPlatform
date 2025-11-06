import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import BackgroundLayer from "@/components/BackgroundLayer";
import { ThemeProvider } from "@/components/ThemeProvider";
import { webTitle, webDescription } from "@/setting/WebSetting";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: webTitle,
  description: webDescription,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
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
                  
                  // 立即应用purple主题色，避免闪烁
                  var isDark = resolvedTheme === 'dark';
                  var root = document.documentElement;
                  
                  // purple主题配置
                  var themeColors = {
                    primary: "#8b5cf6",
                    secondary: "#7c3aed", 
                    accent: "#a855f7"
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
                    
                    var newR = adjust(rgb.r).toString(16).padStart(2, '0');
                    var newG = adjust(rgb.g).toString(16).padStart(2, '0');
                    var newB = adjust(rgb.b).toString(16).padStart(2, '0');
                    
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
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-foreground transition-colors duration-300`}
        style={{
          colorScheme: 'light dark',
          backgroundColor: 'hsl(var(--background))',
        }}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange={false}
          storageKey="theme"
        >
          <BackgroundLayer />
          <Navigation />
          <main className="min-h-screen transition-colors duration-300 relative">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}

import MusicPlayer from '@/components/MusicPlayer';

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <MusicPlayer /> {/* 添加音乐播放器 */}
      </body>
    </html>
  );
}
