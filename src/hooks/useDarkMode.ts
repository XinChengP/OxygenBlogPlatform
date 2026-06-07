'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTheme } from 'next-themes';

/**
 * 暗黑模式增强Hook
 * 
 * 功能特性：
 * 1. 自动跟随系统主题变化
 * 2. 平滑过渡动画控制
 * 3. 图片暗色滤镜支持
 * 4. 系统主题变化监听
 * 
 * @returns 暗黑模式相关状态和控制函数
 */
export function useDarkMode() {
  const { theme, setTheme, resolvedTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 确保组件已挂载（避免服务端渲染不匹配）
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 当前是否为暗黑模式
   */
  const isDark = resolvedTheme === 'dark';

  /**
   * 是否跟随系统主题
   */
  const isSystem = theme === 'system';

  /**
   * 切换主题并添加过渡动画
   * 
   * @param newTheme - 新主题
   */
  const toggleTheme = useCallback((newTheme: 'light' | 'dark' | 'system') => {
    // 开始过渡动画
    setIsTransitioning(true);
    
    // 添加过渡类到document
    document.documentElement.classList.add('theme-transitioning');
    
    // 设置新主题
    setTheme(newTheme);
    
    // 过渡完成后移除过渡类
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
      setIsTransitioning(false);
    }, 500); // 与CSS过渡时间保持一致
  }, [setTheme]);

  /**
   * 在亮色和暗色模式之间切换
   */
  const toggle = useCallback(() => {
    const newTheme = isDark ? 'light' : 'dark';
    toggleTheme(newTheme);
  }, [isDark, toggleTheme]);

  /**
   * 监听系统主题变化
   * 当系统主题变化且当前设置为跟随系统时，自动切换
   */
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        // 系统主题变化时添加过渡效果
        document.documentElement.classList.add('theme-transitioning');
        
        setTimeout(() => {
          document.documentElement.classList.remove('theme-transitioning');
        }, 500);
      }
    };

    // 添加监听器
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [theme, mounted]);

  return {
    // 状态
    isDark,
    isSystem,
    theme,
    resolvedTheme,
    systemTheme,
    mounted,
    isTransitioning,

    // 控制函数
    toggle,
    toggleTheme,
    setTheme: toggleTheme,
  };
}

export default useDarkMode;
