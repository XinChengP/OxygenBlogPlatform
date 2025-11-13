'use client';

// 全局音乐播放器管理器
class GlobalMusicPlayerManager {
  private static instance: GlobalMusicPlayerManager;
  private player: any = null;
  private isInitialized = false;
  private initCallbacks: ((player: any) => void)[] = [];
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
        this.isPageTransitioning = true;
        this.savePlayState();
      } else {
        // 延迟重置状态，确保页面完全加载
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
  initPlayer(player: any) {
    this.player = player;
    this.isInitialized = true;
    this.setupPageTransitionListeners();
    
    // 通知所有等待初始化的回调
    this.initCallbacks.forEach(callback => callback(player));
    this.initCallbacks = [];
  }

  // 设置播放器实例
  setPlayer(player: any) {
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
  onInit(callback: (player: any) => void) {
    if (this.isInitialized && this.player) {
      callback(this.player);
    } else {
      this.initCallbacks.push(callback);
    }
  }

  // 保存播放状态到localStorage
  savePlayState() {
    if (this.player) {
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
  restorePlayState() {
    if (!this.player) return null;
    
    const savedPlayInfo = localStorage.getItem('musicPlayerState');
    if (!savedPlayInfo) return null;
    
    try {
      const playInfo = JSON.parse(savedPlayInfo);
      return {
        index: playInfo.index || 0,
        currentTime: playInfo.currentTime || 0,
        paused: playInfo.paused !== false
      };
    } catch (e) {
      console.error('解析保存的播放状态失败:', e);
      return null;
    }
  }
}

export default GlobalMusicPlayerManager;