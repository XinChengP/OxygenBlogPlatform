'use client';

import { usePathname } from 'next/navigation';
import React, { useMemo } from 'react';
import LuoTianyiLive2D from './LuoTianyiLive2D';

/**
 * Live2D 控制器组件
 *
 * 为了实现在页面切换时不重新加载 Live2D，本组件始终保持挂载，
 * 仅通过 CSS 控制显示/隐藏。被隐藏的页面（首页、404、后台）中，
 * Live2D 仍然存在于 DOM 中，只是不可见且不显示消息。
 */
export default function Live2DController() {
  const pathname = usePathname();

  // 计算当前是否需要隐藏 Live2D
  const isHidden = useMemo(() => {
    // 路径未确定时默认隐藏，避免水合前闪现
    if (pathname === null) {
      return true;
    }
    // 首页、404 页面、不存在的路由以及后台管理页面都隐藏 Live2D
    return (
      pathname === '/' ||
      pathname === '/404' ||
      pathname === '/not-found' ||
      pathname === '/_not-found/page' ||
      pathname.startsWith('/admin')
    );
  }, [pathname]);

  // 始终渲染 LuoTianyiLive2D，通过 hidden 属性控制显隐
  return <LuoTianyiLive2D hidden={isHidden} />;
}