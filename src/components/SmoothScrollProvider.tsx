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
      /*
        music-player-active（音乐播放中禁用过渡）已改由 howlerPlayerManager
        在播放状态变化时直接维护，这里只负责页面过渡效果本身，
        从而切断对 howlerPlayerManager 的静态依赖——
        否则 howler 与 1200+ 行的播放器管理器会被打进全站首载包。
      */

      // 添加页面过渡效果
      document.documentElement.classList.add('page-transitioning');

      // 移除过渡效果
      setTimeout(() => {
        document.documentElement.classList.remove('page-transitioning');
      }, 100);
    };

    handleRouteChange();
  }, [pathname, isInitialized]);

  return <>{children}</>;
}
