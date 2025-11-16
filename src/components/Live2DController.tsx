'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import LuoTianyiLive2D from './LuoTianyiLive2D';

/**
 * Live2D控制器组件
 * 根据当前路径条件渲染LuoTianyiLive2D组件
 */
export default function Live2DController() {
  const pathname = usePathname();
  const router = useRouter();
  const [is404Page, setIs404Page] = useState(false);
  
  console.log('[Live2DController] Current pathname:', pathname);
  
  // 检测404页面的状态
  useEffect(() => {
    const check404Status = () => {
      // 多种方式检测404页面
      const is404 = 
        // 方式1: 检查页面标题是否包含404
        (typeof document !== 'undefined' && document.title.includes('404')) ||
        // 方式2: 检查body class是否包含not-found
        (typeof document !== 'undefined' && document.body.classList.contains('not-found')) ||
        // 方式3: 检查URL路径模式（不匹配已知路由）
        !isKnownRoute(pathname);
      
      setIs404Page(is404);
      
      if (is404) {
        console.log('🚫 404页面检测成功 - 隐藏Live2D');
      }
    };
    
    // 延迟检查确保页面完全加载
    const timer = setTimeout(check404Status, 500);
    return () => clearTimeout(timer);
  }, [pathname]);
  
  // 检查是否为已知路由
  const isKnownRoute = (path: string): boolean => {
    const knownRoutes = [
      '/',
      '/about',
      '/blogs',
      '/archive', 
      '/test',
      '/settings',
      '/guestbook',
      '/tools',
      '/not-found',
      '/404',
      '/_not-found/page'
    ];
    
    // 检查路径是否匹配已知路由或包含已知前缀
    return knownRoutes.some(route => {
      if (route === path) return true;
      if (path.startsWith(route + '/')) return true;
      return false;
    });
  };
  
  // 强制调试输出
  if (typeof window !== 'undefined') {
    console.log('🔍 Live2DController RENDERED:', { 
      pathname, 
      is404Page,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent.substring(0, 50) + '...'
    });
  }
  
  // 简化的显示逻辑：只在首页和404页面隐藏，其他页面都由ConditionalComponents控制
  const hideLive2D = pathname === '/' || pathname === '/404';
  
  console.log('[Live2DController] Hide Live2D:', hideLive2D);
  
  // 详细调试信息
  if (typeof window !== 'undefined') {
    console.log('🔍 Live2DController Debug:', {
      pathname,
      hideLive2D,
      is404Page,
      timestamp: new Date().toISOString(),
      conditions: {
        isRoot: pathname === '/',
        isNotFound: pathname === '/not-found',
        is404: pathname === '/404',
        isNotFoundPage: pathname === '/_not-found/page',
        startsWith404: pathname.startsWith('/404'),
        includesNonexistent: pathname.includes('/nonexistent'),
        includesNotFound: pathname.includes('not-found'),
        is404Page,
        notBlogs: !pathname.startsWith('/blogs'),
        notArchive: !pathname.startsWith('/archive'),
        notAbout: !pathname.startsWith('/about'),
        notTest: !pathname.startsWith('/test'),
        notSettings: !pathname.startsWith('/settings'),
        notGuestbook: !pathname.startsWith('/guestbook'),
        notTools: !pathname.startsWith('/tools')
      }
    });
  }
  
  if (hideLive2D) {
    if (typeof window !== 'undefined') {
      console.log('🚫 Live2DController: Hiding Live2D for path:', pathname, '404Page:', is404Page);
    }
    return null;
  }
  
  if (typeof window !== 'undefined') {
    console.log('✅ Live2DController: Showing Live2D for path:', pathname);
  }
  
  return <LuoTianyiLive2D />;
}