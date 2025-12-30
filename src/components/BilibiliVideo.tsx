'use client';

import { useEffect, useRef, useState } from 'react';

interface BilibiliVideoProps {
  src: string;
  width?: string | number;
  height?: string | number;
  className?: string;
}

export default function BilibiliVideo({ 
  src, 
  width = '100%', 
  height = 400, 
  className 
}: BilibiliVideoProps) {
  // 容器引用
  const containerRef = useRef<HTMLDivElement>(null);
  // iframe引用
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // 视频加载状态
  const [videoLoaded, setVideoLoaded] = useState(false);
  // 容器可见性
  const [isVisible, setIsVisible] = useState(false);

  // 节流函数：限制滚动触发频率
  const throttle = (fn: Function, delay = 200) => {
    let timer: NodeJS.Timeout | null = null;
    return (...args: any[]) => {
      if (!timer) {
        timer = setTimeout(() => {
          fn.apply(this, args);
          timer = null;
        }, delay);
      }
    };
  };

  // 判断元素是否进入视口（留缓冲，避免反复触发）
  const isInViewport = (el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    return rect.top < window.innerHeight + 300 && rect.bottom > -100;
  };

  // 处理滚动事件
  const handleScroll = throttle(() => {
    const container = containerRef.current;
    if (!container) return;

    const inViewport = isInViewport(container);
    setIsVisible(inViewport);

    // 首次进入视口：创建iframe（仅一次）
    if (inViewport && !videoLoaded) {
      const iframe = document.createElement('iframe');
      iframe.src = src;
      iframe.width = typeof width === 'number' ? `${width}px` : width;
      iframe.height = typeof height === 'number' ? `${height}px` : height;
      iframe.frameBorder = 0;
      iframe.allowFullscreen = true;
      // 关键：禁用iframe惰性加载，强制保持连接
      iframe.loading = 'eager';
      // 解决跨域脚本错误
      iframe.crossOrigin = 'anonymous';
      // 设置sandbox属性，增强安全性
      iframe.sandbox = 'allow-same-origin allow-scripts allow-presentation allow-fullscreen';

      container.appendChild(iframe);
      iframeRef.current = iframe;
      setVideoLoaded(true);
    }
  });

  useEffect(() => {
    // 初始检查
    const container = containerRef.current;
    if (container) {
      const inViewport = isInViewport(container);
      setIsVisible(inViewport);
      
      if (inViewport) {
        // 初始就在视口中，直接加载视频
        const iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.width = typeof width === 'number' ? `${width}px` : width;
        iframe.height = typeof height === 'number' ? `${height}px` : height;
        iframe.frameBorder = 0;
        iframe.allowFullscreen = true;
        iframe.loading = 'eager';
        iframe.crossOrigin = 'anonymous';
        iframe.sandbox = 'allow-same-origin allow-scripts allow-presentation allow-fullscreen';

        container.appendChild(iframe);
        iframeRef.current = iframe;
        setVideoLoaded(true);
      }
    }

    // 添加滚动事件监听
    window.addEventListener('scroll', handleScroll);
    
    // 也监听resize事件，处理窗口大小变化
    window.addEventListener('resize', handleScroll);

    return () => {
      // 清理事件监听
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [handleScroll, src, width, height]);

  return (
    <div
      ref={containerRef}
      className={`bilibili-video-container ${className || ''}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: `${height}px`,
        margin: '20px 0',
        display: isVisible ? 'block' : 'none',
        position: 'relative',
      }}
    />
  );
}