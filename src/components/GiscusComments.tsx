'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

interface GiscusCommentsProps {
  // 不再需要 id 参数，因为我们使用 pathname 映射
}

/**
 * Giscus 评论组件
 * 
 * 基于 Giscus 的评论系统，使用 GitHub Discussions 作为后端
 * - 自动适配深色/浅色主题
 * - 使用 pathname 映射，每个页面有独立的评论
 * - 响应式布局
 */
export default function GiscusComments({}: GiscusCommentsProps) {
  const { theme, systemTheme } = useTheme();
  const giscusRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') return;

    // 获取当前主题
    const getCurrentTheme = () => {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      return currentTheme === 'dark' ? 'dark' : 'light';
    };

    // 确保 Giscus 脚本已加载
    const loadGiscus = async () => {
      try {
        // 如果已经初始化过，不再重复初始化
        if (isInitialized.current) return;
        
        // 检查 Giscus 是否已经加载
        if (!(window as any).Giscus && !scriptRef.current) {
          // 动态加载 Giscus 脚本
          const script = document.createElement('script');
          script.src = 'https://giscus.app/client.js';
          script.async = true;
          script.crossOrigin = 'anonymous';
          
          // 设置 Giscus 配置
          script.setAttribute('data-repo', 'XinChengP/OxygenBlogPlatform');
          script.setAttribute('data-repo-id', 'R_kgDOQQbz2g');
          script.setAttribute('data-category', 'General');
          script.setAttribute('data-category-id', 'DIC_kwDOQQbz2s4CxkZ6');
          script.setAttribute('data-mapping', 'pathname');
          script.setAttribute('data-strict', '0');
          script.setAttribute('data-reactions-enabled', '1');
          script.setAttribute('data-emit-metadata', '0');
          script.setAttribute('data-input-position', 'bottom');
          script.setAttribute('data-theme', getCurrentTheme());
          script.setAttribute('data-lang', 'zh-CN');
          
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
          
          scriptRef.current = script;
          document.head.appendChild(script);
        } else if ((window as any).Giscus) {
          isInitialized.current = true;
        }
      } catch (error) {
        console.error('Giscus 初始化失败:', error);
      }
    };

    // 延迟加载，确保 DOM 已准备好
    const timer = setTimeout(() => {
      loadGiscus();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [theme, systemTheme]);

  // 主题变化时重新渲染 Giscus
  useEffect(() => {
    if (isInitialized.current && (window as any).Giscus) {
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
      <div className="bg-card rounded-lg shadow-sm p-6 md:p-8">
        <h3 className="text-xl font-semibold mb-6 text-foreground">评论</h3>
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