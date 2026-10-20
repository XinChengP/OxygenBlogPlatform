'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface DeferredMountProps {
  children: ReactNode;
  /**
   * 占位高度：在真正挂载前撑住布局，避免图表/地图晚到把下方内容顶开。
   */
  minHeight?: number | string;
  /** 提前多少距离开始挂载，默认 400px（约一屏的 1/3） */
  rootMargin?: string;
  className?: string;
}

/**
 * 进入视口附近才挂载子树。
 *
 * 用于 about 的 recharts 技能雷达 / Leaflet 地图、changelogs 的统计图表：
 * 这些库体积大（recharts ~155KB gzip、leaflet ~42KB gzip），
 * 但都在页面下方，没必要和首屏内容抢带宽与主线程。
 */
export default function DeferredMount({
  children,
  minHeight = 240,
  rootMargin = '400px 0px',
  className = '',
}: DeferredMountProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 老浏览器直接挂载，避免内容永远不出现
    if (typeof IntersectionObserver === 'undefined') {
      setMounted(true);
      return;
    }

    const target = containerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [rootMargin]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={mounted ? undefined : { minHeight }}
    >
      {mounted ? children : null}
    </div>
  );
}
