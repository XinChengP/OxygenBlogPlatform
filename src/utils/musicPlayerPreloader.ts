// 音乐播放器预加载器
class MusicPlayerPreloader {
  private static instance: MusicPlayerPreloader;
  private preloadedResources: Set<string> = new Set();
  private preloadPromises: Map<string, Promise<void>> = new Map();
  private isPreloading: boolean = false;

  static getInstance() {
    if (!this.instance) {
      this.instance = new MusicPlayerPreloader();
    }
    return this.instance;
  }

  // 预加载APlayer资源
  async preloadAPlayerResources(basePath: string = '') {
    if (this.isPreloading) return;
    
    const resources = [
      `${basePath}/aplayer/APlayer.min.css`,
      `${basePath}/aplayer/APlayer.min.js`
    ];

    this.isPreloading = true;
    
    try {
      await Promise.all(resources.map(url => this.preloadResource(url)));
    } finally {
      this.isPreloading = false;
    }
  }

  // 预加载音频文件（只预加载元数据）
  async preloadAudioFiles(audioUrls: string[]) {
    const audioPromises = audioUrls.map(url => this.preloadAudio(url));
    await Promise.allSettled(audioPromises);
  }

  // 预加载图片资源
  async preloadImages(imageUrls: string[]) {
    const imagePromises = imageUrls.map(url => this.preloadImage(url));
    await Promise.allSettled(imagePromises);
  }

  private async preloadResource(url: string): Promise<void> {
    if (this.preloadedResources.has(url)) return;
    
    if (this.preloadPromises.has(url)) {
      return this.preloadPromises.get(url);
    }

    const promise = this.loadResource(url);
    this.preloadPromises.set(url, promise);
    
    try {
      await promise;
      this.preloadedResources.add(url);
    } finally {
      this.preloadPromises.delete(url);
    }
  }

  private loadResource(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = url.endsWith('.css') ? 'style' : 'script';
      link.href = url;
      
      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`Failed to preload resource: ${url}`));
      
      document.head.appendChild(link);
    });
  }

  private preloadAudio(url: string): Promise<void> {
    if (this.preloadedResources.has(url)) return Promise.resolve();
    
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'metadata'; // 只预加载元数据
      
      audio.addEventListener('loadedmetadata', () => {
        this.preloadedResources.add(url);
        resolve();
      });
      
      audio.addEventListener('error', () => {
        // 即使失败也resolve，不影响主流程
        resolve();
      });
      
      audio.src = url;
    });
  }

  private preloadImage(url: string): Promise<void> {
    if (this.preloadedResources.has(url)) return Promise.resolve();
    
    return new Promise((resolve) => {
      const img = new Image();
      
      img.onload = () => {
        this.preloadedResources.add(url);
        resolve();
      };
      
      img.onerror = () => {
        // 即使失败也resolve，不影响主流程
        resolve();
      };
      
      img.src = url;
    });
  }

  // 清除预加载缓存
  clearCache() {
    this.preloadedResources.clear();
    this.preloadPromises.clear();
    this.isPreloading = false;
  }

  // 获取预加载状态
  isResourcePreloaded(url: string): boolean {
    return this.preloadedResources.has(url);
  }

  // 批量预加载音乐相关资源
  async preloadMusicResources(musicList: any[], basePath: string = '') {
    const audioUrls = musicList.map(item => item.url).filter(Boolean);
    const coverUrls = musicList.map(item => item.cover).filter(Boolean);
    
    // 并行预加载
    await Promise.all([
      this.preloadAPlayerResources(basePath),
      this.preloadAudioFiles(audioUrls),
      this.preloadImages(coverUrls)
    ]);
  }
}

// 预加载管理器
export class PreloadManager {
  private static instance: PreloadManager;
  private preloader: MusicPlayerPreloader;

  private constructor() {
    this.preloader = MusicPlayerPreloader.getInstance();
  }

  static getInstance() {
    if (!this.instance) {
      this.instance = new PreloadManager();
    }
    return this.instance;
  }

  // 在空闲时间预加载音乐资源
  async preloadInIdleTime(musicList: any[], basePath: string = '') {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async () => {
        try {
          await this.preloader.preloadMusicResources(musicList, basePath);
        } catch (error) {
          console.warn('Idle time preloading failed:', error);
        }
      }, { timeout: 5000 });
    } else {
      // 降级到setTimeout
      setTimeout(async () => {
        try {
          await this.preloader.preloadMusicResources(musicList, basePath);
        } catch (error) {
          console.warn('Preloading failed:', error);
        }
      }, 3000);
    }
  }

  // 立即预加载关键资源
  async preloadCriticalResources(musicList: any[], basePath: string = '') {
    try {
      await this.preloader.preloadAPlayerResources(basePath);
      // 只预加载前几个音频文件的元数据
      const criticalAudioUrls = musicList.slice(0, 3).map(item => item.url).filter(Boolean);
      await this.preloader.preloadAudioFiles(criticalAudioUrls);
    } catch (error) {
      console.warn('Critical resources preloading failed:', error);
    }
  }

  // 获取预加载状态
  getPreloadStatus(url: string): boolean {
    return this.preloader.isResourcePreloaded(url);
  }

  // 清除所有缓存
  clearAllCaches() {
    this.preloader.clearCache();
  }
}

export default MusicPlayerPreloader;