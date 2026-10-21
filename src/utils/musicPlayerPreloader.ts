'use client';

import { getAssetPath } from './assetUtils';
import type { PlayMode } from '@/types/music';
import { howlerPlayerManager } from './howlerPlayerManager';

// ==================== 类型定义 ====================

/**
 * 预加载优先级枚举
 * - high: 高优先级，立即加载
 * - medium: 中优先级，延迟加载（下一首歌曲）
 * - low: 低优先级，空闲时加载
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
 * 缓存资源信息接口
 */
interface CachedResource {
  /** 资源URL */
  url: string;
  /** 资源类型 */
  type: 'audio' | 'image';
  /** 缓存时间戳 */
  cachedAt: number;
}

/**
 * 播放进度事件详情（与 howlerPlayerManager 保持一致）
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
  /** 下一首索引（管理器计算，不会推进随机队列） */
  nextIndex: number;
}

/**
 * 歌曲切换事件详情
 */
interface SongChangeEventDetail {
  /** 新歌曲索引 */
  index: number;
  /** 下一首索引 */
  nextIndex: number;
}

/**
 * 播放模式变化事件详情
 */
interface PlayModeChangeEventDetail {
  /** 新的播放模式 */
  mode: PlayMode;
}

// ==================== 常量定义 ====================

/** 预加载触发阈值：播放进度达到此百分比时开始预加载下一首 */
const PRELOAD_THRESHOLD = 80;

/** 缓存过期时间：1小时（毫秒） */
const CACHE_EXPIRE_TIME = 60 * 60 * 1000;

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
 *
 * 【预加载策略】
 * - 当前歌曲由 Howler 自己加载，预加载器不再重复请求；
 * - 切歌时预加载管理器计算出的“下一首”；
 * - 播放进度到 80% 时再次确认下一首已预加载；
 * - 随机模式下直接使用管理器的随机队列 peek 结果，
 *   不再自行随机猜歌（旧实现会每 250ms 预加载一首不同的歌）。
 */
class MusicPlayerPreloader {
  /** 单例实例 */
  private static instance: MusicPlayerPreloader;

  /** 资源缓存映射表：存储已缓存资源的详细信息 */
  private resourceCache: Map<string, CachedResource> = new Map();

  /** 正在预加载的Promise映射表（防止重复加载） */
  private preloadPromises: Map<string, Promise<void>> = new Map();

  /** 缓存的音频元素引用（用于复用Audio对象） */
  private audioCache: Map<string, HTMLAudioElement> = new Map();

  /** 缓存的图片元素引用（用于复用Image对象） */
  private imageCache: Map<string, HTMLImageElement> = new Map();

  /** 当前播放列表 */
  private playlist: MusicResource[] = [];

  /** 当前播放索引 */
  private currentIndex: number = -1;

  /** 当前播放模式（默认随机播放，与管理器保持一致） */
  private playMode: PlayMode = 'random';

  /** 是否已设置管理器事件监听 */
  private managerListenersSetup = false;

  /** 上一次预加载的索引（防止重复预加载） */
  private lastPreloadedIndex: number = -1;

  /** 管理器事件处理器引用（用于解绑） */
  private boundProgressHandler: ((detail: PlayProgressDetail) => void) | null = null;
  private boundSongChangeHandler: ((detail: SongChangeEventDetail) => void) | null = null;
  private boundModeChangeHandler: ((detail: PlayModeChangeEventDetail) => void) | null = null;

  /** 延迟预加载定时器集合（用于清理） */
  private pendingTimeouts: Set<ReturnType<typeof setTimeout>> = new Set();

  /** 上一次清理过期缓存的时间戳 */
  private lastCacheCleanupAt = 0;

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

  // ==================== 播放列表与事件监听 ====================

  /**
   * 设置播放列表信息（初始化时调用）
   *
   * @param playlist - 播放列表
   * @param currentIndex - 当前播放索引
   * @param playMode - 播放模式
   */
  setupPlaylist(playlist: MusicResource[], currentIndex: number = 0, playMode: PlayMode = 'random'): void {
    this.updatePlaylist(playlist, currentIndex, playMode);

    // 设置管理器事件监听
    this.setupManagerListeners();

    // 当前歌曲由 Howler 负责加载，这里只预加载下一首
    this.preloadUpcoming('medium');
  }

  /**
   * 更新播放列表（本地歌单合并在线歌单后调用）
   *
   * 不会重置缓存，也不会重复预加载当前歌曲。
   *
   * @param playlist - 新播放列表
   * @param currentIndex - 当前播放索引
   * @param playMode - 播放模式
   */
  updatePlaylist(playlist: MusicResource[], currentIndex: number = 0, playMode: PlayMode = 'random'): void {
    this.playlist = playlist;
    this.currentIndex = currentIndex;
    this.playMode = playMode;
    this.lastPreloadedIndex = -1;
  }

