'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';

/**
 * 页面滚动导航组件
 * 
 * 提供转到页首和页底的功能
 * - 根据滚动位置自动切换按钮状态
 * - 支持深色/浅色主题
 * - 平滑滚动效果
 * - 响应式设计
 */
export default function ScrollToTop() {
  const { theme } = useTheme();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // 判断是否显示"回到顶部"按钮
      setShowScrollTop(scrollTop > 300);
      
      // 判断是否在页面底部
      setIsAtBottom(scrollTop + windowHeight >= documentHeight - 50);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始检查
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 滚动到顶部
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // 滚动到底部
  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="flex flex-col space-y-2">
        {/* 回到顶部按钮 */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className="p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all duration-300 transform hover:scale-110"
            aria-label="回到顶部"
            title="回到顶部"
          >
            <ChevronUpIcon className="h-5 w-5" />
          </button>
        )}
        
        {/* 转到页底按钮 */}
        <button
          onClick={scrollToBottom}
          className={`p-3 ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded-full shadow-lg transition-all duration-300 transform hover:scale-110 ${isAtBottom ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="转到页底"
          title="转到页底"
          disabled={isAtBottom}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}