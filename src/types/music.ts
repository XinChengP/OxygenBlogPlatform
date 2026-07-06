/**
 * 音乐播放器相关类型定义
 *
 * 原本旧版播放器专属的类型已移除，
 * 当前类型仅描述播放器状态、歌曲数据和播放历史等通用信息，
 * 与新的音频引擎配合使用。
 */

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

/**
 * 音乐来源类型
 * - local: 本地音乐文件
 * - netease: 网易云音乐（通过 Meting API 加载）
 */
export type MusicSource = 'local' | 'netease';

/**
 * 处理后的音频项接口
 * 用于播放器组件，所有路径已处理为可直接播放的完整 URL
 */
export interface ProcessedAudioItem {
  /** 歌曲名称 */
  name: string;
  /** 歌手名称 */
  artist: string;
  /** 处理后的音频文件完整路径或 URL */
  url: string;
  /** 处理后的封面图片完整路径或 URL（可选） */
  cover?: string;
  /** 处理后的歌词文件完整路径或 URL（可选） */
  lrc?: string;
  /** 音乐来源 */
  source?: MusicSource;
}
