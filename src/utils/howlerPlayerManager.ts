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
const FAILURE_AUTO_SKIP_DELAY_MS = 3000;

/** 连续失败达到该次数后停止自动切歌，避免把整张歌单刷一遍 */
const MAX_CONSECUTIVE_FAILURES = 3;

/** 手动切歌历史栈最大长度 */
const MAX_PLAY_HISTORY_STACK = 100;

/** Media Session 位置状态更新间隔（毫秒） */
const MEDIA_POSITION_UPDATE_INTERVAL_MS = 1000;

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

/**
 * 歌曲身份键：用于播放列表变化后恢复当前歌曲
 */
function getSongIdentity(song: {
  name: string;
  artist: string;
  source?: string;
}): string {
  return `${song.name}|${song.artist}|${song.source || 'local'}`;
}

/**
 * 歌名 + 歌手键（忽略来源）
 *
 * 用于“本地兜底歌单 → 在线歌单”切换：同一首歌在本地和网易云里 source 不同，
 * 但歌名/歌手一致时应该继续当前播放，而不是把本地歌塞进在线列表或重新加载。
 */
function getSongNameArtistKey(song: { name: string; artist: string }): string {
  return `${song.name.trim().toLowerCase()}|${song.artist.trim().toLowerCase()}`;
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
  /**
   * 下一首索引（管理器按当前播放模式计算，不会推进随机队列）
   *
   * 预加载器直接使用这个值，避免自己随机猜下一首导致：
   * 1. 预加载的歌曲与真正播放的下一首不一致；
   * 2. 随机模式下每 250ms 预加载一首不同的歌。
   */
  nextIndex: number;
}

/**
 * 歌曲切换事件详情
 */
interface SongChangeEventDetail {
  /** 新歌曲索引 */
  index: number;
  /** 下一首索引（供预加载器使用） */
  nextIndex: number;
}

/**
 * 播放错误事件详情
 */
export interface PlaybackErrorDetail {
  /** 错误类型：加载失败 / 播放失败 / 连续失败终止 */
  type: 'load' | 'play' | 'fatal';
  /** 歌曲名 */
  song?: string;
  /** 错误信息 */
  message?: string;
  /** 歌曲来源，用于区分在线签名 URL 过期与本地文件损坏 */
  source?: ProcessedAudioItem['source'];
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
 * 4. 随机播放通过「洗牌队列 + 游标」保证一轮内不重复，并支持 peek 下一首
 * 5. 歌曲加载/播放失败等待 3 秒后自动切歌，连续失败 3 次后停止
 * 6. 集成 Media Session，支持锁屏/通知栏/耳机按键控制
 */
class HowlerPlayerManager {
  /** 单例实例 */
  private static instance: HowlerPlayerManager;

  /** 播放列表 */
  private playlist: ProcessedAudioItem[] = [];

  /** 当前播放索引 */
  private currentIndex = 0;

  /** 当前播放模式（默认随机播放） */
  private playMode: PlayMode = 'random';

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

  /** 页面隐藏处理器引用（用于 destroy 时解绑） */
  private boundVisibilityHandler: (() => void) | null = null;

  /** 页面卸载处理器引用（用于 destroy 时解绑） */
  private boundPageHideHandler: (() => void) | null = null;

  /** 进度更新定时器 ID */
  private progressIntervalId: ReturnType<typeof setInterval> | null = null;

  /** 上一次保存播放状态的时间戳 */
  private lastSaveTime = 0;

  /** 歌曲失败后的自动切歌定时器 */
  private failureTimeoutId: ReturnType<typeof setTimeout> | null = null;

  /** 连续失败次数 */
  private consecutiveFailures = 0;

  /** 是否发生过用户主动播放（用于区分“自动播放被拦截”和“真实播放失败”） */
  private userInitiated = false;

  /** 随机播放顺序数组（洗牌队列） */
  private randomQueue: number[] = [];

  /** 随机播放当前游标 */
  private randomCursor = 0;

  /** 手动切歌历史栈（用于随机模式的“上一首”） */
  private playHistoryStack: number[] = [];

  /** Media Session 是否已初始化 */
  private mediaSessionSetup = false;

  /** 上一次更新 Media Session 位置的时间戳 */
  private lastMediaPositionUpdate = 0;

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

