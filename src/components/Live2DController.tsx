'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import LuoTianyiLive2D from './LuoTianyiLive2D';

/**
 * Live2D控制器组件
 * 根据当前路径条件渲染LuoTianyiLive2D组件
 */
export default function Live2DController() {
  const pathname = usePathname();
  const [isClient, setIsClient] = useState(false);
  
  // 确保客户端挂载完成
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // 检查是否为已知路由
  const isKnownRoute = useMemo(() => {
    const knownRoutes = [
      '/about',
      '/blogs',
      '/archive', 
      '/test',
      '/settings',
      '/guestbook',
      '/tools'
    ];
    
    // 检查路径是否匹配已知路由或包含已知前缀
    return knownRoutes.some(route => {
      if (route === pathname) return true;
      if (pathname.startsWith(route + '/')) return true;
      return false;
    });
  }, [pathname]);
  
  // 简化的显示逻辑：只在首页和404页面隐藏，其他页面都显示
  const shouldShowLive2D = useMemo(() => {
    // 只在首页(/)、404页面和不存在的路由隐藏Live2D
    return pathname !== '/' && pathname !== '/404' && pathname !== '/not-found' && pathname !== '/_not-found/page' && isKnownRoute;
  }, [pathname, isKnownRoute]);
  
  if (!shouldShowLive2D) {
    return null;
  }
  
  return <LuoTianyiLive2D />;
}