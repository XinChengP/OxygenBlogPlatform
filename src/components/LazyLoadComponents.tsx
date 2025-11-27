'use client';

import { lazy, Suspense, useMemo, useState, useEffect, useRef } from 'react';

// 懒加载大型组件
const MagicCard = lazy(() => import('@/components/magicui/magic-card'));
const Sparkles = lazy(() => import('@/components/magicui/sparkles'));
const Timeline = lazy(() => import('@/components/magicui/timeline'));
const EvervaultCard = lazy(() => import('@/components/magicui/evervault-card'));

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
}

// 基于Intersection Observer的懒加载包装器
export function LazyLoadWrapper({ children, fallback = null, threshold = 0.1 }: LazyLoadWrapperProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  if (!isVisible) {
    return (
      <div ref={elementRef} className="min-h-[200px]">
        {fallback}
      </div>
    );
  }

  return <>{children}</>;
}

// 优化的大型组件加载器
export function OptimizedMagicCard(props: any) {
  return (
    <Suspense fallback={<div className="w-full h-64 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />}>
      <MagicCard {...props} />
    </Suspense>
  );
}

export function OptimizedSparkles(props: any) {
  return (
    <Suspense fallback={<div className="w-full h-32 bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse rounded-lg" />}>
      <Sparkles {...props} />
    </Suspense>
  );
}

export function OptimizedTimeline(props: any) {
  return (
    <Suspense fallback={<div className="w-full h-96 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />}>
      <Timeline {...props} />
    </Suspense>
  );
}

export function OptimizedEvervaultCard(props: any) {
  return (
    <Suspense fallback={<div className="w-full h-80 bg-gray-200 dark:bg-gray-800 animate-pulse rounded-lg" />}>
      <EvervaultCard {...props} />
    </Suspense>
  );
}

// 工具函数：预加载关键组件
export const preloadComponents = () => {
  // 预加载关键组件
  MagicCard.preload?.();
  Sparkles.preload?.();
  Timeline.preload?.();
  EvervaultCard.preload?.();
};

// 按需加载工具函数
export const loadComponent = (componentName: string) => {
  switch (componentName) {
    case 'MagicCard':
      return MagicCard;
    case 'Sparkles':
      return Sparkles;
    case 'Timeline':
      return Timeline;
    case 'EvervaultCard':
      return EvervaultCard;
    default:
      return null;
  }
};