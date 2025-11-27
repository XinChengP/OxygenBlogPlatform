/**
 * Live2D 资源管理器 - 增强版
 * 负责Live2D资源的预加载、缓存、错误处理和性能优化
 */

export interface Live2DResourceConfig {
  modelPath: string;
  texturePath: string;
  motionPath: string;
  soundPath?: string;
  priority: number; // 加载优先级 1-10
  preload: boolean; // 是否预加载
  cache: boolean; // 是否缓存
  retryCount: number; // 重试次数
  timeout: number; // 加载超时时间
}

export interface ResourceLoadResult {
  success: boolean;
  resource: string;
  loadTime: number;
  size?: number;
  error?: string;
  retryCount: number;
}

interface CachedResource {
  data: any;
  size: number;
  loadTime: number;
  accessTime: number;
  accessCount: number;
  priority: number;
}

interface LoadingTask {
  url: string;
  type: 'model' | 'texture' | 'motion' | 'sound';
  priority: number;
  retryCount: number;
  startTime: number;
  resolve: (result: ResourceLoadResult) => void;
  reject: (error: Error) => void;
}

class Live2DResourceManager {
  private cache: Map<string, CachedResource> = new Map();
  private loadingTasks: Map<string, LoadingTask> = new Map();
  private loadHistory: ResourceLoadResult[] = [];
  private performanceStats: {
    totalLoads: number;
    cacheHits: number;
    cacheMisses: number;
    totalLoadTime: number;
    totalSize: number;
    errors: number;
  } = {
    totalLoads: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalLoadTime: 0,
    totalSize: 0,
    errors: 0
  };

  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly MAX_HISTORY_SIZE = 1000;
  private readonly DEFAULT_TIMEOUT = 30000; // 30秒
  private readonly DEFAULT_RETRY_COUNT = 3;

  private maxConcurrentLoads = 6; // 最大并发加载数
  private currentLoadCount = 0;

