'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import GlobalMusicPlayerManager, { regenerateRandomOrder } from '@/utils/globalMusicPlayerManager';
import type { PlayMode, MusicPlayerState, APlayerNS } from '@/types/aplayer';

/**
 * useMusicPlayer Hook 返回值接口
 * 提供播放器的完整控制能力和状态信息
 */
interface UseMusicPlayerReturn {
  /** 播放器实例，可能为 null（未初始化时） */
  player: APlayerNS.APlayer | null;
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
  /** 设置播放模式 */
  setPlayMode: (mode: PlayMode) => void;
  /** 循环切换播放模式：list -> random -> single -> list */
  togglePlayMode: () => void;
  /** 切换歌词显示/隐藏 */
  toggleLyrics: () => void;
}

/**
 * 播放模式循环顺序
 * 按照列表循环 -> 随机播放 -> 单曲循环的顺序循环切换
 */
const PLAY_MODE_ORDER: PlayMode[] = ['list', 'random', 'single'];

/**
 * 播放模式对应的 APlayer loop 值
 * APlayer 原生支持 'all'、'one'、'none' 三种循环模式
 * - all: 列表循环（播完最后一首回到第一首）
 * - one: 单曲循环
 * - none: 不循环（播完最后一首停止）
 */
const PLAY_MODE_TO_LOOP: Record<PlayMode, 'all' | 'one' | 'none'> = {
  list: 'all',
  random: 'all',
  single: 'one',
};

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
  
  /** 播放器实例引用 */
  const playerRef = useRef<APlayerNS.APlayer | null>(null);
  
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

  // ==================== 状态同步函数 ====================
  
  /**
   * 从播放器实例同步所有状态
   * 读取播放器的当前状态并更新到 React 状态中
   */
  const syncStateFromPlayer = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    
    // 同步播放索引
    if (typeof player.list?.index === 'number') {
      setCurrentIndex(player.list.index);
    }
    
    // 同步暂停状态
    setIsPaused(player.paused);
    
    // 同步音量
    if (typeof player.volume === 'number') {
      setVolumeState(player.volume);
    }
    
    // 同步歌词显示状态
    const globalManager = GlobalMusicPlayerManager.getInstance();
    setLyricsVisible(globalManager.isLyricsVisible());
  }, []);

  // ==================== 播放器初始化 ====================
  
  useEffect(() => {
    // 确保在客户端环境运行
    if (typeof window === 'undefined') return;
    
    const globalManager = GlobalMusicPlayerManager.getInstance();
    
    /**
     * 初始化播放器引用和事件监听
     * @param player APlayer 实例
     */
    // 存储事件处理器引用，用于组件卸载时清理
    const eventHandlers: Array<{ event: string; handler: () => void }> = [];
    
    const initPlayer = (player: APlayerNS.APlayer) => {
      // APlayer v1.10.1 实际没有 off 方法，动态添加空函数防止报错
      if (!player.off) {
        (player as any).off = () => {};
      }

      playerRef.current = player;
      setIsInitialized(true);
      
      // 初始同步状态
      syncStateFromPlayer();
      
      // 播放事件：更新暂停状态
      const handlePlay = () => {
        setIsPaused(false);
        setCurrentIndex(player.list.index);
      };
      player.on('play', handlePlay);
      eventHandlers.push({ event: 'play', handler: handlePlay });
      
      // 暂停事件：更新暂停状态
      const handlePause = () => {
        setIsPaused(true);
      };
      player.on('pause', handlePause);
      eventHandlers.push({ event: 'pause', handler: handlePause });
      
      // 列表切换事件：更新当前索引
      const handleListSwitch = () => {
        setCurrentIndex(player.list.index);
      };
      player.on('listswitch', handleListSwitch);
      eventHandlers.push({ event: 'listswitch', handler: handleListSwitch });
      
      // 音量变化事件：更新音量状态
      const handleVolumeChange = () => {
        setVolumeState(player.volume);
      };
      player.on('volumechange', handleVolumeChange);
      eventHandlers.push({ event: 'volumechange', handler: handleVolumeChange });
    };
    
    // 检查播放器是否已初始化
    if (globalManager.isPlayerInitialized()) {
      const player = globalManager.getPlayer();
      if (player) {
        initPlayer(player);
      }
    } else {
      // 等待播放器初始化完成
      globalManager.onInit((player) => {
        initPlayer(player);
      });
    }
    
    // 清理函数：移除所有事件监听器
    // 注意：APlayer v1.10.1 实际没有 off 方法，调用前需检查
    return () => {
      try {
        const player = playerRef.current;
        if (player && typeof player.off === 'function') {
          eventHandlers.forEach(({ event, handler }) => {
            player.off(event, handler);
          });
        }
      } catch (e) {
        // 忽略清理过程中的非致命错误
      }
      eventHandlers.length = 0;
    };
  }, [syncStateFromPlayer]);

  // ==================== 播放控制方法 ====================
  
  /**
   * 开始播放
   * 如果播放器已初始化且当前暂停，则开始播放
   */
  const play = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    
    try {
      player.play();
    } catch (error) {
      console.error('播放失败:', error);
    }
  }, []);
  
  /**
   * 暂停播放
   * 如果播放器已初始化且正在播放，则暂停
   */
  const pause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    
    try {
      player.pause();
    } catch (error) {
      console.error('暂停失败:', error);
    }
  }, []);
  
  /**
   * 切换播放/暂停状态
   * 如果正在播放则暂停，如果暂停则开始播放
   */
  const toggle = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    
    try {
      player.toggle();
    } catch (error) {
      console.error('切换播放状态失败:', error);
    }
  }, []);
  
  /**
   * 播放下一首
   * 切换到播放列表中的下一首歌曲
   * 如果当前是最后一首，则循环到第一首
   */
  const next = useCallback(() => {
    const player = playerRef.current;
    if (!player || !player.list) return;
    
    try {
      const list = player.list;
      const nextIndex = (list.index + 1) % list.list.length;
      list.switch(nextIndex);
    } catch (error) {
      console.error('切换下一首失败:', error);
    }
  }, []);
  
  /**
   * 播放上一首
   * 切换到播放列表中的上一首歌曲
   * 如果当前是第一首，则循环到最后一首
   */
  const prev = useCallback(() => {
    const player = playerRef.current;
    if (!player || !player.list) return;
    
    try {
      const list = player.list;
      const prevIndex = list.index === 0 ? list.list.length - 1 : list.index - 1;
      list.switch(prevIndex);
    } catch (error) {
      console.error('切换上一首失败:', error);
    }
  }, []);
  
  /**
   * 跳转到指定时间点
   * @param time 目标时间，单位为秒
   */
  const seek = useCallback((time: number) => {
    const player = playerRef.current;
    if (!player) return;
    
    try {
      player.seek(time);
    } catch (error) {
      console.error('跳转失败:', error);
    }
  }, []);
  
  /**
   * 设置音量
   * @param newVolume 目标音量，范围 0-1
   */
  const setVolume = useCallback((newVolume: number) => {
    const player = playerRef.current;
    if (!player) return;
    
    // 确保音量在有效范围内
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    
    try {
      // APlayer 通过 audio 元素设置音量
      if (player.audio) {
        player.audio.volume = clampedVolume;
      }
      setVolumeState(clampedVolume);
    } catch (error) {
      console.error('设置音量失败:', error);
    }
  }, []);

  // ==================== 播放模式控制 ====================
  
  /**
   * 设置播放模式
   * @param mode 目标播放模式
   */
  const setPlayMode = useCallback((mode: PlayMode) => {
    const player = playerRef.current;
    if (!player || !player.options) return;
    
    try {
      // APlayer v1.10.1 的 loop 参数是字符串 ('all' | 'one' | 'none')，不是布尔值
      // 设置正确的 loop 值，让 APlayer 原生处理自动切换
      player.options.loop = PLAY_MODE_TO_LOOP[mode];

      // 设置播放顺序：列表循环用 'list'，随机播放用 'random'
      player.options.order = mode === 'random' ? 'random' : 'list';
      
      // 更新状态
      setPlayModeState(mode);
      
      // 保存到 localStorage 以便持久化
      localStorage.setItem('musicPlayMode', mode);
    } catch (error) {
      console.error('设置播放模式失败:', error);
    }
  }, []);
  
  /**
   * 循环切换播放模式
   * 按照 list -> random -> single -> list 的顺序循环
   */
  const togglePlayMode = useCallback(() => {
    const currentModeIndex = PLAY_MODE_ORDER.indexOf(playMode);
    const nextModeIndex = (currentModeIndex + 1) % PLAY_MODE_ORDER.length;
    const nextMode = PLAY_MODE_ORDER[nextModeIndex];
    
    setPlayMode(nextMode);
  }, [playMode, setPlayMode]);

  // ==================== 歌词控制 ====================
  
  /**
   * 切换歌词显示/隐藏
   * 通过全局管理器控制歌词的显示状态
   */
  const toggleLyrics = useCallback(() => {
    const globalManager = GlobalMusicPlayerManager.getInstance();
    globalManager.toggleLyrics();
    
    // 更新本地状态
    setLyricsVisible(globalManager.isLyricsVisible());
  }, []);

  // ==================== 返回值 ====================
  
  return {
    player: playerRef.current,
    isInitialized,
    currentIndex,
    isPaused,
    volume,
    playMode,
    lyricsVisible,
    play,
    pause,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    setPlayMode,
    togglePlayMode,
    toggleLyrics,
  };
}

export default useMusicPlayer;