    this.boundVisibilityHandler = () => {
      if (document.visibilityState === 'hidden') {
        // 页面切到后台时强制保存，绕过节流，避免丢失最后一秒的暂停/进度
        this.savePlayState(true);
      }
    };

    this.boundPageHideHandler = () => {
      this.savePlayState(true);
    };

    document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    // pagehide 在移动端比 beforeunload 更可靠；beforeunload 用于桌面端兜底
    window.addEventListener('pagehide', this.boundPageHideHandler);
    window.addEventListener('beforeunload', this.boundPageHideHandler);
  }

  /**
   * 移除页面切换监听器
   */
  private teardownPageTransitionListeners() {
    if (typeof window === 'undefined') return;

    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }

    if (this.boundPageHideHandler) {
      window.removeEventListener('pagehide', this.boundPageHideHandler);
      window.removeEventListener('beforeunload', this.boundPageHideHandler);
      this.boundPageHideHandler = null;
    }

    this.listenersSetup = false;
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
    this.playHistoryStack = [];
    this.consecutiveFailures = 0;

    // 恢复保存的播放状态（音量为全局设置，恢复后立即生效）
    const savedState = this.restorePlayState();

    // 优先使用传入的初始索引；否则按保存的歌曲身份恢复，最后才回退到 index
    let targetIndex = options.initialIndex ?? 0;
    if (options.initialIndex === undefined) {
      if (savedState?.songKey) {
        // 先按完整身份（含来源）匹配
        let found = this.playlist.findIndex(
          song => getSongIdentity(song) === savedState.songKey
        );

        // 本地兜底切到在线歌单后，来源会从 local 变成 netease；
        // 此时按歌名 + 歌手再匹配一次，避免恢复到错误的歌。
        if (found < 0) {
          const savedNameArtist = savedState.songKey
            .replace(/\|(local|netease)$/, '')
            .toLowerCase();
          found = this.playlist.findIndex(
            song => getSongNameArtistKey(song) === savedNameArtist
          );
        }

        targetIndex = found >= 0 ? found : (savedState.index ?? 0);
      } else {
        targetIndex = savedState?.index ?? 0;
      }
    }
    if (targetIndex < 0 || targetIndex >= this.playlist.length) {
      targetIndex = 0;
    }

    const targetTime = options.initialTime ?? savedState?.currentTime ?? 0;
    // 调用方显式传入 autoPlay 时以调用方为准；否则尊重上次的播放/暂停状态
    const shouldAutoPlay = options.autoPlay ?? !(savedState?.paused ?? true);

    this.currentIndex = targetIndex;

    // 设置页面切换监听器与 Media Session
    this.setupPageTransitionListeners();
    this.setupMediaSession();

    this.isInitialized = true;

    // 生成随机播放顺序（此时 currentIndex 已确定，可避免第一首就是当前歌）
    this.regenerateRandomOrder();

    // 通知等待初始化的回调
    this.initCallbacks.forEach(callback => callback(this));
    this.initCallbacks = [];

    // 加载第一首歌曲
    if (this.playlist.length > 0) {
      this.loadSong(this.currentIndex, shouldAutoPlay, false, targetTime);
    } else {
      this.emitEvent('listswitch');
    }

