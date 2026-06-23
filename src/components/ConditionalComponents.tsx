'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import ScrollToTop from './ScrollToTop';
import { isLanternDisplayPeriod } from '@/utils/lunarDateUtils';

// 动态导入红灯笼组件，减少首屏 bundle 体积和 hydration 开销
const Lantern = dynamic(() => import('./Lantern'), { ssr: false });

// 使用 React.memo 减少不必要的渲染
export default React.memo(function ConditionalComponents() {
  const pathname = usePathname();
  const [showLanterns, setShowLanterns] = useState(false);

  // 显示灯笼（根据农历日期：北方小年到元宵节期间）
  useEffect(() => {
    setShowLanterns(isLanternDisplayPeriod());
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