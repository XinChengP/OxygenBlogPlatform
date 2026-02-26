/**
 * Live2D 增强加载器
 * 提供可靠的资源加载、错误重试、超时处理和性能监控
 */

export interface LoadOptions {
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  priority?: 'high' | 'normal' | 'low';
  cache?: boolean;
}

export interface LoadResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  loadTime: number;
  retryCount: number;
  fromCache?: boolean;
}

export interface LoaderStats {
  totalLoads: number;
  successfulLoads: number;
  failedLoads: number;
  cacheHits: number;
  averageLoadTime: number;
  totalRetries: number;
}

// 资源缓存
const resourceCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5分钟缓存

// 加载统计
const loaderStats: LoaderStats = {
  totalLoads: 0,
  successfulLoads: 0,
  failedLoads: 0,
  cacheHits: 0,
  averageLoadTime: 0,
  totalRetries: 0,
};

/**
 * 带超时和重试的 fetch 加载
 */
export async function loadWithRetry<T>(
  url: string,
  options: LoadOptions = {}
): Promise<LoadResult<T>> {
  const {
    timeout = 30000,
    retryCount = 3,
    retryDelay = 1000,
    cache = true,
  } = options;

  const startTime = performance.now();
  let lastError: Error | null = null;
  let currentRetry = 0;

  // 检查缓存
  if (cache) {
    const cached = resourceCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      loaderStats.cacheHits++;
      return {
        success: true,
        data: cached.data,
        loadTime: 0,
        retryCount: 0,
        fromCache: true,
      };
    }
  }

  loaderStats.totalLoads++;

  for (let attempt = 0; attempt <= retryCount; attempt++) {
    try {
      const result = await loadWithTimeout<T>(url, timeout);

      // 更新缓存
      if (cache) {
        resourceCache.set(url, { data: result, timestamp: Date.now() });
      }

      const loadTime = performance.now() - startTime;
      loaderStats.successfulLoads++;
      loaderStats.totalRetries += currentRetry;
      updateAverageLoadTime(loadTime);

      return {
        success: true,
        data: result,
        loadTime,
        retryCount: currentRetry,
      };
    } catch (error) {
      lastError = error as Error;
      currentRetry = attempt;

      console.warn(`[Live2DLoader] 加载失败 (尝试 ${attempt + 1}/${retryCount + 1}): ${url}`, error);

      if (attempt < retryCount) {
        // 指数退避延迟
        const delay = retryDelay * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  const loadTime = performance.now() - startTime;
  loaderStats.failedLoads++;

  return {
    success: false,
    error: lastError || new Error('加载失败'),
    loadTime,
    retryCount: currentRetry,
  };
}

/**
 * 带超时的加载
 */
async function loadWithTimeout<T>(url: string, timeout: number): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'max-age=3600',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 根据内容类型返回不同格式
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return await response.json() as T;
    } else if (contentType.includes('text/')) {
      return await response.text() as unknown as T;
    } else {
      return await response.blob() as unknown as T;
    }
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * 加载脚本（带重试）
 */
export function loadScriptWithRetry(
  src: string,
  options: LoadOptions = {}
): Promise<LoadResult<void>> {
  const {
    timeout = 30000,
    retryCount = 3,
    retryDelay = 1000,
  } = options;

  const startTime = performance.now();
  let currentRetry = 0;

  loaderStats.totalLoads++;

  return new Promise((resolve) => {
    const attemptLoad = (attempt: number) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;

      const timeoutId = setTimeout(() => {
        script.remove();
        handleError(new Error('加载超时'));
      }, timeout);

      script.onload = () => {
        clearTimeout(timeoutId);
        const loadTime = performance.now() - startTime;
        loaderStats.successfulLoads++;
        loaderStats.totalRetries += currentRetry;
        updateAverageLoadTime(loadTime);

        resolve({
          success: true,
          loadTime,
          retryCount: currentRetry,
        });
      };

      script.onerror = () => {
        clearTimeout(timeoutId);
        script.remove();
        handleError(new Error('脚本加载失败'));
      };

      const handleError = (error: Error) => {
        currentRetry = attempt;
        console.warn(`[Live2DLoader] 脚本加载失败 (尝试 ${attempt + 1}/${retryCount + 1}): ${src}`, error);

        if (attempt < retryCount) {
          const delay = retryDelay * Math.pow(2, attempt);
          setTimeout(() => attemptLoad(attempt + 1), delay);
        } else {
          const loadTime = performance.now() - startTime;
          loaderStats.failedLoads++;

          resolve({
            success: false,
            error,
            loadTime,
            retryCount: currentRetry,
          });
        }
      };

      document.head.appendChild(script);
    };

    attemptLoad(0);
  });
}

/**
 * 并行加载多个资源
 */
export async function loadMultiple<T>(
  urls: { url: string; options?: LoadOptions }[],
  maxConcurrent = 3
): Promise<LoadResult<T>[]> {
  const results: LoadResult<T>[] = [];

  for (let i = 0; i < urls.length; i += maxConcurrent) {
    const batch = urls.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map(({ url, options }) => loadWithRetry<T>(url, options))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * 预加载关键资源
 */
export async function preloadCriticalResources(
  resources: { url: string; type: 'script' | 'json' | 'image' | 'model' }[]
): Promise<{ success: boolean; failed: string[] }> {
  const failed: string[] = [];

  const loadPromises = resources.map(async ({ url, type }) => {
    try {
      if (type === 'script') {
        const result = await loadScriptWithRetry(url, { retryCount: 3, timeout: 30000 });
        if (!result.success) {
          failed.push(url);
        }
      } else {
        const result = await loadWithRetry(url, { retryCount: 3, cache: true });
        if (!result.success) {
          failed.push(url);
        }
      }
    } catch {
      failed.push(url);
    }
  });

  await Promise.all(loadPromises);

  return {
    success: failed.length === 0,
    failed,
  };
}

/**
 * 检查资源是否存在
 */
export async function checkResourceExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD', cache: 'no-cache' });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 获取加载统计
 */
export function getLoaderStats(): LoaderStats {
  return { ...loaderStats };
}

/**
 * 重置加载统计
 */
export function resetLoaderStats(): void {
  loaderStats.totalLoads = 0;
  loaderStats.successfulLoads = 0;
  loaderStats.failedLoads = 0;
  loaderStats.cacheHits = 0;
  loaderStats.averageLoadTime = 0;
  loaderStats.totalRetries = 0;
}

/**
 * 清除资源缓存
 */
export function clearResourceCache(): void {
  resourceCache.clear();
  console.log('[Live2DLoader] 资源缓存已清除');
}

/**
 * 更新平均加载时间
 */
function updateAverageLoadTime(newTime: number): void {
  const total = loaderStats.successfulLoads;
  const current = loaderStats.averageLoadTime;
  loaderStats.averageLoadTime = (current * (total - 1) + newTime) / total;
}

/**
 * 延迟函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 创建加载进度追踪器
 */
export function createProgressTracker(
  totalItems: number,
  onProgress: (progress: number, loaded: number, failed: number) => void
) {
  let loaded = 0;
  let failed = 0;

  return {
    onItemLoaded: (success: boolean) => {
      if (success) {
        loaded++;
      } else {
        failed++;
      }
      const progress = ((loaded + failed) / totalItems) * 100;
      onProgress(progress, loaded, failed);
    },
    getProgress: () => ({
      progress: ((loaded + failed) / totalItems) * 100,
      loaded,
      failed,
      remaining: totalItems - loaded - failed,
    }),
  };
}
