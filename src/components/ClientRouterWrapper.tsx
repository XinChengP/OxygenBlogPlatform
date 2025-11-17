'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * 客户端路由包装器 - 优化路由切换性能
 * 防止页面切换时重复加载资源
 */
export default function ClientRouterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previousPathRef = useRef<string>('');
  const isFirstRenderRef = useRef<boolean>(true);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      previousPathRef.current = pathname;
      return;
    }

    // 只在真正切换页面时执行清理
    if (previousPathRef.current !== pathname) {
      // 检查是否是博客文章之间的切换
      const isBlogPostSwitch = 
        previousPathRef.current.includes('/blogs/') && 
        pathname.includes('/blogs/');

      if (isBlogPostSwitch) {
        // 博客文章间切换，保持图片缓存状态
        console.log('Blog post navigation detected, preserving image cache');
        
        // 确保全局缓存状态正确传递
        if (typeof window !== 'undefined') {
          const currentCache = (window as any).__imageCache;
          if (currentCache) {
            console.log('Global image cache preserved with', currentCache.size, 'entries');
          }
        }
      } else {
        // 其他页面切换，可以清理缓存
        console.log('Page navigation detected, path:', pathname);
        
        // 非博客页面切换时，选择性清理缓存
        if (typeof window !== 'undefined' && (window as any).__imageCache) {
          // 只清理非博客相关的图片缓存
          const cache = (window as any).__imageCache;
          const entriesToKeep = Array.from(cache.entries()).filter(([src]) => 
            src.includes('/blogs/') || src.includes('coverImage')
          );
          
          (window as any).__imageCache = new Map(entriesToKeep);
          console.log('Selective cache cleanup completed');
        }
      }

      previousPathRef.current = pathname;
    }
  }, [pathname]);

  return <>{children}</>;
}