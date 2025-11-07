'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { getTwikooEnvId } from '@/config/twikoo';

interface TwikooCommentsProps {
  envId?: string;
  path?: string;
  onCommentCountChange?: (count: number) => void;
}

/**
 * Twikoo评论组件
 * 
 * @param envId - Twikoo环境ID，如果不提供则使用配置文件中的默认值
 * @param path - 页面路径，用于区分不同页面的评论
 * @param onCommentCountChange - 评论数量变化时的回调函数
 */
export default function TwikooComments({ 
  envId, 
  path = window?.location?.pathname || '', 
  onCommentCountChange 
}: TwikooCommentsProps) {
  const { theme } = useTheme();
  const twikooRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  
  // 使用传入的envId或从配置文件获取
  const twikooEnvId = envId || getTwikooEnvId();

  useEffect(() => {
    // 确保只在客户端渲染
    if (typeof window === 'undefined') return;

    // 动态加载Twikoo脚本
    const loadTwikooScript = () => {
      if (document.getElementById('twikoo-script')) return;

      const script = document.createElement('script');
      script.id = 'twikoo-script';
      script.src = 'https://cdn.staticfile.org/twikoo/1.6.40/twikoo.all.min.js';
      script.async = true;
      script.onload = () => {
        initTwikoo();
      };
      document.body.appendChild(script);
    };

    // 初始化Twikoo
  const initTwikoo = () => {
    if (!twikooRef.current || isInitialized.current) return;

    // 初始化Twikoo评论
    if (window.twikoo) {
      window.twikoo.init({
        envId: twikooEnvId,
        el: '#tcomment',
        path: path,
        lang: 'zh-CN',
        onCommentLoaded: () => {
          // 评论加载完成后的回调
          console.log('Twikoo评论加载完成');
          
          // 获取评论数量
          if (onCommentCountChange) {
            const countElement = document.querySelector('.tk-comments-count');
            if (countElement) {
              const count = parseInt(countElement.textContent || '0', 10);
              onCommentCountChange(count);
            }
          }
        }
      });
      isInitialized.current = true;
    }
  };

    // 如果Twikoo已经加载，直接初始化
    if (window.twikoo) {
      initTwikoo();
    } else {
      // 否则先加载脚本
      loadTwikooScript();
    }

    // 监听主题变化，重新初始化Twikoo
    if (theme) {
      // 当主题变化时，重新初始化Twikoo以应用新主题
      const handleThemeChange = () => {
        if (isInitialized.current && window.twikoo) {
          // 销毁现有实例
          twikooRef.current!.innerHTML = '';
          isInitialized.current = false;
          // 重新初始化
          setTimeout(initTwikoo, 100);
        }
      };

      // 添加主题变化监听
      window.addEventListener('themechange', handleThemeChange);
      
      return () => {
        window.removeEventListener('themechange', handleThemeChange);
      };
    }
  }, [envId, path, theme, onCommentCountChange]);

  return (
    <div className="w-full mt-8">
      <div id="tcomment" ref={twikooRef} className="twikoo-container"></div>
    </div>
  );
}

// 声明全局类型
declare global {
  interface Window {
    twikoo: {
      init: (options: {
        envId: string;
        el: string;
        path?: string;
        lang?: string;
        onCommentLoaded?: () => void;
      }) => void;
    };
  }
}