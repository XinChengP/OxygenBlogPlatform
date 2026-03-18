'use client';

import { getAssetPath } from './assetUtils';

// ==================== 类型定义 ====================

/**
 * 播放模式类型
 * - list: 列表循环播放
 * - random: 随机播放
 * - single: 单曲循环播放
 */
export type PlayMode = 'list' | 'random' | 'single';

/**
 * 预加载优先级枚举
 * - high: 高优先级，立即加载（当前播放歌曲）
 * - medium: 中优先级，延迟加载（下一首歌曲）
 * - low: 低优先级，空闲时加载（其他歌曲）
 */
export type PreloadPriority = 'high' | 'medium' | 'low';

/**
 * 音乐资源信息接口
 */
export interface MusicResource {
  /** 音频文件URL */
  url: string;
  /** 封面图片URL */
  cover?: string;
  /** 歌曲ID */
  id?: string;
  /** 歌曲名称 */
  name?: string;
}

/**
 * 预加载任务接口
 */
interface PreloadTask {
  /** 资源URL */
  url: string;
  /** 资源类型：audio 或 image */
  type: 'audio' | 'image';
  /** 优先级 */
  priority: PreloadPriority;
  /** Promise 实例 */
  promise?: Promise<void>;
}

/**
 * 缓存资源信息接口
 */
interface CachedResource {
  /** 资源URL */
  url: string;
  /** 资源类型 */
  type: 'audio' | 'image';
  /** 缓存时间戳 */
  cachedAt: number;
  /** 资源大小（字节，可选） */
  size?: number;
}

/**
 * 播放进度事件详情
 */
interface PlayProgressDetail {
  /** 当前播放时间（秒） */
  currentTime: number;
  /** 总时长（秒） */
  duration: number;
  /** 播放进度百分比（0-100） */
  progress: number;
  /** 当前歌曲索引 */
  currentIndex: number;
}

// ==================== 常量定义 ====================

/** 预加载触发阈值：播放进度达到此百分比时开始预加载下一首 */
const PRELOAD_THRESHOLD = 80;

/** 缓存过期时间：24小时（毫秒） */
const CACHE_EXPIRE_TIME = 24 * 60 * 60 * 1000;

/** 最大缓存资源数量 */
const MAX_CACHE_SIZE = 100;

/** 高优先级任务延迟时间（毫秒） */
const HIGH_PRIORITY_DELAY = 0;

/** 中优先级任务延迟时间（毫秒） */
const MEDIUM_PRIORITY_DELAY = 500;

/** 低优先级任务延迟时间（毫秒） */
const LOW_PRIORITY_DELAY = 2000;

// ==================== 音乐播放器预加载器类 ====================

/**
 * 音乐播放器预加载器
 * 负责智能预加载音乐资源，支持优先级加载、缓存管理和播放进度监听
 * 采用单例模式确保全局只有一个预加载器实例
 */
class MusicPlayerPreloader {
  /** 单例实例 */
  private static instance: MusicPlayerPreloader;

  /** 已预加载的资源URL集合（用于快速判断是否已加载） */
  private preloadedResources: Set<string> = new Set();

  /** 正在预加载的Promise映射表（防止重复加载） */
  private preloadPromises: Map<string, Promise<void>> = new Map();

  /** 是否正在预加载中 */
  private isPreloading: boolean = false;

  // ==================== SubTask 6.3: 资源缓存策略 ====================

  /** 资源缓存映射表：存储已缓存资源的详细信息 */
  private resourceCache: Map<string, CachedResource> = new Map();

  /** 缓存的音频元素引用（用于复用Audio对象） */
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  /** 缓存的图片元素引用（用于复用Image对象） */
  private imageCache: Map<string, HTMLImageElement> = new Map();

  // ==================== SubTask 6.2: 智能预加载状态 ====================

  /** 当前播放列表 */
  private playlist: MusicResource[] = [];

  /** 当前播放索引 */
  private currentIndex: number = -1;

  /** 当前播放模式 */
  private playMode: PlayMode = 'list';

  /** 是否已设置播放进度监听 */
  private progressListenerSetup: boolean = false;

  /** 上一次预加载的索引（防止重复预加载） */
  private lastPreloadedIndex: number = -1;

  // ==================== SubTask 6.4: 事件监听器管理 ====================

  /** 存储所有事件监听器的引用，用于清理 */
  private eventListeners: Map<string, Map<Function, EventListener>> = new Map();

