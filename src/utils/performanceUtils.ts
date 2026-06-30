/**
 * 性能优化工具函数
 * 提供防抖、节流、懒加载等常用性能优化功能
 */

/**
 * 防抖函数
 * 延迟执行，如果在延迟期间再次调用则重新计时
 * 适用于：搜索输入、窗口调整等高频触发事件
 * 
 * @param fn 要执行的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  // 使用 ReturnType<typeof setTimeout> 以获得更好的跨环境兼容性
  let timer: ReturnType<typeof setTimeout> | null = null;
  
  return function (...args: Parameters<T>) {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}

/**
 * 节流函数
 * 在指定时间间隔内只执行一次
 * 适用于：滚动事件、鼠标移动等连续触发事件
 * 
 * @param fn 要执行的函数
 * @param interval 时间间隔（毫秒）
 * @returns 节流后的函数
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  
  return function (...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn(...args);
    }
  };
}

/**
 * 使用 requestIdleCallback 在浏览器空闲时执行任务
 * 适用于：非关键任务的延迟执行
 * 
 * @param callback 要执行的回调函数
 * @param timeout 超时时间（毫秒）
 */
export function runWhenIdle(callback: () => void, timeout?: number): void {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(callback, { timeout });
  } else {
    // 降级方案：使用 setTimeout
    setTimeout(callback, 1);
  }
}

/**
 * 使用 Intersection Observer 实现元素可见性检测
 * 适用于：懒加载、无限滚动等场景
 * 
 * @param element 要观察的元素
 * @param callback 可见性变化时的回调
 * @param options 观察选项
 * @returns 清理函数
 */
export function observeVisibility(
  element: Element,
  callback: (isVisible: boolean) => void,
  options?: IntersectionObserverInit
): () => void {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      callback(entry.isIntersecting);
    });
  }, options);
  
  observer.observe(element);
  
  return () => {
    observer.disconnect();
  };
}

/**
 * 性能监控工具
 * 用于测量代码执行时间
 */
export const performanceMonitor = {
  /**
   * 开始计时
   */
  start(label: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-start`);
    }
  },
  
  /**
   * 结束计时并输出结果
   */
  end(label: string): void {
    if (typeof performance !== 'undefined') {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label)[0];
      if (measure && process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${label}: ${measure.duration.toFixed(2)}ms`);
      }
    }
  },
  
  /**
   * 清除所有测量数据
   */
  clear(): void {
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
};

/**
 * 批量处理函数
 * 将大量数据分批处理，避免阻塞主线程
 * 
 * @param items 要处理的数据数组
 * @param processor 处理函数
 * @param batchSize 每批处理的数量
 * @param onProgress 进度回调
 */
export async function batchProcess<T, R>(
  items: T[],
  processor: (item: T) => R,
  batchSize: number = 10,
  onProgress?: (completed: number, total: number) => void
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = batch.map(processor);
    results.push(...batchResults);
    
    if (onProgress) {
      onProgress(Math.min(i + batchSize, items.length), items.length);
    }
    
    // 让出主线程
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return results;
}

/**
 * 内存缓存工具
 * 简单的键值对缓存，支持过期时间
 */
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();
  private defaultTTL: number;
  
  constructor(defaultTTL: number = 5 * 60 * 1000) { // 默认5分钟
    this.defaultTTL = defaultTTL;
  }
  
  /**
   * 设置缓存
   */
  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }
  
  /**
   * 获取缓存
   */
  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }
  
  /**
   * 检查是否存在
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }
  
  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * 清理过期项
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * 创建全局缓存实例
 */
export const globalCache = new MemoryCache<unknown>();

/**
 * 使用 Web Worker 执行耗时任务
 * 适用于：复杂计算、大数据处理等
 * 
 * @param workerScript Worker 脚本代码
 * @param data 传递给 Worker 的数据
 * @returns Promise 返回结果
 */
export function runInWorker<T, R>(
  workerScript: string,
  data: T
): Promise<R> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([workerScript], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };
    
    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };
    
    worker.postMessage(data);
  });
}

/**
 * 图片懒加载辅助函数
 * 用于判断图片是否应该加载
 */
export function shouldLoadImage(
  imgElement: HTMLImageElement,
  rootMargin: string = '200px'
): Promise<boolean> {
  return new Promise((resolve) => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            resolve(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin }
    );
    
    observer.observe(imgElement);
  });
}

/**
 * 预加载图片
 * 在需要显示前提前加载图片资源
 * 
 * @param src 图片地址
 * @returns Promise
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * 预加载关键资源
 * 用于首屏关键资源的预加载
 * 
 * @param resources 资源地址数组
 */
export async function preloadCriticalResources(resources: string[]): Promise<void> {
  const promises = resources.map(async (src) => {
    if (src.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      await preloadImage(src);
    }
    // 可以扩展支持其他资源类型
  });
  
  await Promise.all(promises);
}
