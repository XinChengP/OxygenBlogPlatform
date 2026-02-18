'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import MusicPlayer from './MusicPlayer';
import Live2DController from './Live2DController';
import ScrollToTop from './ScrollToTop';
import Lantern3D from './Lantern3D';
import { getMusicPlayerVisibility, onMusicPlayerVisibilityChange } from '@/utils/musicPlayerVisibility';
import { enable3DLanterns, lanternText } from '@/setting/WebSetting';
import { isInSpringFestivalPeriod, getCurrentFestivalInfo } from '@/utils/lunarCalendar';

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
    
    // 检查是否应该显示灯笼（春节期间）
    const checkLanternSeason = () => {
      if (!enable3DLanterns) return;
      
      // 使用农历日期判断是否在春节期间（正月初一到十五）
      const inSpringFestival = isInSpringFestivalPeriod();
      const festivalInfo = getCurrentFestivalInfo();
      
      console.log('🎊 灯笼调试信息:');
      console.log('是否春节期间:', inSpringFestival);
      console.log('节日信息:', festivalInfo);
      console.log('是否启用灯笼:', enable3DLanterns);
      
      // 临时强制显示灯笼（调试用）
      setShowLanterns(true);
      
      // 正式逻辑（取消注释以使用）
      // if (inSpringFestival) {
      //   setShowLanterns(true);
      // }
    };
    
    checkLanternSeason();
  }, []);
  
  // 监听音乐播放器显示状态变化
  useEffect(() => {
    if (!isClient) return;
    
    const unsubscribe = onMusicPlayerVisibilityChange((visible) => {
      setMusicPlayerVisible(visible);
    });
    
    return () => {
      unsubscribe();
    };
  }, [isClient]);
  
  // 计算是否需要隐藏Live2D和音乐播放器
  const hideLive2DAndMusic = useMemo(() => {
    return pathname === '/' || pathname === '/404' || pathname.startsWith('/_not-found');
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
      {/* 3D灯笼组件 - 春节期间显示 */}
      {showLanterns && <Lantern3D text={lanternText} enabled={true} />}
      {/* 音乐播放器 - 在所有页面都渲染，但通过CSS控制可见性 */}
      <div className={containerClassName} suppressHydrationWarning>
        <MusicPlayer />
      </div>
      {/* 使用Live2DController进行智能路径控制 */}
      <Live2DController />
      {/* ScrollToTop组件 - 除首页外所有页面显示 */}
      {showScrollToTop && <ScrollToTop />}
    </>
  );
});