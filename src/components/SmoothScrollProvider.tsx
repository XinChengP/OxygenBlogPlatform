'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { initScrollManager, getScrollManager } from '@/utils/scrollManager';

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export default function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const pathname = usePathname();
  const scrollManagerRef = useRef<ReturnType<typeof getScrollManager>>(null);
  const [isInitialized, setIsInitialized] = useState(false);

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
      /* 页面过渡效果 */
      html.page-transitioning {
        opacity: 0.95;
        transition: opacity 0.15s ease-in-out;
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
      
      /* 页面加载时的淡入效果 */
      body {
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