  /**
   * 预加载资源
   */
  async preloadResources(configs: Live2DResourceConfig[]): Promise<ResourceLoadResult[]> {
    console.log(`[Live2DResourceManager] 开始预加载 ${configs.length} 个资源`);
    
    // 按优先级排序
    const sortedConfigs = [...configs].sort((a, b) => b.priority - a.priority);
    
    // 分批加载，避免并发过多
    const batchSize = this.maxConcurrentLoads;
    const results: ResourceLoadResult[] = [];
    
    for (let i = 0; i < sortedConfigs.length; i += batchSize) {
      const batch = sortedConfigs.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(config => this.loadResource(config))
      );
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            resource: batch[index].modelPath,
            loadTime: 0,
            error: result.reason?.message || '加载失败',
            retryCount: 0
          });
        }
      });
    }
    
    console.log(`[Live2DResourceManager] 预加载完成，成功 ${results.filter(r => r.success).length}/${results.length}`);
    return results;
  }

  /**
   * 加载单个资源
   */
  async loadResource(config: Live2DResourceConfig): Promise<ResourceLoadResult> {
    const startTime = performance.now();
    const resourceKey = this.getResourceKey(config);
    
    // 检查缓存
    if (config.cache && this.cache.has(resourceKey)) {
      const cached = this.cache.get(resourceKey)!;
      cached.accessTime = Date.now();
      cached.accessCount++;
      
      this.performanceStats.cacheHits++;
      console.log(`[Live2DResourceManager] 缓存命中: ${resourceKey}`);
      
      return {
        success: true,
        resource: resourceKey,
        loadTime: 0,
        size: cached.size,
        retryCount: 0
      };
    }
    
    this.performanceStats.cacheMisses++;
    
    // 如果已经在加载中，返回现有任务
    if (this.loadingTasks.has(resourceKey)) {
      console.log(`[Live2DResourceManager] 资源正在加载中: ${resourceKey}`);
      return new Promise((resolve, reject) => {
        const existingTask = this.loadingTasks.get(resourceKey)!;
        existingTask.resolve = resolve;
        existingTask.reject = reject;
      });
    }
    
    // 等待并发槽位
    await this.waitForLoadSlot();
    
    try {
      const result = await this.performLoad(config, resourceKey, startTime);
      return result;
    } finally {
      this.currentLoadCount--;
      this.loadingTasks.delete(resourceKey);
    }
  }

  /**
   * 执行实际加载
   */
  private async performLoad(config: Live2DResourceConfig, resourceKey: string, startTime: number): Promise<ResourceLoadResult> {
    let lastError: Error | null = null;
    let retryCount = 0;
    
    for (let attempt = 0; attempt <= Math.max(config.retryCount, this.DEFAULT_RETRY_COUNT); attempt++) {
      try {
        console.log(`[Live2DResourceManager] 加载资源 (尝试 ${attempt + 1}): ${resourceKey}`);
        
        const result = await this.loadWithTimeout(config, config.timeout || this.DEFAULT_TIMEOUT);
        
        // 缓存成功结果
        if (config.cache && result.success) {
          this.addToCache(resourceKey, result);
        }
        
        const loadTime = performance.now() - startTime;
        this.updatePerformanceStats(result, loadTime);
        
        console.log(`[Live2DResourceManager] 资源加载成功: ${resourceKey} (${loadTime.toFixed(2)}ms)`);
        
        return {
          ...result,
          loadTime,
          retryCount
        };
        
      } catch (error) {
        lastError = error as Error;
        retryCount = attempt + 1;
        
        console.warn(`[Live2DResourceManager] 资源加载失败 (尝试 ${attempt + 1}): ${resourceKey}`, error);
        
        if (attempt < Math.max(config.retryCount, this.DEFAULT_RETRY_COUNT)) {
          // 指数退避延迟
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }
    
    const errorMessage = lastError?.message || '加载失败';
    console.error(`[Live2DResourceManager] 资源加载最终失败: ${resourceKey} - ${errorMessage}`);
    
    return {
      success: false,
      resource: resourceKey,
      loadTime: performance.now() - startTime,
      error: errorMessage,
      retryCount
    };
  }

  /**
   * 带超时的加载
   */
  private async loadWithTimeout(config: Live2DResourceConfig, timeout: number): Promise<ResourceLoadResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('加载超时')), timeout);
    });
    
    const loadPromise = this.loadResourceInternal(config);
    
    return Promise.race([loadPromise, timeoutPromise]);
  }

  /**
   * 内部资源加载实现
   */
  private async loadResourceInternal(config: Live2DResourceConfig): Promise<ResourceLoadResult> {
    let url: string;
    let type: string;
    
    switch (config.type) {
      case 'model':
        url = config.modelPath;
        type = 'json';
        break;
      case 'texture':
        url = config.texturePath;
        type = 'image';
        break;
      case 'motion':
        url = config.motionPath;
        type = 'json';
        break;
      case 'sound':
        url = config.soundPath!;
        type = 'audio';
        break;
      default:
        throw new Error(`不支持的资源类型: ${(config as any).type}`);
    }
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    let data: any;
    let size = 0;
    
    switch (type) {
      case 'json':
        data = await response.json();
        size = JSON.stringify(data).length;
        break;
      case 'image':
        const blob = await response.blob();
        data = URL.createObjectURL(blob);
        size = blob.size;
        break;
      case 'audio':
        const audioBlob = await response.blob();
        data = URL.createObjectURL(audioBlob);
        size = audioBlob.size;
        break;
    }
    
    return {
      success: true,
      resource: url,
      loadTime: 0,
      size,
      retryCount: 0
    };
  }

  /**
   * 等待加载槽位
   */
  private async waitForLoadSlot(): Promise<void> {
    while (this.currentLoadCount >= this.maxConcurrentLoads) {
      await this.delay(100);
    }
    this.currentLoadCount++;
  }

  /**
   * 添加到缓存
   */
  private addToCache(key: string, result: ResourceLoadResult): void {
    if (!result.success || !result.size) return;
    
    // 检查缓存大小限制
    const currentCacheSize = Array.from(this.cache.values())
      .reduce((total, item) => total + item.size, 0);
    
    if (currentCacheSize + result.size > this.MAX_CACHE_SIZE) {
      this.evictLeastUsedItems(result.size);
    }
    
    this.cache.set(key, {
      data: result,
      size: result.size,
      loadTime: result.loadTime,
      accessTime: Date.now(),
      accessCount: 1,
      priority: 5
    });
    
    console.log(`[Live2DResourceManager] 添加到缓存: ${key} (${(result.size / 1024).toFixed(2)}KB)`);
  }

  /**
   * 缓存淘汰策略 - LRU + 优先级
   */
  private evictLeastUsedItems(requiredSize: number): void {
    const items = Array.from(this.cache.entries())
      .map(([key, value]) => ({
        key,
        value,
        score: value.accessCount * 0.3 + value.priority * 0.7
      }))
      .sort((a, b) => a.score - b.score); // 分数越低越容易被淘汰
    
    let freedSize = 0;
    const toRemove: string[] = [];
    
    for (const item of items) {
      toRemove.push(item.key);
      freedSize += item.value.size;
      
      if (freedSize >= requiredSize) break;
    }
    
    toRemove.forEach(key => {
      this.cache.delete(key);
      console.log(`[Live2DResourceManager] 缓存淘汰: ${key}`);
    });
  }

  /**
   * 更新性能统计
   */
  private updatePerformanceStats(result: ResourceLoadResult, loadTime: number): void {
    this.performanceStats.totalLoads++;
    this.performanceStats.totalLoadTime += loadTime;
    
    if (result.success) {
      if (result.size) {
        this.performanceStats.totalSize += result.size;
      }
    } else {
      this.performanceStats.errors++;
    }
    
    // 记录加载历史
    this.loadHistory.push({
      ...result,
      loadTime
    });
    
    // 限制历史记录数量
    if (this.loadHistory.length > this.MAX_HISTORY_SIZE) {
      this.loadHistory.shift();
    }
  }

  /**
   * 获取资源键
   */
  private getResourceKey(config: Live2DResourceConfig): string {
    return `${config.type}:${config.modelPath}`;
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    const cacheSize = this.cache.size;
    this.cache.clear();
    console.log(`[Live2DResourceManager] 清除缓存: ${cacheSize} 项`);
  }

  /**
   * 获取缓存统计
   */
  getCacheStats(): {
    cacheSize: number;
    totalCacheSize: number;
    cacheHitRate: number;
    loadHistory: ResourceLoadResult[];
  } {
    const totalCacheSize = Array.from(this.cache.values())
      .reduce((total, item) => total + item.size, 0);
    
    const totalRequests = this.performanceStats.cacheHits + this.performanceStats.cacheMisses;
    const cacheHitRate = totalRequests > 0 
      ? (this.performanceStats.cacheHits / totalRequests) * 100 
      : 0;
    
    return {
      cacheSize: this.cache.size,
      totalCacheSize,
      cacheHitRate,
      loadHistory: [...this.loadHistory]
    };
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats(): typeof this.performanceStats & {
    averageLoadTime: number;
    averageSize: number;
    errorRate: number;
  } {
    const successfulLoads = this.performanceStats.totalLoads - this.performanceStats.errors;
    
    return {
      ...this.performanceStats,
      averageLoadTime: successfulLoads > 0 ? this.performanceStats.totalLoadTime / successfulLoads : 0,
      averageSize: successfulLoads > 0 ? this.performanceStats.totalSize / successfulLoads : 0,
      errorRate: this.performanceStats.totalLoads > 0 
        ? (this.performanceStats.errors / this.performanceStats.totalLoads) * 100 
        : 0
    };
  }

  /**
   * 导出性能报告
   */
  exportPerformanceReport(): {
    cacheStats: ReturnType<Live2DResourceManager['getCacheStats']>;
    performanceStats: ReturnType<Live2DResourceManager['getPerformanceStats']>;
    timestamp: number;
  } {
    return {
      cacheStats: this.getCacheStats(),
      performanceStats: this.getPerformanceStats(),
      timestamp: Date.now()
    };
  }

  /**
   * 设置最大并发加载数
   */
  setMaxConcurrentLoads(max: number): void {
    this.maxConcurrentLoads = Math.max(1, max);
  }

  /**
   * 获取当前加载状态
   */
  getLoadingStatus(): {
    activeTasks: number;
    queuedTasks: number;
    isBusy: boolean;
  } {
    return {
      activeTasks: this.currentLoadCount,
      queuedTasks: this.loadingTasks.size,
      isBusy: this.currentLoadCount >= this.maxConcurrentLoads
    };
  }
}

// 创建全局单例实例
export const live2dResourceManager = new Live2DResourceManager();

export default live2dResourceManager;