'use client';

import { lazy, Suspense, useMemo, useState, useEffect, useRef } from 'react';

// 懒加载大型组件
const Sparkles = lazy(() => import('@/components/ui/sparkles').then(module => ({ default: module.SparklesCore })));
const Timeline = lazy(() => import('@/components/ui/timeline').then(module => ({ default: module.Timeline })));
const EvervaultCard = lazy(() => import('@/components/ui/evervault-card').then(module => ({ default: module.EvervaultCard })));

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
  // React.lazy组件不支持preload方法
  // 这里可以添加其他预加载逻辑
};

// 按需加载工具函数
export const loadComponent = (componentName: string) => {
  switch (componentName) {
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