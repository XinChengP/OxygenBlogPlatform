'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

// 动态导入浮动控件与灯笼，减少首屏 bundle 体积和 hydration 开销
const ScrollToTop = dynamic(() => import('./ScrollToTop'), { ssr: false });
const Lantern = dynamic(() => import('./Lantern'), { ssr: false });

// 使用 React.memo 减少不必要的渲染
export default React.memo(function ConditionalComponents() {
  const pathname = usePathname();
  const [showLanterns, setShowLanterns] = useState(false);

  // 显示灯笼（根据农历日期：北方小年到元宵节期间）
  // 农历库只在客户端按需加载，不进入首屏依赖图
  useEffect(() => {
    let cancelled = false;
    import('@/utils/lunarDateUtils')
      .then(({ isLanternDisplayPeriod }) => {
        if (!cancelled) setShowLanterns(isLanternDisplayPeriod());
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // 计算是否需要显示 ScrollToTop 组件
  const showScrollToTop = useMemo(() => {
    return pathname !== '/';
  }, [pathname]);

  return (
    <>
      {/* 红灯笼组件 - 后台页面不显示 */}
      {showLanterns && !pathname.startsWith('/admin') && <Lantern text="新春快乐" enabled={true} />}
      {/* ScrollToTop 组件 - 除首页外所有页面显示 - 后台页面不显示 */}
      {showScrollToTop && !pathname.startsWith('/admin') && <ScrollToTop />}
    </>
  );
});