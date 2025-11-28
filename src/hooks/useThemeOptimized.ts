'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { applyThemeColors } from '@/setting/WebSetting';

interface ThemeOptimizerConfig {
  enableCache?: boolean;
  enablePrefetch?: boolean;
  transitionDuration?: number;
  enableReducedMotion?: boolean;
}

/**
 * 主题优化Hook
 * 提供高性能的主题切换和颜色应用
 */
export function useThemeOptimized(config: ThemeOptimizerConfig = {}) {
  const { 
    enableCache = true, 
    enablePrefetch = true, 
    transitionDuration = 300,
    enableReducedMotion = true 
  } = config;
  
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // 主题色缓存
  const themeCache = useMemo(() => new Map<string, string>(), []);
  
  // 优化的主题应用函数
  const applyTheme = useCallback((newTheme: string) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    
    // 检查用户是否偏好减少动画
    const prefersReducedMotion = enableReducedMotion && 
      typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      // 立即应用主题（无过渡）
      setTheme(newTheme);
      applyThemeColors(newTheme === 'dark');
      setIsTransitioning(false);
    } else {
      // 使用过渡动画
      setTheme(newTheme);
      
      // 延迟应用颜色，确保过渡平滑
      setTimeout(() => {
        applyThemeColors(newTheme === 'dark');
        setIsTransitioning(false);
      }, 50);
    }
  }, [isTransitioning, setTheme, enableReducedMotion]);
  
  // 预加载主题
  const prefetchTheme = useCallback(async (themeName: string) => {
    if (!enablePrefetch) return;
    
    // 检查缓存
    if (enableCache && themeCache.has(themeName)) {
      return themeCache.get(themeName);
    }
    
    // 模拟异步主题加载
    const loadTheme = async () => {
      // 这里可以添加实际的主题数据加载逻辑
      const themeData = {
        name: themeName,
        colors: getThemeColors(themeName),
        isDark: themeName === 'dark',
      };
      
      // 缓存主题数据
      if (enableCache) {
        themeCache.set(themeName, JSON.stringify(themeData));
      }
      
      return themeData;
    };
    
    return loadTheme();
  }, [enableCache, enablePrefetch, themeCache]); // 修复依赖数组
  
  // 批量预加载多个主题
  const prefetchThemes = useCallback(async (themes: string[]) => {
    if (!enablePrefetch) return;
    
    const promises = themes.map(prefetchTheme);
    await Promise.allSettled(promises);
  }, [prefetchTheme, enablePrefetch]);
  
  // 监听系统主题变化
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        // 系统主题变化时重新应用
        applyThemeColors(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);
  
  // 性能监控
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (duration > 100) {
          console.warn(`主题切换耗时: ${duration.toFixed(2)}ms`);
        }
      };
    }
  }, [theme]);
  
  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    isTransitioning,
    applyTheme,
    prefetchTheme,
    prefetchThemes,
    transitionDuration,
  };
}

// 辅助函数：获取主题色
function getThemeColors(themeName: string) {
  const themes: Record<string, { primary: string; secondary: string; accent: string }> = {
    blue: { primary: '#66ccff', secondary: '#1e40af', accent: '#06b6d4' },
    green: { primary: '#10b981', secondary: '#059669', accent: '#34d399' },
    purple: { primary: '#8b5cf6', secondary: '#7c3aed', accent: '#a78bfa' },
    red: { primary: '#ef4444', secondary: '#dc2626', accent: '#f87171' },
    orange: { primary: '#f97316', secondary: '#ea580c', accent: '#fb923c' },
    pink: { primary: '#ec4899', secondary: '#db2777', accent: '#f472b6' },
    cyan: { primary: '#06b6d4', secondary: '#0891b2', accent: '#22d3ee' },
    yellow: { primary: '#eab308', secondary: '#ca8a04', accent: '#facc15' },
    indigo: { primary: '#6366f1', secondary: '#4f46e5', accent: '#818cf8' },
    teal: { primary: '#14b8a6', secondary: '#0d9488', accent: '#2dd4bf' },
  };
  
  return themes[themeName] || themes.blue;
}

/**
 * 批量主题预加载Hook
 */
export function useThemePreloader(themes: string[]) {
  const [isPreloaded, setIsPreloaded] = useState(false);
  
  useEffect(() => {
    const preload = async () => {
      // 使用requestIdleCallback在浏览器空闲时预加载
      const preloadTask = () => {
        themes.forEach(theme => {
          // 预加载主题相关资源
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = `/api/theme/${theme}`;
          document.head.appendChild(link);
        });
        setIsPreloaded(true);
      };
      
      if ('requestIdleCallback' in window) {
        requestIdleCallback(preloadTask);
      } else {
        setTimeout(preloadTask, 0);
      }
    };
    
    preload();
  }, [themes]);
  
  return isPreloaded;
}