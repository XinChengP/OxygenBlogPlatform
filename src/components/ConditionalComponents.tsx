'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import ScrollToTop from './ScrollToTop';
import { getMusicPlayerVisibility, onMusicPlayerVisibilityChange } from '@/utils/musicPlayerVisibility';
import { isLanternDisplayPeriod } from '@/utils/lunarDateUtils';

// 动态导入重型组件，减少首屏 bundle 体积和 hydration 开销
const MusicPlayer = dynamic(() => import('./MusicPlayer'), { ssr: false });
const Live2DController = dynamic(() => import('./Live2DController'), { ssr: false });
const Lantern = dynamic(() => import('./Lantern'), { ssr: false });

// 使用React.memo减少不必要的渲染
export default React.memo(function ConditionalComponents() {
  const pathname = usePathname();
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [showLanterns, setShowLanterns] = useState(false);
  
  // 确保客户端挂载完成
  useEffect(() => {
    setIsClient(true);
    setMusicPlayerVisible(getMusicPlayerVisibility());
    
    // 显示灯笼（根据农历日期：北方小年到元宵节期间）
    setShowLanterns(isLanternDisplayPeriod());
    
    // 监听音乐播放器显示状态变化
    const unsubscribe = onMusicPlayerVisibilityChange((visible) => {
      setMusicPlayerVisible(visible);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // 计算是否需要隐藏Live2D和音乐播放器
  const hideLive2DAndMusic = useMemo(() => {
    return pathname === '/' || pathname === '/404' || pathname.startsWith('/_not-found') || pathname.startsWith('/admin');
  }, [pathname]);
  
  // 使用suppressHydrationWarning避免水合警告
  const containerClassName = useMemo(() => {
    return isClient 
      ? (hideLive2DAndMusic || !musicPlayerVisible ? 'aplayer-container hidden' : 'aplayer-container')
      : 'aplayer-container';
  }, [isClient, hideLive2DAndMusic, musicPlayerVisible]);
  
  // 计算是否需要显示ScrollToTop组件
  const showScrollToTop = useMemo(() => {
    return pathname !== '/';
  }, [pathname]);

  return (
    <>
      {/* 红灯笼组件 - 后台页面不显示 */}
      {showLanterns && !pathname.startsWith('/admin') && <Lantern text="新春快乐" enabled={true} />}
      {/* 音乐播放器 - 在所有页面都渲染，但通过CSS控制可见性 - 后台页面不显示 */}
      {!pathname.startsWith('/admin') && (
        <div className={containerClassName} suppressHydrationWarning>
          <MusicPlayer />
        </div>
      )}
      {/* 使用Live2DController进行智能路径控制 - 后台页面不显示 */}
      {!pathname.startsWith('/admin') && <Live2DController />}
      {/* ScrollToTop组件 - 除首页外所有页面显示 - 后台页面不显示 */}
      {showScrollToTop && !pathname.startsWith('/admin') && <ScrollToTop />}
    </>
  );
});