'use client';

import { Howl, Howler } from 'howler';
import type { PlayMode, MusicHistoryItem, MusicPlayerState, ProcessedAudioItem } from '@/types/music';
import { PLAY_MODE_ORDER } from '@/types/playMode';

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

/** 播放状态保存节流间隔（毫秒），避免频繁写入 localStorage */
const SAVE_THROTTLE_MS = 1000;

/** 播放进度事件触发间隔（毫秒），平衡实时性与性能 */
const PROGRESS_UPDATE_INTERVAL_MS = 250;

/** 歌曲加载/播放失败后的自动切歌等待时间（毫秒） */
const FAILURE_AUTO_SKIP_DELAY_MS = 12000;

// ==================== 工具函数 ====================

/**
 * Fisher-Yates 洗牌算法
 * 生成一个不重复元素的随机排列数组
 * @param array 原始数组
 * @returns 随机排列后的新数组
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 格式化歌曲唯一标识
 * 使用歌名 + 歌手 + 来源组合，避免不同来源的同名歌曲冲突
 * @param song 歌曲信息
 * @returns 唯一标识字符串
 */
function generateSongId(song: { name: string; artist: string; source?: string }): string {
  return `${song.name}-${song.artist}-${song.source || 'local'}`;
}

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

// ==================== Howler 播放器管理器类 ====================

/**
 * 基于 Howler.js 的全局音乐播放器管理器
 *
 * 负责管理音频播放、播放列表、播放状态、播放历史等核心功能
 * 采用单例模式确保全局只有一个管理器实例
 *
 * 设计要点：
 * 1. 使用 Howler.js 作为音频引擎，支持流媒体和本地文件
 * 2. 事件驱动架构，UI 通过监听事件同步状态
 * 3. 播放状态持久化到 localStorage，刷新后自动恢复
 * 4. 随机播放通过已播放索引集合避免连续重复
 * 5. 歌曲加载/播放失败等待 12 秒后自动切歌
 */
class HowlerPlayerManager {
  /** 单例实例 */
  private static instance: HowlerPlayerManager;

  /** 播放列表 */
  private playlist: ProcessedAudioItem[] = [];

  /** 当前播放索引 */
  private currentIndex = 0;

  /** 当前播放模式 */
  private playMode: PlayMode = 'list';

  /** 当前 Howl 音频实例 */
  private howl: Howl | null = null;

  /** 播放器是否已初始化 */
  private isInitialized = false;

  /** 是否正在播放 */
  private playing = false;

  /** 是否正在加载音频 */
  private loading = false;

  /** 当前歌曲总时长（秒） */
  private duration = 0;

  /** 当前播放时间（秒） */
  private currentTime = 0;

  /** 当前音量值（0-1） */
  private volume = 0.7;

  /** 是否静音 */
  private muted = false;

  /** 歌词是否可见 */
  private lyricsVisible = false;

  /** 播放历史列表 */
  private playHistory: MusicHistoryItem[] = [];

  /** 自定义事件监听器映射表 */
  private eventListeners: Map<string, Set<Function>> = new Map();

  /** 初始化完成回调队列 */
  private initCallbacks: ((manager: HowlerPlayerManager) => void)[] = [];

  /** 页面过渡监听器是否已设置 */
  private listenersSetup = false;

  /** 进度更新动画帧 ID */
  private progressRafId: number | null = null;

  /** 上一次触发进度事件的时间戳 */
  private lastProgressEmit = 0;

  /** 上一次保存播放状态的时间戳 */
  private lastSaveTime = 0;

  /** 歌曲失败后的自动切歌定时器 */
  private failureTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** 随机播放模式下已播放过的索引集合，用于避免连续重复 */
  private playedIndices: number[] = [];

  /** 随机播放顺序数组 */
  private randomOrder: number[] = [];

  /**
   * 私有构造函数，防止外部实例化
   * 构造时从 localStorage 恢复播放历史
   */
  private constructor() {
    this.loadHistoryFromStorage();
  }

