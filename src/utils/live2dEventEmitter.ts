/**
 * Live2D 事件总线
 * 用于在不同组件之间协调Live2D相关的交互事件
 */

export interface Live2DEvent {
  type: string;
  data?: Record<string, unknown> | string | number | boolean | null;
  timestamp: number;
}

export type Live2DEventHandler = (event: Live2DEvent) => void;

class Live2DEventEmitter {
  private handlers: Map<string, Set<Live2DEventHandler>> = new Map();
  private isEnabled = true;

  on(eventType: string, handler: Live2DEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    };
  }

  emit(eventType: string, data?: Record<string, unknown> | string | number | boolean | null): void {
    if (!this.isEnabled) return;

    const event: Live2DEvent = {
      type: eventType,
      data,
      timestamp: Date.now(),
    };

    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.warn(`Live2D事件处理失败: ${eventType}`, error);
        }
      });
    }

    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.warn(`Live2D通配符事件处理失败: ${eventType}`, error);
        }
      });
    }
  }

  once(eventType: string, handler: Live2DEventHandler): () => void {
    const wrappedHandler = (event: Live2DEvent) => {
      handler(event);
      const handlers = this.handlers.get(eventType);
      if (handlers) handlers.delete(wrappedHandler);
    };
    return this.on(eventType, wrappedHandler);
  }

  off(eventType: string, handler?: Live2DEventHandler): void {
    if (handler) {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) this.handlers.delete(eventType);
      }
    } else {
      this.handlers.delete(eventType);
    }
  }

  removeAllListeners(): void {
    this.handlers.clear();
  }

  enable(): void { this.isEnabled = true; }
  disable(): void { this.isEnabled = false; }

  listenerCount(eventType: string): number {
    return this.handlers.get(eventType)?.size ?? 0;
  }
}

export const live2dEventEmitter = new Live2DEventEmitter();
export default live2dEventEmitter;

export const Live2DEvents = {
  THEME_CHANGE: 'theme-change',
  MUSIC_PLAY: 'music-play',
  MUSIC_PAUSE: 'music-pause',
  PAGE_LOAD: 'page-load',
  PAGE_CHANGE: 'page-change',
  PAGE_SCROLL: 'page-scroll',
  LIVE2D_INIT: 'live2d-init',
  LIVE2D_READY: 'live2d-ready',
  LIVE2D_ERROR: 'live2d-error',
  LIVE2D_MESSAGE: 'live2d-message',
  CUSTOM_MESSAGE: 'custom-message',
  CLICK: 'click',
  INFO: 'info',
  ALL: '*',
} as const;

export type Live2DEventType = typeof Live2DEvents[keyof typeof Live2DEvents];

export const emitLive2DEvent = (eventType: string, data?: Record<string, unknown> | string | number | boolean | null): void => {
  live2dEventEmitter.emit(eventType, data);
};

export const emitThemeChangeEvent = (newTheme: string, previousTheme: string): void => {
  emitLive2DEvent(Live2DEvents.THEME_CHANGE, { newTheme, previousTheme, isDark: newTheme === 'dark', isLight: newTheme === 'light', timestamp: Date.now() });
};

export const emitMusicEvent = (action: 'play' | 'pause', songInfo?: { title: string; artist: string }): void => {
  emitLive2DEvent(`music-${action}`, { ...songInfo, timestamp: Date.now() });
};

export const emitLive2DStatusEvent = (status: 'init' | 'ready' | 'error', data?: Record<string, unknown>): void => {
  const eventMap = { init: Live2DEvents.LIVE2D_INIT, ready: Live2DEvents.LIVE2D_READY, error: Live2DEvents.LIVE2D_ERROR };
  emitLive2DEvent(eventMap[status], { ...data, timestamp: Date.now() });
};

export const emitLive2DMessageEvent = (message: string, type = 'normal', priority = 1): void => {
  emitLive2DEvent(Live2DEvents.LIVE2D_MESSAGE, { message, type, priority, timestamp: Date.now() });
};

export const emitPageEvent = (action: 'load' | 'change' | 'scroll', data?: Record<string, unknown>): void => {
  const eventMap = { load: Live2DEvents.PAGE_LOAD, change: Live2DEvents.PAGE_CHANGE, scroll: Live2DEvents.PAGE_SCROLL };
  emitLive2DEvent(eventMap[action], { ...data, timestamp: Date.now() });
};
