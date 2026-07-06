'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import GlobalMusicPlayerManager from '@/utils/globalMusicPlayerManager';
import { musicConfigManager, ProcessedAudioItem } from '@/utils/musicConfigManager';
import type { PlayMode } from '@/types/music';
import { PLAY_MODE_ORDER } from '@/types/playMode';
import { emitMusicEvent } from '@/utils/live2dEventEmitter';
import { getMusicPlayerVisibility, onMusicPlayerVisibilityChange } from '@/utils/musicPlayerVisibility';
import MusicPlayerPreloader from '@/utils/musicPlayerPreloader';

/**
 * 音乐播放器组件 Props 接口
 */
interface MusicPlayerProps {
  /** 是否自动播放，默认 false */
  autoPlay?: boolean;
  /** 是否循环播放，默认 false（由播放模式控制） */
  loop?: boolean;
  /** 是否隐藏播放器（用于路由级控制），默认 false */
  hidden?: boolean;
}

/**
 * 播放模式显示名称映射
 */
const PLAY_MODE_NAMES: Record<PlayMode, string> = {
  list: '列表循环',
  random: '随机播放',
  single: '单曲循环',
};

/**
 * 播放模式图标（使用 SVG path）
 */
const PLAY_MODE_ICONS: Record<PlayMode, string> = {
  list: 'M4 6h16M4 12h16M4 18h16',
  random: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  single: 'M4 4h16v16H4z M9 9h6v6H9z',
};

/**
 * 格式化时间为 mm:ss
 * @param seconds 秒数
 * @returns 格式化后的时间字符串
 */
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 歌手名称高亮处理函数
 * 将特定歌手名称包装为带颜色的 span
 * @param text 原始歌手字符串
 * @returns React 可渲染的节点数组
 */