    this.savePlayState(true);
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
   * @param recordHistory 是否把当前歌曲压入“上一首”历史栈
   * @param seekTime 加载完成后跳转到的时间（秒），用于恢复播放进度
   */
  private loadSong(
    index: number,
    autoPlay: boolean,
    recordHistory: boolean = true,
    seekTime: number = 0
  ) {
    if (index < 0 || index >= this.playlist.length) return;

    // 记录切歌历史：只在真正换歌时记录，恢复/后退不记录
    if (
      recordHistory &&
      this.playlist.length > 1 &&
      index !== this.currentIndex
    ) {
      this.playHistoryStack.push(this.currentIndex);
      if (this.playHistoryStack.length > MAX_PLAY_HISTORY_STACK) {
        this.playHistoryStack.shift();
      }
    }

    // 清理之前的 Howl 实例
    this.destroyCurrentHowl();

    this.currentIndex = index;
    this.currentTime = 0;
    this.duration = 0;
    this.loading = true;
    this.playing = false;
    this.syncPlaybackClass();

    const song = this.playlist[index];

    // 创建新的 Howl 实例，将 autoPlay 传入构造函数内部处理
    // 避免音频已缓存时 load 事件在 once 监听器挂载前触发导致无法自动播放
    this.howl = this.createHowl(song.url, autoPlay, seekTime);

    // 根据播放模式设置循环
    this.applyLoopByMode();

    // 通知 UI 与预加载器：当前歌曲已切换
    const nextIndex = this.peekNextIndex();
    this.emitEvent('song-change', {
      index,
      nextIndex,
    } as SongChangeEventDetail);

    // 触发列表切换事件，通知 UI 更新当前歌曲信息
    this.emitEvent('listswitch');

    // 切歌后立即持久化索引，避免刷新后回到旧歌
    this.savePlayState(true);
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
   * 对音频 URL 做安全编码
   *
   * 旧实现直接 encodeURI(url) 会把已经编码过的 URL 二次编码：
   * encodeURI('a%20b.mp3') -> 'a%2520b.mp3'，导致 404。
   * 这里用 URL 解析器：相对路径会正确编码中文/空格，
   * 绝对 URL 中已有的 %xx 转义会原样保留。
   *
   * @param url 原始 URL
   * @returns 可交给浏览器加载的 URL
   */
  private encodeUrl(url: string): string {
    if (typeof window === 'undefined') return url;
    // data:/blob: 不是可解析的层次化 URL，原样返回
    if (/^(data|blob):/i.test(url)) return url;

    try {
      return new URL(url, window.location.href).href;
    } catch {
      return url;
    }
  }

  /**
   * 创建 Howl 实例
   * @param url 音频 URL
   * @param autoPlay 加载完成后是否自动播放，用于避免外部 once('load') 的竞态问题
   * @param seekTime 加载完成后跳转到的时间（秒）
   * @returns Howl 实例
   */
  private createHowl(url: string, autoPlay: boolean = false, seekTime: number = 0): Howl {
    const encodedUrl = this.encodeUrl(url);

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

        // 恢复上次播放进度（放在 onload 内，避免外部监听器错过同步触发的 load）
        if (seekTime > 0) {
          this.seekInternal(seekTime, false);
        }

        this.emitEvent('load');
        this.emitProgress();
        this.updateMediaSessionMetadata();
        this.updateMediaSessionPlaybackState();

        // 在 onload 回调内部直接播放，确保即使 load 事件同步触发也能生效
        if (autoPlay) {
          this.startPlayback(false);
        }
      },
      onloaderror: (_id, error) => {
        this.handleLoadError(error);
      },
      onplayerror: (_id, error) => {
        this.handlePlayError(error);
      },
      onplay: () => {
        this.playing = true;
        this.loading = false;
        this.consecutiveFailures = 0;
        this.clearFailureSkip();
        this.emitEvent('play');
        this.recordHistoryOnPlay();
        this.startProgressLoop();
        this.syncPlaybackClass();
        this.updateMediaSessionMetadata();
        this.updateMediaSessionPlaybackState();
      },
      onpause: () => {
        this.playing = false;
        this.captureCurrentTime();
        this.stopProgressLoop();
        this.emitEvent('pause');
        this.emitProgress();
        this.savePlayState(true);
        this.syncPlaybackClass();
        this.updateMediaSessionPlaybackState();
      },
      onend: () => {
        this.playing = false;
        if (this.duration > 0 && isFinite(this.duration)) {
          this.currentTime = this.duration;
        } else {
          this.captureCurrentTime();
        }
        this.stopProgressLoop();
        this.emitEvent('ended');
        this.emitProgress();
        this.savePlayState(true);
        this.syncPlaybackClass();
        this.updateMediaSessionPlaybackState();
        this.handleSongEnd();
      },
      onstop: () => {
        this.playing = false;
        this.captureCurrentTime();
        this.stopProgressLoop();
        this.emitEvent('pause');
        this.emitProgress();
        this.savePlayState(true);
        this.syncPlaybackClass();
        this.updateMediaSessionPlaybackState();
      },
      onseek: () => {
        this.captureCurrentTime();
        this.emitProgress();
        this.updateMediaSessionPosition(true);
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
      // 先移除所有事件监听，避免 unload/stop 触发 onpause/onstop 覆盖新状态
      this.howl.off();
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
   * 开始播放（用户主动）
   */
  play() {
    this.startPlayback(true);
  }

  /**
   * 内部播放入口
   * @param fromUser 是否由用户操作触发
   */
  private startPlayback(fromUser: boolean) {
    if (!this.howl) return;
    if (fromUser) {
      this.userInitiated = true;
    }
    this.howl.play();
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
      this.userInitiated = true;
      this.startPlayback(true);
    }
  }

  /**
   * 播放下一首
   *
   * 注意：单曲循环模式下，用户主动点“下一首”按普通列表语义切到下一首，
   * 而不是把当前歌从头再播一遍；自动结束时的单曲循环仍由 Howl.loop 处理。
   */
  next() {
    if (this.playlist.length === 0) return;

    this.userInitiated = true;

    const nextIndex = this.playMode === 'single'
      ? (this.currentIndex + 1) % this.playlist.length
      : this.getNextIndex();

    this.loadSong(nextIndex, true);
  }

  /**
   * 播放上一首
   *
   * - 播放超过 3 秒：先回到本首开头（主流播放器行为）
   * - 随机模式：优先回退到历史栈中的真实上一首
   */
  prev() {
    if (this.playlist.length === 0) return;

    this.userInitiated = true;

    if (this.currentTime > 3 && this.howl) {
      this.seek(0);
      return;
    }

    let prevIndex: number | undefined = this.playHistoryStack.pop();

    if (
      prevIndex === undefined ||
      prevIndex < 0 ||
      prevIndex >= this.playlist.length
    ) {
      if (this.playMode === 'random') {
        prevIndex = this.getRandomIndexExcludingCurrent();
      } else {
        prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
      }
    }

    // recordHistory=false：后退时不再把当前歌压回历史栈
    this.loadSong(prevIndex, true, false);
  }

  /**
   * 跳转到指定时间点（用户操作）
   * @param time 目标时间（秒）
   */
  seek(time: number) {
    this.userInitiated = true;
    this.seekInternal(time, true);
  }

  /**
   * 内部跳转
   * @param time 目标时间（秒）
   * @param fromUser 是否由用户操作触发
   */
  private seekInternal(time: number, fromUser: boolean) {
    if (!this.howl) return;

    if (fromUser) {
      this.userInitiated = true;
    }

    const maxTime = this.duration > 0 && isFinite(this.duration)
      ? this.duration
      : Infinity;
    const clampedTime = Math.max(0, Math.min(time, maxTime));

    this.howl.seek(clampedTime);
    this.currentTime = clampedTime;
    this.emitProgress();
    this.updateMediaSessionPosition(true);
    this.savePlayState(true);
  }

  /**
   * 读取并更新当前播放时间
   */
  private captureCurrentTime() {
    if (!this.howl) return;
    try {
      const time = this.howl.seek();
      if (typeof time === 'number' && isFinite(time)) {
        this.currentTime = time;
      }
    } catch {
      // 读取失败时保留旧值
    }
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
    this.savePlayState();
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
    this.savePlayState(true);
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
    this.savePlayState(true);
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
   * 清除连续失败计数与待执行的自动切歌
   * 在线歌单刷新后调用，避免旧 URL 的失败计时器把新歌切走。
   */
  resetFailureState(): void {
    this.clearFailureSkip();
    this.consecutiveFailures = 0;
  }

  /**
   * 重新加载当前歌曲（保留播放位置），用于在线签名 URL 过期后的重试
   */
  reloadCurrentSong(): void {
    const seekTime = this.currentTime;
    this.loadSong(this.currentIndex, true, false, seekTime);
  }

  /**
   * 更新播放列表（用于在线歌单加载/刷新）
   *
   * 处理规则：
   * 1. 当前歌曲在新列表中（完整身份匹配）→ 保留播放，只更新索引；
   * 2. 本地兜底歌单切到在线歌单 → 按歌名+歌手匹配；找不到时切到在线第一首，
   *    但绝不把本地歌曲混进在线列表；
   * 3. 在线歌曲被歌单移除 → 保留当前歌曲在最前面，避免播放中断。
   *
   * @param newPlaylist 新播放列表
   */
  updatePlaylist(newPlaylist: ProcessedAudioItem[]) {
    if (newPlaylist.length === 0) return;

    const currentSong = this.getCurrentSong();

    let nextPlaylist = [...newPlaylist];
    let nextIndex = 0;
    let shouldReloadFirstSong = false;
    const wasPlaying = this.playing;

    if (currentSong) {
      // 1. 完整身份匹配（歌名 + 歌手 + 来源）
      let found = nextPlaylist.findIndex(
        song => getSongIdentity(song) === getSongIdentity(currentSong)
      );

      // 2. 本地 → 在线：忽略来源，按歌名 + 歌手匹配
      if (found < 0) {
        found = nextPlaylist.findIndex(
          song => getSongNameArtistKey(song) === getSongNameArtistKey(currentSong)
        );
      }

      if (found >= 0) {
        nextIndex = found;
      } else if (currentSong.source === 'local') {
        // 本地兜底列表被在线列表替换：切到在线第一首，保持原来的播放/暂停状态
        shouldReloadFirstSong = true;
        nextIndex = 0;
      } else {
        // 在线歌曲被移出歌单：保留当前歌曲，避免播放中断
        nextPlaylist = [currentSong, ...nextPlaylist];
        nextIndex = 0;
      }
    }

    this.playlist = nextPlaylist;
    this.currentIndex = nextIndex;
    this.playHistoryStack = [];
    this.regenerateRandomOrder();

    this.emitEvent('playlist-update', {
      length: nextPlaylist.length,
    });

    if (shouldReloadFirstSong) {
      // loadSong 内部会触发 listswitch / song-change 并保存状态
      this.loadSong(nextIndex, wasPlaying, false);
      return;
    }

    this.emitEvent('listswitch');
    this.emitEvent('song-change', {
      index: nextIndex,
      nextIndex: this.peekNextIndex(),
    } as SongChangeEventDetail);

    this.savePlayState(true);
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
    this.userInitiated = true;
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
   * 同步 html 根元素上的 music-player-active 标记
   *
   * 该类被 globals.css 用于「音乐播放中禁用页面过渡动画」。
   * 原由 SmoothScrollProvider 在每次路由切换时查询播放状态来维护，
   * 那样会把本管理器（连带 howler）打进全站首载包；
   * 现改为播放状态变化时由本管理器直接驱动，语义也更准确：
   * 暂停后立即恢复过渡动画，无需等下一次路由切换。
   */
  private syncPlaybackClass(): void {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('music-player-active', this.playing);
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
   * 使用 Fisher-Yates 洗牌算法，并确保队列第一首不是当前歌曲，
   * 避免“随机下一首”立刻重复当前正在播放的歌。
   */
  private regenerateRandomOrder() {
    if (this.playlist.length === 0) {
      this.randomQueue = [];
      this.randomCursor = 0;
      return;
    }

    const queue = shuffleArray(this.playlist.map((_, i) => i));

    if (queue.length > 1 && queue[0] === this.currentIndex) {
      const swapPos = queue.findIndex(index => index !== this.currentIndex);
      if (swapPos > 0) {
        [queue[0], queue[swapPos]] = [queue[swapPos], queue[0]];
      }
    }

    this.randomQueue = queue;
    this.randomCursor = 0;
  }

  /**
   * 确保随机队列长度与播放列表一致
   */
  private ensureRandomQueue() {
    if (
      this.randomQueue.length !== this.playlist.length ||
      this.randomCursor >= this.randomQueue.length
    ) {
      this.regenerateRandomOrder();
    }
  }

  /**
   * 从当前游标开始寻找下一首非当前歌曲的随机索引
   * 不推进游标，供 peekNextIndex 使用。
   */
  private scanRandomNext(): number {
    if (this.playlist.length <= 1) return 0;

    this.ensureRandomQueue();

    for (let i = this.randomCursor; i < this.randomQueue.length; i++) {
      if (this.randomQueue[i] !== this.currentIndex) {
        return this.randomQueue[i];
      }
    }

    // 本轮队列已耗尽：立即重新洗牌（peek 与后续真正的 next 使用同一队列）
    this.regenerateRandomOrder();

    for (let i = 0; i < this.randomQueue.length; i++) {
      if (this.randomQueue[i] !== this.currentIndex) {
        return this.randomQueue[i];
      }
    }

    return this.currentIndex;
  }

  /**
   * 获取下一首随机索引，并推进随机游标
   * @returns 随机索引
   */
  private getNextRandomIndex(): number {
    const nextIndex = this.scanRandomNext();

    // 把游标推进到选中项之后
    const position = this.randomQueue.indexOf(nextIndex, this.randomCursor);
    this.randomCursor = position >= 0 ? position + 1 : this.randomCursor + 1;

    return nextIndex;
  }

  /**
   * 获取一个非当前播放歌曲的随机索引（兜底用）
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
   * 获取下一首歌曲的索引（会推进随机队列）
   * 根据播放模式决定下一首逻辑
   * @returns 下一首歌曲索引
   */
  private getNextIndex(): number {
    if (this.playlist.length === 0) return 0;
    if (this.playlist.length === 1) return 0;

    switch (this.playMode) {
      case 'single':
        // 自动结束时的单曲循环由 Howl.loop 处理；这里作为失败兜底返回下一首
        return (this.currentIndex + 1) % this.playlist.length;
      case 'random':
        return this.getNextRandomIndex();
      case 'list':
      default:
        // 列表循环
        return (this.currentIndex + 1) % this.playlist.length;
    }
  }

  /**
   * 预览下一首索引（不推进随机队列）
   *
   * 供 UI/预加载器使用，保证“预加载的歌”与“真正播放的下一首”一致。
   * @returns 下一首索引；播放列表为空时返回 -1
   */
  peekNextIndex(): number {
    if (this.playlist.length === 0) return -1;
    if (this.playlist.length === 1) return 0;

    switch (this.playMode) {
      case 'single':
        // 单曲循环不需要预加载下一首
        return this.currentIndex;
      case 'random':
        return this.scanRandomNext();
      case 'list':
      default:
        return (this.currentIndex + 1) % this.playlist.length;
    }
  }

  /**
   * 对外的“下一首”查询（语义化别名）
   */
  getUpcomingIndex(): number {
    return this.peekNextIndex();
  }

  /**
   * 歌曲结束后的处理
   * 根据播放模式决定是否切换歌曲
   */
  private handleSongEnd() {
    // 单曲循环已由 Howl.loop(true) 自动处理，这里不需要额外操作
    if (this.playMode === 'single') {
      this.savePlayState(true);
      return;
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
    this.savePlayState(true);
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
   * 保存内容包括：索引、歌曲身份、播放进度、暂停状态、音量、静音状态、播放模式、歌词显示状态
   *
   * @param force 是否绕过节流（暂停、切歌、页面隐藏等关键时机使用）
   */
  savePlayState(force: boolean = false) {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    // 节流控制，避免频繁写入 localStorage
    if (!force && now - this.lastSaveTime < SAVE_THROTTLE_MS) return;
    this.lastSaveTime = now;

    const currentSong = this.getCurrentSong();

    const playState: MusicPlayerState = {
      index: this.currentIndex,
      songKey: currentSong ? getSongIdentity(currentSong) : undefined,
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
        songKey: typeof playInfo.songKey === 'string' ? playInfo.songKey : undefined,
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
   *
   * 进度本身只需要 250ms 粒度，因此直接使用 setInterval，
   * 不再用 rAF 每秒唤醒 60 次主线程。暂停时停止，避免空转。
   */
  private startProgressLoop() {
    if (typeof window === 'undefined') return;
    if (this.progressIntervalId !== null) return;

    this.progressIntervalId = setInterval(() => {
      this.updateProgress();
    }, PROGRESS_UPDATE_INTERVAL_MS);
  }

  /**
   * 停止播放进度更新循环
   */
  private stopProgressLoop() {
    if (this.progressIntervalId !== null) {
      clearInterval(this.progressIntervalId);
      this.progressIntervalId = null;
    }
  }

  /**
   * 更新播放进度
   * 触发 timeupdate 事件，并触发进度事件供预加载器使用
   */
  private updateProgress() {
    if (!this.howl) return;

    this.captureCurrentTime();
    if (this.duration === 0) {
      this.duration = this.howl.duration() || 0;
    }

    // 页面隐藏时不派发进度、不写 localStorage：
    // 后台标签页没有 UI 需要更新，visibilitychange 已负责最终保存。
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      this.updateMediaSessionPosition();
      return;
    }

    this.emitProgress();
    this.savePlayState();
    this.updateMediaSessionPosition();
  }

  /**
   * 立即派发一次进度事件（不受节流限制）
   * 用于 seek、暂停、加载完成等需要 UI 立刻同步的场景。
   */
  private emitProgress() {
    if (this.duration === 0 && this.howl) {
      this.duration = this.howl.duration() || 0;
    }

    const progress = this.duration > 0
      ? (this.currentTime / this.duration) * 100
      : 0;

    // 触发 timeupdate 进度更新事件，保持事件名与旧版播放器兼容
    this.emitEvent('timeupdate');

    // 触发进度事件，供预加载器/UI 使用
    this.emitEvent('play-progress', {
      currentTime: this.currentTime,
      duration: this.duration,
      progress,
      currentIndex: this.currentIndex,
      nextIndex: this.peekNextIndex(),
    } as PlayProgressDetail);
  }

  // ==================== Media Session ====================

  /**
   * 初始化 Media Session
   *
   * 让浏览器锁屏、通知栏、耳机线控/蓝牙按键可以控制播放。
   * 由于 Howler 使用 HTML5 Audio，浏览器会识别当前页面的媒体播放。
   */
  private setupMediaSession() {
    if (this.mediaSessionSetup || typeof navigator === 'undefined') return;
    if (!('mediaSession' in navigator) || !navigator.mediaSession) return;

    this.mediaSessionSetup = true;

    const mediaSession = navigator.mediaSession;

    const setHandler = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
      try {
        mediaSession.setActionHandler(action, handler);
      } catch {
        // 部分浏览器不支持某些 action，忽略即可
      }
    };

    setHandler('play', () => this.play());
    setHandler('pause', () => this.pause());
    setHandler('stop', () => {
      this.pause();
      this.seekInternal(0, true);
    });
    setHandler('previoustrack', () => this.prev());
    setHandler('nexttrack', () => this.next());
    setHandler('seekbackward', (details) => {
      this.seek(this.currentTime - (details.seekOffset || 10));
    });
    setHandler('seekforward', (details) => {
      this.seek(this.currentTime + (details.seekOffset || 10));
    });
    setHandler('seekto', (details) => {
      if (typeof details.seekTime === 'number') {
        this.seek(details.seekTime);
      }
    });
  }

  /**
   * 更新锁屏/通知栏的歌曲信息
   */
  private updateMediaSessionMetadata() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (typeof MediaMetadata === 'undefined') return;

    const song = this.getCurrentSong();
    if (!song) return;

    try {
      let artworkUrl = song.cover;
      if (artworkUrl && !/^https?:/i.test(artworkUrl) && typeof window !== 'undefined') {
        artworkUrl = new URL(artworkUrl, window.location.href).href;
      }

      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.name,
        artist: song.artist,
        album: 'OxygenBlogPlatform',
        artwork: artworkUrl ? [{ src: artworkUrl }] : [],
      });
    } catch {
      // MediaMetadata 构造失败不影响播放
    }
  }

  /**
   * 更新 Media Session 的播放状态
   */
  private updateMediaSessionPlaybackState() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.playbackState = this.playing ? 'playing' : 'paused';
    } catch {
      // 忽略不支持 playbackState 的浏览器
    }
  }

  /**
   * 更新 Media Session 的进度条
   * @param force 是否绕过 1 秒节流
   */
  private updateMediaSessionPosition(force: boolean = false) {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (typeof navigator.mediaSession.setPositionState !== 'function') return;
    if (!this.duration || !isFinite(this.duration) || this.duration <= 0) return;

    const now = Date.now();
    if (!force && now - this.lastMediaPositionUpdate < MEDIA_POSITION_UPDATE_INTERVAL_MS) {
      return;
    }
    this.lastMediaPositionUpdate = now;

    try {
      navigator.mediaSession.setPositionState({
        duration: this.duration,
        playbackRate: 1,
        position: Math.max(0, Math.min(this.currentTime, this.duration)),
      });
    } catch {
      // position 超出范围等异常忽略
    }
  }

  /**
   * 清理 Media Session 处理器
   */
  private clearMediaSession() {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const actions: MediaSessionAction[] = [
      'play', 'pause', 'stop', 'previoustrack', 'nexttrack',
      'seekbackward', 'seekforward', 'seekto',
    ];

    for (const action of actions) {
      try {
        navigator.mediaSession.setActionHandler(action, null);
      } catch {
        // 忽略不支持的 action
      }
    }

    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
    } catch {
      // 忽略
    }

    this.mediaSessionSetup = false;
  }

