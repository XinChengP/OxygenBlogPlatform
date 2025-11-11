// 音乐相关类型定义

export interface Song {
  id: string;
  title: string;
  artist?: string;
  url: string;
  duration?: number;
  cover?: string; // 添加封面字段
  lrc?: string; // 添加歌词字段
}

export interface Playlist {
  id: string;
  name: string;
  cover?: string;
  description?: string;
  songs: Song[];
}

export interface Artist {
  id: string;
  name: string;
  avatar?: string;
  description?: string;
}

export interface Album {
  id: string;
  name: string;
  cover?: string;
  artist?: string;
  description?: string;
}

// 播放模式枚举
export enum PlayMode {
  SINGLE = 'single',       // 只放单曲
  SINGLE_LOOP = 'singleLoop',  // 单曲循环
  SEQUENTIAL = 'sequential',   // 顺序播放
  LIST_LOOP = 'listLoop',      // 列表循环
  RANDOM = 'random'            // 随机播放
}

// 音乐平台枚举
export enum MusicServer {
  NETEASE = 'netease',
  TENCENT = 'tencent',
  KUGOU = 'kugou',
  XIAMI = 'xiami',
  BAIDU = 'baidu'
}

// 音乐类型枚举
export enum MusicType {
  SONG = 'song',
  PLAYLIST = 'playlist',
  ALBUM = 'album',
  SEARCH = 'search',
  ARTIST = 'artist'
}