  /** 绑定的事件处理器引用（用于解绑） */
  private boundProgressHandler: ((event: CustomEvent<PlayProgressDetail>) => void) | null = null;

  /** 绑定的播放模式变化处理器引用 */
  private boundModeChangeHandler: ((event: CustomEvent<{ mode: PlayMode }>) => void) | null = null;

  /** 绑定的歌曲切换处理器引用 */
  private boundSongChangeHandler: ((event: CustomEvent<{ index: number }>) => void) | null = null;

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor() {
    // 初始化时清理过期缓存
    this.cleanExpiredCache();
  }

  /**
   * 获取单例实例
   * @returns MusicPlayerPreloader 的唯一实例
   */
  static getInstance(): MusicPlayerPreloader {
    if (!MusicPlayerPreloader.instance) {
      MusicPlayerPreloader.instance = new MusicPlayerPreloader();
    }
    return MusicPlayerPreloader.instance;
  }

  // ==================== SubTask 6.1: 优先级加载 ====================

  /**
   * 按优先级预加载资源
   * 高优先级资源立即加载，中优先级延迟500ms，低优先级延迟2秒
   * @param resources - 要预加载的资源列表
   * @param priority - 预加载优先级
   */
  async preloadWithPriority(resources: MusicResource[], priority: PreloadPriority): Promise<void> {
    // 根据优先级确定延迟时间
    const delay = this.getDelayByPriority(priority);

    // 如果是高优先级，立即加载
    if (priority === 'high') {
      await this.preloadResourcesImmediate(resources);
      return;
    }

    // 中低优先级使用延迟加载
    await this.preloadResourcesWithDelay(resources, delay);
  }

  /**
   * 根据优先级获取延迟时间
   * @param priority - 优先级
   * @returns 延迟时间（毫秒）
   */
  private getDelayByPriority(priority: PreloadPriority): number {
    switch (priority) {
      case 'high':
        return HIGH_PRIORITY_DELAY;
      case 'medium':
        return MEDIUM_PRIORITY_DELAY;
      case 'low':
        return LOW_PRIORITY_DELAY;
      default:
        return LOW_PRIORITY_DELAY;
    }
  }

  /**
   * 立即预加载资源（高优先级）
   * @param resources - 资源列表
   */
  private async preloadResourcesImmediate(resources: MusicResource[]): Promise<void> {
    const tasks: Promise<void>[] = [];

    for (const resource of resources) {
      // 处理音频URL路径
      const audioUrl = getAssetPath(resource.url);
      
      // 预加载音频
      if (!this.isResourceCached(audioUrl)) {
        tasks.push(this.preloadAudio(audioUrl));
      }

      // 预加载封面图片
      if (resource.cover) {
        const coverUrl = getAssetPath(resource.cover);
        if (!this.isResourceCached(coverUrl)) {
          tasks.push(this.preloadImage(coverUrl));
        }
      }
    }

    // 并行执行所有预加载任务
    await Promise.allSettled(tasks);
  }