  /**
   * 设置管理器事件监听
   * 直接订阅管理器事件，不再依赖 window 上的 CustomEvent
   */
  private setupManagerListeners(): void {
    if (this.managerListenersSetup) return;
    if (typeof window === 'undefined') return;

    this.boundProgressHandler = (detail: PlayProgressDetail) => {
      this.handlePlayProgress(detail);
    };

    this.boundSongChangeHandler = (detail: SongChangeEventDetail) => {
      this.handleSongChange(detail);
    };

    this.boundModeChangeHandler = (detail: PlayModeChangeEventDetail) => {
      this.handlePlayModeChange(detail.mode);
    };

    howlerPlayerManager.addEventListener('play-progress', this.boundProgressHandler);
    howlerPlayerManager.addEventListener('song-change', this.boundSongChangeHandler);
    howlerPlayerManager.addEventListener('play-mode-change', this.boundModeChangeHandler);

    this.managerListenersSetup = true;
  }

  /**
   * 处理播放进度事件
   * 当播放进度达到阈值时预加载管理器计算出的下一首
   * @param detail - 播放进度详情
   */
  private handlePlayProgress(detail: PlayProgressDetail): void {
    this.currentIndex = detail.currentIndex;

    if (detail.progress < PRELOAD_THRESHOLD) return;
    if (detail.nextIndex < 0 || detail.nextIndex >= this.playlist.length) return;
    // 单曲循环时 nextIndex === currentIndex，不需要预加载
    if (detail.nextIndex === detail.currentIndex) return;
    // 已经预加载过同一首，避免重复请求
    if (detail.nextIndex === this.lastPreloadedIndex) return;

    this.lastPreloadedIndex = detail.nextIndex;
    this.preloadSongAtIndex(detail.nextIndex, 'medium');
  }

  /**
   * 处理歌曲切换事件
   * @param detail - 歌曲切换详情
   */
  private handleSongChange(detail: SongChangeEventDetail): void {
    this.currentIndex = detail.index;
    this.lastPreloadedIndex = -1;

    if (detail.nextIndex < 0 || detail.nextIndex >= this.playlist.length) return;
    if (detail.nextIndex === detail.index) return;

    this.lastPreloadedIndex = detail.nextIndex;
    this.preloadSongAtIndex(detail.nextIndex, 'medium');
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
   * 预加载管理器计算出的下一首
   * @param priority - 预加载优先级
   */
  private preloadUpcoming(priority: PreloadPriority): void {
    if (this.playMode === 'single') return;

    const nextIndex = howlerPlayerManager.getUpcomingIndex();
    if (nextIndex < 0 || nextIndex >= this.playlist.length) return;
    if (nextIndex === this.currentIndex) return;
    if (nextIndex === this.lastPreloadedIndex) return;

    this.lastPreloadedIndex = nextIndex;
    this.preloadSongAtIndex(nextIndex, priority);
  }

  // ==================== 优先级加载 ====================

  /**
   * 按优先级预加载资源
   * 高优先级资源立即加载，中优先级延迟500ms，低优先级延迟2秒
   * @param resources - 要预加载的资源列表
   * @param priority - 预加载优先级
   */
  async preloadWithPriority(resources: MusicResource[], priority: PreloadPriority): Promise<void> {
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
   * 预加载指定索引的歌曲（带优先级）
   * @param index - 歌曲索引
   * @param priority - 优先级
   */
  async preloadSongAtIndex(index: number, priority: PreloadPriority = 'medium'): Promise<void> {
    if (index < 0 || index >= this.playlist.length) return;
    const resource = this.playlist[index];
    await this.preloadWithPriority([resource], priority);
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
      const timeoutId = setTimeout(async () => {
        this.pendingTimeouts.delete(timeoutId);
        try {
          await this.preloadResourcesImmediate(resources);
        } finally {
          resolve();
        }
      }, delay);

      this.pendingTimeouts.add(timeoutId);
    });
  }

  // ==================== 基础预加载方法 ====================

