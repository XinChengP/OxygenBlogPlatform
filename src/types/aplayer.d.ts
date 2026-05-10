// APlayer库的类型定义
// 此文件为APlayer提供基本的TypeScript类型支持

declare namespace APlayerNS {
  interface APlayerOptions {
    container?: HTMLElement | string;
    audio?: APlayerAudio | APlayerAudio[];
    fixed?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    order?: 'list' | 'random';
    preload?: 'none' | 'metadata' | 'auto';
    volume?: number;
    mutex?: boolean;
    lrcType?: 0 | 1 | 2 | 3;
    listFolded?: boolean;
    listMaxHeight?: string | number;
    storageName?: string;
    audio?: APlayerAudio[];
  }

  interface APlayerAudio {
    name: string;
    artist: string;
    url: string;
    cover?: string;
    lrc?: string;
    type?: 'auto' | 'hls' | 'normal';
    /** 音乐来源（可选） */
    source?: 'local';
  }

  interface APlayerAudioList {
    switch: (index: number) => void;
    add: (audio: APlayerAudio, index?: number) => void;
    remove: (index: number) => void;
    show: () => void;
    hide: () => void;
    toggle: () => void;
    index: number;
    current: APlayerAudio | null;
    list: APlayerAudio[];
    theme: string;
  }

  interface APlayerEvents {
    // 播放控制事件
    on(event: 'play', handler: () => void): this;
    on(event: 'pause', handler: () => void): this;
    on(event: 'timeupdate', handler: () => void): this;
    on(event: 'loadedmetadata', handler: () => void): this;
    on(event: 'durationchange', handler: () => void): this;
    
    // 列表事件
    on(event: 'listswitch', handler: () => void): this;
    
    // 音量事件
    on(event: 'volumechange', handler: () => void): this;
    
    // 移除监听器
    off(event: string, handler: () => void): this;
  }

  interface APlayer {
    // 基本属性
    container: HTMLElement;
    audio: HTMLAudioElement;
    options: APlayerOptions;
    
    // 播放器控制
    play(): void;
    pause(): void;
    toggle(): void;
    seek(position: number): void;
    
    // 状态属性
    readonly paused: boolean;
    readonly duration: number;
    readonly loading: boolean;
    readonly currentTime: number;
    readonly volume: number;
    readonly muted: boolean;
    
    // 列表管理
    list: APlayerAudioList;
    
    // 初始化方法
    init(): this;
    
    // 销毁播放器
    destroy(): void;
    
    // 事件处理
    on(event: string, handler: () => void): this;
    off(event: string, handler: () => void): this;
    once(event: string, handler: () => void): this;
    trigger(event: string): this;
    
    // 显示通知消息
    notice(text: string, time?: number, opacity?: number): void;
  }
}

// 全局APlayer和Next.js类型
declare global {
  interface Window {
    APlayer: {
      new (options: APlayerNS.APlayerOptions): APlayerNS.APlayer;
    };
    globalAPlayer?: APlayerNS.APlayer;
    next?: {
      router?: {
        events?: {
          on: (event: string, handler: () => void) => void;
          off: (event: string, handler: () => void) => void;
        };
      };
    };
  }
}

// ==================== 应用自定义类型定义 ====================

/**
 * 播放模式枚举
 * - list: 列表循环播放
 * - random: 随机播放
 * - single: 单曲循环播放
 */
export type PlayMode = 'list' | 'random' | 'single';

/**
 * 完整的播放状态接口
 * 用于记录和恢复播放器的完整状态
 */
export interface MusicPlayerState {
  /** 当前播放索引，表示播放列表中的歌曲位置 */
  index: number;
  /** 播放进度，单位为秒 */
  currentTime: number;
  /** 是否处于暂停状态，true 表示暂停，false 表示播放中 */
  paused: boolean;
  /** 音量值，范围 0-1，0 表示静音，1 表示最大音量 */
  volume: number;
  /** 是否静音，true 表示静音状态 */
  muted: boolean;
  /** 播放模式，可选值：list（列表循环）、random（随机）、single（单曲循环） */
  playMode: PlayMode;
  /** 歌词显示状态，true 表示歌词可见 */
  lyricsVisible: boolean;
}

/**
 * 播放历史项接口
 * 记录单首歌曲的播放历史信息
 */
export interface MusicHistoryItem {
  /** 歌曲唯一标识符 */
  id: string;
  /** 歌曲名称 */
  name: string;
  /** 歌手/艺术家名称 */
  artist: string;
  /** 播放时间戳，Unix 时间戳（毫秒） */
  playedAt: number;
}

/**
 * 播放历史接口
 * 管理播放历史的集合
 */
export interface MusicHistory {
  /** 播放历史项列表，按播放时间倒序排列 */
  items: MusicHistoryItem[];
  /** 最大保存数量，默认为 50 条记录 */
  maxItems: number;
}

/**
 * 音乐配置歌曲项接口
 * 定义配置文件中单首歌曲的完整信息
 */
export interface MusicConfigSong {
  /** 歌曲唯一标识符 */
  id: string;
  /** 歌曲名称 */
  name: string;
  /** 歌手/艺术家名称 */
  artist: string;
  /** 音频文件 URL 地址 */
  url: string;
  /** 封面图片 URL 地址（可选） */
  cover?: string;
  /** 歌词文件 URL 地址（可选） */
  lrc?: string;
  /** 歌曲时长，单位为秒（可选） */
  duration?: number;
}

/**
 * 音乐配置文件接口
 * 定义整个音乐播放器的配置结构
 */
export interface MusicConfig {
  /** 配置文件版本号 */
  version: string;
  /** 最后更新时间，ISO 8601 格式字符串 */
  lastUpdated: string;
  /** 歌曲列表 */
  songs: MusicConfigSong[];
}

// 导出类型定义
export { APlayerNS }; 