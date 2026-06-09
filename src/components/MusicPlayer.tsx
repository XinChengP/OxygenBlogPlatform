'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import DOMPurify from 'dompurify';
import GlobalMusicPlayerManager from '@/utils/globalMusicPlayerManager';
import { musicConfigManager, ProcessedAudioItem } from '@/utils/musicConfigManager';
import type { APlayerNS, PlayMode } from '@/types/aplayer';
import { emitMusicEvent } from '@/utils/live2dEventEmitter';
import { getAssetPath } from '@/utils/assetUtils';

/**
 * 音乐播放器组件 Props 接口
 */
interface MusicPlayerProps {
  /** 是否自动播放，默认 false */
  autoPlay?: boolean;
  /** 是否循环播放，默认 false（由播放模式控制） */
  loop?: boolean;
}

/**
 * 播放模式循环顺序
 * 按照列表循环 -> 随机播放 -> 单曲循环的顺序循环切换
 */
const PLAY_MODE_ORDER: PlayMode[] = ['list', 'random', 'single'];

/**
 * 播放模式对应的 APlayer order 值
 * APlayer 原生只支持 list 和 random，single 需要特殊处理
 */
const PLAY_MODE_TO_ORDER: Record<PlayMode, 'list' | 'random'> = {
  list: 'list',
  random: 'random',
  single: 'list', // 单曲循环使用 list 模式，配合 loop 属性实现
};

/**
 * 播放模式显示名称映射
 */
const PLAY_MODE_NAMES: Record<PlayMode, string> = {
  list: '列表循环',
  random: '随机播放',
  single: '单曲循环',
};

/**
 * 音乐播放器组件
 * 
 * 功能特性：
 * 1. 从配置文件加载音乐列表（支持热更新）
 * 2. 播放模式切换（列表循环、随机播放、单曲循环）
 * 3. 播放状态持久化（跨页面保持播放进度）
 * 4. Live2D 联动（播放/暂停事件通知）
 * 5. 歌手名称高亮显示
 * 6. GitHub Pages 兼容（basePath 处理）
 * 
 * @param props 组件属性
 * @returns 音乐播放器组件
 */
