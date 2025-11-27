import { useEffect, useRef, useState, useCallback } from 'react';
import { PreloadManager } from '@/utils/musicPlayerPreloader';

// 音乐播放器优化Hook
export function useMusicPlayerOptimized() {
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const preloadManagerRef = useRef(PreloadManager.getInstance());
  const abortControllerRef = useRef<AbortController | null>(null);

  // 预加载音乐资源
  const preloadMusicResources = useCallback(async (musicList: any[], basePath: string = '') => {
    // 取消之前的预加载
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    const { signal } = abortControllerRef.current;
    
    setIsPreloaded(false);
    setPreloadProgress(0);
    
    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        if (signal.aborted) {
          clearInterval(progressInterval);
          return;
        }
        
        setPreloadProgress(prev => {
          const next = prev + 10;
          return next >= 90 ? 90 : next;
        });
      }, 100);
      
      // 预加载关键资源
      await preloadManagerRef.current.preloadCriticalResources(musicList, basePath);
      
      if (signal.aborted) return;
      
      clearInterval(progressInterval);
      setPreloadProgress(100);
      setIsPreloaded(true);
      
      // 在空闲时间预加载剩余资源
      preloadManagerRef.current.preloadInIdleTime(musicList, basePath);
      
    } catch (error) {
      if (!signal.aborted) {
        console.warn('音乐资源预加载失败:', error);
      }
    }
  }, []);

  // 检查资源是否已预加载
  const isResourcePreloaded = useCallback((url: string) => {
    return preloadManagerRef.current.getPreloadStatus(url);
  }, []);

  // 清除预加载缓存
  const clearPreloadCache = useCallback(() => {
    preloadManagerRef.current.clearAllCaches();
    setIsPreloaded(false);
    setPreloadProgress(0);
  }, []);

  // 清理函数
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isPreloaded,
    preloadProgress,
    preloadMusicResources,
    isResourcePreloaded,
    clearPreloadCache
  };
}

// 音乐播放器性能监控Hook
export function useMusicPlayerMonitor() {
  const [metrics, setMetrics] = useState({
    loadTime: 0,
    initializationTime: 0,
    memoryUsage: 0,
    errorCount: 0
  });
  
  const startTimeRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

  // 开始性能监控
  const startMonitoring = useCallback(() => {
    startTimeRef.current = performance.now();
    errorCountRef.current = 0;
  }, []);

  // 记录加载完成
  const recordLoadComplete = useCallback(() => {
    const loadTime = performance.now() - startTimeRef.current;
    
    if ('memory' in performance) {
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo.usedJSHeapSize / 1024 / 1024; // MB
      
      setMetrics(prev => ({
        ...prev,
        loadTime,
        memoryUsage
      }));
    } else {
      setMetrics(prev => ({
        ...prev,
        loadTime
      }));
    }
  }, []);

  // 记录初始化完成
  const recordInitializationComplete = useCallback(() => {
    const initializationTime = performance.now() - startTimeRef.current;
    
    setMetrics(prev => ({
      ...prev,
      initializationTime
    }));
  }, []);

  // 记录错误
  const recordError = useCallback(() => {
    errorCountRef.current++;
    
    setMetrics(prev => ({
      ...prev,
      errorCount: errorCountRef.current
    }));
  }, []);

  // 获取性能报告
  const getPerformanceReport = useCallback(() => {
    return {
      ...metrics,
      performanceScore: calculatePerformanceScore(metrics),
      recommendations: generateRecommendations(metrics)
    };
  }, [metrics]);

  return {
    metrics,
    startMonitoring,
    recordLoadComplete,
    recordInitializationComplete,
    recordError,
    getPerformanceReport
  };
}

// 计算性能分数
function calculatePerformanceScore(metrics: any): number {
  let score = 100;
  
  // 基于加载时间扣分
  if (metrics.loadTime > 3000) score -= 30;
  else if (metrics.loadTime > 2000) score -= 20;
  else if (metrics.loadTime > 1000) score -= 10;
  
  // 基于内存使用扣分
  if (metrics.memoryUsage > 50) score -= 20;
  else if (metrics.memoryUsage > 30) score -= 10;
  
  // 基于错误数量扣分
  score -= metrics.errorCount * 10;
  
  return Math.max(0, score);
}

// 生成优化建议
function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = [];
  
  if (metrics.loadTime > 2000) {
    recommendations.push('考虑启用资源预加载以加快加载速度');
  }
  
  if (metrics.memoryUsage > 30) {
    recommendations.push('内存使用较高，考虑优化资源缓存策略');
  }
  
  if (metrics.errorCount > 0) {
    recommendations.push('存在加载错误，建议检查资源路径和网络连接');
  }
  
  return recommendations;
}

// 音乐播放器懒加载Hook
export function useMusicPlayerLazy() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // 设置懒加载观察
  const setupLazyLoad = useCallback((elementRef: React.RefObject<HTMLElement>, options?: IntersectionObserverInit) => {
    if (!elementRef.current) return;

    // 清理之前的观察者
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    const defaultOptions: IntersectionObserverInit = {
      rootMargin: '100px', // 提前100px开始加载
      threshold: 0.1
    };

    const observerOptions = { ...defaultOptions, ...options };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !shouldLoad) {
          setShouldLoad(true);
          observerRef.current?.disconnect();
        }
      });
    }, observerOptions);

    observerRef.current.observe(elementRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [shouldLoad]);

  return {
    shouldLoad,
    setupLazyLoad
  };
}