'use client';

import type { APlayerNS, PlayMode, MusicHistoryItem, MusicPlayerState } from '@/types/aplayer';

// ==================== 常量定义 ====================

/** localStorage 键名常量 */
const STORAGE_KEYS = {
  /** 播放器状态存储键 */
  PLAYER_STATE: 'musicPlayerState',
  /** 播放历史存储键 */
  PLAY_HISTORY: 'musicPlayHistory',
} as const;

/** 播放历史最大保存数量 */
const MAX_HISTORY_ITEMS = 50;

/** 播放模式循环顺序 */
const PLAY_MODE_ORDER: PlayMode[] = ['list', 'random', 'single'];

// ==================== 自定义事件类型定义 ====================

/**
 * 播放模式变化事件详情
 */
interface PlayModeChangeEventDetail {
  /** 新的播放模式 */
  mode: PlayMode;
  /** 之前的播放模式 */
  previousMode: PlayMode;
}

/**
 * 音量变化事件详情
 */
interface VolumeChangeEventDetail {
  /** 当前音量值（0-1） */
  volume: number;
  /** 是否静音 */
  muted: boolean;
}

/**
 * 播放历史更新事件详情
 */
interface HistoryUpdateEventDetail {
  /** 更新后的历史列表 */
  history: MusicHistoryItem[];
  /** 操作类型：add（添加）、clear（清空） */
  action: 'add' | 'clear';
}

// ==================== 全局音乐播放器管理器类 ====================

/**
 * 全局音乐播放器管理器
 * 负责管理 APlayer 实例、播放状态、播放历史等核心功能
 * 采用单例模式确保全局只有一个管理器实例
 */
class GlobalMusicPlayerManager {
  /** 单例实例 */
  private static instance: GlobalMusicPlayerManager;

  /** APlayer 播放器实例 */
  private player: APlayerNS.APlayer | null = null;

  /** 播放器是否已初始化 */
  private isInitialized = false;

  /** 初始化回调队列 */
  private initCallbacks: ((player: APlayerNS.APlayer) => void)[] = [];

  /** 是否正在页面切换中 */
  private isPageTransitioning = false;

  /** 监听器是否已设置 */
  private listenersSetup = false;

  // ==================== 播放模式状态 ====================

  /** 当前播放模式，默认为列表循环 */
  private playMode: PlayMode = 'list';

  // ==================== 歌词显示状态 ====================

  /** 歌词是否可见，默认隐藏 */
  private lyricsVisible: boolean = false;

  // ==================== 播放历史 ====================

  /** 播放历史列表 */
  private playHistory: MusicHistoryItem[] = [];

  // ==================== 事件监听器存储 ====================

  /** 自定义事件监听器映射表 */
  private eventListeners: Map<string, Set<Function>> = new Map();

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor() {
    // 在构造函数中初始化播放历史
    this.loadHistoryFromStorage();
  }

  /**
   * 获取单例实例
   * @returns GlobalMusicPlayerManager 的唯一实例
   */
  static getInstance(): GlobalMusicPlayerManager {
    if (!GlobalMusicPlayerManager.instance) {
      GlobalMusicPlayerManager.instance = new GlobalMusicPlayerManager();
    }
    return GlobalMusicPlayerManager.instance;
  }

  // ==================== 页面切换监听 ====================

