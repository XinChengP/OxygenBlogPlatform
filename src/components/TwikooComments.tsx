'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

interface TwikooCommentsProps {
  id: string; // 文章的唯一标识符，通常使用文章的 slug
}

/**
 * Twikoo 评论组件
 * 
 * 基于 Twikoo 的评论系统，支持：
 * - 自动适配深色/浅色主题
 * - 根据文章 ID 区分不同文章的评论
 * - 响应式布局
 * 
 * @param id - 文章的唯一标识符
 * @returns JSX 元素
 */
export default function TwikooComments({ id }: TwikooCommentsProps) {
  const { theme, systemTheme } = useTheme();
  const twikooRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') return;

    // 确保 Twikoo 脚本已加载
    const loadTwikoo = async () => {
      try {
        // 如果已经初始化过，不再重复初始化
        if (isInitialized.current) return;
        
        // 动态加载 Twikoo 脚本
        const script = document.createElement('script');
        script.src = 'https://cdn.staticfile.org/twikoo/1.6.39/twikoo.all.min.js';
        script.async = true;
        
        script.onload = () => {
          // 脚本加载完成后初始化 Twikoo
          if ((window as any).twikoo && twikooRef.current) {
            (window as any).twikoo.init({
              envId: 'https://twikoo.vercel.app', // 替换为您的 Twikoo 环境ID
              el: '#tcomment', // 评论容器的元素ID
              lang: 'zh-CN', // 语言设置
              // 主题设置，根据当前主题自动切换
              onCommentLoaded: () => {
                console.log('Twikoo 评论加载完成');
                
                // 应用主题样式
                applyThemeStyles();
              }
            });
            
            isInitialized.current = true;
          }
        };
        
        document.head.appendChild(script);
      } catch (error) {
        console.error('Twikoo 初始化失败:', error);
      }
    };

    // 应用主题样式
    const applyThemeStyles = () => {
      if (!twikooRef.current) return;
      
      const currentTheme = theme === 'system' ? systemTheme : theme;
      const isDark = currentTheme === 'dark';
      
      // 尝试修改 Twikoo 的主题
      const twikooContainer = twikooRef.current.querySelector('#tcomment') as HTMLElement;
      if (twikooContainer) {
        // 设置 CSS 变量来控制主题
        twikooContainer.style.setProperty('--twikoo-bg-color', isDark ? '#1f2937' : '#ffffff');
        twikooContainer.style.setProperty('--twikoo-text-color', isDark ? '#e5e7eb' : '#111827');
        twikooContainer.style.setProperty('--twikoo-border-color', isDark ? '#374151' : '#e5e7eb');
      }
    };

    // 延迟加载，确保 DOM 已准备好
    const timer = setTimeout(() => {
      loadTwikoo();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [theme, systemTheme]);

  // 主题变化时重新应用样式
  useEffect(() => {
    if (isInitialized.current) {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      const isDark = currentTheme === 'dark';
      
      // 尝试重新渲染 Twikoo 以应用新主题
      const twikooContainer = document.querySelector('#tcomment') as HTMLElement;
      if (twikooContainer) {
        twikooContainer.style.setProperty('--twikoo-bg-color', isDark ? '#1f2937' : '#ffffff');
        twikooContainer.style.setProperty('--twikoo-text-color', isDark ? '#e5e7eb' : '#111827');
        twikooContainer.style.setProperty('--twikoo-border-color', isDark ? '#374151' : '#e5e7eb');
      }
    }
  }, [theme, systemTheme]);

  return (
    <div className="mt-12">
      <div className="bg-card rounded-lg shadow-sm p-6 md:p-8">
        <h3 className="text-xl font-semibold mb-6 text-foreground">评论</h3>
        <div 
          ref={twikooRef}
          id="tcomment" 
          className="twikoo-container"
          style={{
            minHeight: '200px',
            backgroundColor: 'var(--twikoo-bg-color, transparent)',
            color: 'var(--twikoo-text-color, inherit)',
            borderColor: 'var(--twikoo-border-color, transparent)'
          }}
        />
      </div>
    </div>
  );
}