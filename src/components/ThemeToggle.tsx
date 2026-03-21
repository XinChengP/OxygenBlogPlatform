'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import sunIcon from '@/assets/sun.svg';
import moonIcon from '@/assets/moon.svg';
import systemIcon from '@/assets/system.svg';
import { emitThemeChangeEvent } from '@/utils/live2dEventEmitter';

/**
 * 主题切换组件 - 增强版
 * 
 * 功能特性：
 * 1. 支持浅色、深色、跟随系统三种主题选项
 * 2. 平滑过渡动画效果
 * 3. 自动跟随系统主题变化
 * 4. 与Live2D看板娘联动
 * 
 * @returns 主题切换按钮组件
 */
export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // 确保组件在客户端渲染后才显示，避免水合不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-md bg-gray-100 dark:bg-gray-800 animate-pulse" />
    );
  }

  /**
   * 获取当前应该显示的图标
   */
  const getCurrentIcon = () => {
    if (theme === 'light') {
      return sunIcon;
    } else if (theme === 'dark') {
      return moonIcon;
    }
    return systemIcon; // 跟随系统模式
  };

  /**
   * 获取当前主题的标签
   */
  const getCurrentLabel = () => {
    if (theme === 'light') {
      return '浅色';
    } else if (theme === 'dark') {
      return '深色';
    }
    return '跟随系统';
  };

  // 主题配置列表
  const themes = [
    { 
      key: 'light', 
      label: '浅色模式', 
      icon: sunIcon,
      description: '始终使用浅色主题'
    },
    { 
      key: 'dark', 
      label: '深色模式', 
      icon: moonIcon,
      description: '始终使用深色主题'
    },
    { 
      key: 'system', 
      label: '跟随系统', 
      icon: systemIcon,
      description: '自动匹配系统主题设置'
    },
  ];

  const currentTheme = themes.find(t => t.key === theme) || themes[0];

  /**
   * 切换主题并添加过渡动画
   * 
   * @param newTheme - 新主题
   */
  const handleThemeChange = (newTheme: string) => {
    const previousTheme = theme;
    
    // 如果主题没有变化，直接关闭菜单
    if (newTheme === previousTheme) {
      setIsOpen(false);
      return;
    }
    
    console.log(`[ThemeToggle] 主题切换: ${previousTheme || 'light'} -> ${newTheme}`);
    
    // 开始过渡动画
    setIsTransitioning(true);
    document.documentElement.classList.add('theme-transitioning');
    
    // 设置新主题
    setTheme(newTheme);
    setIsOpen(false);
    
    // 发送主题切换事件给Live2D看板娘
    emitThemeChangeEvent(newTheme, previousTheme || 'light');
    console.log(`[ThemeToggle] 已发送Live2D主题切换事件`);
    
    // 过渡完成后移除过渡类
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transitioning');
      setIsTransitioning(false);
    }, 500);
  };

  /**
   * 切换下拉菜单显示状态
   */
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative">
      {/* 主题切换按钮 */}
      <button
        onClick={toggleDropdown}
        disabled={isTransitioning}
        className={`
          flex items-center justify-center w-9 h-9 rounded-md 
          bg-gray-100/80 dark:bg-gray-800/80 
          hover:bg-gray-200/80 dark:hover:bg-gray-700/80 
          transition-all duration-300 backdrop-blur-sm 
          border border-gray-200/50 dark:border-gray-700/50
          ${isTransitioning ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-label={`当前主题: ${getCurrentLabel()}，点击切换主题`}
        title={`当前: ${getCurrentLabel()}`}
      >
        <Image 
          src={getCurrentIcon()} 
          alt="主题图标" 
          width={18} 
          height={18} 
          className={`
            w-[18px] h-[18px] transition-transform duration-300
            ${isTransitioning ? 'animate-spin' : ''}
          `}
        />
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* 菜单内容 */}
          <div 
            className="
              absolute right-0 top-full mt-2 w-48 
              bg-white/95 dark:bg-gray-900/95 
              backdrop-blur-md rounded-lg shadow-lg 
              border border-gray-200/50 dark:border-gray-700/50 
              py-1 z-20 animate-fadeIn
            "
          >
            {/* 菜单标题 */}
            <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200/50 dark:border-gray-700/50">
              选择主题
            </div>
            
            {/* 主题选项 */}
            {themes.map((themeOption) => (
              <button
                key={themeOption.key}
                onClick={() => handleThemeChange(themeOption.key)}
                className={`
                  w-full px-3 py-2.5 text-left text-sm 
                  transition-all duration-200 
                  flex items-center space-x-3
                  ${theme === themeOption.key
                    ? 'bg-blue-50/80 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/50'
                  }
                `}
              >
                {/* 图标 */}
                <Image 
                  src={themeOption.icon} 
                  alt={themeOption.label}
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
                
                {/* 文字内容 */}
                <div className="flex-1">
                  <div className="font-medium">{themeOption.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {themeOption.description}
                  </div>
                </div>
                
                {/* 选中标记 */}
                {theme === themeOption.key && (
                  <svg 
                    className="w-4 h-4 text-blue-600 dark:text-blue-400" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
