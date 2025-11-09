import { Song, Playlist, PlayMode } from '@/components/MusicPlayer';

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

// 本地存储键名
const MUSIC_STATE_KEY = 'oxygen-blog-music-state';

// 保存音乐状态到本地存储
export const saveMusicState = (state: Partial<MusicState>): void => {
  if (typeof window === 'undefined') return;
  
  try {
    // 只保存需要持久化的状态，不包括实时变化的状态如currentTime
    const stateToSave = {
      currentSong: state.currentSong || null,
      isPlaying: state.isPlaying || false,
      currentPlaylist: state.currentPlaylist || null,
      currentSongIndex: state.currentSongIndex || 0,
      volume: state.volume !== undefined ? state.volume : 0.7,
      isMuted: state.isMuted || false,
      playMode: state.playMode || PlayMode.RANDOM,
      shouldResumePlay: state.shouldResumePlay || false,
    };
    
    localStorage.setItem(MUSIC_STATE_KEY, JSON.stringify(stateToSave));
  } catch (error) {
    console.error('保存音乐状态失败:', error);
  }
};

// 从本地存储加载音乐状态
export const loadMusicState = (): MusicState => {
  if (typeof window === 'undefined') return defaultMusicState;
  
  try {
    const savedState = localStorage.getItem(MUSIC_STATE_KEY);
    if (savedState) {
      // 使用类型断言确保类型安全
      const parsedState = JSON.parse(savedState) as Partial<MusicState>;
      
      // 验证并返回状态，确保所有字段都存在
      return {
        currentSong: parsedState.currentSong || null,
        isPlaying: parsedState.isPlaying || false,
        currentPlaylist: parsedState.currentPlaylist || null,
        currentSongIndex: parsedState.currentSongIndex || 0,
        volume: parsedState.volume !== undefined ? parsedState.volume : 0.7,
        isMuted: parsedState.isMuted || false,
        playMode: parsedState.playMode || PlayMode.RANDOM,
        currentTime: 0, // 重置播放时间，不从本地存储恢复
        shouldResumePlay: parsedState.shouldResumePlay || false,
      };
    }
  } catch (error) {
    console.error('加载音乐状态失败:', error);
  }
  
  return defaultMusicState;
};

// 清除音乐状态
export const clearMusicState = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(MUSIC_STATE_KEY);
  } catch (error) {
    console.error('清除音乐状态失败:', error);
  }
};