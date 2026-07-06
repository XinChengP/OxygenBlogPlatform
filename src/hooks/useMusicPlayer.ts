'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import GlobalMusicPlayerManager from '@/utils/globalMusicPlayerManager';
import type { PlayMode, MusicPlayerState } from '@/types/music';
import { PLAY_MODE_ORDER } from '@/types/playMode';

/**
 * useMusicPlayer Hook 返回值接口
 * 提供播放器的完整控制能力和状态信息
 */
interface UseMusicPlayerReturn {
  /** 播放器管理器实例，可能为 null（未初始化时） */
  player: ReturnType<typeof GlobalMusicPlayerManager.getInstance> | null;
  /** 播放器是否已初始化完成 */
  isInitialized: boolean;
  /** 当前播放歌曲在列表中的索引 */
  currentIndex: number;
  /** 是否处于暂停状态，true 表示暂停 */
  isPaused: boolean;
  /** 当前音量值，范围 0-1 */
  volume: number;
  /** 当前播放模式 */
  playMode: PlayMode;
  /** 歌词是否可见 */
  lyricsVisible: boolean;
  /** 当前播放时间（秒） */
  currentTime: number;
  /** 当前歌曲总时长（秒） */
  duration: number;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 开始播放 */
  play: () => void;
  /** 暂停播放 */
  pause: () => void;
  /** 切换播放/暂停状态 */
  toggle: () => void;
  /** 播放下一首 */
  next: () => void;
  /** 播放上一首 */
  prev: () => void;
  /** 跳转到指定时间点（秒） */
  seek: (time: number) => void;
  /** 设置音量，范围 0-1 */
  setVolume: (volume: number) => void;
  /** 设置静音状态 */
  setMuted: (muted: boolean) => void;
  /** 设置播放模式 */
  setPlayMode: (mode: PlayMode) => void;
  /** 循环切换播放模式：list -> random -> single -> list */
  togglePlayMode: () => void;
  /** 切换歌词显示/隐藏 */
  toggleLyrics: () => void;
}

