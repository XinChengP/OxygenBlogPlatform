/**
 * 图片预加载工具 - 优化移动端图片加载性能
 */

/**
 * 预加载图片并缓存到内存
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 检查是否已经在缓存中（与OptimizedImage组件共享缓存）
    if (typeof window !== 'undefined') {
      // 检查全局缓存状态
      const globalCache = (window as any).__imageCache;
      if (globalCache && globalCache.get(src) === true) {
        console.log(`图片已在缓存中，跳过预加载: ${src}`);
        resolve();
        return;
      }
    }
    
    const img = new Image();
    img.onload = () => {
      // 更新全局缓存状态
      if (typeof window !== 'undefined') {
        if (!(window as any).__imageCache) {
          (window as any).__imageCache = new Map();
        }
        (window as any).__imageCache.set(src, true);
      }
      console.log(`图片预加载成功: ${src}`);
      resolve();
    };
    img.onerror = () => {
      console.error(`图片预加载失败: ${src}`);
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
}

/**
 * 批量预加载图片
 */
export async function preloadImages(sources: string[]): Promise<void> {
  const promises = sources.map(src => preloadImage(src));
  await Promise.allSettled(promises);
}

/**
 * 提取 Markdown 内容中的图片链接
 */
export function extractImageUrls(content: string): string[] {
  const imageRegex = /!\[.*?\]\((.*?)\)|<img[^>]+src=["'](.*?)["'][^>]*>/g;
  const urls: string[] = [];
  let match;
  
  while ((match = imageRegex.exec(content)) !== null) {
    const url = match[1] || match[2];
    if (url && !urls.includes(url)) {
      urls.push(url);
    }
  }
  
  return urls;
}

/**
 * 图片加载状态管理器
 */
class ImagePreloadManager {
  private loadedImages = new Set<string>();
  private loadingImages = new Map<string, Promise<void>>();
  
  /**
   * 预加载单张图片
   */
  async preload(src: string): Promise<void> {
    if (this.loadedImages.has(src)) {
      return; // 已加载完成
    }
    
    if (this.loadingImages.has(src)) {
      return this.loadingImages.get(src); // 正在加载中，返回现有 Promise
    }
    
    const loadPromise = preloadImage(src).then(() => {
      this.loadedImages.add(src);
      this.loadingImages.delete(src);
    }).catch(error => {
      this.loadingImages.delete(src);
      throw error;
    });
    
    this.loadingImages.set(src, loadPromise);
    return loadPromise;
  }
  
  /**
   * 批量预加载
   */
  async preloadBatch(sources: string[]): Promise<void> {
    const uniqueSources = [...new Set(sources)];
    const loadPromises = uniqueSources.map(src => this.preload(src));
    await Promise.allSettled(loadPromises);
  }
  
  /**
   * 检查图片是否已加载
   */
  isLoaded(src: string): boolean {
    return this.loadedImages.has(src);
  }
  
  /**
   * 清除缓存
   */
  clear(): void {
    this.loadedImages.clear();
    this.loadingImages.clear();
  }
}

// 创建全局实例
export const imagePreloadManager = new ImagePreloadManager();

/**
 * 移动端优化策略
 */
export function optimizeForMobile(): void {
  // 限制并发加载数量（移动端网络限制）
  // const MAX_CONCURRENT_LOADS = 3;
  
  // 监听网络状态变化
  if ('connection' in navigator) {
    const connection = (navigator as any).connection;
    
    // 在慢速网络下禁用预加载
    if (connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g') {
      return;
    }
  }
  
  // 监听页面可见性变化
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // 页面隐藏时暂停加载
      imagePreloadManager.clear();
    }
  });
}

/**
 * 服务端渲染优化 - 预加载关键图片
 */
export function preloadCriticalImages(imageUrls: string[]): void {
  if (typeof window === 'undefined') return; // 服务端不执行
  
  // 只预加载首屏可见的图片
  const criticalImages = imageUrls.slice(0, 5);
  imagePreloadManager.preloadBatch(criticalImages);
}