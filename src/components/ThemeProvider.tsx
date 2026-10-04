'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';

/**
 * 主题控制器组件
 * 界面配色完全由 globals.css 的 :root/.dark CSS 令牌承载，
 * 这里不做任何运行时颜色重算（原 applyThemeColors 已删除，
 * 其亮度系数会偏离手调色板，且部分变量在 Tailwind v4 下不生效）。
 * 职责：主题切换时的平滑过渡 + 系统主题变化监听。
 */
function ThemeController() {
  const { resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 手动切换主题时临时挂载过渡类，让颜色平滑渐变
  // （配色本身由 .dark 类切换 CSS 令牌自动生效，这里只负责过渡动画）
  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.add('theme-transitioning');
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 500);
    return () => {
      clearTimeout(timer);
      document.documentElement.classList.remove('theme-transitioning');
    };
  }, [resolvedTheme, mounted]);

  // 监听系统主题变化（当设置为跟随系统时）
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleSystemThemeChange = () => {
      document.documentElement.classList.add('theme-transitioning');
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 500);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme, mounted]);

  return null;
}

/**
 * 主题提供者组件
 *
 * 功能特性：
 * 1. 为应用提供主题切换功能
 * 2. 自动应用主题色
 * 3. 支持系统主题自动同步
 * 4. 平滑过渡动画
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeController />
      {children}
    </NextThemesProvider>
  );
}

export default ThemeProvider;
