'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  getMusicPlayerVisibility,
  onMusicPlayerVisibilityChange,
} from '@/utils/musicPlayerVisibility';

// 动态导入播放器组件，避免 SSR 水合问题
// Howler.js 需要浏览器环境
const MusicPlayer = dynamic(() => import('@/components/MusicPlayer'), {
  ssr: false,
});

/**
 * 音乐播放器控制器
 *
 * 负责：
 * 1. 根据当前路由决定播放器是否需要隐藏
 * 2. 让播放器在页面切换时保持挂载，避免重新初始化导致播放中断
 * 3. 默认不下载播放器代码：只有用户开过播放器（localStorage 为 true）
 *    且当前页面需要显示时，才在空闲时段加载 MusicPlayer + Howler。
 *
 * 之前无条件渲染 <MusicPlayer hidden>：即使默认隐藏、从不播放，
 * 每个页面仍会下载约 32KB(gzip) 的播放器与 Howler 代码。
 */
export default function MusicPlayerController() {
  const pathname = usePathname();
  const [isNotFound, setIsNotFound] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [shouldMount, setShouldMount] = useState(false);
  const mountedRef = useRef(false);

  // 真实 404 的 pathname 是访问的任意不存在路径，无法枚举匹配，
  // 因此复用 not-found.tsx 写在 body 上的 `not-found` 类来识别 404 页面。
  useEffect(() => {
    const update = () => {
      setIsNotFound(document.body.classList.contains('not-found'));
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // 读取用户是否开启过播放器，并跟随 ScrollToTop 里的开关变化
  useEffect(() => {
    setEnabled(getMusicPlayerVisibility());
    return onMusicPlayerVisibilityChange(setEnabled);
  }, []);

  // 计算当前是否需要隐藏播放器
  const isHidden = useMemo(() => {
    // 路径未确定时默认隐藏，避免水合前闪现
    if (pathname === null) {
      return true;
    }
    // 首页、404 页面、不存在的路由以及后台管理页面都隐藏播放器
    return (
      isNotFound ||
      pathname === '/' ||
      pathname === '/404' ||
      pathname === '/not-found' ||
      pathname.startsWith('/_not-found') ||
      pathname.startsWith('/admin')
    );
  }, [pathname, isNotFound]);

  useEffect(() => {
    // 已经挂载过就保持挂载：路由切到首页时只隐藏，不卸载，避免播放中断
    if (mountedRef.current) return;
    if (!enabled || isHidden) return;

    const start = () => {
      if (mountedRef.current) return;
      mountedRef.current = true;
      setShouldMount(true);
    };

    const idleWindow = window as Window & {
      requestIdleCallback?: (cb: () => void, options: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    let idleId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleId = idleWindow.requestIdleCallback(start, { timeout: 2500 });
    } else {
      timer = setTimeout(start, 1500);
    }

    return () => {
      if (idleId !== null) idleWindow.cancelIdleCallback?.(idleId);
      if (timer !== null) clearTimeout(timer);
    };
  }, [enabled, isHidden]);

  if (!shouldMount) return null;

  return <MusicPlayer hidden={isHidden || !enabled} />;
}
