'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import sunIcon from '@/assets/sun.svg';
import moonIcon from '@/assets/moon.svg';
import { emitThemeChangeEvent } from '@/utils/live2dEventEmitter';

/**
 * 主题切换组件
 * 提供浅色、深色、跟随系统三种主题选项
 */
export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
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
    } else if (theme === 'system') {
      // 跟随系统时，如果系统是深色模式显示sun图标，浅色模式显示moon图标
      return resolvedTheme === 'light' ? sunIcon : moonIcon;
    }
    return sunIcon; // 默认
  };

  const themes = [
    { key: 'light', label: '浅色模式', icon: sunIcon },
    { key: 'dark', label: '深色模式', icon: moonIcon },
    { key: 'system', label: '跟随系统', icon: getCurrentIcon() },
  ];

  const currentTheme = themes.find(t => t.key === theme) || themes[2];

  /**
   * 切换主题
   */
  const handleThemeChange = (newTheme: string) => {
    const previousTheme = theme;
    console.log(`[ThemeToggle] 主题切换: ${previousTheme || 'system'} -> ${newTheme}`);
    setTheme(newTheme);
    setIsOpen(false);
    
    // 发送主题切换事件给Live2D看板娘
    emitThemeChangeEvent(newTheme, previousTheme || 'system');
    console.log(`[ThemeToggle] 已发送Live2D主题切换事件`);
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
        className="flex items-center justify-center w-9 h-9 rounded-md bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 transition-colors duration-200 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50"
        aria-label="切换主题"
      >
        <Image 
          src={getCurrentIcon()} 
          alt="主题图标" 
          width={18} 
          height={18} 
          className="w-[18px] h-[18px]"
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
          <div className="absolute right-0 top-full mt-2 w-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50 py-1 z-20">
            {themes.map((themeOption) => (
              <button
                key={themeOption.key}
                onClick={() => handleThemeChange(themeOption.key)}
                className={`w-full px-3 py-2 text-left text-sm transition-colors duration-200 flex items-center space-x-2 ${
                  theme === themeOption.key
                    ? 'bg-blue-50/80 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50/80 dark:hover:bg-gray-800/50'
                }`}
              >
                <span>{themeOption.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}