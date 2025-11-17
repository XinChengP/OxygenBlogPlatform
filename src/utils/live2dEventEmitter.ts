/**
 * Live2D 事件总线
 * 用于在不同组件之间协调Live2D相关的交互事件
 */

export interface Live2DEvent {
  type: 'theme-change' | 'music-play' | 'music-pause' | 'page-navigate' | 'custom-message';
  data?: any;
  timestamp: number;
}

export type Live2DEventHandler = (event: Live2DEvent) => void;

class Live2DEventEmitter {
  private handlers: Map<string, Set<Live2DEventHandler>> = new Map();
  private isEnabled: boolean = true;

  /**
   * 订阅事件
   */
  on(eventType: string, handler: Live2DEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    
    this.handlers.get(eventType)!.add(handler);
    
    // 返回取消订阅函数
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

  /**
   * 发布事件
   */
  emit(eventType: string, data?: any): void {
    if (!this.isEnabled) return;
    
    const event: Live2DEvent = {
      type: eventType as Live2DEvent['type'],
      data,
      timestamp: Date.now()
    };

    console.log(`[Live2DEventEmitter] 发布事件: ${eventType}`, data);

    const handlers = this.handlers.get(eventType);
    if (handlers) {
      console.log(`[Live2DEventEmitter] 找到 ${handlers.size} 个处理器`);
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.warn(`Live2D事件处理失败: ${eventType}`, error);
        }
      });
    } else {
      console.log(`[Live2DEventEmitter] 未找到事件处理器: ${eventType}`);
    }

    // 同时触发通配符监听器
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

  /**
   * 一次性事件监听
   */
  once(eventType: string, handler: Live2DEventHandler): () => void {
    const wrappedHandler = (event: Live2DEvent) => {
      handler(event);
      // 执行后自动取消订阅
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(wrappedHandler);
      }
    };
    
    return this.on(eventType, wrappedHandler);
  }

  /**
   * 移除事件监听器
   */
  off(eventType: string, handler?: Live2DEventHandler): void {
    if (handler) {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
        }
      }
    } else {
      // 移除该事件类型的所有监听器
      this.handlers.delete(eventType);
    }
  }

  /**
   * 清除所有事件监听器
   */
  removeAllListeners(): void {
    this.handlers.clear();
  }

  /**
   * 启用事件系统
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * 禁用事件系统
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * 获取事件监听器数量
   */
  listenerCount(eventType: string): number {
    const handlers = this.handlers.get(eventType);
    return handlers ? handlers.size : 0;
  }

  /**
   * 获取所有事件类型
   */
  eventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}

// 创建全局单例实例
export const live2dEventEmitter = new Live2DEventEmitter();

// 为了向后兼容，也导出默认实例
export default live2dEventEmitter;

/**
 * 便捷的事件发送函数
 */
export const emitLive2DEvent = (eventType: string, data?: any): void => {
  live2dEventEmitter.emit(eventType, data);
};

/**
 * 主题切换事件助手
 */
export const emitThemeChangeEvent = (newTheme: string, previousTheme: string): void => {
  emitLive2DEvent('theme-change', {
    newTheme,
    previousTheme,
    isDark: newTheme === 'dark',
    isLight: newTheme === 'light'
  });
};

/**
 * 音乐播放事件助手
 */
export const emitMusicEvent = (action: 'play' | 'pause', songInfo?: { title: string; artist: string }): void => {
  emitLive2DEvent(`music-${action}`, songInfo);
};