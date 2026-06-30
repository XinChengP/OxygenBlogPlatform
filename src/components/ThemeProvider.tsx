'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { applyThemeColors } from '@/setting/WebSetting';

/**
 * 主题控制器组件
 * 合并了 ThemeColorApplier 和 SystemThemeSync 的功能：
 * 1. 监听 resolvedTheme 变化并应用主题色
 * 2. 监听系统主题变化并添加过渡效果
 */
function ThemeController() {
  const { resolvedTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const applyThemeWithTransition = useCallback((isDark: boolean) => {
    document.documentElement.classList.add('theme-transitioning');
    applyThemeColors(isDark);
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
    }, 500);
  }, []);

  // 监听 resolvedTheme 变化并应用主题色
  useEffect(() => {
    if (!mounted) return;
    applyThemeWithTransition(resolvedTheme === 'dark');
  }, [resolvedTheme, applyThemeWithTransition, mounted]);

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
