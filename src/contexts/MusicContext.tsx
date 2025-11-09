'use client';

import { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';

// 定义全局音频实例的类型
declare global {
  interface Window {
    globalAudio?: HTMLAudioElement;
  }
}
import { PlayMode } from '@/components/MusicPlayer';

interface Song {
  id: string;
  title: string;
  artist?: string;
  url: string;
  duration?: number;
  cover?: string;
}

interface Playlist {
  id: string;
  name: string;
  songs: Song[];
}

interface MusicContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  selectSong: (index: number) => void;
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
  currentTime: number;
  duration: number;
  setProgress: (e: React.MouseEvent<HTMLDivElement>) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  progressBarRef: React.RefObject<HTMLDivElement | null>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

export function MusicProvider({ children }: { children: React.ReactNode }) {
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>(PlayMode.RANDOM);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const [shouldResumePlay, setShouldResumePlay] = useState(false); // 添加一个状态来跟踪是否应该恢复播放
  
  // 创建全局音频实例，确保在页面切换时不会丢失
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 如果还没有全局音频实例，创建一个
      if (!window.globalAudio) {
        window.globalAudio = new Audio();
        window.globalAudio.preload = 'auto';
        window.globalAudio.crossOrigin = 'anonymous';
      }
      audioRef.current = window.globalAudio;
    }
    
    return () => {
      // 不再清理音频元素，让它继续播放
    };
  }, []); // 移除shouldResumePlay依赖，避免重复初始化
  
  // 专门用于恢复播放状态的useEffect
  useEffect(() => {
    if (audioRef.current && shouldResumePlay && audioRef.current.src && audioRef.current.paused) {
      audioRef.current.play().then(() => {
        setIsPlaying(true);
        setShouldResumePlay(true);
      }).catch(error => {
        console.error("恢复播放失败:", error);
        setIsPlaying(false);
        setShouldResumePlay(false);
      });
    }
  }, [shouldResumePlay]);

  // 播放/暂停
  const togglePlayPause = () => {
    if (!audioRef.current || !currentSong) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      setShouldResumePlay(false);
      setIsPlaying(false);
    } else {
      // 尝试播放音频
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setIsPlaying(true);
          setShouldResumePlay(true);
        }).catch(error => {
          console.error('Error playing audio:', error);
          setIsPlaying(false);
          setShouldResumePlay(false);
        });
      }
    }
  };

  // 播放下一首
  const playNext = useCallback(() => {
    if (!currentPlaylist || currentPlaylist.songs.length === 0) return;
    
    let nextIndex = currentSongIndex;
    
    switch (playMode) {
      case PlayMode.SINGLE:
        // 单曲播放，不自动播放下一首
        setIsPlaying(false);
        setShouldResumePlay(false);
        return;
      case PlayMode.SINGLE_LOOP:
        // 单曲循环，保持当前歌曲
        nextIndex = currentSongIndex;
        break;
      case PlayMode.SEQUENTIAL:
        // 顺序播放
        nextIndex = (currentSongIndex + 1) % currentPlaylist.songs.length;
        break;
      case PlayMode.LIST_LOOP:
        // 列表循环
        nextIndex = (currentSongIndex + 1) % currentPlaylist.songs.length;
        break;
      case PlayMode.RANDOM:
        // 随机播放
        do {
          nextIndex = Math.floor(Math.random() * currentPlaylist.songs.length);
        } while (nextIndex === currentSongIndex && currentPlaylist.songs.length > 1);
        break;
    }
    
    setCurrentSongIndex(nextIndex);
    setIsPlaying(true);
    setShouldResumePlay(true);
  }, [currentPlaylist, currentSongIndex, playMode]);

  // 播放上一首
  const playPrevious = () => {
    if (!currentPlaylist || currentPlaylist.songs.length === 0) return;
    
    let prevIndex = currentSongIndex;
    
    switch (playMode) {
      case PlayMode.SINGLE:
        return;
      case PlayMode.SINGLE_LOOP:
        break;
      case PlayMode.SEQUENTIAL:
        prevIndex = currentSongIndex === 0 ? currentPlaylist.songs.length - 1 : currentSongIndex - 1;
        break;
      case PlayMode.LIST_LOOP:
        prevIndex = currentSongIndex === 0 ? currentPlaylist.songs.length - 1 : currentSongIndex - 1;
        break;
      case PlayMode.RANDOM:
        do {
          prevIndex = Math.floor(Math.random() * currentPlaylist.songs.length);
        } while (prevIndex === currentSongIndex && currentPlaylist.songs.length > 1);
        break;
    }
    
    setCurrentSongIndex(prevIndex);
    setIsPlaying(true);
    setShouldResumePlay(true);
  };

  // 选择并播放指定歌曲
  const selectSong = (index: number) => {
    if (!currentPlaylist || index < 0 || index >= currentPlaylist.songs.length) return;
    
    const song = currentPlaylist.songs[index];
    
    // 如果是同一首歌，不需要重新加载
    if (currentSong && currentSong.id === song.id) {
      // 如果当前歌曲已暂停，则继续播放
      if (!isPlaying) {
        togglePlayPause();
      }
      return;
    }
    
    setCurrentSong(song);
    setCurrentSongIndex(index);
    
    // 使用全局音频实例
    if (audioRef.current && song.url) {
      // 保存当前播放状态
      const wasPlaying = isPlaying;
      
      audioRef.current.src = song.url;
      audioRef.current.load();
      
      // 如果之前在播放，自动播放新歌曲
      if (wasPlaying) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setShouldResumePlay(true);
        }).catch(error => {
          console.error('Error playing audio:', error);
          setIsPlaying(false);
          setShouldResumePlay(false);
        });
      } else {
        setIsPlaying(false);
        setShouldResumePlay(false);
      }
    }
  };

  // 设置播放进度
  const setProgress = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current) return;
    
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pos * duration;
  };

  // 切换静音状态
  const toggleMute = () => {
    if (isMuted) {
      setVolume(volume || 0.7);
      if (audioRef.current) {
        audioRef.current.volume = volume || 0.7;
      }
      setIsMuted(false);
    } else {
      setVolume(0);
      if (audioRef.current) {
        audioRef.current.volume = 0;
      }
      setIsMuted(true);
    }
  };

  // 当歌曲索引变化时，更新当前歌曲
  useEffect(() => {
    if (currentPlaylist && currentSongIndex >= 0 && currentSongIndex < currentPlaylist.songs.length) {
      setCurrentSong(currentPlaylist.songs[currentSongIndex]);
    }
  }, [currentSongIndex, currentPlaylist]);

  // 音频事件处理
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = playNext;
    const handleLoadStart = () => console.log('Loading audio...');
    const handleCanPlay = () => console.log('Audio can play');
    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setIsPlaying(false);
    };
    // 添加页面可见性变化处理
    const handleVisibilityChange = () => {
      // 当页面变为可见时，如果之前是播放状态，则继续播放
      if (!document.hidden && shouldResumePlay && audio.paused) {
        audio.play().then(() => {
          setIsPlaying(true);
          setShouldResumePlay(true);
        }).catch(error => {
          console.error('Error resuming audio:', error);
          setIsPlaying(false);
          setShouldResumePlay(false);
        });
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentSong, playMode, playNext, shouldResumePlay, isPlaying, audioRef, setIsPlaying, setShouldResumePlay]);

  // 当歌曲改变时，更新音频源
  useEffect(() => {
    if (audioRef.current && currentSong) {
      // 只有当歌曲URL改变时才更新音频源
      if (audioRef.current.src !== currentSong.url) {
        // 保存当前播放状态
        const wasPlaying = isPlaying;
        
        audioRef.current.src = currentSong.url;
        audioRef.current.load();
        
        // 如果之前在播放，加载完成后自动播放
        const handleCanPlay = () => {
          if (wasPlaying) {
            audioRef.current?.play().then(() => {
              setIsPlaying(true);
              setShouldResumePlay(true);
            }).catch(error => {
              console.error('Error playing audio:', error);
              setIsPlaying(false);
              setShouldResumePlay(false);
            });
          }
          audioRef.current?.removeEventListener('canplay', handleCanPlay);
        };
        audioRef.current.addEventListener('canplay', handleCanPlay);
        
        return () => {
          audioRef.current?.removeEventListener('canplay', handleCanPlay);
        };
      }
    }
  }, [currentSong]);

  // 设置初始音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  // 页面切换时的音频恢复
  useEffect(() => {
    // 检查并恢复音频播放状态
    const checkAndResumeAudio = () => {
      // 如果音频已经在播放，不需要做任何事
      if (audioRef.current && !audioRef.current.paused) {
        setIsPlaying(true);
        setShouldResumePlay(true);
        return;
      }
      
      // 如果应该播放但音频暂停了，尝试恢复播放
      if (audioRef.current && shouldResumePlay && audioRef.current.src) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
          setShouldResumePlay(true);
        }).catch(error => {
          console.error("恢复播放失败:", error);
          setIsPlaying(false);
          setShouldResumePlay(false);
        });
      }
    };
    
    // 延迟检查，确保页面已经完全加载
    const timer = setTimeout(checkAndResumeAudio, 100);
    
    return () => clearTimeout(timer);
  }, [shouldResumePlay, isPlaying]); // 添加isPlaying依赖，避免ESLint警告

  return (
    <MusicContext.Provider
      value={{
        currentSong,
        isPlaying,
        togglePlayPause,
        playNext,
        playPrevious,
        selectSong,
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
        currentTime,
        duration,
        setProgress,
        audioRef,
        progressBarRef,
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