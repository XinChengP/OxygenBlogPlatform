'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { getGiscusAttributes } from '@/config/giscus';

interface GiscusCommentsProps {
  id: string; // 文章的唯一标识符，通常使用文章的 slug
}

/**
 * Giscus 评论组件
 * 
 * 基于 Giscus 的评论系统，使用 GitHub Discussions 作为后端
 * 根据 https://giscus.app/zh-CN 官方文档实现
 * 
 * 特性：
 * - 自动适配深色/浅色主题
 * - 根据文章 ID 区分不同文章的评论
 * - 响应式布局
 * - 支持多种语言
 * - 无跟踪，无广告，永久免费
 * - 无需数据库，所有数据均储存在 GitHub Discussions 中
 * 
 * @param id - 文章的唯一标识符
 * @returns JSX 元素
 */
export default function GiscusComments({ id }: GiscusCommentsProps) {
  const { theme, systemTheme } = useTheme();
  const giscusRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') return;

    // 确保 Giscus 脚本已加载
    const loadGiscus = async () => {
      try {
        // 如果已经初始化过，不再重复初始化
        if (isInitialized.current) return;
        
        // 检查 Giscus 是否已经加载
        if (!(window as any).giscus) {
          // 动态加载 Giscus 脚本
          const script = document.createElement('script');
          script.src = 'https://giscus.app/client.js';
          script.async = true;
          script.crossOrigin = 'anonymous';
          
          // 使用配置文件设置 Giscus 属性
          const attributes = getGiscusAttributes(id, isDarkTheme());
          
          // 设置脚本属性
          Object.entries(attributes).forEach(([key, value]) => {
            if (key === 'src') {
              script.src = value as string;
            } else if (key === 'async') {
              script.async = value as boolean;
            } else if (key === 'crossOrigin') {
              script.crossOrigin = value as string;
            } else {
              script.setAttribute(key, value as string);
            }
          });
          
          script.onload = () => {
            console.log('Giscus 评论加载完成');
            isInitialized.current = true;
          };
          
          script.onerror = () => {
            console.error('Giscus 脚本加载失败');
            if (giscusRef.current) {
              giscusRef.current.innerHTML = '<div class="text-red-500">评论加载失败，请刷新页面重试</div>';
            }
          };
          
          document.head.appendChild(script);
        } else {
          isInitialized.current = true;
        }
      } catch (error) {
        console.error('Giscus 初始化失败:', error);
      }
    };

    // 获取当前主题
    const getCurrentTheme = () => {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      return currentTheme === 'dark' ? 'dark' : 'light';
    };
    
    // 获取当前主题是否为深色模式
    const isDarkTheme = () => {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      return currentTheme === 'dark';
    };

    // 延迟加载，确保 DOM 已准备好
    const timer = setTimeout(() => {
      loadGiscus();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [theme, systemTheme, id]);

  // 主题变化时重新渲染 Giscus
  useEffect(() => {
    if (isInitialized.current && (window as any).giscus) {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      const giscusTheme = currentTheme === 'dark' ? 'dark' : 'light';
      
      // 发送主题变化消息到 Giscus iframe
      const iframe = document.querySelector('iframe.giscus-frame') as HTMLIFrameElement;
      if (iframe) {
        iframe.contentWindow?.postMessage(
          { giscus: { setConfig: { theme: giscusTheme } } },
          'https://giscus.app'
        );
      }
    }
  }, [theme, systemTheme]);

  return (
    <div className="mt-12">
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-lg shadow-sm p-6 md:p-8 border border-gray-200/30 dark:border-gray-700/30">
        <h3 className="text-xl font-semibold mb-6 text-gray-800 dark:text-gray-100">评论</h3>
        <div 
          ref={giscusRef}
          className="giscus-container"
          style={{
            minHeight: '200px'
          }}
        />
      </div>
    </div>
  );
}