  // ==================== 失败处理 ====================

  /**
   * 处理音频加载失败
   * @param error Howler 返回的错误信息
   */
  private handleLoadError(error: unknown) {
    this.loading = false;
    this.playing = false;
    this.stopProgressLoop();
    this.syncPlaybackClass();
    this.updateMediaSessionPlaybackState();

    const song = this.getCurrentSong();
    console.error(`[MusicPlayer] 音乐加载失败: ${song?.name || '未知歌曲'}`, error);
    this.emitEvent('error', {
      type: 'load',
      song: song?.name,
      source: song?.source,
      message: error instanceof Error ? error.message : String(error ?? '加载失败'),
    } as PlaybackErrorDetail);

    this.scheduleFailureSkip();
  }

  /**
   * 处理音频播放失败
   * @param error Howler 返回的错误信息
   */
  private handlePlayError(error: unknown) {
    this.playing = false;
    this.stopProgressLoop();
    this.syncPlaybackClass();
    this.updateMediaSessionPlaybackState();

    const song = this.getCurrentSong();
    console.error(`[MusicPlayer] 音乐播放失败: ${song?.name || '未知歌曲'}`, error);

    // 页面加载后的自动恢复播放可能被浏览器 autoplay 策略拦截，
    // 这不是歌曲本身的问题，不应该自动跳到下一首（否则会把整张歌单刷一遍）。
    if (!this.userInitiated) {
      this.emitEvent('autoplay-blocked');
      return;
    }

    this.emitEvent('error', {
      type: 'play',
      song: song?.name,
      source: song?.source,
      message: error instanceof Error ? error.message : String(error ?? '播放失败'),
    } as PlaybackErrorDetail);

    this.scheduleFailureSkip();
  }

