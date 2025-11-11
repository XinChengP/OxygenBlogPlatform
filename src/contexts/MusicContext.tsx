'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { PlayMode, Song, Playlist } from '@/types/music';
import { fetchSongUrl, fetchLyrics } from '@/services/musicService';
import { getAssetPath } from '@/utils/assetUtils';

interface MusicContextType {
  currentSong: Song | null;
  currentPlaylist: Playlist | null;
  setCurrentPlaylist: (playlist: Playlist | null) => void;
  currentSongIndex: number;
  setCurrentSongIndex: (index: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  playMode: PlayMode;
  setPlayMode: (mode: PlayMode) => void;
  loadSongUrl: (song: Song) => Promise<string | null>;
  loadLyrics: (song: Song) => Promise<string | null>;
  isPlaying: boolean;
  togglePlayPause: () => void;
  playNext: () => void;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.7);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.RANDOM);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // 切换静音状态 - 仅UI交互，不实际播放
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(volume || 0.7);
      setIsMuted(false);
    } else {
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume]);
  
  // 切换播放状态 - 仅UI交互，不实际播放
  const togglePlayPause = useCallback(() => {
    setIsPlaying(!isPlaying);
  }, [isPlaying]);
  
  // 播放下一首 - 仅UI交互，不实际播放
  const playNext = useCallback(() => {
    if (currentPlaylist && currentSongIndex < currentPlaylist.songs.length - 1) {
      setCurrentSongIndex(currentSongIndex + 1);
    } else if (currentPlaylist && currentPlaylist.songs.length > 0) {
      // 如果是最后一首，根据播放模式决定
      if (playMode === PlayMode.LIST_LOOP) {
        setCurrentSongIndex(0);
      } else if (playMode === PlayMode.RANDOM) {
        const randomIndex = Math.floor(Math.random() * currentPlaylist.songs.length);
        setCurrentSongIndex(randomIndex);
      } else {
        // SINGLE 和 SINGLE_LOOP 模式下不自动播放下一首
        setIsPlaying(false);
      }
    }
  }, [currentPlaylist, currentSongIndex, playMode]);
  
  // 加载歌曲URL
  const loadSongUrl = useCallback(async (song: Song): Promise<string | null> => {
    if (song.url) {
      // 处理静态资源路径
      if (song.url.startsWith('/')) {
        return getAssetPath(song.url);
      }
      return song.url;
    }
    
    try {
      // 如果歌曲没有URL，尝试从API获取
      const url = await fetchSongUrl(song.id);
      if (url && url.startsWith('/')) {
        return getAssetPath(url);
      }
      return url;
    } catch (error) {
      console.error('Error loading song URL:', error);
      return null;
    }
  }, []);
  
  // 加载歌词
  const loadLyrics = useCallback(async (song: Song): Promise<string | null> => {
    if (song.lrc) {
      return song.lrc;
    }
    
    try {
      // 如果歌曲没有歌词，尝试从API获取
      const lyrics = await fetchLyrics(song.id);
      return lyrics;
    } catch (error) {
      console.error('Error loading lyrics:', error);
      return null;
    }
  }, []);
  
  // 当当前歌曲索引改变时，更新当前歌曲
  useEffect(() => {
    if (currentPlaylist && currentSongIndex >= 0 && currentSongIndex < currentPlaylist.songs.length) {
      const song = currentPlaylist.songs[currentSongIndex];
      // 处理封面路径
      if (song.cover && song.cover.startsWith('/')) {
        song.cover = getAssetPath(song.cover);
      }
      setCurrentSong(song);
    }
  }, [currentPlaylist, currentSongIndex]);

  return (
    <MusicContext.Provider
      value={{
        currentSong,
        currentPlaylist,
        setCurrentPlaylist,
        currentSongIndex,
        setCurrentSongIndex,
        volume,
        setVolume,
        isMuted,
        toggleMute,
        playMode,
        setPlayMode,
        loadSongUrl,
        loadLyrics,
        isPlaying,
        togglePlayPause,
        playNext,
      }}
    >
      {children}
    </MusicContext.Provider>
  );
}

export function useMusic() {
  const context = useContext(MusicContext);
  if (context === undefined) {
    throw new Error('useMusic must be used within a MusicProvider');
  }
  return context;
}