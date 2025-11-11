import { Song, Playlist, PlayMode } from '@/types/music';

// 音乐状态接口
export interface MusicState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentPlaylist: Playlist | null;
  currentSongIndex: number;
  volume: number;
  isMuted: boolean;
  playMode: PlayMode;
  currentTime: number;
  shouldResumePlay: boolean;
}

// 默认音乐状态
export const defaultMusicState: MusicState = {
  currentSong: null,
  isPlaying: false,
  currentPlaylist: null,
  currentSongIndex: 0,
  volume: 0.7,
  isMuted: false,
  playMode: PlayMode.RANDOM,
  currentTime: 0,
  shouldResumePlay: false,
};

// 保存音乐状态到本地存储 - 仅用于UI展示
export const saveMusicState = (state: Partial<MusicState>): void => {
  // 空实现，仅保留函数签名以维持UI功能
  console.log('保存音乐状态 (UI仅展示):', state);
};

// 从本地存储加载音乐状态 - 仅用于UI展示
export const loadMusicState = (): MusicState => {
  // 返回默认状态，不进行实际存储操作
  return defaultMusicState;
};

// 清除音乐状态 - 仅用于UI展示
export const clearMusicState = (): void => {
  // 空实现，仅保留函数签名以维持UI功能
  console.log('清除音乐状态 (UI仅展示)');
};