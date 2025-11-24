'use client';

import type { APlayerNS } from '@/types/aplayer';

// 全局音乐播放器管理器
class GlobalMusicPlayerManager {
  private static instance: GlobalMusicPlayerManager;
  private player: APlayerNS.APlayer | null = null;
  private isInitialized = false;
  private initCallbacks: ((player: APlayerNS.APlayer) => void)[] = [];
  private isPageTransitioning = false;
  private listenersSetup = false; // 添加标记，确保监听器只设置一次

  private constructor() {
    // 不在构造函数中设置监听器，而是在initPlayer中设置
  }

  static getInstance(): GlobalMusicPlayerManager {
    if (!GlobalMusicPlayerManager.instance) {
      GlobalMusicPlayerManager.instance = new GlobalMusicPlayerManager();
    }
    return GlobalMusicPlayerManager.instance;
  }

  // 设置页面切换监听器
  private setupPageTransitionListeners() {
    // 确保监听器只设置一次
    if (this.listenersSetup || typeof window === 'undefined') return;
    
    this.listenersSetup = true;
    
    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // 只有在页面真正隐藏（不是路由切换）时才保存状态
        this.savePlayState();
        // 不设置isPageTransitioning，避免影响音频播放
      } else {
        // 页面重新可见时，延迟重置状态
        setTimeout(() => {
          this.isPageTransitioning = false;
        }, 100);
      }
    });

    // 监听页面卸载
    window.addEventListener('beforeunload', () => {
      this.isPageTransitioning = true;
      this.savePlayState();
    });

    // 监听路由变化（Next.js特有）
    try {
      if (typeof window !== 'undefined' && (window as any).next?.router?.events) {
        (window as any).next.router.events.on('routeChangeStart', () => {
          this.isPageTransitioning = true;
          this.savePlayState();
        });
        
        (window as any).next.router.events.on('routeChangeComplete', () => {
          setTimeout(() => {
            this.isPageTransitioning = false;
          }, 100);
        });
      }
    } catch (error) {
      console.warn('Failed to setup Next.js router listeners:', error);
    }
  }

  // 初始化播放器
  initPlayer(player: APlayerNS.APlayer) {
    this.player = player;
    this.isInitialized = true;
    this.setupPageTransitionListeners();
    
    // 通知所有等待初始化的回调
    this.initCallbacks.forEach(callback => callback(player));
    this.initCallbacks = [];
  }

  // 设置播放器实例
  setPlayer(player: APlayerNS.APlayer) {
    this.player = player;
    this.setupPageTransitionListeners();
  }

  // 获取播放器实例
  getPlayer(): any | null {
    return this.player;
  }

  // 检查播放器是否已初始化
  isPlayerInitialized(): boolean {
    return this.isInitialized;
  }

  // 检查是否正在页面切换
  isPageInTransition(): boolean {
    return this.isPageTransitioning;
  }

  // 当播放器初始化后执行回调
  onInit(callback: (player: APlayerNS.APlayer) => void) {
    if (this.isInitialized && this.player) {
      callback(this.player);
    } else {
      this.initCallbacks.push(callback);
    }
  }

  // 保存播放状态到localStorage
  savePlayState() {
    if (this.player && this.player.list && this.player.audio) {
      const playState = {
        index: this.player.list.index,
        currentTime: this.player.audio.currentTime,
        paused: this.player.paused,
        volume: this.player.volume,
        muted: this.player.muted
      };
      localStorage.setItem('musicPlayerState', JSON.stringify(playState));
    }
  }

  // 从localStorage恢复播放状态
  restorePlayState(): any | null {
    if (!this.player) return null;
    
    const savedPlayInfo = localStorage.getItem('musicPlayerState');
    if (!savedPlayInfo) return null;
    
    try {
      const playInfo = JSON.parse(savedPlayInfo);
      
      // 验证数据结构
      if (!playInfo || typeof playInfo !== 'object') {
        return null;
      }
      
      return {
        index: typeof playInfo.index === 'number' ? playInfo.index : 0,
        currentTime: typeof playInfo.currentTime === 'number' ? playInfo.currentTime : 0,
        paused: typeof playInfo.paused === 'boolean' ? playInfo.paused : true,
        volume: typeof playInfo.volume === 'number' ? Math.max(0, Math.min(1, playInfo.volume)) : 0.5,
        muted: typeof playInfo.muted === 'boolean' ? playInfo.muted : false
      };
    } catch (e) {
      console.error('解析保存的播放状态失败:', e);
      return null;
    }
  }

  // 控制歌词显示
  showLyrics() {
    if (this.player && (this.player as any).lrc) {
      (this.player as any).lrc.show();
      // 同时更新CSS类
      const lrcElement = document.querySelector('.aplayer-lrc');
      if (lrcElement) {
        lrcElement.classList.remove('aplayer-lrc-hide');
        lrcElement.classList.add('aplayer-lrc-show');
      }
    }
  }

  // 隐藏歌词
  hideLyrics() {
    if (this.player && (this.player as any).lrc) {
      (this.player as any).lrc.hide();
      // 同时更新CSS类
      const lrcElement = document.querySelector('.aplayer-lrc');
      if (lrcElement) {
        lrcElement.classList.add('aplayer-lrc-hide');
        lrcElement.classList.remove('aplayer-lrc-show');
      }
    }
  }

  // 切换歌词显示状态
  toggleLyrics() {
    if (this.player && (this.player as any).lrc) {
      (this.player as any).lrc.toggle();
      // 同时更新CSS类
      const lrcElement = document.querySelector('.aplayer-lrc');
      if (lrcElement) {
        if (lrcElement.classList.contains('aplayer-lrc-hide')) {
          lrcElement.classList.remove('aplayer-lrc-hide');
          lrcElement.classList.add('aplayer-lrc-show');
        } else {
          lrcElement.classList.add('aplayer-lrc-hide');
          lrcElement.classList.remove('aplayer-lrc-show');
        }
      }
    }
  }

  // 获取歌词当前显示状态
  isLyricsVisible(): boolean {
    if (this.player && (this.player as any).lrc) {
      // APlayer的歌词组件有一个隐藏的样式类来判断是否显示
      const lrcElement = document.querySelector('.aplayer-lrc');
      if (lrcElement) {
        return !lrcElement.classList.contains('aplayer-lrc-hide') && 
               lrcElement.classList.contains('aplayer-lrc-show');
      }
    }
    return false;
  }
}

export default GlobalMusicPlayerManager;