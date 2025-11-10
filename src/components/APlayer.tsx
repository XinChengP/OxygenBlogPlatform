"use client";

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useMusic } from '@/contexts/MusicContext';
import { getAssetPath } from '@/utils/assetUtils';
import { Song, Playlist, PlayMode } from './MusicPlayer';

interface APlayerProps {
  playlists: Playlist[];
  fixed?: boolean; // 是否启用吸底模式
  lrcType?: number; // 歌词类型：0-不显示，1-显示
  server?: string; // 音乐平台：netease, tencent, kugou, xiami, baidu
  type?: string; // 类型：song, playlist, album, search, artist
  id?: string | number; // 音乐ID
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

export default function APlayer({ 
  playlists, 
  fixed = false, 
  lrcType = 0,
  server = MusicServer.NETEASE,
  type = MusicType.PLAYLIST,
  id = '167985096'
}: APlayerProps) {
  const { theme, resolvedTheme } = useTheme();
  const musicContext = useMusic();
  
  // 从context中获取状态
  const {
    currentSong,
    currentPlaylist,
    currentSongIndex,
    playMode,
    setPlayMode,
    volume,
    setVolume,
    isMuted,
    toggleMute,
    loadSongUrl,
    loadLyrics,
  } = musicContext;
  
  // 本地状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(!fixed);
  const [showPlayModeMenu, setShowPlayModeMenu] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [showLyrics, setShowLyrics] = useState(lrcType === 1);
  const [currentLyrics, setCurrentLyrics] = useState<string[]>([]);
  const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // 音频引用
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const isDark = resolvedTheme === 'dark';

  // 初始化音频播放器
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio();
      
      // 设置音频事件监听器
      const audio = audioRef.current;
      
      audio.addEventListener('loadedmetadata', () => {
        setDuration(audio.duration);
      });
      
      audio.addEventListener('timeupdate', () => {
        setCurrentTime(audio.currentTime);
        
        // 更新歌词索引
        if (currentLyrics.length > 0) {
          const time = audio.currentTime;
          let newIndex = 0;
          
          for (let i = 0; i < currentLyrics.length; i++) {
            const [timeStr] = currentLyrics[i].split(']');
            const lyricTime = parseLyricTime(timeStr.substring(1));
            
            if (time >= lyricTime) {
              newIndex = i;
            } else {
              break;
            }
          }
          
          setCurrentLyricIndex(newIndex);
        }
      });
      
      audio.addEventListener('ended', () => {
        handleNext();
      });
      
      audio.addEventListener('error', (e) => {
        console.error('Audio error:', e);
        setIsLoading(false);
      });
      
      return () => {
        if (audio) {
          audio.pause();
          audio.src = '';
        }
      };
    }
  }, []);

  // 当当前歌曲改变时，加载新歌曲
  useEffect(() => {
    if (currentSong && audioRef.current) {
      loadSong(currentSong);
    }
  }, [currentSong]);

  // 加载歌曲
  const loadSong = async (song: Song) => {
    if (!audioRef.current) return;
    
    setIsLoading(true);
    try {
      // 尝试从API获取歌曲URL
      const songUrl = await loadSongUrl(song);
      
      if (songUrl) {
        audioRef.current.src = songUrl;
        await audioRef.current.load();
        
        // 尝试加载歌词
        if (showLyrics) {
          loadSongLyrics(song);
        }
        
        if (isPlaying) {
          await audioRef.current.play();
        }
      } else {
        console.error('Failed to load song URL');
      }
    } catch (error) {
      console.error('Error loading song:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 加载歌词
  const loadSongLyrics = async (song: Song) => {
    try {
      // 尝试从API获取歌词
      const lyricsText = await loadLyrics(song);
      
      if (lyricsText) {
        const lyrics = parseLyrics(lyricsText);
        setCurrentLyrics(lyrics);
      } else {
        // 如果没有获取到歌词，尝试从同名.lrc文件加载
        const lrcUrl = song.url.replace(/\.[^/.]+$/, '.lrc');
        const response = await fetch(lrcUrl);
        
        if (response.ok) {
          const lrcText = await response.text();
          const lyrics = parseLyrics(lrcText);
          setCurrentLyrics(lyrics);
        } else {
          setCurrentLyrics([]);
        }
      }
    } catch (error) {
      console.error('Error loading lyrics:', error);
      setCurrentLyrics([]);
    }
  };

  // 解析歌词
  const parseLyrics = (lrcText: string): string[] => {
    const lines = lrcText.split('\n');
    return lines.filter(line => line.trim() !== '' && line.includes('['));
  };

  // 解析歌词时间
  const parseLyricTime = (timeStr: string): number => {
    const parts = timeStr.split(':');
    const minutes = parseFloat(parts[0]);
    const seconds = parseFloat(parts[1]);
    return minutes * 60 + seconds;
  };

  // 播放/暂停
  const handleTogglePlayPause = async () => {
    if (!audioRef.current || !currentSong) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  // 下一首
  const handleNext = () => {
    if (!currentPlaylist || currentPlaylist.songs.length <= 1) return;
    
    let nextIndex = currentSongIndex + 1;
    
    // 根据播放模式确定下一首
    switch (playMode) {
      case PlayMode.SINGLE:
        // 单曲播放，不自动播放下一首
        return;
      case PlayMode.SINGLE_LOOP:
        // 单曲循环，播放同一首
        nextIndex = currentSongIndex;
        break;
      case PlayMode.LIST_LOOP:
        // 列表循环，循环播放
        if (nextIndex >= currentPlaylist.songs.length) {
          nextIndex = 0;
        }
        break;
      case PlayMode.RANDOM:
        // 随机播放
        nextIndex = Math.floor(Math.random() * currentPlaylist.songs.length);
        break;
      case PlayMode.SEQUENTIAL:
      default:
        // 顺序播放，到达末尾时停止
        if (nextIndex >= currentPlaylist.songs.length) {
          setIsPlaying(false);
          return;
        }
        break;
    }
    
    // 更新当前歌曲索引
    musicContext.setCurrentSongIndex(nextIndex);
  };

  // 上一首
  const handlePrevious = () => {
    if (!currentPlaylist || currentPlaylist.songs.length <= 1) return;
    
    let prevIndex = currentSongIndex - 1;
    
    // 根据播放模式确定上一首
    switch (playMode) {
      case PlayMode.SINGLE:
        // 单曲播放，不自动播放上一首
        return;
      case PlayMode.SINGLE_LOOP:
        // 单曲循环，播放同一首
        prevIndex = currentSongIndex;
        break;
      case PlayMode.LIST_LOOP:
        // 列表循环，循环播放
        if (prevIndex < 0) {
          prevIndex = currentPlaylist.songs.length - 1;
        }
        break;
      case PlayMode.RANDOM:
        // 随机播放
        prevIndex = Math.floor(Math.random() * currentPlaylist.songs.length);
        break;
      case PlayMode.SEQUENTIAL:
      default:
        // 顺序播放，到达开头时停止
        if (prevIndex < 0) {
          setIsPlaying(false);
          return;
        }
        break;
    }
    
    // 更新当前歌曲索引
    musicContext.setCurrentSongIndex(prevIndex);
  };

  // 选择歌曲
  const handleSelectSong = (index: number) => {
    musicContext.setCurrentSongIndex(index);
    if (!isPlaying) {
      setIsPlaying(true);
    }
  };

  // 设置音量
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // 设置播放进度
  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  // 格式化时间
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // 切换播放模式
  const togglePlayMode = () => {
    const modes = Object.values(PlayMode);
    const currentIndex = modes.indexOf(playMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setPlayMode(modes[nextIndex]);
    setShowPlayModeMenu(false);
  };
  
  // 设置播放模式
  const setPlayModeDirectly = (mode: PlayMode) => {
    setPlayMode(mode);
    setShowPlayModeMenu(false);
  };

  // 获取播放模式图标
  const getPlayModeIcon = () => {
    switch (playMode) {
      case PlayMode.SINGLE:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
        );
      case PlayMode.SINGLE_LOOP:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        );
      case PlayMode.SEQUENTIAL:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
      case PlayMode.LIST_LOOP:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        );
      case PlayMode.RANDOM:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // 获取播放模式名称
  const getPlayModeName = () => {
    switch (playMode) {
      case PlayMode.SINGLE:
        return '单曲播放';
      case PlayMode.SINGLE_LOOP:
        return '单曲循环';
      case PlayMode.SEQUENTIAL:
        return '顺序播放';
      case PlayMode.LIST_LOOP:
        return '列表循环';
      case PlayMode.RANDOM:
        return '随机播放';
      default:
        return '';
    }
  };

  // 格式化歌曲标题
  const formatSongTitle = (title: string): string => {
    return title;
  };

  // 点击页面其他地方关闭播放模式菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPlayModeMenu) {
        setShowPlayModeMenu(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showPlayModeMenu]);

  // 如果是吸底模式且未展开，返回迷你播放器
  if (fixed && !isExpanded) {
    return (
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ${
        isDark ? 'bg-gray-900/95 text-white' : 'bg-white/95 text-gray-800'
      } backdrop-blur-md shadow-lg border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1">
              {/* 歌曲封面 */}
              <div className="relative w-10 h-10 flex-shrink-0">
                <img
                  src={currentSong?.cover || getAssetPath('/placeholder-album.svg')}
                  alt={`${currentSong?.title} 封面`}
                  className="w-full h-full object-cover rounded"
                />
                {isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                    <div className="flex space-x-1">
                      <div className="w-1 h-3 bg-white rounded-full animate-pulse"></div>
                      <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-1 h-3 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* 歌曲信息 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {currentSong ? formatSongTitle(currentSong.title) : '未选择歌曲'}
                </p>
                {currentSong?.artist && (
                  <p className="text-xs opacity-70 truncate">{currentSong.artist}</p>
                )}
              </div>
            </div>
            
            {/* 控制按钮 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handlePrevious}
                disabled={!currentPlaylist || currentPlaylist.songs.length <= 1}
                className={`p-1 rounded-full transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M8.445 14.832A1 1 0 0010 14v-8a1 1 0 00-1.555-.832L3 9.168V6a1 1 0 00-2 0v8a1 1 0 002 0v-3.168l5.445 4z" />
                </svg>
              </button>
              
              <button
                onClick={handleTogglePlayPause}
                disabled={!currentSong}
                className={`p-2 rounded-full transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'
                }`}
              >
                {isPlaying ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              
              <button
                onClick={handleNext}
                disabled={!currentPlaylist || currentPlaylist.songs.length <= 1}
                className={`p-1 rounded-full transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 10.832V14a1 1 0 002 0V6a1 1 0 00-2 0v3.168L4.555 5.168z" />
                </svg>
              </button>
              
              <button
                onClick={() => setIsExpanded(true)}
                className={`p-1 rounded-full transition-all transform hover:scale-110 ${
                  isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 完整播放器
  return (
    <div className={`w-full rounded-xl overflow-hidden transition-all duration-300 ${
      fixed ? 'fixed bottom-0 left-0 right-0 z-50 rounded-none' : ''
    } ${isDark ? 'bg-gray-800/90 text-white' : 'bg-white/90 text-gray-800'} backdrop-blur-sm shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">APlayer</h3>
        </div>
        
        {fixed && (
          <button
            onClick={() => setIsExpanded(false)}
            className={`p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      
      {/* 主要内容区域 */}
      <div className="flex flex-col md:flex-row">
        {/* 左侧歌曲列表和歌词 */}
        <div className={`w-full md:w-1/3 p-4 border-r ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          {/* 标签页切换 */}
          <div className="flex space-x-1 mb-4">
            <button
              onClick={() => setShowPlaylist(true)}
              className={`flex-1 py-2 px-4 rounded-t-lg text-sm font-medium transition-colors ${
                showPlaylist
                  ? isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              播放列表
            </button>
            <button
              onClick={() => setShowLyrics(true)}
              className={`flex-1 py-2 px-4 rounded-t-lg text-sm font-medium transition-colors ${
                showLyrics
                  ? isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
                  : isDark ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              歌词
            </button>
          </div>
          
          {/* 播放列表 */}
          {showPlaylist && (
            <div className="h-80 overflow-y-auto">
              {currentPlaylist && (
                <div className="space-y-1">
                  {currentPlaylist.songs.map((song, index) => (
                    <div
                      key={song.id}
                      onClick={() => handleSelectSong(index)}
                      className={`p-3 rounded-lg cursor-pointer transition-all ${
                        index === currentSongIndex
                          ? isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                          : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="truncate flex-1">
                          <p className="text-sm font-medium truncate">{formatSongTitle(song.title)}</p>
                          {song.artist && (
                            <p className="text-xs opacity-70 truncate">{song.artist}</p>
                          )}
                        </div>
                        {index === currentSongIndex && isPlaying && (
                          <div className="flex space-x-1 ml-2">
                            <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                            <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* 歌词 */}
          {showLyrics && (
            <div className="h-80 overflow-y-auto">
              {currentLyrics.length > 0 ? (
                <div className="space-y-2 p-4">
                  {currentLyrics.map((lyric, index) => {
                    const [timeStr, lyricText] = lyric.split(']');
                    return (
                      <div
                        key={index}
                        className={`text-center transition-all duration-300 ${
                          index === currentLyricIndex
                            ? 'text-lg font-bold text-blue-500'
                            : index < currentLyricIndex
                            ? 'text-sm opacity-50'
                            : 'text-sm opacity-70'
                        }`}
                      >
                        {lyricText}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-sm opacity-50">
                  暂无歌词
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 右侧播放控制区域 */}
        <div className="flex-1 p-4">
          {/* 当前播放歌曲信息 */}
          {currentSong && (
            <div className="mb-4 flex items-center space-x-4">
              <div className="relative w-24 h-24 flex-shrink-0">
                <img
                  src={currentSong.cover || getAssetPath('/placeholder-album.svg')}
                  alt={`${currentSong.title} 封面`}
                  className="w-full h-full object-cover rounded-lg shadow-md"
                />
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h4 className="text-lg font-semibold mb-1">{formatSongTitle(currentSong.title)}</h4>
                {currentSong.artist && (
                  <p className="text-sm opacity-70 mb-2">{currentSong.artist}</p>
                )}
                
                {/* 进度条 */}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                  <div 
                    className={`h-2 rounded-full cursor-pointer overflow-hidden ${
                      isDark ? 'bg-gray-700' : 'bg-gray-300'
                    }`}
                  >
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-600 transition-all duration-100 relative"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    >
                      {/* 进度指示器 */}
                      <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 控制按钮 */}
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              onClick={handlePrevious}
              disabled={!currentPlaylist || currentPlaylist.songs.length <= 1}
              className={`p-3 rounded-full transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8.445 14.832A1 1 0 0010 14v-8a1 1 0 00-1.555-.832L3 9.168V6a1 1 0 00-2 0v8a1 1 0 002 0v-3.168l5.445 4z" />
              </svg>
            </button>
            
            <button
              onClick={handleTogglePlayPause}
              disabled={!currentSong}
              className={`w-14 h-14 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-white transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg`}
            >
              {isPlaying ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            
            <button
              onClick={handleNext}
              disabled={!currentPlaylist || currentPlaylist.songs.length <= 1}
              className={`p-3 rounded-full transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 10.832V14a1 1 0 002 0V6a1 1 0 00-2 0v3.168L4.555 5.168z" />
              </svg>
            </button>
          </div>
          
          {/* 播放模式和音量控制 */}
          <div className="flex items-center justify-between">
            {/* 播放模式按钮 */}
            <div className="flex items-center space-x-2 relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPlayModeMenu(!showPlayModeMenu);
                }}
                className={`flex items-center space-x-1 p-2 rounded-lg transition-all transform hover:scale-105 ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                }`}
                title={getPlayModeName()}
              >
                {getPlayModeIcon()}
                <span className="text-sm">{getPlayModeName()}</span>
              </button>
              
              {/* 播放模式弹出菜单 */}
              {showPlayModeMenu && (
                <div 
                  onClick={(e) => e.stopPropagation()}
                  className={`absolute bottom-full left-0 mb-2 p-2 rounded-lg shadow-lg z-10 ${
                    isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                  }`}
                >
                  <div className="space-y-1">
                    {Object.values(PlayMode).map((mode) => (
                      <button
                        key={mode}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlayModeDirectly(mode);
                        }}
                        className={`flex items-center space-x-2 w-full p-2 rounded-md transition-colors ${
                          playMode === mode
                            ? isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                            : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-xs">
                          {mode === PlayMode.SINGLE && '单曲播放'}
                          {mode === PlayMode.SINGLE_LOOP && '单曲循环'}
                          {mode === PlayMode.SEQUENTIAL && '顺序播放'}
                          {mode === PlayMode.LIST_LOOP && '列表循环'}
                          {mode === PlayMode.RANDOM && '随机播放'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* 音量控制 */}
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleMute}
                className={`p-1 rounded-full transition-colors ${
                  isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                }`}
                title={isMuted ? '取消静音' : '静音'}
              >
                {isMuted || volume === 0 ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 opacity-70" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <div className="flex-1 relative">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
                  style={{
                    background: `linear-gradient(to right, #EF4444 0%, #EF4444 ${volume * 100}%, ${isDark ? '#374151' : '#E5E7EB'} ${volume * 100}%, ${isDark ? '#374151' : '#E5E7EB'} 100%)`
                  }}
                />
              </div>
              <span className="text-sm w-10 text-right">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* 自定义滑块样式 */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          background: #EF4444;
          cursor: pointer;
          border-radius: 50%;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #EF4444;
          cursor: pointer;
          border-radius: 50%;
          border: none;
          box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}