const MusicPlayerComponent = function MusicPlayer({ 
  autoPlay = false,
  loop = false 
}: MusicPlayerProps) {
  // ==================== 状态定义 ====================
  
  /** APlayer 容器 DOM 引用 */
  const aplayerRef = useRef<HTMLDivElement>(null);
  
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
  
  /** 使用 ref 存储 playMode，确保事件处理器中能获取最新值 */
  const playModeRef = useRef<PlayMode>('list');
  
  /** APlayer 实例引用（用于事件监听器清理） */
  const playerInstanceRef = useRef<APlayerNS.APlayer | null>(null);
  
  /** 清理函数引用（用于组件卸载时清理） */
  const cleanupRef = useRef<(() => void) | null>(null);

  // ==================== 客户端挂载检测 ====================
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  // ==================== SubTask 5.1: 从配置文件加载音乐列表 ====================
  
  /**
   * 加载音乐配置
   * 使用 musicConfigManager 从配置文件获取处理后的音频列表
   */
  useEffect(() => {
    if (!isClient) return;
    
    /**
     * 异步加载音乐配置
     * 加载失败时使用默认配置作为降级方案
     */
    const loadMusicConfig = async () => {
      try {
        // 使用 musicConfigManager 获取处理后的音频列表
        // getProcessedAudioListAsync 会自动处理路径（getAssetPath）
        const processedList = await musicConfigManager.getProcessedAudioListAsync();
        
        if (processedList && processedList.length > 0) {
          setAudioList(processedList);
          setConfigLoadError(false);
          console.log(`[MusicPlayer] 成功加载 ${processedList.length} 首歌曲`);
        } else {
          // 配置为空，使用默认配置
          console.warn('[MusicPlayer] 配置文件歌曲列表为空，使用默认配置');
          const defaultList = musicConfigManager.getProcessedAudioList();
          setAudioList(defaultList);
          setConfigLoadError(false);
        }
      } catch (error) {
        // 加载失败，使用默认配置作为降级方案
        console.error('[MusicPlayer] 加载音乐配置失败:', error);
        setConfigLoadError(true);
        
        // 使用默认配置
        const defaultList = musicConfigManager.getProcessedAudioList();
        setAudioList(defaultList);
      }
    };
    
    loadMusicConfig();
  }, [isClient]);

  // ==================== SubTask 5.2: 播放模式管理 ====================
  
  /**
   * 恢复播放模式状态
   * 从 localStorage 读取上次保存的播放模式
   */
  const restorePlayMode = useCallback(() => {
    try {
      const savedMode = localStorage.getItem('musicPlayMode');
      if (savedMode && PLAY_MODE_ORDER.includes(savedMode as PlayMode)) {
        setPlayMode(savedMode as PlayMode);
        return savedMode as PlayMode;
      }
    } catch (error) {
      console.warn('[MusicPlayer] 读取播放模式失败:', error);
    }
    return 'list';
  }, []);

  /**
   * 应用播放模式到播放器
   * @param player APlayer 实例
   * @param mode 播放模式
   */
  const applyPlayMode = useCallback((player: APlayerNS.APlayer, mode: PlayMode) => {
    if (!player || !player.options) return;
    
    console.log('[MusicPlayer] 应用播放模式:', mode);
    
    // 设置 APlayer 的 order 配置
    player.options.order = PLAY_MODE_TO_ORDER[mode];
    
    // 处理单曲循环模式
    // APlayer 没有原生的单曲循环模式，需要通过设置 loop 属性来模拟
    if (mode === 'single') {
      player.options.loop = true;
      console.log('[MusicPlayer] 启用单曲循环模式');
    } else {
      // 列表循环和随机播放模式下，loop 应该为 false
      player.options.loop = false;
      if (mode === 'random') {
        console.log('[MusicPlayer] 启用随机播放模式，order:', player.options.order);
        
        // 关键修复：重新生成随机顺序数组
        // APlayer 的 randomOrder 在初始化时只生成一次，切换模式时需要重新生成
        const audioCount = player.list && player.list.list ? player.list.list.length : 0;
        if (audioCount > 0) {
          // @ts-ignore - APlayer 内部方法
          const shuffleFn = (window as any).APlayer?.default?.randomOrder || 
                           (player as any).constructor?.randomOrder;
          
          if (shuffleFn && typeof shuffleFn === 'function') {
            // @ts-ignore
            player.randomOrder = shuffleFn(audioCount);
            console.log('[MusicPlayer] 已重新生成随机顺序数组');
          } else {
            // 备用方案：手动生成随机顺序
            const indices = Array.from({ length: audioCount }, (_, i) => i);
            // Fisher-Yates 洗牌算法
            for (let i = indices.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            // @ts-ignore
            player.randomOrder = indices;
            console.log('[MusicPlayer] 已手动生成随机顺序数组');
          }
        }
        
        // 随机模式下，确保列表已正确初始化
        if (player.list && player.list.list) {
          console.log('[MusicPlayer] 当前歌曲数量:', player.list.list.length);
        }
      }
    }
    
    // 保存到 localStorage
    try {
      localStorage.setItem('musicPlayMode', mode);
    } catch (error) {
      console.warn('[MusicPlayer] 保存播放模式失败:', error);
    }
  }, [loop]);

  /**
   * 同步 playMode 到 ref
   * 确保事件处理器中能获取最新的 playMode 值
   */
  useEffect(() => {
    playModeRef.current = playMode;
    console.log('[MusicPlayer] 播放模式更新:', playMode);
  }, [playMode]);

  /**
   * 监听播放模式变化事件
   * 允许外部组件通过事件改变播放模式
   */
  useEffect(() => {
    if (!isClient) return;
    
    const globalManager = GlobalMusicPlayerManager.getInstance();
    
    /**
     * 处理播放模式变化事件
     * @param detail 事件详情
     */
    const handlePlayModeChange = (detail: { mode: PlayMode }) => {
      if (detail && detail.mode) {
        setPlayMode(detail.mode);
        
        // 同步到播放器实例
        const player = globalManager.getPlayer();
        if (player) {
          applyPlayMode(player, detail.mode);
        }
      }
    };
    
    // 注册事件监听器
    globalManager.addEventListener('play-mode-change', handlePlayModeChange);
    
    return () => {
      // 清理事件监听器
      globalManager.removeEventListener('play-mode-change', handlePlayModeChange);
    };
  }, [isClient, applyPlayMode]);

  // ==================== SubTask 5.3: 播放器初始化与事件管理 ====================
  
  /**
   * 歌手名称高亮处理函数
   * 为特定歌手名称添加颜色高亮效果
   */
  const highlightArtistNames = useCallback(() => {
    const artistElements = document.querySelectorAll('.aplayer-list-author');
    artistElements.forEach(element => {
      // 检查元素是否存在
      if (!element) return;
      
      const text = element.textContent || '';
      let highlightedText = text;
      
      // 高亮洛天依Official（整体天依蓝 #66ccff）
      if (text.includes('洛天依Official')) {
        highlightedText = highlightedText.replace(
          /洛天依Official/g, 
          '<span style="color: #66ccff">洛天依Official</span>'
        );
      }
      
      // 高亮洛天依（天依蓝 #66ccff）
      if (text.includes('洛天依')) {
        highlightedText = highlightedText.replace(
          /洛天依(?!Official)/g, 
          '<span style="color: #66ccff">洛天依</span>'
        );
      }
      
      // 高亮乐正绫（绫红 #ee0000）
      if (text.includes('乐正绫')) {
        highlightedText = highlightedText.replace(
          /乐正绫/g, 
          '<span style="color: #ee0000">乐正绫</span>'
        );
      }
      
      // 高亮言和（言和绿 #00ffcc）
      if (text.includes('言和')) {
        highlightedText = highlightedText.replace(
          /言和/g, 
          '<span style="color: #00ffcc">言和</span>'
        );
      }
      
      // 高亮星尘（星字 #9999ff，尘字 #ffff00）
      if (text.includes('星尘')) {
        highlightedText = highlightedText.replace(
          /星尘/g, 
          '<span style="color: #9999ff">星</span><span style="color: #ffff00">尘</span>'
        );
      }
      
      // 如果有变化，使用 DOMPurify 清理后更新 HTML
      if (highlightedText !== text && element) {
        element.innerHTML = DOMPurify.sanitize(highlightedText);
      }
    });
  }, []);

  /**
   * 设置播放器事件监听器
   * @param player APlayer 实例
   * @param globalManager 全局播放器管理器
   */
  const setupPlayerEventListeners = useCallback((
    player: APlayerNS.APlayer, 
    globalManager: GlobalMusicPlayerManager
  ) => {
    // ==================== 播放事件处理 ====================
    
    /**
     * 播放开始事件处理
     * 触发 Live2D 提示，保存播放状态
     */
    const handlePlayStart = async () => {
      // 使用 list.list 获取音频列表（APlayer 的 list 属性）
      // 添加空值检查，防止 player.list 未定义时报错
      if (!player.list || !player.list.list || player.list.index < 0) {
        console.warn('[MusicPlayer] 播放器列表尚未初始化，跳过事件处理');
        return;
      }
      const currentAudio = player.list.list[player.list.index];
      if (currentAudio) {
        // 触发 Live2D 音乐播放事件
        emitMusicEvent('play', {
          title: currentAudio.name || '',
          artist: currentAudio.artist || ''
        });
        
        // 添加到播放历史
        globalManager.addToHistory({
          id: currentAudio.name || '',
          name: currentAudio.name || '',
          artist: currentAudio.artist || '',
          playedAt: Date.now()
        });
      }
      // 保存播放状态
      globalManager.savePlayState();
    };

    /**
     * 暂停事件处理
     * 触发 Live2D 暂停提示，保存播放状态
     */
    const handlePause = () => {
      emitMusicEvent('pause');
      globalManager.savePlayState();
    };

    /**
     * 通用播放器事件处理
     * 用于保存播放状态
     */
    const handlePlayerEvent = () => {
      globalManager.savePlayState();
    };

    /**
     * 播放进度更新事件处理
     * 使用节流控制 savePlayState 调用频率，避免高频 localStorage 写入
     */
    let lastSaveTime = 0;
    const SAVE_THROTTLE_MS = 5000; // 每5秒最多保存一次状态
    
    const handleTimeUpdate = () => {
      const now = Date.now();
      if (now - lastSaveTime >= SAVE_THROTTLE_MS) {
        globalManager.savePlayState();
        lastSaveTime = now;
      }
    };

    /**
     * 列表切换事件处理
     * 重新应用歌手名称高亮
     */
    const handleListSwitch = () => {
      globalManager.savePlayState();
      // 延迟执行高亮，确保 DOM 已更新
      setTimeout(highlightArtistNames, 100);
    };

    /**
     * 播放结束事件处理
     * 用于处理单曲循环、列表循环和随机播放模式
     */
    const handleEnded = () => {
      // 使用 ref 获取最新的播放模式，避免闭包问题
      const currentMode = playModeRef.current;
      
      console.log('[MusicPlayer] 歌曲播放结束，当前模式:', currentMode);
      
      // 单曲循环模式下，重新播放当前歌曲
      if (currentMode === 'single') {
        console.log('[MusicPlayer] 单曲循环：重新播放当前歌曲');
        player.seek(0);
        player.play();
      } 
      // 随机播放模式下，APlayer 会自动选择下一首随机歌曲
      else if (currentMode === 'random') {
        console.log('[MusicPlayer] 随机播放模式：等待 APlayer 自动选择下一首');
        // 验证 APlayer 的随机列表是否已正确初始化
        if (player.list && player.list.list) {
          // APlayer 应该自动处理，但如果没有自动切换，手动触发
          setTimeout(() => {
            if (player.paused) {
              console.log('[MusicPlayer] 随机模式未自动播放，手动切换到下一首');
              const nextIndex = (player.list.index + 1) % player.list.list.length;
              player.list.switch(nextIndex);
              // 确保切换后自动播放
              setTimeout(() => {
                if (player.paused) {
                  player.play();
                }
              }, 300);
            }
          }, 500);
        }
      }
      // 列表循环模式下，手动切换到下一首
      else if (currentMode === 'list') {
        console.log('[MusicPlayer] 列表循环模式：切换到下一首');
        if (player.list && player.list.list && player.list.list.length > 0) {
          const currentIndex = player.list.index;
          const nextIndex = (currentIndex + 1) % player.list.list.length;
          console.log(`[MusicPlayer] 从索引 ${currentIndex} 切换到 ${nextIndex}`);
          player.list.switch(nextIndex);
          // 确保切换后自动播放
          setTimeout(() => {
            if (player.paused) {
              player.play();
            }
          }, 300);
        }
      }
    };

    /**
     * 音频加载错误事件处理
     * 当音频文件加载失败时显示错误提示并尝试切换到下一首
     */
    const handleError = () => {
      // 获取当前播放的歌曲
      if (!player.list || !player.list.list || player.list.index < 0) {
        return;
      }
      
      const currentAudio = player.list.list[player.list.index];
      
      // 本地音乐出现错误，可能是文件不存在或路径错误
      console.error(`[MusicPlayer] 音乐加载失败: ${currentAudio.name}`, currentAudio.url);
      player.notice(`歌曲 "${currentAudio.name}" 加载失败，正在尝试下一首...`);
      
      // 切换到下一首
      setTimeout(() => {
        if (player.list && player.list.list && player.list.list.length > 0) {
          const nextIndex = (player.list.index + 1) % player.list.list.length;
          player.list.switch(nextIndex);
        }
      }, 1500);
    };

    // 注册 APlayer 事件监听器
    player.on('play', handlePlayStart);
    player.on('pause', handlePause);
    player.on('timeupdate', handleTimeUpdate);
    player.on('volumechange', handlePlayerEvent);
    player.on('listswitch', handleListSwitch);
    player.on('ended', handleEnded);
    player.on('error', handleError);

    // 返回真正的事件清理函数，防止页面切换后事件监听器重复绑定
    return () => {
      player.off('play', handlePlayStart);
      player.off('pause', handlePause);
      player.off('timeupdate', handleTimeUpdate);
      player.off('volumechange', handlePlayerEvent);
      player.off('listswitch', handleListSwitch);
      player.off('ended', handleEnded);
      player.off('error', handleError);
    };
  }, [highlightArtistNames]);

  /**
   * 初始化 APlayer 播放器
   * 动态加载 APlayer 资源并创建播放器实例
   */
  useEffect(() => {
    // 确保在客户端环境且音频列表已加载
    if (!isClient || audioList.length === 0 || isInitialized) return;
    
    const globalManager = GlobalMusicPlayerManager.getInstance();
    
    /**
     * 使用现有的播放器实例
     * 将播放器 DOM 移动到当前组件容器
     */
    const useExistingPlayer = () => {
      if (globalManager.isPlayerInitialized()) {
        const player = globalManager.getPlayer();
        
        if (player && aplayerRef.current && player.container !== aplayerRef.current) {
          // 清空当前容器
          while (aplayerRef.current.firstChild) {
            aplayerRef.current.removeChild(aplayerRef.current.firstChild);
          }
          
          // 将播放器 DOM 移动到新容器
          while (player.container.firstChild) {
            aplayerRef.current.appendChild(player.container.firstChild);
          }
          
          // 更新播放器的容器引用
          player.container = aplayerRef.current;
        }
        
        // 重新设置事件监听器（页面切换后需要重新绑定）
        if (player) {
          setupPlayerEventListeners(player, globalManager);
        }
        
        setIsInitialized(true);
        playerInstanceRef.current = player;
        
        // 加载完成，隐藏加载状态提示
        setIsLoading(false);
      }
    };

    /**
     * 创建新的播放器实例
     */
    const initializePlayer = () => {
      if (typeof window === 'undefined' || !(window as any).APlayer || !aplayerRef.current) {
        return;
      }
      
      const APlayer = (window as any).APlayer;
      
      // 获取保存的播放状态
      const savedPlayInfo = globalManager.restorePlayState();
      const { 
        index: initialIndex = 0, 
        currentTime: initialTime = 0, 
        paused: initialPaused = true,
        volume: initialVolume = 0.7,
        muted: initialMuted = false
      } = savedPlayInfo || {};
      
      // 恢复播放模式
      const restoredMode = restorePlayMode();
      setPlayMode(restoredMode);
      
      // 创建 APlayer 实例
      const ap = new APlayer({
        container: aplayerRef.current,
        audio: audioList, // 音频列表已由 musicConfigManager 处理路径
        fixed: true, // 吸底模式
        autoplay: autoPlay,
        // loop 属性控制单曲循环，列表循环由 APlayer 内部处理
        // 单曲循环时设为 true，其他模式设为 false
        loop: restoredMode === 'single',
        preload: 'metadata',
        volume: initialVolume,
        mutex: true, // 阻止其他播放器同时播放
        lrcType: 2, // 启用歌词显示，使用歌词文件路径（lrc 字段是 URL）
        listFolded: true, // 折叠列表
        listMaxHeight: 400, // 列表最大高度
        storageName: 'musicPlayer', // 本地存储名称
        theme: '#1DA1F2', // 主题色
        order: PLAY_MODE_TO_ORDER[restoredMode], // 播放顺序
      });

      // 保存播放器实例引用
      playerInstanceRef.current = ap;

      // 恢复播放状态
      if (initialIndex > 0 && initialIndex < audioList.length) {
        ap.list.switch(initialIndex);
      }
      if (initialTime > 0) {
        ap.seek(initialTime);
      }
      if (initialMuted && ap.audio) {
        ap.audio.muted = true;
      }
      if (!initialPaused) {
        ap.play();
      }

      // 设置事件监听器并获取清理函数
      const cleanupEventListeners = setupPlayerEventListeners(ap, globalManager);

      // 页面卸载前保存状态
      const saveStateBeforeUnload = () => {
        globalManager.savePlayState();
      };
      window.addEventListener('beforeunload', saveStateBeforeUnload);

      // 页面可见性变化监听
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          globalManager.savePlayState();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // 设置播放器实例到全局管理器
      // 使用 initPlayer 而不是 setPlayer，确保 isInitialized 被正确设置
      globalManager.initPlayer(ap);
      (window as any).globalAPlayer = ap;

      // 应用歌手名称高亮
      setTimeout(highlightArtistNames, 200);

      // 重写列表显示方法，确保高亮效果
      const originalListShow = ap.list.show;
      ap.list.show = function() {
        originalListShow.call(this);
        setTimeout(highlightArtistNames, 100);
      };

      // 默认隐藏歌词
      setTimeout(() => {
        if (ap.lrc) {
          ap.lrc.hide();
          const lrcElement = document.querySelector('.aplayer-lrc');
          if (lrcElement) {
            lrcElement.classList.add('aplayer-lrc-hide');
            lrcElement.classList.remove('aplayer-lrc-show');
          }
        }
      }, 100);

      setIsInitialized(true);

      // 加载完成，隐藏加载状态提示
      setIsLoading(false);

      // 保存清理函数引用
      cleanupRef.current = () => {
        window.removeEventListener('beforeunload', saveStateBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        cleanupEventListeners();
      };
    };

    /**
     * 动态加载 APlayer 资源并初始化
     */
    const initAPlayer = async () => {
      if (typeof window === 'undefined' || !aplayerRef.current) return;
      
      try {
        // 检查是否已有全局播放器实例
        if (globalManager.isPlayerInitialized()) {
          useExistingPlayer();
          return;
        }
        
        // 检查 APlayer 是否已加载
        if (!(window as any).APlayer) {
          const cssUrl = getAssetPath('/aplayer/APlayer.min.css');
          const jsUrl = getAssetPath('/aplayer/APlayer.min.js');
          
          // 辅助函数：检查样式表是否已加载，避免重复注入
          const isStyleLoaded = (href: string) => !!document.querySelector(`link[href="${href}"]`);
          // 辅助函数：检查脚本是否已加载，避免重复注入
          const isScriptLoaded = (src: string) => !!document.querySelector(`script[src="${src}"]`);
          
          // 动态加载 APlayer 样式（去重检查）
          if (!isStyleLoaded(cssUrl)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = cssUrl;
            document.head.appendChild(link);
          }

          // 动态加载 APlayer 脚本（去重检查）
          if (!isScriptLoaded(jsUrl)) {
            const script = document.createElement('script');
            script.src = jsUrl;
            
            script.onload = () => {
              initializePlayer();
            };
            
            script.onerror = () => {
              console.error('[MusicPlayer] 加载 APlayer 脚本失败');
              setConfigLoadError(true);
              setIsLoading(false); // 加载失败，隐藏加载状态
            };
            
            document.head.appendChild(script);
          } else {
            // 脚本已加载但 APlayer 全局对象可能还在初始化中，延迟执行
            setTimeout(() => {
              initializePlayer();
            }, 100);
          }
        } else {
          initializePlayer();
        }
      } catch (error) {
        console.error('[MusicPlayer] 初始化 APlayer 失败:', error);
        setConfigLoadError(true);
        setIsLoading(false); // 初始化失败，隐藏加载状态
      }
    };

    initAPlayer();
    
    // 清理函数
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [
    isClient, 
    audioList, 
    isInitialized, 
    autoPlay, 
    loop, 
    restorePlayMode, 
    setupPlayerEventListeners, 
    highlightArtistNames
  ]);

  // ==================== SubTask 8.2: 重试加载播放器 ====================
  
  /**
   * 重试加载播放器
   * 当加载失败时，用户可以点击重试按钮重新加载
   */
  const handleRetry = useCallback(() => {
    // 重置状态
    setConfigLoadError(false);
    setIsLoading(true);
    setIsInitialized(false);
    // 由于 useEffect 依赖 isInitialized，重置后会重新触发初始化
  }, []);

  // ==================== 渲染 ====================

  return (
    <div className="aplayer-container">
      {/* APlayer 播放器容器 */}
      <div ref={aplayerRef} />
      
      {/* SubTask 8.2: 优化错误提示信息（Toast 样式） */}
      {configLoadError && isClient && (
        <div 
          className="fixed bottom-20 right-4 bg-red-500/95 text-white px-4 py-3 rounded-lg text-sm z-50 flex flex-col gap-2 shadow-lg backdrop-blur-sm max-w-xs"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2">
            {/* 错误图标 */}
            <svg 
              className="h-5 w-5 flex-shrink-0" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <span>音乐播放器加载失败</span>
          </div>
          <div className="text-xs text-white/80">
            请检查网络连接后重试
          </div>
          {/* 重试按钮 */}
          <button
            onClick={handleRetry}
            className="mt-1 w-full bg-white/20 hover:bg-white/30 transition-colors duration-200 px-3 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"
            aria-label="重新加载音乐播放器"
          >
            <svg 
              className="h-3.5 w-3.5" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
              />
            </svg>
            重新加载
          </button>
        </div>
      )}
    </div>
  );
};

// 使用 React.memo 减少不必要的渲染
export default React.memo(MusicPlayerComponent);