  /**
   * 调度失败后的自动切歌
   * 避免立即切歌导致的问题，给用户/网络一定的缓冲时间；
   * 连续失败达到上限后停止，避免无意义地轮询整张歌单。
   */
  private scheduleFailureSkip() {
    // 先清除可能存在的旧定时器，避免重复调度
    this.clearFailureSkip();

    this.consecutiveFailures += 1;

    if (this.consecutiveFailures > MAX_CONSECUTIVE_FAILURES) {
      this.emitEvent('error', {
        type: 'fatal',
        message: '连续多首歌曲加载失败，请检查网络后重试',
      } as PlaybackErrorDetail);
      return;
    }

    this.failureTimeoutId = setTimeout(() => {
      if (this.playlist.length > 0) {
        // 单曲循环下失败时也切到下一首，避免一直卡在同一首
        const nextIndex = this.playlist.length === 1
          ? 0
          : this.getNextIndex();
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
   *
   * 只派发给管理器内部的监听器，不再额外向 window 派发 CustomEvent：
   * - 原先每个进度 tick 会向 window 派发 2 个事件（timeupdate/play-progress），
   *   实测 4 次/秒，纯属额外开销；
   * - 预加载器改为直接订阅管理器事件，不再依赖 DOM 事件。
   *
   * @param event 事件名称
   * @param detail 事件详情数据
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
  }

  // ==================== 工具方法 ====================

  /**
   * 销毁播放器管理器
   * 清理所有监听器、定时器和 Howl 实例
   */
  destroy() {
    // 保存最终状态
    this.savePlayState(true);

    // 停止进度循环
    this.stopProgressLoop();

    // 清除失败切歌定时器
    this.clearFailureSkip();

    // 销毁 Howl 实例
    this.destroyCurrentHowl();

    // 清理页面事件与 Media Session
    this.teardownPageTransitionListeners();
    this.clearMediaSession();

    // 清理事件监听器
    this.eventListeners.clear();

    // 重置状态
    this.playlist = [];
    this.currentIndex = 0;
    this.playing = false;
    this.loading = false;
    this.isInitialized = false;
    this.initCallbacks = [];
    this.randomQueue = [];
    this.randomCursor = 0;
    this.playHistoryStack = [];
    this.consecutiveFailures = 0;
    this.userInitiated = false;
  }
}

// 导出单例实例，供需要直接引用实例的场景使用
const howlerPlayerManager = HowlerPlayerManager.getInstance();

// 默认导出类本身，保持与旧版 GlobalMusicPlayerManager 相同的调用方式
export default HowlerPlayerManager;

export { HowlerPlayerManager, howlerPlayerManager };