  /**
   * 延迟预加载资源（中低优先级）
   * @param resources - 资源列表
   * @param delay - 延迟时间（毫秒）
   */
  private async preloadResourcesWithDelay(resources: MusicResource[], delay: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        await this.preloadResourcesImmediate(resources);
        resolve();
      }, delay);
    });
  }

  /**
   * 预加载指定索引的歌曲（带优先级）
   * @param index - 歌曲索引
   * @param priority - 优先级
   */
  async preloadSongAtIndex(index: number, priority: PreloadPriority = 'medium'): Promise<void> {
    if (index < 0 || index >= this.playlist.length) return;

    const resource = this.playlist[index];
    await this.preloadWithPriority([resource], priority);
  }

  // ==================== 基础预加载方法 ====================

  /**
   * 预加载APlayer资源（CSS和JS）
   * @param basePath - 基础路径
   */
  async preloadAPlayerResources(basePath: string = ''): Promise<void> {
    if (this.isPreloading) return;

    const resources = [
      getAssetPath(`${basePath}/aplayer/APlayer.min.css`),
      getAssetPath(`${basePath}/aplayer/APlayer.min.js`)
    ];

    this.isPreloading = true;

    try {
      await Promise.all(resources.map(url => this.preloadResource(url)));
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * 预加载音频文件（只预加载元数据）
   * @param audioUrls - 音频URL列表
   */
  async preloadAudioFiles(audioUrls: string[]): Promise<void> {
    const audioPromises = audioUrls.map(url => this.preloadAudio(getAssetPath(url)));
    await Promise.allSettled(audioPromises);
  }

  /**
   * 预加载图片资源
   * @param imageUrls - 图片URL列表
   */
  async preloadImages(imageUrls: string[]): Promise<void> {
    const imagePromises = imageUrls.map(url => this.preloadImage(getAssetPath(url)));
    await Promise.allSettled(imagePromises);
  }

  /**
   * 预加载单个资源（使用link标签）
   * @param url - 资源URL
   */
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
      this.addToCache(url, url.endsWith('.mp3') || url.endsWith('.ogg') || url.endsWith('.wav') ? 'audio' : 'image');
    } finally {
      this.preloadPromises.delete(url);
    }
  }

  /**
   * 使用link标签加载资源
   * @param url - 资源URL
   */
  private loadResource(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = url.endsWith('.css') ? 'style' : 'script';
      link.href = url;

      link.onload = () => resolve();
      link.onerror = () => reject(new Error(`预加载资源失败: ${url}`));

      document.head.appendChild(link);
    });
  }

  /**
   * 预加载音频文件
   * @param url - 音频URL
   */
  private preloadAudio(url: string): Promise<void> {
    // 检查是否已缓存
    if (this.isResourceCached(url)) return Promise.resolve();

    // 检查是否正在加载
    if (this.preloadPromises.has(url)) {
      return this.preloadPromises.get(url)!;
    }

    const promise = new Promise<void>((resolve) => {
      // 尝试从缓存获取Audio元素
      let audio = this.audioCache.get(url);
      
      if (!audio) {
        audio = new Audio();
        audio.preload = 'metadata'; // 只预加载元数据，节省带宽
        this.audioCache.set(url, audio);
      }

      // 元数据加载完成
      const handleLoadedMetadata = () => {
        this.preloadedResources.add(url);
        this.addToCache(url, 'audio');
        cleanup();
        resolve();
      };

      // 加载错误处理
      const handleError = () => {
        // 即使失败也resolve，不影响主流程
        cleanup();
        resolve();
      };

      // 清理事件监听器
      const cleanup = () => {
        audio!.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio!.removeEventListener('error', handleError);
      };

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('error', handleError);

      // 设置音频源
      if (audio.src !== url) {
        audio.src = url;
      }
    });

    this.preloadPromises.set(url, promise);
    
    // 完成后清理Promise引用
    promise.finally(() => {
      this.preloadPromises.delete(url);
    });

    return promise;
  }

  /**
   * 预加载图片文件
   * @param url - 图片URL
   */
  private preloadImage(url: string): Promise<void> {
    // 检查是否已缓存
    if (this.isResourceCached(url)) return Promise.resolve();

    // 检查是否正在加载
    if (this.preloadPromises.has(url)) {
      return this.preloadPromises.get(url)!;
    }

    const promise = new Promise<void>((resolve) => {
      // 尝试从缓存获取Image元素
      let img = this.imageCache.get(url);
      
      if (!img) {
        img = new Image();
        this.imageCache.set(url, img);
      }

      // 图片加载完成
      const handleLoad = () => {
        this.preloadedResources.add(url);
        this.addToCache(url, 'image');
        cleanup();
        resolve();
      };

      // 加载错误处理
      const handleError = () => {
        // 即使失败也resolve，不影响主流程
        cleanup();
        resolve();
      };

      // 清理事件监听器
      const cleanup = () => {
        img!.removeEventListener('load', handleLoad);
        img!.removeEventListener('error', handleError);
      };

      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);

      // 设置图片源
      if (img.src !== url) {
        img.src = url;
      }
    });

    this.preloadPromises.set(url, promise);
    
    // 完成后清理Promise引用
    promise.finally(() => {
      this.preloadPromises.delete(url);
    });

    return promise;
  }

  // ==================== SubTask 6.2: 智能预加载 ====================

  /**
   * 设置播放列表信息
   * @param playlist - 播放列表
   * @param currentIndex - 当前播放索引
   * @param playMode - 播放模式
   */
  setupPlaylist(playlist: MusicResource[], currentIndex: number = 0, playMode: PlayMode = 'list'): void {
    this.playlist = playlist;
    this.currentIndex = currentIndex;
    this.playMode = playMode;
    this.lastPreloadedIndex = -1; // 重置预加载状态

    // 设置播放进度监听
    this.setupProgressListener();

    // 立即预加载当前歌曲（高优先级）
    if (currentIndex >= 0 && currentIndex < playlist.length) {
      this.preloadSongAtIndex(currentIndex, 'high');
    }
  }

  /**
   * 设置播放进度监听器
   * 监听播放进度事件，在播放到80%时触发预加载
   */
  private setupProgressListener(): void {
    if (this.progressListenerSetup || typeof window === 'undefined') return;

    // 创建绑定的事件处理器
    this.boundProgressHandler = (event: CustomEvent<PlayProgressDetail>) => {
      this.handlePlayProgress(event.detail);
    };

    this.boundModeChangeHandler = (event: CustomEvent<{ mode: PlayMode }>) => {
      this.handlePlayModeChange(event.detail.mode);
    };

    this.boundSongChangeHandler = (event: CustomEvent<{ index: number }>) => {
      this.handleSongChange(event.detail.index);
    };

    // 监听播放进度事件
    window.addEventListener('music-player:play-progress', this.boundProgressHandler as EventListener);

    // 监听播放模式变化事件
    window.addEventListener('music-player:play-mode-change', this.boundModeChangeHandler as EventListener);

    // 监听歌曲切换事件
    window.addEventListener('music-player:song-change', this.boundSongChangeHandler as EventListener);

    this.progressListenerSetup = true;
  }

  /**
   * 处理播放进度事件
   * 当播放进度达到阈值时，根据播放模式预加载下一首
   * @param detail - 播放进度详情
   */
  private handlePlayProgress(detail: PlayProgressDetail): void {
    // 更新当前索引
    this.currentIndex = detail.currentIndex;

    // 当播放进度达到阈值时触发预加载
    if (detail.progress >= PRELOAD_THRESHOLD) {
      this.preloadNextByPlayMode();
    }
  }

  /**
   * 处理播放模式变化
   * @param mode - 新的播放模式
   */
  private handlePlayModeChange(mode: PlayMode): void {
    this.playMode = mode;
    // 播放模式变化时重置预加载状态
    this.lastPreloadedIndex = -1;
  }

  /**
   * 处理歌曲切换事件
   * @param index - 新的歌曲索引
   */
  private handleSongChange(index: number): void {
    this.currentIndex = index;
    // 歌曲切换时预加载当前歌曲（高优先级）
    this.preloadSongAtIndex(index, 'high');
  }

  /**
   * 根据播放模式预加载下一首歌曲
   * - 顺序播放：预加载下一首
   * - 随机播放：预加载随机一首
   * - 单曲循环：不预加载
   */
  private preloadNextByPlayMode(): void {
    // 单曲循环模式不预加载
    if (this.playMode === 'single') {
      return;
    }

    let nextIndex: number;

    if (this.playMode === 'random') {
      // 随机模式：随机选择一首（排除当前播放的）
      nextIndex = this.getRandomIndex();
    } else {
      // 顺序播放：预加载下一首
      nextIndex = (this.currentIndex + 1) % this.playlist.length;
    }

    // 防止重复预加载同一首
    if (nextIndex === this.lastPreloadedIndex) {
      return;
    }

    // 标记为已预加载
    this.lastPreloadedIndex = nextIndex;

    // 使用中优先级预加载
    this.preloadSongAtIndex(nextIndex, 'medium');
  }

  /**
   * 获取随机索引（排除当前播放的歌曲）
   * @returns 随机索引
   */
  private getRandomIndex(): number {
    if (this.playlist.length <= 1) return 0;

    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * this.playlist.length);
    } while (randomIndex === this.currentIndex);

    return randomIndex;
  }

  /**
   * 更新当前播放索引
   * @param index - 新的索引
   */
  updateCurrentIndex(index: number): void {
    this.currentIndex = index;
  }

  /**
   * 更新播放模式
   * @param mode - 新的播放模式
   */
  updatePlayMode(mode: PlayMode): void {
    this.playMode = mode;
    this.lastPreloadedIndex = -1;
  }

  // ==================== SubTask 6.3: 资源缓存策略 ====================

  /**
   * 检查资源是否已缓存
   * @param url - 资源URL
   * @returns 是否已缓存
   */
  isResourceCached(url: string): boolean {
    // 首先检查快速查找集合
    if (this.preloadedResources.has(url)) {
      return true;
    }

    // 然后检查详细缓存映射
    const cached = this.resourceCache.get(url);
    if (cached) {
      // 检查缓存是否过期
      if (Date.now() - cached.cachedAt > CACHE_EXPIRE_TIME) {
        this.resourceCache.delete(url);
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * 将资源添加到缓存
   * @param url - 资源URL
   * @param type - 资源类型
   */
  private addToCache(url: string, type: 'audio' | 'image'): void {
    // 检查缓存大小，如果超过限制则清理最旧的缓存
    if (this.resourceCache.size >= MAX_CACHE_SIZE) {
      this.cleanOldestCache();
    }

    this.resourceCache.set(url, {
      url,
      type,
      cachedAt: Date.now(),
    });

    // 同时添加到快速查找集合
    this.preloadedResources.add(url);
  }

  /**
   * 清理最旧的缓存
   */
  private cleanOldestCache(): void {
    // 找到最旧的缓存项
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.resourceCache) {
      if (value.cachedAt < oldestTime) {
        oldestTime = value.cachedAt;
        oldestKey = key;
      }
    }

    // 删除最旧的缓存
    if (oldestKey) {
      this.resourceCache.delete(oldestKey);
      this.preloadedResources.delete(oldestKey);
      
      // 同时清理对应的元素缓存
      this.audioCache.delete(oldestKey);
      this.imageCache.delete(oldestKey);
    }
  }

  /**
   * 清理过期缓存
   */
  private cleanExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.resourceCache) {
      if (now - value.cachedAt > CACHE_EXPIRE_TIME) {
        expiredKeys.push(key);
      }
    }

    // 删除过期缓存
    for (const key of expiredKeys) {
      this.resourceCache.delete(key);
      this.preloadedResources.delete(key);
      this.audioCache.delete(key);
      this.imageCache.delete(key);
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    this.preloadedResources.clear();
    this.preloadPromises.clear();
    this.resourceCache.clear();
    this.audioCache.clear();
    this.imageCache.clear();
    this.isPreloading = false;
    this.lastPreloadedIndex = -1;
  }

  /**
   * 获取缓存统计信息
   * @returns 缓存统计
   */
  getCacheStats(): {
    totalCached: number;
    audioCount: number;
    imageCount: number;
    cacheSize: number;
  } {
    let audioCount = 0;
    let imageCount = 0;

    for (const resource of this.resourceCache.values()) {
      if (resource.type === 'audio') {
        audioCount++;
      } else {
        imageCount++;
      }
    }

    return {
      totalCached: this.resourceCache.size,
      audioCount,
      imageCount,
      cacheSize: MAX_CACHE_SIZE,
    };
  }

  // ==================== SubTask 6.4: 事件监听器管理 ====================

  /**
   * 清理所有事件监听器
   * 防止内存泄漏
   */
  cleanup(): void {
    // 移除播放进度监听器
    if (this.boundProgressHandler && typeof window !== 'undefined') {
      window.removeEventListener('music-player:play-progress', this.boundProgressHandler as EventListener);
      this.boundProgressHandler = null;
    }

    // 移除播放模式变化监听器
    if (this.boundModeChangeHandler && typeof window !== 'undefined') {
      window.removeEventListener('music-player:play-mode-change', this.boundModeChangeHandler as EventListener);
      this.boundModeChangeHandler = null;
    }

    // 移除歌曲切换监听器
    if (this.boundSongChangeHandler && typeof window !== 'undefined') {
      window.removeEventListener('music-player:song-change', this.boundSongChangeHandler as EventListener);
      this.boundSongChangeHandler = null;
    }

    // 清理所有存储的事件监听器引用
    this.eventListeners.clear();

    // 重置监听器设置标志
    this.progressListenerSetup = false;
  }

  /**
   * 销毁预加载器实例
   * 清理所有资源、监听器和缓存
   */
  destroy(): void {
    // 清理事件监听器
    this.cleanup();

    // 清理缓存
    this.clearCache();

    // 重置状态
    this.playlist = [];
    this.currentIndex = -1;
    this.playMode = 'list';
    this.lastPreloadedIndex = -1;
  }

  // ==================== 工具方法 ====================

  /**
   * 检查资源是否已预加载
   * @param url - 资源URL
   * @returns 是否已预加载
   */
  isResourcePreloaded(url: string): boolean {
    return this.isResourceCached(getAssetPath(url));
  }

  /**
   * 批量预加载音乐相关资源
   * @param musicList - 音乐列表
   * @param basePath - 基础路径
   */
  async preloadMusicResources(musicList: MusicResource[], basePath: string = ''): Promise<void> {
    // 设置播放列表
    this.setupPlaylist(musicList);

    // 预加载APlayer资源
    await this.preloadAPlayerResources(basePath);

    // 提取音频和封面URL
    const audioUrls = musicList.map(item => item.url).filter(Boolean);
    const coverUrls = musicList.map(item => item.cover).filter(Boolean) as string[];

    // 并行预加载
    await Promise.all([
      this.preloadAudioFiles(audioUrls),
      this.preloadImages(coverUrls)
    ]);
  }
}

