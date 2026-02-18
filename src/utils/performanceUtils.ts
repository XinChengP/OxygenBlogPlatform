/**
 * 性能优化工具
 * 提供图片懒加载、缓存、防抖等功能
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * 图片懒加载Hook
 */
export function useLazyImage(src: string, options?: IntersectionObserverInit) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageRef, setImageRef] = useState<HTMLImageElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    if (!imageRef) return;
    
    // 清理之前的观察者
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    // 创建新的观察者
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      {
        rootMargin: '50px', // 提前50px开始加载
        threshold: 0.1,
        ...options
      }
    );
    
    observerRef.current.observe(imageRef);
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [src, imageRef, options]);
  
  return { imageSrc, setImageRef };
}

/**
 * 防抖Hook
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
  
  // 清理函数
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback as T;
}

/**
 * 节流Hook
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const throttledCallback = useCallback((...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;
    
    if (timeSinceLastCall >= delay) {
      // 立即执行
      lastCallRef.current = now;
      callback(...args);
    } else {
      // 延迟执行
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]);
  
  // 清理函数
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return throttledCallback as T;
}

/**
 * 内存缓存管理器
 */
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  private cleanupInterval: NodeJS.Timeout;
  
  constructor(
    private defaultTTL: number = 5 * 60 * 1000, // 默认5分钟
    private cleanupIntervalMs: number = 60 * 1000 // 每分钟清理一次
  ) {
    // 启动定时清理
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);
  }
  
  /**
   * 设置缓存
   */
  set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expires });
  }
  
  /**
   * 获取缓存
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    
    if (!item) {
      return undefined;
    }
    
    // 检查是否过期
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  /**
   * 删除缓存
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }
  
  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }
  
  /**
   * 清理过期项
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    }
  }
  
  /**
   * 销毁缓存管理器
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

/**
 * 图片预加载器
 */
export class ImagePreloader {
  private cache = new Map<string, HTMLImageElement>();
  
  /**
   * 预加载图片
   */
  async preload(url: string): Promise<HTMLImageElement> {
    // 检查缓存
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        this.cache.set(url, img);
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error(`Failed to load image: ${url}`));
      };
      
      img.src = url;
    });
  }
  
  /**
   * 批量预加载图片
   */
  async preloadBatch(urls: string[]): Promise<HTMLImageElement[]> {
    const promises = urls.map(url => this.preload(url));
    return Promise.all(promises);
  }
  
  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * 获取缓存大小
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * 虚拟滚动Hook（用于长列表）
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const scrollTopRef = useRef(0);
  
  const totalHeight = items.length * itemHeight;
  const visibleCount = Math.ceil(containerHeight / itemHeight) + 2; // 多渲染2个作为缓冲
  
  const handleScroll = useCallback((scrollTop: number) => {
    scrollTopRef.current = scrollTop;
    
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(start + visibleCount, items.length);
    
    setVisibleRange({ start, end });
  }, [itemHeight, visibleCount, items.length]);
  
  const visibleItems = items.slice(visibleRange.start, visibleRange.end);
  const offsetTop = visibleRange.start * itemHeight;
  
  return {
    visibleItems,
    offsetTop,
    totalHeight,
    handleScroll
  };
}

/**
 * 全局性能监控
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private enabled = process.env.NODE_ENV === 'development';
  
  /**
   * 记录性能指标
   */
  record(name: string, value: number): void {
    if (!this.enabled) return;
    
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    this.metrics.get(name)!.push(value);
    
    // 限制记录数量
    const values = this.metrics.get(name)!;
    if (values.length > 100) {
      values.shift();
    }
  }
  
  /**
   * 获取平均性能
   */
  getAverage(name: string): number {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return 0;
    
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }
  
  /**
   * 获取性能报告
   */
  getReport(): Record<string, { average: number; count: number; min: number; max: number }> {
    const report: Record<string, { average: number; count: number; min: number; max: number }> = {};
    
    for (const [name, values] of this.metrics.entries()) {
      if (values.length === 0) continue;
      
      const average = this.getAverage(name);
      const min = Math.min(...values);
      const max = Math.max(...values);
      
      report[name] = {
        average: Math.round(average * 100) / 100,
        count: values.length,
        min: Math.round(min * 100) / 100,
        max: Math.round(max * 100) / 100
      };
    }
    
    return report;
  }
  
  /**
   * 清空所有指标
   */
  clear(): void {
    this.metrics.clear();
  }
  
  /**
   * 打印性能报告
   */
  printReport(): void {
    if (!this.enabled) return;
    
    const report = this.getReport();
    console.group('📊 性能监控报告');
    
    for (const [name, stats] of Object.entries(report)) {
      console.log(
        `%c${name}: %c平均 ${stats.average}ms (最小: ${stats.min}ms, 最大: ${stats.max}ms, 次数: ${stats.count})`,
        'font-weight: bold; color: #3b82f6',
        'color: #6b7280'
      );
    }
    
    if (Object.keys(report).length === 0) {
      console.log('暂无性能数据');
    }
    
    console.groupEnd();
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

/**
 * 测量函数执行时间
 */
export function measurePerformance<T extends (...args: any[]) => any>(
  fn: T,
  name?: string
): T {
  const functionName = name || fn.name || 'anonymous';
  
  return ((...args: Parameters<T>) => {
    const start = performance.now();
    
    try {
      const result = fn(...args);
      
      // 如果返回的是Promise，等待其完成
      if (result instanceof Promise) {
        return result.finally(() => {
          const end = performance.now();
          performanceMonitor.record(functionName, end - start);
        });
      }
      
      const end = performance.now();
      performanceMonitor.record(functionName, end - start);
      return result;
    } catch (error) {
      const end = performance.now();
      performanceMonitor.record(functionName, end - start);
      throw error;
    }
  }) as T;
}