'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/**
 * 客户端路由包装器
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
      console.log('Page navigation detected, path:', pathname);
      previousPathRef.current = pathname;
    }
  }, [pathname]);

  return <>{children}</>;
}