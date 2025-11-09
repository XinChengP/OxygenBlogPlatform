"use client";

import { useState, useRef, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useMusic } from '@/contexts/MusicContext';

export interface Song {
  id: string;
  title: string;
  artist?: string;
  url: string;
  duration?: number;
  cover?: string; // 添加封面字段
}

export interface Playlist {
  id: string;
  name: string;
  songs: Song[];
}

interface MusicPlayerProps {
  playlists: Playlist[];
}

// 播放模式枚举
export enum PlayMode {
  SINGLE = 'single',       // 只放单曲
  SINGLE_LOOP = 'singleLoop',  // 单曲循环
  SEQUENTIAL = 'sequential',   // 顺序播放
  LIST_LOOP = 'listLoop',      // 列表循环
  RANDOM = 'random'            // 随机播放
}

export default function MusicPlayer({ playlists }: MusicPlayerProps) {
  const { theme, resolvedTheme } = useTheme();
  const musicContext = useMusic();
  
  // 从context中获取状态和方法
  const {
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
  } = musicContext;
  
  // 本地状态
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previousVolume, setPreviousVolume] = useState(0.7); // 用于保存静音前的音量
  const [showPlayModeMenu, setShowPlayModeMenu] = useState(false); // 播放模式菜单显示状态
  const [currentSongCover, setCurrentSongCover] = useState<string>('/placeholder-album.svg'); // 当前歌曲封面
  const [isExtractingCover, setIsExtractingCover] = useState(false); // 是否正在提取封面
  const [searchQuery, setSearchQuery] = useState(''); // 搜索查询

  const isDark = resolvedTheme === 'dark';

  // 自定义函数：找到目标歌曲的索引
  const findTargetSongIndex = (playlist: Playlist | null) => {
    if (!playlist) return 0;
    // 仅在"闪耀的Producer"歌单中查找目标歌曲
    if (playlist.name === "闪耀的Producer") {
      const targetIndex = playlist.songs.findIndex(song => 
        formatSongTitle(song.title).includes("洛天依原创曲】珍珠【2025官方生贺曲")
      );
      return targetIndex !== -1 ? targetIndex : 0;
    }
    return 0;
  };

  // 过滤歌曲列表
  const filteredSongs = currentPlaylist ? currentPlaylist.songs.filter(song => 
    searchQuery === '' || 
    formatSongTitle(song.title).toLowerCase().includes(searchQuery.toLowerCase()) ||
    (song.artist && song.artist.toLowerCase().includes(searchQuery.toLowerCase()))
  ).sort((a, b) => {
    // 将"洛天依原创曲】珍珠【2025官方生贺曲"置顶
    const aIsTargetSong = formatSongTitle(a.title).includes("洛天依原创曲】珍珠【2025官方生贺曲");
    const bIsTargetSong = formatSongTitle(b.title).includes("洛天依原创曲】珍珠【2025官方生贺曲");
    
    if (aIsTargetSong && !bIsTargetSong) return -1;
    if (!aIsTargetSong && bIsTargetSong) return 1;
    return 0;
  }) : [];

  // 当播放列表数据更新时，确保当前播放列表和目标歌曲索引正确
  useEffect(() => {
    if (playlists.length > 0 && !currentPlaylist) {
      // 如果没有当前播放列表，设置第一个播放列表
      const firstPlaylist = playlists[0];
      setCurrentPlaylist(firstPlaylist);
      const targetIndex = findTargetSongIndex(firstPlaylist);
      // 只设置歌曲索引，不自动播放
      setCurrentSongIndex(targetIndex);
    } else if (currentPlaylist) {
      // 如果已有当前播放列表，检查是否需要更新目标歌曲索引
      const updatedPlaylist = playlists.find(p => p.id === currentPlaylist.id);
      if (updatedPlaylist) {
        // 只有当播放列表内容发生变化时才更新
        if (JSON.stringify(updatedPlaylist.songs) !== JSON.stringify(currentPlaylist.songs)) {
          setCurrentPlaylist(updatedPlaylist);
          const targetIndex = findTargetSongIndex(updatedPlaylist);
          // 只设置歌曲索引，不自动播放
          setCurrentSongIndex(targetIndex);
        }
      }
    }
  }, [playlists, currentPlaylist, setCurrentPlaylist]);

  // 从音频文件中提取封面
  const extractCoverFromAudio = async (songUrl: string) => {
    if (!songUrl) return;
    
    setIsExtractingCover(true);
    try {
      // 构建API请求URL，使用新的动态路由API
      // 移除开头的斜杠并编码路径，使用动态路由格式（不带尾部斜杠）
      const musicPath = songUrl.substring(1);
      const apiUrl = `/api/music-metadata/${encodeURIComponent(musicPath)}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const metadata = await response.json();
        if (metadata.cover) {
          setCurrentSongCover(metadata.cover);
          return;
        }
      } else {
        console.error('API response not OK:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error extracting cover:', error);
    } finally {
      setIsExtractingCover(false);
    }
    
    // 如果提取失败，使用默认封面
    setCurrentSongCover('/placeholder-album.svg');
  };

  // 当歌曲改变时，提取封面
  useEffect(() => {
    if (currentSong) {
      extractCoverFromAudio(currentSong.url);
    }
  }, [currentSong]);
  
  // 播放/暂停 - 使用context中的方法
  const handleTogglePlayPause = () => {
    togglePlayPause();
  };

  // 设置音量
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  };

  // 格式化时间
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // 切换播放列表
  const selectPlaylist = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    // 切换播放列表时，自动选择目标歌曲但不自动播放
    const targetIndex = findTargetSongIndex(playlist);
    setCurrentSongIndex(targetIndex);
  };

  // 获取播放模式图标
  const getPlayModeIcon = () => {
    switch (playMode) {
      case PlayMode.SINGLE:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
          </svg>
        );
      case PlayMode.SINGLE_LOOP:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        );
      case PlayMode.SEQUENTIAL:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
      case PlayMode.LIST_LOOP:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        );
      case PlayMode.RANDOM:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
  
  // 设置初始音量
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  
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

  return (
    <div className={`w-full rounded-xl overflow-hidden transition-all duration-300 ${
      isDark ? 'bg-gray-800/90 text-white' : 'bg-white/90 text-gray-800'
    } backdrop-blur-sm shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
      
      {/* 紧凑模式 */}
        {!isExpanded && (
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* 歌曲封面 - 紧凑模式 */}
              <div className="relative w-12 h-12 flex-shrink-0">
                <img
                  src={currentSongCover}
                  alt={`${currentSong?.title} 封面`}
                  className="w-full h-full object-cover rounded-lg shadow-md"
                />
                {isExtractingCover && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              
              <button
                onClick={handleTogglePlayPause}
                disabled={!currentSong}
                className={`p-1 flex items-center justify-center transition-all transform hover:scale-110 ${
                  isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
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
              
              {/* 下一首按钮 - 紧凑模式 */}
              <button
                onClick={playNext}
                disabled={!currentSong}
                className={`p-1 flex items-center justify-center transition-all transform hover:scale-110 ${
                  isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-black'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L8 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 008 6v2.798l-3.445-2.63z" />
                </svg>
              </button>
              
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {currentSong ? formatSongTitle(currentSong.title) : '未选择歌曲'}
                </p>
              </div>
              
              {/* 音波动画 */}
              {isPlaying && currentSong && (
                <div className="flex space-x-1 mr-3">
                  <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse"></div>
                  <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                </div>
              )}
            </div>
            
            <button
              onClick={() => setIsExpanded(true)}
              className={`p-2 rounded-full transition-all transform hover:scale-105 ${
                isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}
      
      {/* 展开模式 */}
      {isExpanded && (
        <div className="p-4 flex flex-col max-w-full">
          {/* 头部 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">音乐播放器</h3>
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
          </div>
          
          {/* 主要内容区域 */}
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 左侧歌曲列表 */}
            <div className={`w-full lg:w-[200px] xl:w-[250px] p-3 rounded-lg ${
              isDark ? 'bg-gray-800' : 'bg-white'
            }`}>
              {/* 播放列表选择 */}
              <div className="mb-4">
                <label className="block text-base font-medium mb-2">选择播放列表</label>
                <select
                  value={currentPlaylist?.id || ''}
                  onChange={(e) => {
                    const playlist = playlists.find(p => p.id === e.target.value);
                    if (playlist) selectPlaylist(playlist);
                  }}
                  className={`w-full p-2 rounded-lg border text-sm ${
                    isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  }`}
                >
                  {playlists.map(playlist => (
                    <option key={playlist.id} value={playlist.id}>
                      {playlist.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {currentPlaylist && (
                <div className="flex flex-col h-full">
                  <h4 className="font-medium mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">歌曲列表</h4>
                  
                  {/* 搜索输入框 */}
                  <div className="mb-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="搜索歌曲..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full px-3 py-2 pl-9 rounded-lg border text-sm ${
                          isDark 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 opacity-50"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  
                  <div className="max-h-56 lg:max-h-80 overflow-y-auto scrollbar-hide flex-1">
                    <ul className="space-y-1">
                      {filteredSongs.length > 0 ? (
                        filteredSongs.map((song, index) => {
                          // 获取原始索引，以便正确选择歌曲
                          const originalIndex = currentPlaylist.songs.findIndex(s => s.id === song.id);
                          return (
                            <li
                              key={song.id}
                              onClick={() => selectSong(originalIndex)}
                              className={`p-3 rounded-lg cursor-pointer transition-all transform hover:scale-[1.02] ${
                                originalIndex === currentSongIndex
                                  ? isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                                  : isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="truncate flex-1">
                                  <p className="text-sm font-medium truncate">{formatSongTitle(song.title)}</p>
                                </div>
                                {originalIndex === currentSongIndex && isPlaying && (
                                  <div className="flex space-x-1 ml-2">
                                    <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                                    <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        <li className="p-3 text-center text-sm opacity-50">
                          {searchQuery ? '未找到匹配的歌曲' : '播放列表为空'}
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>
            
            {/* 右侧播放控制区域 */}
            <div className="flex-1 min-w-0">
              {/* 当前播放歌曲信息 - 不包含封面 */}
              {currentSong && (
                <div className="mb-4 p-3 rounded-lg bg-opacity-50" 
                     style={{ backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)' }}>
                  <div>
                    <h4 className="font-medium truncate mb-2">{formatSongTitle(currentSong.title)}</h4>
                    {currentSong.artist && (
                      <p className="text-sm opacity-70 truncate">{currentSong.artist}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* 歌曲封面 - 独立放在进度条上方居中 */}
              {currentSong && (
                <div className="flex justify-center mb-4">
                  <div className="relative w-32 h-32 lg:w-40 lg:h-40">
                    <img
                      src={currentSongCover}
                      alt={`${currentSong?.title} 封面`}
                      className="w-full h-full object-cover rounded-lg shadow-md"
                    />
                    {isExtractingCover && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* 进度条 */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div 
                  ref={progressBarRef}
                  className={`h-2 rounded-full cursor-pointer overflow-hidden ${
                    isDark ? 'bg-gray-700' : 'bg-gray-300'
                  }`}
                  onClick={setProgress}
                >
                  <div 
                    className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-100 relative"
                    style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                  >
                    {/* 进度指示器 */}
                    <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md"></div>
                  </div>
                </div>
              </div>
              
              {/* 控制按钮 */}
              <div className="flex items-center justify-center space-x-4 mb-4">
                <button
                  onClick={playPrevious}
                  disabled={!currentPlaylist || currentPlaylist.songs.length <= 1}
                  className={`p-3 rounded-full transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M8.445 14.832A1 1 0 0010 14v-8a1 1 0 00-1.555-.832L3 9.168V6a1 1 0 00-2 0v8a1 1 0 002 0v-3.168l5.445 4z" />
                  </svg>
                </button>
                
                <button
                  onClick={handleTogglePlayPause}
                  disabled={!currentSong}
                  className={`w-16 h-16 flex items-center justify-center transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoading ? (
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
                
                <button
                  onClick={playNext}
                  disabled={!currentPlaylist || currentPlaylist.songs.length <= 1}
                  className={`p-3 rounded-full transition-all transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 10.832V14a1 1 0 002 0V6a1 1 0 00-2 0v3.168L4.555 5.168z" />
                  </svg>
                </button>
              </div>
              
              {/* 播放模式和音量控制 */}
              <div className="flex items-center justify-between">
                {/* 播放模式按钮 - 优化为更直观的样式 */}
                <div className="flex items-center space-x-2 relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowPlayModeMenu(!showPlayModeMenu);
                    }}
                    className={`relative group p-2 rounded-lg transition-all transform hover:scale-105 ${
                      isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
                    }`}
                    title={getPlayModeName()}
                  >
                    <span className="font-medium">{getPlayModeName()}</span>
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
                        background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${volume * 100}%, ${isDark ? '#374151' : '#E5E7EB'} ${volume * 100}%, ${isDark ? '#374151' : '#E5E7EB'} 100%)`
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
              background: #3B82F6;
              cursor: pointer;
              border-radius: 50%;
              box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
            }
            
            .slider::-moz-range-thumb {
              width: 16px;
              height: 16px;
              background: #3B82F6;
              cursor: pointer;
              border-radius: 50%;
              border: none;
              box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
            }
            
            /* 隐藏滚动条但保持滚动功能 */
            .scrollbar-hide {
              -ms-overflow-style: none;  /* Internet Explorer 10+ */
              scrollbar-width: none;  /* Firefox */
            }
            .scrollbar-hide::-webkit-scrollbar {
              display: none;  /* Safari and Chrome */
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

// 格式化歌曲标题，显示完整的标题（包括【】内的部分）
const formatSongTitle = (title: string): string => {
  // 直接返回原始标题，不进行任何处理
  return title;
};