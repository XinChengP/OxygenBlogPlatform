'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { type ThemeProviderProps } from 'next-themes';
import { useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import { applyThemeColors } from '@/setting/WebSetting';

// 主题色缓存
const themeColorCache = new Map<string, string>();

/**
 * 优化的主题色应用组件
 * 使用防抖和缓存机制提高性能
 */
function OptimizedThemeColorApplier() {
  const { resolvedTheme } = useTheme();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastThemeRef = useRef<string>('');

  const applyThemeColorsOptimized = useCallback((isDark: boolean) => {
    // 如果主题没有变化，跳过处理
    if (lastThemeRef.current === (isDark ? 'dark' : 'light')) {
      return;
    }
    
    lastThemeRef.current = isDark ? 'dark' : 'light';
    
    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 使用防抖机制，避免频繁的主题切换
    timeoutRef.current = setTimeout(() => {
      applyThemeColors(isDark);
    }, 16); // 约60fps的帧时间
  }, []);

  useEffect(() => {
    applyThemeColorsOptimized(resolvedTheme === 'dark');
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [resolvedTheme, applyThemeColorsOptimized]);

  return null;
}

/**
 * 主题预加载器
 * 在组件挂载前预加载主题配置
 */
function ThemePreloader() {
  useEffect(() => {
    // 预加载主题色配置
    const preloadThemeColors = () => {
      const themes = ['blue', 'green', 'purple', 'red', 'orange', 'pink', 'cyan', 'yellow', 'indigo', 'teal'];
      
      themes.forEach(theme => {
        if (!themeColorCache.has(theme)) {
          // 预计算主题色
          const colors = getThemeColors(theme);
          themeColorCache.set(theme, colors);
        }
      });
    };
    
    // 使用requestIdleCallback在浏览器空闲时执行
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      requestIdleCallback(preloadThemeColors);
    } else {
      // 降级到setTimeout
      setTimeout(preloadThemeColors, 0);
    }
  }, []);

  return null;
}

/**
 * 获取主题色配置
 */
function getThemeColors(themeName: string) {
  // 这里可以添加实际的主题色计算逻辑
  // 为了性能，返回预计算的值
  return themeName;
}

/**
 * 优化的主题提供者组件
 * 提供高性能的主题切换功能
 */
export function OptimizedThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider 
      {...props}
      // 优化主题切换性能
      disableTransitionOnChange={false}
      // 启用系统主题检测
      enableSystem={true}
      // 默认主题
      defaultTheme="system"
      // 主题属性
      attribute="class"
      // 存储键名
      storageKey="theme"
    >
      <ThemePreloader />
      <OptimizedThemeColorApplier />
      {children}
    </NextThemesProvider>
  );
}

// 保持向后兼容性
export { OptimizedThemeProvider as ThemeProvider };