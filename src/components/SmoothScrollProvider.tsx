'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { initScrollManager, getScrollManager } from '@/utils/scrollManager';
import GlobalMusicPlayerManager from '@/utils/globalMusicPlayerManager';

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export default function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const pathname = usePathname();
  const scrollManagerRef = useRef<ReturnType<typeof getScrollManager>>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const globalManager = GlobalMusicPlayerManager.getInstance();

  useEffect(() => {
    // 初始化高级滚动管理器
    scrollManagerRef.current = initScrollManager();
    setIsInitialized(true);

    return () => {
      // 清理资源
      if (scrollManagerRef.current) {
        scrollManagerRef.current.destroy();
      }
    };
  }, []);

  // 监听路径变化
  useEffect(() => {
    if (!isInitialized) return;

    // 页面切换时的额外处理
    const handleRouteChange = () => {
      // 检查音乐播放器是否正在播放
      const isMusicPlaying = !globalManager.getPlayer()?.paused;
      
      if (isMusicPlaying) {
        // 如果音乐正在播放，添加特殊类来禁用过渡效果
        document.documentElement.classList.add('aplayer-active');
      } else {
        // 移除特殊类，允许正常过渡
        document.documentElement.classList.remove('aplayer-active');
      }
      
      // 添加页面过渡效果
      document.documentElement.classList.add('page-transitioning');
      
      // 移除过渡效果
      setTimeout(() => {
        document.documentElement.classList.remove('page-transitioning');
      }, 100);
    };

    handleRouteChange();
  }, [pathname, isInitialized]);

  // 添加CSS过渡样式
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* 页面过渡效果 - 排除音乐播放器 */
      html.page-transitioning:not(.aplayer-active) {
        opacity: 0.95;
        transition: opacity 0.15s ease-in-out;
      }
      
      /* 当音乐播放器活动时禁用页面过渡 */
      html.aplayer-active {
        opacity: 1 !important;
        transition: none !important;
      }
      
      /* 平滑滚动 */
      html {
        scroll-behavior: smooth;
      }
      
      /* 减少运动偏好的用户设置 */
      @media (prefers-reduced-motion: reduce) {
        html {
          scroll-behavior: auto;
        }
        
        html.page-transitioning {
          transition: none;
        }
      }
      
      /* 页面加载时的淡入效果 - 排除音乐播放器 */
      body:not(.aplayer-active) {
        animation: pageFadeIn 0.2s ease-out;
      }
      
      @keyframes pageFadeIn {
        from {
          opacity: 0.8;
        }
        to {
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, []);

  return <>{children}</>;
}