/**
 * 音乐播放器核心 Hook
 *
 * 提供播放器的完整控制能力，包括：
 * - 播放控制（播放、暂停、切换、上一首、下一首、跳转）
 * - 音量控制
 * - 播放模式切换（列表循环、随机播放、单曲循环）
 * - 歌词显示控制
 * - 状态同步（自动监听播放器状态变化）
 *
 * @returns 播放器控制对象和状态
 *
 * @example
 * ```tsx
 * function MusicControlPanel() {
 *   const {
 *     isPaused,
 *     playMode,
 *     currentIndex,
 *     toggle,
 *     next,
 *     prev,
 *     togglePlayMode
 *   } = useMusicPlayer();
 *
 *   return (
 *     <div>
 *       <button onClick={prev}>上一首</button>
 *       <button onClick={toggle}>{isPaused ? '播放' : '暂停'}</button>
 *       <button onClick={next}>下一首</button>
 *       <button onClick={togglePlayMode}>{playMode}</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMusicPlayer(): UseMusicPlayerReturn {
  // ==================== 状态定义 ====================

  /** 播放器管理器引用 */
  const managerRef = useRef<ReturnType<typeof GlobalMusicPlayerManager.getInstance> | null>(null);

  /** 播放器是否已初始化 */
  const [isInitialized, setIsInitialized] = useState(false);

  /** 当前播放索引 */
  const [currentIndex, setCurrentIndex] = useState(0);

  /** 是否暂停 */
  const [isPaused, setIsPaused] = useState(true);

  /** 当前音量 */
  const [volume, setVolumeState] = useState(0.7);

  /** 播放模式 */
  const [playMode, setPlayModeState] = useState<PlayMode>('list');

  /** 歌词显示状态 */
  const [lyricsVisible, setLyricsVisible] = useState(false);

  /** 当前播放时间 */
  const [currentTime, setCurrentTime] = useState(0);

  /** 当前歌曲总时长 */
  const [duration, setDuration] = useState(0);

  /** 是否正在加载 */
  const [isLoading, setIsLoading] = useState(false);

  // ==================== 状态同步函数 ====================

  /**
   * 从播放器管理器同步所有状态
   * 读取管理器的当前状态并更新到 React 状态中
   */
  const syncStateFromManager = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;

    setCurrentIndex(manager.getCurrentIndex());
    setIsPaused(manager.isPausedState());
    setVolumeState(manager.getVolume());
    setPlayModeState(manager.getPlayMode());
    setLyricsVisible(manager.isLyricsVisible());
    setCurrentTime(manager.getCurrentTime());
    setDuration(manager.getDuration());
    setIsLoading(manager.isLoadingState());
  }, []);

  // ==================== 播放器初始化 ====================

  useEffect(() => {
    // 确保在客户端环境运行
    if (typeof window === 'undefined') return;

    const manager = GlobalMusicPlayerManager.getInstance();
    managerRef.current = manager;

    /**
     * 初始化事件监听
     */
    const setupListeners = () => {
      setIsInitialized(true);
      syncStateFromManager();

      manager.addEventListener('play', () => {
        setIsPaused(false);
        syncStateFromManager();
      });

      manager.addEventListener('pause', () => {
        setIsPaused(true);
        syncStateFromManager();
      });

      manager.addEventListener('listswitch', () => {
        setCurrentIndex(manager.getCurrentIndex());
        setDuration(manager.getDuration());
        setCurrentTime(manager.getCurrentTime());
      });

      manager.addEventListener('volumechange', () => {
        setVolumeState(manager.getVolume());
      });

      manager.addEventListener('play-mode-change', (detail: { mode: PlayMode }) => {
        setPlayModeState(detail.mode);
      });

      manager.addEventListener('lyrics-toggle', (detail: { visible: boolean }) => {
        setLyricsVisible(detail.visible);
      });
    };

    if (manager.isPlayerInitialized()) {
      setupListeners();
    } else {
      manager.onInit(() => {
        setupListeners();
      });
    }

    // 定时同步进度
    const intervalId = setInterval(() => {
      if (managerRef.current) {
        setCurrentTime(managerRef.current.getCurrentTime());
        setDuration(managerRef.current.getDuration());
      }
    }, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, [syncStateFromManager]);

  // ==================== 播放控制方法 ====================

  const play = useCallback(() => {
    managerRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    managerRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    managerRef.current?.toggle();
  }, []);

  const next = useCallback(() => {
    managerRef.current?.next();
  }, []);

  const prev = useCallback(() => {
    managerRef.current?.prev();
  }, []);

  const seek = useCallback((time: number) => {
    managerRef.current?.seek(time);
  }, []);

  const setVolume = useCallback((newVolume: number) => {
    const manager = managerRef.current;
    if (!manager) return;
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    manager.setVolume(clampedVolume);
    setVolumeState(clampedVolume);
  }, []);

  const setMuted = useCallback((muted: boolean) => {
    managerRef.current?.setMuted(muted);
  }, []);

  const setPlayMode = useCallback((mode: PlayMode) => {
    managerRef.current?.setPlayMode(mode);
  }, []);

  const togglePlayMode = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    const newMode = manager.togglePlayMode();
    setPlayModeState(newMode);
  }, []);

  const toggleLyrics = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;
    manager.toggleLyrics();
    setLyricsVisible(manager.isLyricsVisible());
  }, []);

  // ==================== 返回值 ====================

  return {
    player: managerRef.current,
    isInitialized,
    currentIndex,
    isPaused,
    volume,
    playMode,
    lyricsVisible,
    currentTime,
    duration,
    isLoading,
    play,
    pause,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    setMuted,
    setPlayMode,
    togglePlayMode,
    toggleLyrics,
  };
}

export default useMusicPlayer;