// ==================== 预加载管理器类 ====================

/**
 * 预加载管理器
 * 提供更高层次的预加载API，支持空闲时间预加载和关键资源预加载
 */
export class PreloadManager {
  /** 单例实例 */
  private static instance: PreloadManager;

  /** 预加载器实例 */
  private preloader: MusicPlayerPreloader;

  /**
   * 私有构造函数
   */
  private constructor() {
    this.preloader = MusicPlayerPreloader.getInstance();
  }

  /**
   * 获取单例实例
   * @returns PreloadManager 的唯一实例
   */
  static getInstance(): PreloadManager {
    if (!PreloadManager.instance) {
      PreloadManager.instance = new PreloadManager();
    }
    return PreloadManager.instance;
  }

  /**
   * 在空闲时间预加载音乐资源
   * 使用 requestIdleCallback API 在浏览器空闲时预加载
   * @param musicList - 音乐列表
   * @param basePath - 基础路径
   */
  async preloadInIdleTime(musicList: MusicResource[], basePath: string = ''): Promise<void> {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(async () => {
        try {
          await this.preloader.preloadMusicResources(musicList, basePath);
        } catch (error) {
          console.warn('空闲时间预加载失败:', error);
        }
      }, { timeout: 5000 });
    } else {
      // 降级到setTimeout
      setTimeout(async () => {
        try {
          await this.preloader.preloadMusicResources(musicList, basePath);
        } catch (error) {
          console.warn('预加载失败:', error);
        }
      }, 3000);
    }
  }

  /**
   * 立即预加载关键资源
   * 优先加载APlayer资源和前几首歌曲
   * @param musicList - 音乐列表
   * @param basePath - 基础路径
   */
  async preloadCriticalResources(musicList: MusicResource[], basePath: string = ''): Promise<void> {
    try {
      // 预加载APlayer资源
      await this.preloader.preloadAPlayerResources(basePath);

      // 设置播放列表
      this.preloader.setupPlaylist(musicList);

      // 高优先级预加载第一首歌曲
      if (musicList.length > 0) {
        await this.preloader.preloadSongAtIndex(0, 'high');
      }

      // 中优先级预加载后续歌曲
      const nextSongs = musicList.slice(1, 4);
      if (nextSongs.length > 0) {
        await this.preloader.preloadWithPriority(nextSongs, 'medium');
      }
    } catch (error) {
      console.warn('关键资源预加载失败:', error);
    }
  }

  /**
   * 设置播放列表并开始智能预加载
   * @param playlist - 播放列表
   * @param currentIndex - 当前播放索引
   * @param playMode - 播放模式
   */
  setupSmartPreload(playlist: MusicResource[], currentIndex: number = 0, playMode: PlayMode = 'list'): void {
    this.preloader.setupPlaylist(playlist, currentIndex, playMode);
  }

  /**
   * 按优先级预加载资源
   * @param resources - 资源列表
   * @param priority - 优先级
   */
  async preloadWithPriority(resources: MusicResource[], priority: PreloadPriority): Promise<void> {
    return this.preloader.preloadWithPriority(resources, priority);
  }

  /**
   * 获取预加载状态
   * @param url - 资源URL
   * @returns 是否已预加载
   */
  getPreloadStatus(url: string): boolean {
    return this.preloader.isResourcePreloaded(url);
  }

  /**
   * 检查资源是否已缓存
   * @param url - 资源URL
   * @returns 是否已缓存
   */
  isResourceCached(url: string): boolean {
    return this.preloader.isResourceCached(url);
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    totalCached: number;
    audioCount: number;
    imageCount: number;
    cacheSize: number;
  } {
    return this.preloader.getCacheStats();
  }

  /**
   * 清除所有缓存
   */
  clearAllCaches(): void {
    this.preloader.clearCache();
  }

  /**
   * 清理事件监听器
   */
  cleanup(): void {
    this.preloader.cleanup();
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.preloader.destroy();
  }
}

export default MusicPlayerPreloader;
