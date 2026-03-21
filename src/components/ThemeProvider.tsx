'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { applyThemeColors } from '@/setting/WebSetting';

/**
 * 主题色应用组件
 * 监听主题变化并应用相应的主题色
 * 同时处理系统主题变化的平滑过渡
 */
function ThemeColorApplier() {
  const { resolvedTheme, theme, systemTheme } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);

  /**
   * 应用主题色并添加过渡效果
   */
  const applyThemeWithTransition = useCallback((isDark: boolean) => {
    // 开始过渡
    setIsTransitioning(true);
    document.documentElement.classList.add('theme-transitioning');
    
    // 应用主题色
    applyThemeColors(isDark);
    
    // 结束过渡
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
      setIsTransitioning(false);
    }, 500);
  }, []);

  // 监听resolvedTheme变化并应用主题色
  useEffect(() => {
    const isDark = resolvedTheme === 'dark';
    applyThemeWithTransition(isDark);
  }, [resolvedTheme, applyThemeWithTransition]);

  // 监听系统主题变化（当设置为跟随系统时）
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemThemeChange = () => {
      console.log('[ThemeProvider] 系统主题变化，当前设置: 跟随系统');
      // 系统主题变化时，resolvedTheme会自动更新
      // 这里只需要确保过渡动画正常执行
      document.documentElement.classList.add('theme-transitioning');
      
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 500);
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  return null;
}

/**
 * 系统主题同步组件
 * 确保当系统主题变化时，UI能够正确响应
 */
function SystemThemeSync() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 监听系统主题变化
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const newSystemTheme = mediaQuery.matches ? 'dark' : 'light';
      console.log(`[SystemThemeSync] 系统主题变化为: ${newSystemTheme}`);
      
      // 添加过渡效果
      document.documentElement.classList.add('theme-transitioning');
      
      setTimeout(() => {
        document.documentElement.classList.remove('theme-transitioning');
      }, 500);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, mounted, setTheme]);

  return null;
}

/**
 * 主题提供者组件 - 增强版
 * 
 * 功能特性：
 * 1. 为应用提供主题切换功能
 * 2. 自动应用主题色
 * 3. 支持系统主题自动同步
 * 4. 平滑过渡动画
 * 
 * @param children - 子组件
 * @param props - 其他主题配置属性
 * @returns 主题提供者组件
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider {...props}>
      <ThemeColorApplier />
      <SystemThemeSync />
      {children}
    </NextThemesProvider>
  );
}

export default ThemeProvider;
