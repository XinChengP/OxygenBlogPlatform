// APlayer库的类型定义
// 此文件为APlayer提供基本的TypeScript类型支持

declare namespace APlayerNS {
  interface APlayerOptions {
    container?: HTMLElement | string;
    audio?: APlayerAudio | APlayerAudio[];
    fixed?: boolean;
    autoplay?: boolean;
    loop?: boolean;
    order?: 'list' | 'random';
    preload?: 'none' | 'metadata' | 'auto';
    volume?: number;
    mutex?: boolean;
    lrcType?: 0 | 1 | 2 | 3;
    listFolded?: boolean;
    listMaxHeight?: string | number;
    storageName?: string;
    audio?: APlayerAudio[];
  }

  interface APlayerAudio {
    name: string;
    artist: string;
    url: string;
    cover?: string;
    lrc?: string;
    type?: 'auto' | 'hls' | 'normal';
  }

  interface APlayerAudioList {
    switch: (index: number) => void;
    add: (audio: APlayerAudio, index?: number) => void;
    remove: (index: number) => void;
    show: () => void;
    hide: () => void;
    toggle: () => void;
    index: number;
    current: APlayerAudio | null;
    list: APlayerAudio[];
    theme: string;
  }

  interface APlayerEvents {
    // 播放控制事件
    on(event: 'play', handler: () => void): this;
    on(event: 'pause', handler: () => void): this;
    on(event: 'timeupdate', handler: () => void): this;
    on(event: 'loadedmetadata', handler: () => void): this;
    on(event: 'durationchange', handler: () => void): this;
    
    // 列表事件
    on(event: 'listswitch', handler: () => void): this;
    
    // 音量事件
    on(event: 'volumechange', handler: () => void): this;
    
    // 移除监听器
    off(event: string, handler: () => void): this;
  }

  interface APlayer {
    // 基本属性
    container: HTMLElement;
    audio: HTMLAudioElement;
    options: APlayerOptions;
    
    // 播放器控制
    play(): void;
    pause(): void;
    toggle(): void;
    seek(position: number): void;
    
    // 状态属性
    readonly paused: boolean;
    readonly duration: number;
    readonly loading: boolean;
    readonly currentTime: number;
    readonly volume: number;
    readonly muted: boolean;
    
    // 列表管理
    list: APlayerAudioList;
    
    // 初始化方法
    init(): this;
    
    // 销毁播放器
    destroy(): void;
    
    // 事件处理
    on(event: string, handler: () => void): this;
    off(event: string, handler: () => void): this;
    once(event: string, handler: () => void): this;
    trigger(event: string): this;
  }
}

// 全局APlayer和Next.js类型
declare global {
  interface Window {
    APlayer: {
      new (options: APlayerNS.APlayerOptions): APlayerNS.APlayer;
    };
    globalAPlayer?: APlayerNS.APlayer;
    next?: {
      router?: {
        events?: {
          on: (event: string, handler: () => void) => void;
          off: (event: string, handler: () => void) => void;
        };
      };
    };
  }
}

// 导出类型定义
export { APlayerNS }; 