function highlightArtistName(text: string): React.ReactNode[] {
  const patterns: { name: string; color: string; whole?: boolean }[] = [
    { name: '洛天依Official', color: '#66ccff', whole: true },
    { name: '洛天依', color: '#66ccff' },
    { name: '乐正绫', color: '#ee0000' },
    { name: '言和', color: '#00ffcc' },
    { name: '星尘', color: '#9999ff', whole: true },
  ];

  // 按名称长度降序，避免短名称先匹配导致长名称无法完整匹配
  const sortedPatterns = [...patterns].sort((a, b) => b.name.length - a.name.length);

  const result: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    let matched = false;
    for (const pattern of sortedPatterns) {
      const index = remaining.indexOf(pattern.name);
      if (index !== -1) {
        if (index > 0) {
          result.push(<span key={keyIndex++}>{remaining.slice(0, index)}</span>);
        }
        const matchedText = remaining.slice(index, index + pattern.name.length);
        if (pattern.name === '星尘' && !pattern.whole) {
          // 星尘特殊处理：星字 #9999ff，尘字 #ffff00
          result.push(
            <span key={keyIndex++} style={{ color: '#9999ff' }}>星</span>,
            <span key={keyIndex++} style={{ color: '#ffff00' }}>尘</span>
          );
        } else {
          result.push(
            <span key={keyIndex++} style={{ color: pattern.color }}>{matchedText}</span>
          );
        }
        remaining = remaining.slice(index + pattern.name.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      result.push(<span key={keyIndex++}>{remaining}</span>);
      break;
    }
  }

  return result;
}

/**
 * 音乐播放器组件
 *
 * 功能特性：
 * 1. 从配置文件加载音乐列表（支持热更新）
 * 2. 播放模式切换（列表循环、随机播放、单曲循环）
 * 3. 播放状态持久化（跨页面保持播放进度）
 * 4. Live2D 联动（播放/暂停事件通知）
 * 5. 歌手名称高亮显示
 * 6. 自定义天依蓝风格 UI
 *
 * @param props 组件属性
 * @returns 音乐播放器组件
 */
const MusicPlayerComponent = function MusicPlayer({
  autoPlay = false,
  hidden = false,
}: MusicPlayerProps) {
  // ==================== 状态定义 ====================

  /** 处理后的音频列表（从配置文件加载） */
  const [audioList, setAudioList] = useState<ProcessedAudioItem[]>([]);

  /** 播放器是否已初始化 */
  const [isInitialized, setIsInitialized] = useState(false);

  /** 是否在客户端环境 */
  const [isClient, setIsClient] = useState(false);

  /** 配置加载是否失败（用于显示错误提示） */
  const [configLoadError, setConfigLoadError] = useState(false);

  /** 是否正在加载播放器（用于显示加载状态提示） */
  const [isLoading, setIsLoading] = useState(true);

  /** 当前播放模式 */
  const [playMode, setPlayMode] = useState<PlayMode>('list');

  /** 是否正在播放 */
  const [isPlaying, setIsPlaying] = useState(false);

  /** 当前播放索引 */
  const [currentIndex, setCurrentIndex] = useState(0);

  /** 当前播放时间（秒） */
  const [currentTime, setCurrentTime] = useState(0);

  /** 当前歌曲总时长（秒） */
  const [duration, setDuration] = useState(0);

  /** 当前音量（0-1） */
  const [volume, setVolume] = useState(0.7);

  /** 是否静音 */
  const [isMuted, setIsMuted] = useState(false);

  /** 是否展开为完整面板 */
  const [isExpanded, setIsExpanded] = useState(false);

  /** 是否显示播放列表 */
  const [showPlaylist, setShowPlaylist] = useState(false);

  /** 用户手动设置的播放器可见性，默认隐藏，由右下角按钮控制显示 */
  const [userVisible, setUserVisible] = useState(false);

  /** 进度条悬停时预览的时间（秒） */
  const [hoverTime, setHoverTime] = useState(0);

  /** 进度条悬停时的百分比位置 */
  const [hoverPercent, setHoverPercent] = useState(0);

  /** 是否正在悬停在进度条上 */
  const [isHoveringProgress, setIsHoveringProgress] = useState(false);

  /** 全局播放器管理器引用 */
  const managerRef = useRef(GlobalMusicPlayerManager.getInstance());

  /** 进度条 DOM 引用 */
  const progressBarRef = useRef<HTMLDivElement>(null);

  /** 音量条 DOM 引用 */
  const volumeBarRef = useRef<HTMLDivElement>(null);

  /** 是否正在拖拽进度条 */
  const isDraggingProgressRef = useRef(false);

  /** 是否正在拖拽音量条 */
  const isDraggingVolumeRef = useRef(false);

  /** 标记是否已经启动过播放器加载 */
  const hasLoadedRef = useRef(false);

  /** 定时同步状态 ID */
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 最终是否隐藏：路由级隐藏 或 用户手动关闭
  const isHidden = hidden || !userVisible;

  // ==================== 客户端挂载检测 ====================

  useEffect(() => {
    setIsClient(true);
    setUserVisible(getMusicPlayerVisibility());

    const unsubscribe = onMusicPlayerVisibilityChange((visible) => {
      setUserVisible(visible);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ==================== 从配置文件加载音乐列表 ====================

  /**
   * 加载音乐配置
   * 使用 musicConfigManager 从配置文件获取处理后的音频列表
   */
  useEffect(() => {
    if (!isClient) return;

    const loadMusicConfig = async () => {
      try {
        const processedList = await musicConfigManager.getProcessedAudioListAsync();

        if (processedList && processedList.length > 0) {
          setAudioList(processedList);
          setConfigLoadError(false);
        } else {
          const defaultList = musicConfigManager.getProcessedAudioList();
          setAudioList(defaultList);
          setConfigLoadError(false);
        }
      } catch (error) {
        console.error('[MusicPlayer] 加载音乐配置失败:', error);
        setConfigLoadError(true);
        const defaultList = musicConfigManager.getProcessedAudioList();
        setAudioList(defaultList);
      }
    };

    loadMusicConfig();
  }, [isClient]);

  // ==================== 播放器初始化 ====================

  /**
   * 初始化 Howler 播放器
   * 音频列表加载完成后调用管理器的 init 方法
   */
  useEffect(() => {
    if (!isClient || audioList.length === 0 || isInitialized) return;

    const manager = managerRef.current;

    // 全局已有实例且已初始化时，只需同步状态
    if (manager.isPlayerInitialized()) {
      setIsInitialized(true);
      setIsLoading(false);
      syncStateFromManager();
      return;
    }

    if (isHidden) {
      // 隐藏状态下不初始化，但标记加载完成以移除 loading
      setIsLoading(false);
      return;
    }

    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    try {
      manager.init(audioList, { autoPlay });
      setIsInitialized(true);
      setIsLoading(false);
      syncStateFromManager();

      // 设置预加载器
      const preloader = MusicPlayerPreloader.getInstance();
      preloader.setupPlaylist(
        audioList.map(item => ({ url: item.url, cover: item.cover, name: item.name, id: `${item.name}-${item.artist}` })),
        manager.getCurrentIndex(),
        manager.getPlayMode()
      );
    } catch (error) {
      console.error('[MusicPlayer] 初始化 Howler 播放器失败:', error);
      setConfigLoadError(true);
      setIsLoading(false);
    }
  }, [isClient, audioList, isInitialized, autoPlay, isHidden]);

  // ==================== 状态同步 ====================

  /**
   * 从管理器同步状态到 React 状态
   */
  const syncStateFromManager = useCallback(() => {
    const manager = managerRef.current;
    setIsPlaying(manager.isPlayingState());
    setCurrentIndex(manager.getCurrentIndex());
    setCurrentTime(manager.getCurrentTime());
    setDuration(manager.getDuration());
    setVolume(manager.getVolume());
    setIsMuted(manager.isMuted());
    setPlayMode(manager.getPlayMode());
  }, []);

  /**
   * 监听管理器事件，同步播放状态
   */
  useEffect(() => {
    if (!isClient || !isInitialized) return;

    const manager = managerRef.current;

    const handlePlay = () => {
      const song = manager.getCurrentSong();
      setIsPlaying(true);
      if (song) {
        emitMusicEvent('play', { title: song.name, artist: song.artist });
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      emitMusicEvent('pause');
    };

    const handleListSwitch = () => {
      setCurrentIndex(manager.getCurrentIndex());
      setDuration(manager.getDuration());
      setCurrentTime(manager.getCurrentTime());
    };

    const handleVolumeChange = () => {
      setVolume(manager.getVolume());
      setIsMuted(manager.isMuted());
    };

    const handlePlayModeChange = (detail: { mode: PlayMode }) => {
      setPlayMode(detail.mode);
    };

    manager.addEventListener('play', handlePlay);
    manager.addEventListener('pause', handlePause);
    manager.addEventListener('listswitch', handleListSwitch);
    manager.addEventListener('volumechange', handleVolumeChange);
    manager.addEventListener('play-mode-change', handlePlayModeChange);

    // 定时同步进度，确保进度条平滑更新
    syncIntervalRef.current = setInterval(() => {
      if (!isDraggingProgressRef.current) {
        setCurrentTime(manager.getCurrentTime());
        setDuration(manager.getDuration());
      }
    }, 250);

    return () => {
      manager.removeEventListener('play', handlePlay);
      manager.removeEventListener('pause', handlePause);
      manager.removeEventListener('listswitch', handleListSwitch);
      manager.removeEventListener('volumechange', handleVolumeChange);
      manager.removeEventListener('play-mode-change', handlePlayModeChange);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    };
  }, [isClient, isInitialized]);

  // ==================== 播放控制 ====================

  const handleTogglePlay = useCallback(() => {
    managerRef.current.toggle();
  }, []);

  const handleNext = useCallback(() => {
    managerRef.current.next();
  }, []);

  const handlePrev = useCallback(() => {
    managerRef.current.prev();
  }, []);

  const handleSwitchSong = useCallback((index: number) => {
    const manager = managerRef.current;
    if (index === manager.getCurrentIndex()) {
      manager.toggle();
    } else {
      manager.init(manager.getPlaylist(), { initialIndex: index, autoPlay: true });
    }
  }, []);

  // ==================== 进度条交互 ====================

  /**
   * 根据鼠标/触摸位置计算进度百分比
   * @param clientX 鼠标或触摸的 X 坐标
   * @returns 0-100 的进度百分比
   */
  const calculateProgressFromEvent = useCallback((clientX: number): number => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const percent = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  }, []);

  /**
   * 根据进度百分比跳转播放位置
   * @param percent 进度百分比
   */
  const seekToPercent = useCallback((percent: number) => {
    const manager = managerRef.current;
    const dur = manager.getDuration();
    if (dur > 0) {
      const targetTime = (percent / 100) * dur;
      manager.seek(targetTime);
      setCurrentTime(targetTime);
    }
  }, []);

  const handleProgressBarMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingProgressRef.current = true;
    const percent = calculateProgressFromEvent(e.clientX);
    seekToPercent(percent);

    const handleMouseMove = (ev: MouseEvent) => {
      const p = calculateProgressFromEvent(ev.clientX);
      seekToPercent(p);
    };

    const handleMouseUp = () => {
      isDraggingProgressRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [calculateProgressFromEvent, seekToPercent]);

  const handleProgressBarTouchStart = useCallback((e: React.TouchEvent) => {
    isDraggingProgressRef.current = true;
    const percent = calculateProgressFromEvent(e.touches[0].clientX);
    seekToPercent(percent);

    const handleTouchMove = (ev: TouchEvent) => {
      const p = calculateProgressFromEvent(ev.touches[0].clientX);
      seekToPercent(p);
    };

    const handleTouchEnd = () => {
      isDraggingProgressRef.current = false;
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  }, [calculateProgressFromEvent, seekToPercent]);

  /**
   * 处理进度条鼠标移动，显示悬停时间预览气泡
   * @param e 鼠标事件
   */
  const handleProgressBarMouseMove = useCallback((e: React.MouseEvent) => {
    const percent = calculateProgressFromEvent(e.clientX);
    const manager = managerRef.current;
    const dur = manager.getDuration();
    setHoverPercent(percent);
    setHoverTime((percent / 100) * (dur || 0));
    setIsHoveringProgress(true);
  }, [calculateProgressFromEvent]);

  /**
   * 处理进度条鼠标离开，隐藏悬停时间预览气泡
   */
  const handleProgressBarMouseLeave = useCallback(() => {
    setIsHoveringProgress(false);
  }, []);

  // ==================== 音量条交互 ====================

  /**
   * 根据鼠标/触摸位置计算音量百分比
   * @param clientX 鼠标或触摸的 X 坐标
   * @returns 0-100 的音量百分比
   */
  const calculateVolumeFromEvent = useCallback((clientX: number): number => {
    if (!volumeBarRef.current) return 0;
    const rect = volumeBarRef.current.getBoundingClientRect();
    const percent = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  }, []);

  /**
   * 设置音量百分比
   * @param percent 音量百分比
   */
  const setVolumePercent = useCallback((percent: number) => {
    const manager = managerRef.current;
    const newVolume = percent / 100;
    manager.setVolume(newVolume);
    if (newVolume > 0 && manager.isMuted()) {
      manager.setMuted(false);
    }
    setVolume(newVolume);
    setIsMuted(manager.isMuted());
  }, []);

  const handleVolumeBarMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingVolumeRef.current = true;
    const percent = calculateVolumeFromEvent(e.clientX);
    setVolumePercent(percent);

    const handleMouseMove = (ev: MouseEvent) => {
      const p = calculateVolumeFromEvent(ev.clientX);
      setVolumePercent(p);
    };

    const handleMouseUp = () => {
      isDraggingVolumeRef.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [calculateVolumeFromEvent, setVolumePercent]);

  const handleVolumeBarTouchStart = useCallback((e: React.TouchEvent) => {
    isDraggingVolumeRef.current = true;
    const percent = calculateVolumeFromEvent(e.touches[0].clientX);
    setVolumePercent(percent);

    const handleTouchMove = (ev: TouchEvent) => {
      const p = calculateVolumeFromEvent(ev.touches[0].clientX);
      setVolumePercent(p);
    };

    const handleTouchEnd = () => {
      isDraggingVolumeRef.current = false;
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  }, [calculateVolumeFromEvent, setVolumePercent]);

  // ==================== 音量控制 ====================

  const handleToggleMute = useCallback(() => {
    const manager = managerRef.current;
    manager.setMuted(!manager.isMuted());
    setIsMuted(manager.isMuted());
  }, []);

  // ==================== 播放模式切换 ====================

  const handleTogglePlayMode = useCallback(() => {
    const manager = managerRef.current;
    const newMode = manager.togglePlayMode();
    setPlayMode(newMode);
  }, []);

  // ==================== 重试加载 ====================

  const handleRetry = useCallback(() => {
    setConfigLoadError(false);
    setIsLoading(true);
    setIsInitialized(false);
    hasLoadedRef.current = false;
  }, []);

  // ==================== 渲染辅助 ====================

  const currentSong = audioList[currentIndex];
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const volumePercent = volume * 100;

  // 空播放列表提示
  if (audioList.length === 0 && !isLoading && !configLoadError) {
    return (
      <div
        className={`fixed bottom-4 left-4 z-[9999] transition-all duration-300 ${isHidden ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}
      >
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-xl border border-[#66ccff]/30 px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
          暂无可用歌曲
        </div>
      </div>
    );
  }

  // ==================== 渲染 ====================

  return (
    <div
      className={`fixed bottom-4 left-4 z-[9999] relative transition-all duration-300 ${isHidden ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}
      style={{ maxWidth: isExpanded || showPlaylist ? '380px' : '280px' }}
    >
      {/* 播放列表 - 向上展开，位于播放器主卡片上方 */}
      {showPlaylist && (
        <div
          className={`
            absolute bottom-full left-0 right-0 mb-2
            max-h-[240px] overflow-y-auto
            bg-white/90 dark:bg-slate-800/90 backdrop-blur-md
            rounded-2xl shadow-xl border border-[#66ccff]/30
            w-[340px] sm:w-[380px]
            animate-[slide-up_0.25s_ease-out]
          `}
        >
          {audioList.map((song, index) => (
            <div
              key={`${song.name}-${song.artist}-${index}`}
              onClick={() => handleSwitchSong(index)}
              className={`
                flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors
                ${index === currentIndex
                  ? 'bg-[#66ccff]/10 border-l-2 border-[#66ccff]'
                  : 'hover:bg-slate-100 dark:hover:bg-slate-800 border-l-2 border-transparent'
                }
              `}
            >
              <div className="text-xs text-slate-400 w-5 text-center">
                {index === currentIndex && isPlaying ? (
                  <div className="flex items-end justify-center gap-0.5 h-3">
                    <span className="w-0.5 bg-[#66ccff] animate-[music-bar_0.6s_ease-in-out_infinite]" style={{ height: '60%' }} />
                    <span className="w-0.5 bg-[#66ccff] animate-[music-bar_0.8s_ease-in-out_infinite]" style={{ height: '100%' }} />
                    <span className="w-0.5 bg-[#66ccff] animate-[music-bar_0.7s_ease-in-out_infinite]" style={{ height: '40%' }} />
                  </div>
                ) : (
                  index + 1
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate ${index === currentIndex ? 'text-[#0099cc] dark:text-[#66ccff] font-medium' : 'text-slate-700 dark:text-slate-200'}`}>
                  {song.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {highlightArtistName(song.artist)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        className={`
          relative bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-xl
          border border-[#66ccff]/30 overflow-hidden transition-all duration-300
          ${isExpanded || showPlaylist ? 'w-[340px] sm:w-[380px]' : 'w-[280px]'}
        `}
      >
        {/* 顶部迷你控制栏 */}
        <div className="flex items-center gap-3 p-3">
          {/* 封面 */}
          <div
            className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {currentSong?.cover ? (
              <img
                src={currentSong.cover}
                alt={currentSong.name}
                className={`w-full h-full object-cover ${isPlaying ? 'animate-spin' : ''}`}
                style={{ animationDuration: '8s' }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#66ccff]/30 to-[#0099cc]/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#66ccff]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                </svg>
              </div>
            )}
            {/* 播放状态指示器 */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                {isPlaying ? (
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </div>
          </div>

          {/* 歌曲信息 */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {currentSong?.name || '未播放'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
              {currentSong ? highlightArtistName(currentSong.artist) : '-'}
            </div>
          </div>

          {/* 迷你控制按钮 */}
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-full hover:bg-[#66ccff]/10 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="上一首"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button
              onClick={handleTogglePlay}
              className="p-2 rounded-full bg-[#66ccff] hover:bg-[#4db8ff] text-white shadow-md transition-colors"
              aria-label={isPlaying ? '暂停' : '播放'}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                {isPlaying ? (
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                ) : (
                  <path d="M8 5v14l11-7z" />
                )}
              </svg>
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-full hover:bg-[#66ccff]/10 text-slate-600 dark:text-slate-300 transition-colors"
              aria-label="下一首"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* 进度条（始终显示） */}
        {/* 外层容器固定高度，避免内部进度条 hover 变粗时带动整体容器高度变化；相对定位用于气泡绝对定位 */}
        <div
          className="h-4 flex items-center cursor-pointer group relative"
          onMouseDown={handleProgressBarMouseDown}
          onTouchStart={handleProgressBarTouchStart}
          onMouseMove={handleProgressBarMouseMove}
          onMouseLeave={handleProgressBarMouseLeave}
        >
          <div
            ref={progressBarRef}
            className="w-full h-1.5 bg-slate-200/80 dark:bg-slate-700/80 rounded-full relative overflow-hidden transition-all duration-200 group-hover:h-2"
          >
            {/* 已播放进度 - 天依蓝渐变 + 微光 */}
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#66ccff] via-[#4db8ff] to-[#0099cc] rounded-full shadow-[0_0_10px_rgba(102,204,255,0.45)] transition-all duration-100"
              style={{ width: `${progressPercent}%` }}
            />

            {/* 拖拽圆点 */}
            <div
              className="absolute top-1/2 w-3.5 h-3.5 bg-white border-[2.5px] border-[#66ccff] rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none"
              style={{ left: `${progressPercent}%`, transform: 'translate(-50%, -50%) scale(1)' }}
            />
          </div>

          {/* 悬停时间气泡：放在 overflow-hidden 外层，避免被裁剪；跟随鼠标位置显示预览时间 */}
          <div
            className="absolute bottom-full mb-2 px-1.5 py-0.5 bg-slate-800/90 dark:bg-slate-700/90 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap"
            style={{ left: `${isHoveringProgress ? hoverPercent : progressPercent}%`, transform: 'translateX(-50%)' }}
          >
            {formatTime(isHoveringProgress ? hoverTime : currentTime)} / {formatTime(duration)}
          </div>
        </div>

        {/* 展开面板 */}
        {(isExpanded || showPlaylist) && (
          <div className="border-t border-slate-200 dark:border-slate-700">
            {/* 控制区（时间已合并到进度条悬停气泡中） */}
            <div className="p-4">
              {/* 控制按钮区：播放模式、音量控制、播放列表切换放在同一行 */}
              <div className="flex items-center justify-between">
                {/* 播放模式 */}
                <button
                  onClick={handleTogglePlayMode}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-[#66ccff]/10 transition-colors"
                  aria-label={PLAY_MODE_NAMES[playMode]}
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d={PLAY_MODE_ICONS[playMode]} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{PLAY_MODE_NAMES[playMode]}</span>
                </button>

                {/* 音量控制 - 静音按钮 + 短音量条，可拖拽精细调节 */}
                <div className="flex items-center gap-1.5 flex-1 justify-center mx-2">
                  <button
                    onClick={handleToggleMute}
                    className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-[#66ccff]/10 hover:text-[#66ccff] transition-colors flex-shrink-0"
                    aria-label={isMuted ? '取消静音' : '静音'}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      {isMuted || volume === 0 ? (
                        <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                      ) : volume < 0.5 ? (
                        <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                      ) : (
                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                      )}
                    </svg>
                  </button>
                  {/* 外层固定高度，内部音量条 hover 变粗不影响布局 */}
                  <div
                    className="h-4 flex items-center cursor-pointer group flex-1 max-w-[80px]"
                    onMouseDown={handleVolumeBarMouseDown}
                    onTouchStart={handleVolumeBarTouchStart}
                  >
                    <div
                      ref={volumeBarRef}
                      className="w-full h-1 bg-slate-200/80 dark:bg-slate-700/80 rounded-full relative overflow-hidden transition-all duration-200 group-hover:h-1.5"
                    >
                      {/* 当前音量 - 天依蓝渐变 */}
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#66ccff] to-[#0099cc] rounded-full transition-all duration-100"
                        style={{ width: `${volumePercent}%` }}
                      />
                      {/* 音量拖拽圆点 */}
                      <div
                        className="absolute top-1/2 w-2.5 h-2.5 bg-white border-2 border-[#66ccff] rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none"
                        style={{ left: `${volumePercent}%`, transform: 'translate(-50%, -50%)' }}
                      />
                    </div>
                  </div>
                </div>

                {/* 播放列表切换 */}
                <button
                  onClick={() => setShowPlaylist(!showPlaylist)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors ${
                    showPlaylist
                      ? 'bg-[#66ccff]/20 text-[#0099cc] dark:text-[#66ccff]'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-[#66ccff]/10'
                  }`}
                  aria-label="播放列表"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
                  </svg>
                  <span>{audioList.length}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 加载提示 */}
      {isLoading && !configLoadError && (
        <div className="absolute -top-10 left-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-lg shadow-lg border border-[#66ccff]/30 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin text-[#66ccff]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          加载音乐中...
        </div>
      )}

      {/* 错误提示 */}
      {configLoadError && isClient && (
        <div
          className="fixed bottom-20 right-4 bg-red-500/95 text-white px-4 py-3 rounded-lg text-sm z-50 flex flex-col gap-2 shadow-lg backdrop-blur-sm max-w-xs"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>音乐播放器加载失败</span>
          </div>
          <div className="text-xs text-white/80">请检查网络连接后重试</div>
          <button
            onClick={handleRetry}
            className="mt-1 w-full bg-white/20 hover:bg-white/30 transition-colors duration-200 px-3 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"
            aria-label="重新加载音乐播放器"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            重新加载
          </button>
        </div>
      )}

      {/* 音乐条动画的关键帧 */}
      <style jsx>{`
        @keyframes music-bar {
          0%, 100% { transform: scaleY(0.5); }
          50% { transform: scaleY(1); }
        }
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// 使用 React.memo 减少不必要的渲染
export default React.memo(MusicPlayerComponent);
