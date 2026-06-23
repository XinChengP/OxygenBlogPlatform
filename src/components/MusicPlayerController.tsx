'use client';

import React, { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// 动态导入播放器组件，避免 SSR 水合问题
// APlayer 需要浏览器环境
const MusicPlayer = dynamic(() => import('@/components/MusicPlayer'), {
  ssr: false,
});

/**
 * 音乐播放器控制器
 *
 * 负责：
 * 1. 根据当前路由决定播放器是否需要隐藏
 * 2. 让播放器在页面切换时保持挂载，避免重新初始化导致播放中断
 * 3. 通过 CSS 控制在首页/404/后台等页面隐藏，而不是 React 条件渲染卸载
 */
export default function MusicPlayerController() {
  const pathname = usePathname();

  // 计算当前是否需要隐藏播放器
  const isHidden = useMemo(() => {
    // 路径未确定时默认隐藏，避免水合前闪现
    if (pathname === null) {
      return true;
    }
    // 首页、404 页面、不存在的路由以及后台管理页面都隐藏播放器
    return (
      pathname === '/' ||
      pathname === '/404' ||
      pathname === '/not-found' ||
      pathname.startsWith('/_not-found') ||
      pathname.startsWith('/admin')
    );
  }, [pathname]);

  return <MusicPlayer hidden={isHidden} />;
}