  /**
   * 获取单例实例
   * @returns HowlerPlayerManager 的唯一实例
   */
  static getInstance(): HowlerPlayerManager {
    if (!HowlerPlayerManager.instance) {
      HowlerPlayerManager.instance = new HowlerPlayerManager();
    }
    return HowlerPlayerManager.instance;
  }

  // ==================== 页面切换监听 ====================

  /**
   * 设置页面切换监听器
   * 监听页面可见性变化和页面卸载事件，用于保存播放状态
   */
  private setupPageTransitionListeners() {
    // 确保监听器只设置一次，且仅在客户端环境执行
    if (this.listenersSetup || typeof window === 'undefined') return;

    this.listenersSetup = true;

    // 页面隐藏时保存状态
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.savePlayState();
      }
    });

    // 页面刷新或关闭前保存状态
    window.addEventListener('beforeunload', () => {
      this.savePlayState();
    });
  }

  // ==================== 播放器初始化 ====================

  /**
   * 初始化播放器
   * @param playlist 播放列表
   * @param options 初始化选项
   */
  init(
    playlist: ProcessedAudioItem[],
    options: { autoPlay?: boolean; initialIndex?: number; initialTime?: number } = {}
  ) {
    if (typeof window === 'undefined') return;

    this.playlist = playlist.length > 0 ? playlist : [];
    this.currentIndex = 0;

    // 生成随机播放顺序
    this.regenerateRandomOrder();

    // 恢复保存的播放状态
    const savedState = this.restorePlayState();

    // 优先使用传入的初始索引，否则使用保存的索引
    let targetIndex = options.initialIndex ?? savedState?.index ?? 0;
    if (targetIndex < 0 || targetIndex >= this.playlist.length) {
      targetIndex = 0;
    }

    const targetTime = options.initialTime ?? savedState?.currentTime ?? 0;
    const shouldAutoPlay = options.autoPlay ?? !(savedState?.paused ?? true);

    this.currentIndex = targetIndex;

    // 设置页面切换监听器
    this.setupPageTransitionListeners();

    this.isInitialized = true;

    // 通知等待初始化的回调
    this.initCallbacks.forEach(callback => callback(this));
    this.initCallbacks = [];

    // 加载第一首歌曲
    if (this.playlist.length > 0) {
      this.loadSong(this.currentIndex, shouldAutoPlay);
      if (targetTime > 0) {
        // 等音频加载完成后再跳转到指定位置
        const handleLoad = () => {
          this.seek(targetTime);
          this.removeEventListener('load', handleLoad);
        };
        this.addEventListener('load', handleLoad);
      }
    }

    // 触发列表切换事件，通知 UI 更新
    this.emitEvent('listswitch');
  }

  /**
   * 设置播放器实例（兼容旧版 API）
   * 新版中此方法与 init 作用相同
   */
  setPlayer(playlist: ProcessedAudioItem[]) {
    this.init(playlist);
  }

  /**
   * 获取播放器实例（兼容旧版 API）
   * 新版返回管理器自身，外部可通过管理器方法控制播放
   * @returns 播放器管理器实例
   */
  getPlayer(): HowlerPlayerManager {
    return this;
  }

  /**
   * 检查播放器是否已初始化
   * @returns 是否已初始化
   */
  isPlayerInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * 当播放器初始化后执行回调
   * @param callback 初始化完成后执行的回调函数
   */
  onInit(callback: (manager: HowlerPlayerManager) => void) {
    if (this.isInitialized) {
      callback(this);
    } else {
      this.initCallbacks.push(callback);
    }
  }

  // ==================== 音频加载与 Howl 管理 ====================

  /**
   * 加载指定索引的歌曲
   * @param index 歌曲索引
   * @param autoPlay 是否自动播放
   */
  private loadSong(index: number, autoPlay: boolean) {
    if (index < 0 || index >= this.playlist.length) return;

    // 清理之前的 Howl 实例
    this.destroyCurrentHowl();

    this.currentIndex = index;
    this.currentTime = 0;
    this.duration = 0;
    this.loading = true;

    const song = this.playlist[index];

    // 创建新的 Howl 实例，将 autoPlay 传入构造函数内部处理
    // 避免音频已缓存时 load 事件在 once 监听器挂载前触发导致无法自动播放
    this.howl = this.createHowl(song.url, autoPlay);

    // 根据播放模式设置循环
    this.applyLoopByMode();

    // 触发列表切换事件，通知 UI 更新当前歌曲信息
    this.emitEvent('listswitch');
  }

  /**
   * 根据音频 URL 推断格式列表
   * 用于显式告知 Howler 音频格式，避免依赖 URL 扩展名自动识别失败
   * @param url 音频 URL
   * @returns 格式字符串数组
   */
  private getAudioFormats(url: string): string[] {
    // Howler 支持的常见音频格式
    const supportedFormats = [
      'mp3', 'mpeg', 'opus', 'ogg', 'oga', 'wav', 'aac',
      'caf', 'm4a', 'm4b', 'mp4', 'weba', 'webm', 'flac',
    ];

    try {
      // 移除查询参数和哈希，提取扩展名
      const cleanUrl = url.split('?')[0].split('#')[0];
      const ext = cleanUrl.split('.').pop()?.toLowerCase();
      if (ext && supportedFormats.includes(ext)) {
        return [ext];
      }
    } catch {
      // 提取失败时使用默认常见格式
    }

    // 默认返回一组常见格式，兼容网易云等可能不带扩展名的 URL
    return ['mp3', 'm4a', 'aac'];
  }

  /**
   * 创建 Howl 实例
   * @param url 音频 URL
   * @param autoPlay 加载完成后是否自动播放，用于避免外部 once('load') 的竞态问题
   * @returns Howl 实例
   */
  private createHowl(url: string, autoPlay: boolean = false): Howl {
    // 对 URL 进行编码，避免中文、空格等特殊字符导致 Howler 无法正确解析
    const encodedUrl = encodeURI(url);

    const howl = new Howl({
      src: [encodedUrl],
      format: this.getAudioFormats(url),
      html5: true, // 使用 HTML5 Audio，支持流媒体和大文件播放
      preload: true,
      volume: this.volume,
      mute: this.muted,
      onload: () => {
        this.loading = false;
        this.duration = howl.duration() || 0;
        this.emitEvent('load');
        this.startProgressLoop();
        // 在 onload 回调内部直接播放，确保即使 load 事件同步触发也能生效
        if (autoPlay) {
          this.play();
        }
      },
      onloaderror: (_id, error) => {
        this.loading = false;
        console.error(`[MusicPlayer] 音乐加载失败: ${this.getCurrentSong()?.name || '未知歌曲'}`, error);
        this.handleLoadError();
      },
      onplayerror: (_id, error) => {
        console.error(`[MusicPlayer] 音乐播放失败: ${this.getCurrentSong()?.name || '未知歌曲'}`, error);
        this.handlePlayError();
      },
      onplay: () => {
        this.playing = true;
        this.loading = false;
        this.clearFailureSkip();
        this.emitEvent('play');
        this.recordHistoryOnPlay();
        this.startProgressLoop();
      },
      onpause: () => {
        this.playing = false;
        this.emitEvent('pause');
        this.savePlayState();
      },
      onend: () => {
        this.playing = false;
        this.emitEvent('ended');
        this.handleSongEnd();
      },
      onstop: () => {
        this.playing = false;
        this.emitEvent('pause');
      },
      onseek: () => {
        this.updateProgress();
      },
    });

    return howl;
  }

  /**
   * 销毁当前 Howl 实例
   */
  private destroyCurrentHowl() {
    this.stopProgressLoop();
    this.clearFailureSkip();
    if (this.howl) {
      this.howl.stop();
      this.howl.unload();
      this.howl = null;
    }
  }

  /**
   * 根据当前播放模式设置循环
   * - 单曲循环：当前歌曲循环播放
   * - 列表/随机循环：由管理器在歌曲结束时手动切换
   */
  private applyLoopByMode() {
    if (this.howl) {
      this.howl.loop(this.playMode === 'single');
    }
  }

  // ==================== 播放控制 ====================

  /**
   * 开始播放
   */
  play() {
    if (this.howl) {
      this.howl.play();
    }
  }

  /**
   * 暂停播放
   */
  pause() {
    if (this.howl) {
      this.howl.pause();
    }
  }

  /**
   * 切换播放/暂停状态
   */
  toggle() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  /**
   * 播放下一首
   */
  next() {
    if (this.playlist.length === 0) return;

    // 记录当前歌曲为已播放，避免随机模式下手动切歌后立即重复回到同一首
    if (!this.playedIndices.includes(this.currentIndex)) {
      this.playedIndices.push(this.currentIndex);
    }

    const nextIndex = this.getNextIndex();
    this.loadSong(nextIndex, true);
  }

  /**
   * 播放上一首
   */
  prev() {
    if (this.playlist.length === 0) return;

    let prevIndex: number;
    if (this.playMode === 'random') {
      // 随机模式下回到上一首较复杂，简单实现为随机一首（避免当前）
      prevIndex = this.getRandomIndexExcludingCurrent();
    } else {
      prevIndex = this.currentIndex === 0 ? this.playlist.length - 1 : this.currentIndex - 1;
    }
    this.loadSong(prevIndex, true);
  }

  /**
   * 跳转到指定时间点
   * @param time 目标时间（秒）
   */
  seek(time: number) {
    if (!this.howl) return;
    const clampedTime = Math.max(0, Math.min(time, this.duration || Infinity));
    this.howl.seek(clampedTime);
    this.currentTime = clampedTime;
  }

  // ==================== 音量控制 ====================

  /**
   * 设置音量
   * @param volume 音量值（0-1）
   */
  setVolume(volume: number) {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    this.volume = clampedVolume;
    Howler.volume(clampedVolume);
    this.emitEvent('volumechange', {
      volume: clampedVolume,
      muted: this.muted,
    } as VolumeChangeEventDetail);
  }

  /**
   * 获取当前音量
   * @returns 音量值（0-1）
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * 设置静音状态
   * @param muted 是否静音
   */
  setMuted(muted: boolean) {
    this.muted = muted;
    Howler.mute(muted);
    this.emitEvent('volumechange', {
      volume: this.volume,
      muted,
    } as VolumeChangeEventDetail);
  }

  /**
   * 获取静音状态
   * @returns 是否静音
   */
  isMuted(): boolean {
    return this.muted;
  }

  // ==================== 播放模式管理 ====================

  /**
   * 设置播放模式
   * @param mode 播放模式：'list'（列表循环）、'random'（随机）、'single'（单曲循环）
   */
  setPlayMode(mode: PlayMode) {
    const previousMode = this.playMode;
    this.playMode = mode;

    // 同步到 localStorage
    try {
      localStorage.setItem('musicPlayMode', mode);
    } catch {
      // 忽略 localStorage 写入失败
    }

    // 重新生成随机顺序
    if (mode === 'random') {
      this.regenerateRandomOrder();
    }

    // 应用循环设置
    this.applyLoopByMode();

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

  // ==================== 播放列表与索引 ====================

  /**
   * 获取当前播放索引
   * @returns 当前播放索引
   */
  getCurrentIndex(): number {
    return this.currentIndex;
  }

  /**
   * 获取播放列表
   * @returns 播放列表副本
   */
  getPlaylist(): ProcessedAudioItem[] {
    return [...this.playlist];
  }

  /**
   * 获取当前播放歌曲
   * @returns 当前歌曲信息，如果没有则返回 null
   */
  getCurrentSong(): ProcessedAudioItem | null {
    return this.playlist[this.currentIndex] || null;
  }

  /**
   * 直接播放指定索引的歌曲（不走 init）
   * 区别于 init：该方法不会重置随机播放顺序，不会读取 localStorage 保存的进度，
   * 也不会触发初始化回调。专用于用户从播放列表手动切歌场景。
   * @param index 目标歌曲索引
   * @param autoPlay 是否自动播放，默认 true
   */
  playAt(index: number, autoPlay: boolean = true) {
    if (index < 0 || index >= this.playlist.length) return;
    // 手动切歌时把当前索引加入已播放集合，避免随机模式下立刻又随机到这首
    if (this.playMode === 'random' && !this.playedIndices.includes(this.currentIndex)) {
      this.playedIndices.push(this.currentIndex);
    }
    this.loadSong(index, autoPlay);
  }

  /**
   * 获取播放状态
   * @returns 是否正在播放
   */
  isPlayingState(): boolean {
    return this.playing;
  }

  /**
   * 获取暂停状态
   * @returns 是否暂停
   */
  isPausedState(): boolean {
    return !this.playing;
  }

  /**
   * 获取加载状态
   * @returns 是否正在加载
   */
  isLoadingState(): boolean {
    return this.loading;
  }

  /**
   * 获取当前歌曲总时长
   * @returns 总时长（秒）
   */
  getDuration(): number {
    return this.duration;
  }

  /**
   * 获取当前播放时间
   * @returns 当前播放时间（秒）
   */
  getCurrentTime(): number {
    return this.currentTime;
  }

  // ==================== 随机播放逻辑 ====================

  /**
   * 重新生成随机播放顺序
   * 使用 Fisher-Yates 洗牌算法，并清空已播放记录
   */
  private regenerateRandomOrder() {
    if (this.playlist.length === 0) {
      this.randomOrder = [];
      return;
    }

    this.randomOrder = shuffleArray(this.playlist.map((_, i) => i));
    this.playedIndices = [];
  }

  /**
   * 获取下一首歌曲的索引
   * 根据播放模式决定下一首逻辑
   * @returns 下一首歌曲索引
   */
  private getNextIndex(): number {
    if (this.playlist.length === 0) return 0;
    if (this.playlist.length === 1) return 0;

    switch (this.playMode) {
      case 'single':
        // 单曲循环返回当前索引
        return this.currentIndex;
      case 'random':
        return this.getNextRandomIndex();
      case 'list':
      default:
        // 列表循环
        return (this.currentIndex + 1) % this.playlist.length;
    }
  }

  /**
   * 获取下一首随机索引
   * 使用随机顺序数组，并记录已播放索引避免连续重复
   * @returns 随机索引
   */
  private getNextRandomIndex(): number {
    // 如果随机顺序数组为空或所有歌曲都已播放，重新生成
    if (this.randomOrder.length === 0 || this.playedIndices.length >= this.playlist.length) {
      this.regenerateRandomOrder();
    }

    // 找到下一个未播放的随机索引
    for (const index of this.randomOrder) {
      if (!this.playedIndices.includes(index)) {
        return index;
      }
    }

    // 兜底：随机一首非当前歌曲
    return this.getRandomIndexExcludingCurrent();
  }

  /**
   * 获取一个非当前播放歌曲的随机索引
   * @returns 随机索引
   */
  private getRandomIndexExcludingCurrent(): number {
    if (this.playlist.length <= 1) return 0;

    let randomIndex: number;
    do {
      randomIndex = Math.floor(Math.random() * this.playlist.length);
    } while (randomIndex === this.currentIndex);

    return randomIndex;
  }

  /**
   * 歌曲结束后的处理
   * 根据播放模式决定是否切换歌曲
   */
  private handleSongEnd() {
    // 单曲循环已由 Howl.loop(true) 自动处理，这里不需要额外操作
    if (this.playMode === 'single') {
      this.savePlayState();
      return;
    }

    // 记录当前歌曲为已播放（用于随机模式去重）
    if (!this.playedIndices.includes(this.currentIndex)) {
      this.playedIndices.push(this.currentIndex);
    }

    // 切换到下一首
    const nextIndex = this.getNextIndex();
    this.loadSong(nextIndex, true);
  }

  // ==================== 播放历史管理 ====================

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
   * @param song 要添加的歌曲信息
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

  /**
   * 在播放事件触发时记录播放历史
   */
  private recordHistoryOnPlay() {
    const song = this.getCurrentSong();
    if (song) {
      this.addToHistory({
        id: generateSongId(song),
        name: song.name,
        artist: song.artist,
        playedAt: Date.now(),
      });
    }
  }

  // ==================== 歌词显示状态管理 ====================

  /**
   * 设置歌词显示状态
   * @param visible 是否显示歌词
   */
  setLyricsVisible(visible: boolean) {
    this.lyricsVisible = visible;
    this.savePlayState();
    this.emitEvent('lyrics-toggle', { visible });
  }

  /**
   * 显示歌词
   */
  showLyrics() {
    this.setLyricsVisible(true);
  }

  /**
   * 隐藏歌词
   */
  hideLyrics() {
    this.setLyricsVisible(false);
  }

  /**
   * 切换歌词显示状态
   */
  toggleLyrics() {
    this.setLyricsVisible(!this.lyricsVisible);
  }

  /**
   * 获取歌词当前显示状态
   * @returns 歌词是否可见
   */
  isLyricsVisible(): boolean {
    return this.lyricsVisible;
  }

  // ==================== 状态持久化机制 ====================

  /**
   * 保存播放状态到 localStorage
   * 保存内容包括：索引、播放进度、暂停状态、音量、静音状态、播放模式、歌词显示状态
   */
  savePlayState() {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    // 节流控制，避免频繁写入 localStorage
    if (now - this.lastSaveTime < SAVE_THROTTLE_MS) return;
    this.lastSaveTime = now;

    const playState: MusicPlayerState = {
      index: this.currentIndex,
      currentTime: this.currentTime,
      paused: !this.playing,
      volume: this.volume,
      muted: this.muted,
      playMode: this.playMode,
      lyricsVisible: this.lyricsVisible,
    };

    try {
      localStorage.setItem(STORAGE_KEYS.PLAYER_STATE, JSON.stringify(playState));
    } catch (error) {
      console.error('保存播放状态失败:', error);
    }
  }

  /**
   * 从 localStorage 恢复播放状态
   * @returns 恢复的播放状态对象，如果恢复失败则返回 null
   */
  restorePlayState(): MusicPlayerState | null {
    if (typeof window === 'undefined') return null;

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

      // 恢复音量
      if (typeof playInfo.volume === 'number') {
        this.volume = Math.max(0, Math.min(1, playInfo.volume));
        Howler.volume(this.volume);
      }

      // 恢复静音状态
      if (typeof playInfo.muted === 'boolean') {
        this.muted = playInfo.muted;
        Howler.mute(this.muted);
      }

      // 返回完整的播放状态
      return {
        index: typeof playInfo.index === 'number' ? playInfo.index : 0,
        currentTime: typeof playInfo.currentTime === 'number' ? playInfo.currentTime : 0,
        paused: typeof playInfo.paused === 'boolean' ? playInfo.paused : true,
        volume: this.volume,
        muted: this.muted,
        playMode: this.playMode,
        lyricsVisible: this.lyricsVisible,
      };
    } catch (e) {
      console.error('解析保存的播放状态失败:', e);
      return null;
    }
  }

  // ==================== 进度更新循环 ====================

  /**
   * 启动播放进度更新循环
   * 使用 requestAnimationFrame 实现平滑更新
   */
  private startProgressLoop() {
    if (typeof window === 'undefined') return;
    if (this.progressRafId !== null) return;

    const loop = () => {
      this.updateProgress();
      this.progressRafId = window.requestAnimationFrame(loop);
    };
    this.progressRafId = window.requestAnimationFrame(loop);
  }

  /**
   * 停止播放进度更新循环
   */
  private stopProgressLoop() {
    if (this.progressRafId !== null && typeof window !== 'undefined') {
      window.cancelAnimationFrame(this.progressRafId);
      this.progressRafId = null;
    }
  }

  /**
   * 更新播放进度
   * 按间隔触发 timeupdate 事件，并触发进度事件供预加载器使用
   */
  private updateProgress() {
    if (!this.howl) return;

    const now = Date.now();
    if (now - this.lastProgressEmit < PROGRESS_UPDATE_INTERVAL_MS) return;
    this.lastProgressEmit = now;

    try {
      this.currentTime = this.howl.seek() || 0;
      if (this.duration === 0) {
        this.duration = this.howl.duration() || 0;
      }
    } catch {
      this.currentTime = 0;
    }

    const progress = this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;

    // 触发 timeupdate 进度更新事件，保持事件名与旧版播放器兼容
    this.emitEvent('timeupdate');

    // 触发进度事件，供预加载器监听
    this.emitEvent('play-progress', {
      currentTime: this.currentTime,
      duration: this.duration,
      progress,
      currentIndex: this.currentIndex,
    } as PlayProgressDetail);

    // 节流保存播放状态
    this.savePlayState();
  }

  // ==================== 失败处理 ====================

  /**
   * 处理音频加载失败
   * 等待指定时间后自动切换到下一首
   */
  private handleLoadError() {
    this.loading = false;
    this.emitEvent('error');
    this.scheduleFailureSkip();
  }

  /**
   * 处理音频播放失败
   * 等待指定时间后自动切换到下一首
   */
  private handlePlayError() {
    this.playing = false;
    this.emitEvent('error');
    this.scheduleFailureSkip();
  }

  /**
   * 调度失败后的自动切歌
   * 避免立即切歌导致的问题，给用户/网络一定的缓冲时间
   */
  private scheduleFailureSkip() {
    // 先清除可能存在的旧定时器，避免重复调度
    this.clearFailureSkip();

    this.failureTimeoutId = setTimeout(() => {
      if (this.playlist.length > 0) {
        const nextIndex = this.getNextIndex();
        this.loadSong(nextIndex, true);
      }
    }, FAILURE_AUTO_SKIP_DELAY_MS);
  }

  /**
   * 清除失败后的自动切歌定时器
   */
  private clearFailureSkip() {
    if (this.failureTimeoutId) {
      clearTimeout(this.failureTimeoutId);
      this.failureTimeoutId = null;
    }
  }

  // ==================== 事件系统 ====================

  /**
   * 添加事件监听器
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  addEventListener(event: string, handler: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }

  /**
   * 移除事件监听器
   * @param event 事件名称
   * @param handler 事件处理函数
   */
  removeEventListener(event: string, handler: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(handler);
    }
  }

  /**
   * 触发自定义事件
   * @param event 事件名称
   * @param detail 事件详情数据
   */
  private emitEvent(event: string, detail?: unknown) {
    // 触发内部注册的监听器
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

    // 同时触发自定义 DOM 事件，方便外部组件监听
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
   * 清理所有监听器、定时器和 Howl 实例
   */
  destroy() {
    // 保存最终状态
    this.savePlayState();

    // 停止进度循环
    this.stopProgressLoop();

    // 清除失败切歌定时器
    this.clearFailureSkip();

    // 销毁 Howl 实例
    this.destroyCurrentHowl();

    // 清理事件监听器
    this.eventListeners.clear();

    // 重置状态
    this.playlist = [];
    this.currentIndex = 0;
    this.playing = false;
    this.loading = false;
    this.isInitialized = false;
    this.listenersSetup = false;
    this.initCallbacks = [];
    this.playedIndices = [];
    this.randomOrder = [];
  }
}

// 导出单例实例，供需要直接引用实例的场景使用
const howlerPlayerManager = HowlerPlayerManager.getInstance();

// 默认导出类本身，保持与旧版 GlobalMusicPlayerManager 相同的调用方式
export default HowlerPlayerManager;

export { HowlerPlayerManager, howlerPlayerManager };
