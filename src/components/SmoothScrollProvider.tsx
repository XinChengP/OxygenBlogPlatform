'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { initScrollManager, getScrollManager } from '@/utils/scrollManager';
import { howlerPlayerManager } from '@/utils/howlerPlayerManager';

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export default function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  const pathname = usePathname();
  const scrollManagerRef = useRef<ReturnType<typeof getScrollManager>>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const globalManager = howlerPlayerManager;

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
      // 检查音乐播放器是否正在播放（若播放器尚未加载则跳过）
      const isMusicPlaying = globalManager.isPlayingState();

      if (isMusicPlaying) {
        // 如果音乐正在播放，添加特殊类来禁用过渡效果
        document.documentElement.classList.add('music-player-active');
      } else {
        // 移除特殊类，允许正常过渡
        document.documentElement.classList.remove('music-player-active');
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

  return <>{children}</>;
}