  /**
   * 设置页面切换监听器
   * 监听页面可见性变化、页面卸载、路由变化等事件
   */
  private setupPageTransitionListeners() {
    // 确保监听器只设置一次，且仅在客户端环境执行
    if (this.listenersSetup || typeof window === 'undefined') return;

    this.listenersSetup = true;

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // 页面隐藏时保存状态
        this.savePlayState();
      } else {
        // 页面重新可见时，延迟重置状态
        setTimeout(() => {
          this.isPageTransitioning = false;
        }, 100);
      }
    });

    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      this.isPageTransitioning = true;
      this.savePlayState();
    });

    // 监听路由变化（Next.js 特有）
    try {
      if (typeof window !== 'undefined' && (window as any).next?.router?.events) {
        (window as any).next.router.events.on('routeChangeStart', () => {
          this.isPageTransitioning = true;
          this.savePlayState();
        });

        (window as any).next.router.events.on('routeChangeComplete', () => {
          setTimeout(() => {
            this.isPageTransitioning = false;
          }, 100);
        });
      }
    } catch (error) {
      console.warn('设置 Next.js 路由监听器失败:', error);
    }
  }

  // ==================== 播放器初始化与获取 ====================

  /**
   * 初始化播放器
   * @param player - APlayer 实例
   */
  initPlayer(player: APlayerNS.APlayer) {
    this.player = player;
    this.isInitialized = true;
    this.setupPageTransitionListeners();

    // 恢复播放状态
    this.restorePlayState();

    // 设置音量变化监听器
    this.setupVolumeListener();

    // 通知所有等待初始化的回调
    this.initCallbacks.forEach(callback => callback(player));
    this.initCallbacks = [];
  }

  /**
   * 设置播放器实例
   * @param player - APlayer 实例
   */
  setPlayer(player: APlayerNS.APlayer) {
    this.player = player;
    this.setupPageTransitionListeners();
    this.restorePlayState();
    this.setupVolumeListener();
  }

  /**
   * 获取播放器实例
   * @returns APlayer 实例或 null
   */
  getPlayer(): APlayerNS.APlayer | null {
    return this.player;
  }

  /**
   * 检查播放器是否已初始化
   * @returns 是否已初始化
   */
  isPlayerInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 检查是否正在页面切换
   * @returns 是否正在页面切换
   */
  isPageInTransition(): boolean {
    return this.isPageTransitioning;
  }

  /**
   * 当播放器初始化后执行回调
   * @param callback - 初始化完成后执行的回调函数
   */
  onInit(callback: (player: APlayerNS.APlayer) => void) {
    if (this.isInitialized && this.player) {
      callback(this.player);
    } else {
      this.initCallbacks.push(callback);
    }
  }

  // ==================== SubTask 3.1: 播放模式状态管理 ====================

  /**
   * 设置播放模式
   * @param mode - 播放模式：'list'（列表循环）、'random'（随机）、'single'（单曲循环）
   */
  setPlayMode(mode: PlayMode) {
    const previousMode = this.playMode;
    this.playMode = mode;

    // 同步到 APlayer 的 order 配置
    // 注意：APlayer 只支持 'list' 和 'random'，'single' 需要特殊处理
    if (this.player && this.player.options) {
      if (mode === 'random') {
        this.player.options.order = 'random';
      } else {
        this.player.options.order = 'list';
      }
    }

    // 触发播放模式变化事件
    this.emitEvent('play-mode-change', {
      mode,
      previousMode,
    } as PlayModeChangeEventDetail);

    // 保存状态
    this.savePlayState();
  }

  /**
   * 获取当前播放模式
   * @returns 当前播放模式
   */
  getPlayMode(): PlayMode {
    return this.playMode;
  }

  /**
   * 循环切换播放模式
   * 按顺序：list -> random -> single -> list
   * @returns 切换后的新播放模式
   */
  togglePlayMode(): PlayMode {
    const currentIndex = PLAY_MODE_ORDER.indexOf(this.playMode);
    const nextIndex = (currentIndex + 1) % PLAY_MODE_ORDER.length;
    const newMode = PLAY_MODE_ORDER[nextIndex];
    this.setPlayMode(newMode);
    return newMode;
  }

  // ==================== SubTask 3.2: 歌词显示状态管理 ====================

  /**
   * 设置歌词显示状态
   * @param visible - 是否显示歌词
   */
  setLyricsVisible(visible: boolean) {
    this.lyricsVisible = visible;

    // 同步到播放器歌词组件
    if (visible) {
      this.showLyrics();
    } else {
      this.hideLyrics();
    }

    // 保存状态
    this.savePlayState();
  }

  /**
   * 获取歌词显示状态
   * @returns 歌词是否可见
   */
  isLyricsVisibleState(): boolean {
    return this.lyricsVisible;
  }

  /**
   * 控制歌词显示
   */
  showLyrics() {
    if (this.player && (this.player as any).lrc) {
      (this.player as any).lrc.show();
      // 同时更新 CSS 类
      const lrcElement = document.querySelector('.aplayer-lrc');
      if (lrcElement) {
        lrcElement.classList.remove('aplayer-lrc-hide');
        lrcElement.classList.add('aplayer-lrc-show');
      }
    }
    this.lyricsVisible = true;
  }

  /**
   * 隐藏歌词
   */
  hideLyrics() {
    if (this.player && (this.player as any).lrc) {
      (this.player as any).lrc.hide();
      // 同时更新 CSS 类
      const lrcElement = document.querySelector('.aplayer-lrc');
      if (lrcElement) {
        lrcElement.classList.add('aplayer-lrc-hide');
        lrcElement.classList.remove('aplayer-lrc-show');
      }
    }
    this.lyricsVisible = false;
  }

  /**
   * 切换歌词显示状态
   */
  toggleLyrics() {
    if (this.player && (this.player as any).lrc) {
      (this.player as any).lrc.toggle();
      // 同时更新 CSS 类
      const lrcElement = document.querySelector('.aplayer-lrc');
      if (lrcElement) {
        if (lrcElement.classList.contains('aplayer-lrc-hide')) {
          lrcElement.classList.remove('aplayer-lrc-hide');
          lrcElement.classList.add('aplayer-lrc-show');
          this.lyricsVisible = true;
        } else {
          lrcElement.classList.add('aplayer-lrc-hide');
          lrcElement.classList.remove('aplayer-lrc-show');
          this.lyricsVisible = false;
        }
      }
    }
    // 保存状态
    this.savePlayState();
  }

  /**
   * 获取歌词当前显示状态（从 DOM 判断）
   * @returns 歌词是否可见
   */
  isLyricsVisible(): boolean {
    if (this.player && (this.player as any).lrc) {
      // APlayer 的歌词组件有一个隐藏的样式类来判断是否显示
      const lrcElement = document.querySelector('.aplayer-lrc');
      if (lrcElement) {
        return (
          !lrcElement.classList.contains('aplayer-lrc-hide') &&
          lrcElement.classList.contains('aplayer-lrc-show')
        );
      }
    }
    return false;
  }

  // ==================== SubTask 3.3: 播放历史管理 ====================

  /**
   * 从 localStorage 加载播放历史
   */
  private loadHistoryFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const savedHistory = localStorage.getItem(STORAGE_KEYS.PLAY_HISTORY);
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          this.playHistory = parsed;
        }
      }
    } catch (error) {
      console.error('加载播放历史失败:', error);
      this.playHistory = [];
    }
  }

  /**
   * 保存播放历史到 localStorage
   */
  private saveHistoryToStorage() {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEYS.PLAY_HISTORY, JSON.stringify(this.playHistory));
    } catch (error) {
      console.error('保存播放历史失败:', error);
    }
  }

  /**
   * 添加歌曲到播放历史
   * 自动去重，最新的记录放在最前面，最多保存 50 条
   * @param song - 要添加的歌曲信息
   */
  addToHistory(song: MusicHistoryItem) {
    // 移除已存在的相同歌曲（根据 id 去重）
    this.playHistory = this.playHistory.filter(item => item.id !== song.id);

    // 将新记录添加到最前面
    this.playHistory.unshift({
      ...song,
      playedAt: song.playedAt || Date.now(),
    });

    // 限制最大数量
    if (this.playHistory.length > MAX_HISTORY_ITEMS) {
      this.playHistory = this.playHistory.slice(0, MAX_HISTORY_ITEMS);
    }

    // 保存到 localStorage
    this.saveHistoryToStorage();

    // 触发历史更新事件
    this.emitEvent('history-update', {
      history: this.playHistory,
      action: 'add',
    } as HistoryUpdateEventDetail);
  }

  /**
   * 获取播放历史列表
   * @returns 播放历史列表的副本
   */
  getHistory(): MusicHistoryItem[] {
    return [...this.playHistory];
  }

  /**
   * 清空播放历史
   */
  clearHistory() {
    this.playHistory = [];

    // 清除 localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.PLAY_HISTORY);
    }

    // 触发历史更新事件
    this.emitEvent('history-update', {
      history: [],
      action: 'clear',
    } as HistoryUpdateEventDetail);
  }

  // ==================== SubTask 3.4: 状态持久化机制优化 ====================

  /**
   * 保存播放状态到 localStorage
   * 保存内容包括：索引、播放进度、暂停状态、音量、静音状态、播放模式、歌词显示状态
   */
  savePlayState() {
    if (this.player && this.player.list && this.player.audio) {
      const playState: MusicPlayerState = {
        index: this.player.list.index,
        currentTime: this.player.audio.currentTime,
        paused: this.player.paused,
        volume: this.player.volume,
        muted: this.player.muted,
        playMode: this.playMode,
        lyricsVisible: this.lyricsVisible,
      };
      localStorage.setItem(STORAGE_KEYS.PLAYER_STATE, JSON.stringify(playState));
    }
  }

  /**
   * 从 localStorage 恢复播放状态
   * @returns 恢复的播放状态对象，如果恢复失败则返回 null
   */
  restorePlayState(): MusicPlayerState | null {
    if (!this.player) return null;

    const savedPlayInfo = localStorage.getItem(STORAGE_KEYS.PLAYER_STATE);
    if (!savedPlayInfo) return null;

    try {
      const playInfo = JSON.parse(savedPlayInfo);

      // 验证数据结构
      if (!playInfo || typeof playInfo !== 'object') {
        return null;
      }

      // 恢复播放模式
      if (playInfo.playMode && PLAY_MODE_ORDER.includes(playInfo.playMode)) {
        this.playMode = playInfo.playMode;
      }

      // 恢复歌词显示状态
      if (typeof playInfo.lyricsVisible === 'boolean') {
        this.lyricsVisible = playInfo.lyricsVisible;
      }

      // 返回完整的播放状态
      return {
        index: typeof playInfo.index === 'number' ? playInfo.index : 0,
        currentTime: typeof playInfo.currentTime === 'number' ? playInfo.currentTime : 0,
        paused: typeof playInfo.paused === 'boolean' ? playInfo.paused : true,
        volume: typeof playInfo.volume === 'number' ? Math.max(0, Math.min(1, playInfo.volume)) : 0.5,
        muted: typeof playInfo.muted === 'boolean' ? playInfo.muted : false,
        playMode: this.playMode,
        lyricsVisible: this.lyricsVisible,
      };
    } catch (e) {
      console.error('解析保存的播放状态失败:', e);
      return null;
    }
  }

  // ==================== SubTask 3.5: 事件系统完善 ====================

  /**
   * 设置音量变化监听器
   * 监听播放器音量变化并触发自定义事件
   */
  private setupVolumeListener() {
    if (!this.player) return;

    // 监听播放器的音量变化事件
    this.player.on('volumechange', () => {
      if (this.player) {
        this.emitEvent('volume-change', {
          volume: this.player.volume,
          muted: this.player.muted,
        } as VolumeChangeEventDetail);
      }
    });
  }

  /**
   * 添加事件监听器
   * @param event - 事件名称
   * @param handler - 事件处理函数
   */
  addEventListener(event: string, handler: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  /**
   * 移除事件监听器
   * @param event - 事件名称
   * @param handler - 事件处理函数
   */
  removeEventListener(event: string, handler: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(handler);
    }
  }

  /**
   * 触发自定义事件
   * @param event - 事件名称
   * @param detail - 事件详情数据
   */
  private emitEvent(event: string, detail?: unknown) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(detail);
        } catch (error) {
          console.error(`事件处理器执行错误 (${event}):`, error);
        }
      });
    }

    // 同时触发自定义 DOM 事件，方便外部监听
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent(`music-player:${event}`, {
        detail,
        bubbles: true,
      });
      window.dispatchEvent(customEvent);
    }
  }

  // ==================== 工具方法 ====================

  /**
   * 销毁播放器管理器
   * 清理所有监听器和状态
   */
  destroy() {
    // 保存最终状态
    this.savePlayState();

    // 清理事件监听器
    this.eventListeners.clear();

    // 重置状态
    this.player = null;
    this.isInitialized = false;
    this.listenersSetup = false;
    this.initCallbacks = [];
  }
}

export default GlobalMusicPlayerManager;