  /**
   * 预加载音频文件（只预加载元数据）
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

      // 已经加载过元数据，直接复用
      // 注意：audio.src 返回绝对 URL，而 url 可能是 /music/... 相对路径，
      // 因此比较 getAttribute('src') 而不是 audio.src。
      if (audio.getAttribute('src') === url && audio.readyState >= 1) {
        this.addToCache(url, 'audio');
        resolve();
        return;
      }

      // 元数据加载完成
      const handleLoadedMetadata = () => {
        this.addToCache(url, 'audio');
        cleanup();
        resolve();
      };

      // 加载错误处理
      const handleError = () => {
        // 失败时移除元素，允许下次重试
        audio!.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio!.removeEventListener('error', handleError);
        audio!.removeAttribute('src');
        this.audioCache.delete(url);
        cleanup();
        // 即使失败也resolve，不影响主流程
        resolve();
      };

      // 超时兜底：网络卡住时不让 Promise 永久挂起，避免后续预加载复用死 Promise
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      // 清理事件监听器与超时定时器
      const cleanup = () => {
        audio!.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio!.removeEventListener('error', handleError);
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      timeoutId = setTimeout(() => {
        cleanup();
        this.audioCache.delete(url);
        resolve();
      }, 10000);

      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('error', handleError);

      // 设置音频源
      if (audio.getAttribute('src') !== url) {
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
        this.addToCache(url, 'image');
        cleanup();
        resolve();
      };

      // 加载错误处理
      const handleError = () => {
        img!.removeEventListener('load', handleLoad);
        img!.removeEventListener('error', handleError);
        img!.removeAttribute('src');
        this.imageCache.delete(url);
        // 即使失败也resolve，不影响主流程
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
      if (img.getAttribute('src') !== url) {
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

  // ==================== 缓存策略 ====================

  /**
   * 检查资源是否已缓存（带 TTL）
   * @param url - 资源URL
   * @returns 是否已缓存
   */
  isResourceCached(url: string): boolean {
    this.maybeCleanExpiredCache();

    const cached = this.resourceCache.get(url);
    if (!cached) return false;

    if (Date.now() - cached.cachedAt > CACHE_EXPIRE_TIME) {
      this.resourceCache.delete(url);
      this.releaseCachedElement(url);
      return false;
    }

    return true;
  }

  /**
   * 定期清理过期缓存（最多每 5 分钟一次）
   */
  private maybeCleanExpiredCache(): void {
    const now = Date.now();
    if (now - this.lastCacheCleanupAt < 5 * 60 * 1000) return;
    this.lastCacheCleanupAt = now;
    this.cleanExpiredCache();
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
  }

  /**
   * 释放单个缓存资源对应的 DOM 元素
   * @param url - 资源URL
   */
  private releaseCachedElement(url: string): void {
    const audio = this.audioCache.get(url);
    if (audio) {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch {
        // 忽略释放失败
      }
      this.audioCache.delete(url);
    }

    const image = this.imageCache.get(url);
    if (image) {
      try {
        image.removeAttribute('src');
      } catch {
        // 忽略释放失败
      }
      this.imageCache.delete(url);
    }
  }

  /**
   * 清理最旧的缓存
   */
  private cleanOldestCache(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, value] of this.resourceCache) {
      if (value.cachedAt < oldestTime) {
        oldestTime = value.cachedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.resourceCache.delete(oldestKey);
      this.releaseCachedElement(oldestKey);
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

    for (const key of expiredKeys) {
      this.resourceCache.delete(key);
      this.releaseCachedElement(key);
    }
  }

  /**
   * 清除所有缓存
   */
  clearCache(): void {
    for (const url of [...this.audioCache.keys()]) {
      this.releaseCachedElement(url);
    }
    for (const url of [...this.imageCache.keys()]) {
      this.releaseCachedElement(url);
    }

    this.resourceCache.clear();
    this.preloadPromises.clear();
    this.audioCache.clear();
    this.imageCache.clear();
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

  // ==================== 清理 ====================

  /**
   * 清理所有事件监听器和延迟任务
   * 防止内存泄漏
   */
  cleanup(): void {
    // 移除管理器事件监听器
    if (this.managerListenersSetup) {
      if (this.boundProgressHandler) {
        howlerPlayerManager.removeEventListener('play-progress', this.boundProgressHandler);
      }
      if (this.boundSongChangeHandler) {
        howlerPlayerManager.removeEventListener('song-change', this.boundSongChangeHandler);
      }
      if (this.boundModeChangeHandler) {
        howlerPlayerManager.removeEventListener('play-mode-change', this.boundModeChangeHandler);
      }

      this.boundProgressHandler = null;
      this.boundSongChangeHandler = null;
      this.boundModeChangeHandler = null;
      this.managerListenersSetup = false;
    }

    // 取消所有尚未执行的延迟预加载
    for (const timeoutId of this.pendingTimeouts) {
      clearTimeout(timeoutId);
    }
    this.pendingTimeouts.clear();
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
    this.playMode = 'random';
    this.lastPreloadedIndex = -1;
  }

  /**
   * 检查资源是否已预加载
   * @param url - 资源URL
   */
  isResourcePreloaded(url: string): boolean {
    return this.isResourceCached(getAssetPath(url));
  }
}

export default MusicPlayerPreloader;
