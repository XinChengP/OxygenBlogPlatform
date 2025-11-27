/**
 * Live2D 事件总线 - 增强版
 * 用于在不同组件之间协调Live2D相关的交互事件
 * 支持事件历史记录、性能监控、错误处理等高级功能
 */

export interface Live2DEvent {
  type: 'theme-change' | 'music-play' | 'music-pause' | 'page-navigate' | 'custom-message' | 'live2d-init' | 'live2d-ready' | 'live2d-error' | 'live2d-message';
  data?: any;
  timestamp: number;
  id?: string;
  source?: string;
}

export type Live2DEventHandler = (event: Live2DEvent) => void;

// 事件统计信息
interface EventStats {
  totalEmitted: number;
  totalHandled: number;
  errorCount: number;
  averageHandleTime: number;
  lastEmitted: number;
}

// 事件历史记录
interface EventHistory {
  event: Live2DEvent;
  handlerCount: number;
  handleTime: number;
  success: boolean;
}

class Live2DEventEmitter {
  private handlers: Map<string, Set<Live2DEventHandler>> = new Map();
  private isEnabled: boolean = true;
  private eventStats: Map<string, EventStats> = new Map();
  private eventHistory: EventHistory[] = [];
  private maxHistorySize: number = 100;
  private performanceMonitoring: boolean = true;

  /**
   * 订阅事件
   */
  on(eventType: string, handler: Live2DEventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
      this.eventStats.set(eventType, {
        totalEmitted: 0,
        totalHandled: 0,
        errorCount: 0,
        averageHandleTime: 0,
        lastEmitted: 0
      });
    }
    
    this.handlers.get(eventType)!.add(handler);
    
    // 返回取消订阅函数
    return () => {
      const handlers = this.handlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.handlers.delete(eventType);
          this.eventStats.delete(eventType);
        }
      }
    };
  }

  /**
   * 发布事件（增强版，带性能监控）
   */
  emit(eventType: string, data?: any): void {
    if (!this.isEnabled) return;
    
    const startTime = this.performanceMonitoring ? performance.now() : 0;
    
    const event: Live2DEvent = {
      type: eventType as Live2DEvent['type'],
      data,
      timestamp: Date.now(),
      id: this.generateEventId(),
      source: 'Live2DEventEmitter'
    };

    console.log(`[Live2DEventEmitter] 发布事件: ${eventType}`, data);

    // 更新事件统计
    this.updateEventStats(eventType, 'emitted');

    let handlerCount = 0;
    let successCount = 0;

    // 触发普通监听器
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      handlerCount = handlers.size;
      handlers.forEach(handler => {
        try {
          handler(event);
          successCount++;
          this.updateEventStats(eventType, 'handled');
        } catch (error) {
          console.warn(`Live2D事件处理失败: ${eventType}`, error);
          this.updateEventStats(eventType, 'error');
        }
      });
    }

    // 同时触发通配符监听器
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      const wildcardCount = wildcardHandlers.size;
      handlerCount += wildcardCount;
      
      wildcardHandlers.forEach(handler => {
        try {
          handler(event);
          successCount++;
        } catch (error) {
          console.warn(`Live2D通配符事件处理失败: ${eventType}`, error);
        }
      });
    }

    // 记录事件历史
    const handleTime = this.performanceMonitoring ? performance.now() - startTime : 0;
    this.recordEventHistory({
      event,
      handlerCount,
      handleTime,
      success: successCount > 0
    });

    if (handlerCount === 0) {
      console.log(`[Live2DEventEmitter] 未找到事件处理器: ${eventType}`);
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
          this.eventStats.delete(eventType);
        }
      }
    } else {
      // 移除该事件类型的所有监听器
      this.handlers.delete(eventType);
      this.eventStats.delete(eventType);
    }
  }

  /**
   * 清除所有事件监听器
   */
  removeAllListeners(): void {
    this.handlers.clear();
    this.eventStats.clear();
    this.eventHistory = [];
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

  /**
   * 获取事件统计信息
   */
  getEventStats(): Record<string, EventStats> {
    const stats: Record<string, EventStats> = {};
    
    this.eventStats.forEach((stat, eventType) => {
      stats[eventType] = { ...stat };
    });
    
    return stats;
  }

  /**
   * 获取事件历史记录
   */
  getEventHistory(): EventHistory[] {
    return [...this.eventHistory];
  }

  /**
   * 清除事件历史记录
   */
  clearEventHistory(): void {
    this.eventHistory = [];
  }

  /**
   * 启用/禁用性能监控
   */
  setPerformanceMonitoring(enabled: boolean): void {
    this.performanceMonitoring = enabled;
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    totalEvents: number;
    totalHandlers: number;
    averageHandleTime: number;
    errorRate: number;
    topEvents: Array<{event: string, count: number}>;
  } {
    const stats = this.getEventStats();
    const eventTypes = Object.keys(stats);
    
    let totalEvents = 0;
    let totalHandlers = 0;
    let totalHandleTime = 0;
    let totalErrors = 0;
    
    const eventCounts: Record<string, number> = {};
    
    eventTypes.forEach(eventType => {
      const stat = stats[eventType];
      totalEvents += stat.totalEmitted;
      totalHandlers += this.listenerCount(eventType);
      totalHandleTime += stat.averageHandleTime * stat.totalHandled;
      totalErrors += stat.errorCount;
      
      eventCounts[eventType] = stat.totalEmitted;
    });
    
    const topEvents = Object.entries(eventCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([event, count]) => ({ event, count }));
    
    return {
      totalEvents,
      totalHandlers,
      averageHandleTime: totalHandlers > 0 ? totalHandleTime / totalHandlers : 0,
      errorRate: totalEvents > 0 ? (totalErrors / totalEvents) * 100 : 0,
      topEvents
    };
  }

  /**
   * 更新事件统计
   */
  private updateEventStats(eventType: string, action: 'emitted' | 'handled' | 'error'): void {
    const stats = this.eventStats.get(eventType);
    if (!stats) return;

    switch (action) {
      case 'emitted':
        stats.totalEmitted++;
        stats.lastEmitted = Date.now();
        break;
      case 'handled':
        stats.totalHandled++;
        break;
      case 'error':
        stats.errorCount++;
        break;
    }
  }

  /**
   * 记录事件历史
   */
  private recordEventHistory(history: EventHistory): void {
    this.eventHistory.push(history);
    
    // 限制历史记录数量
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * 生成事件ID
   */
  private generateEventId(): string {
    return `live2d-event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 导出事件数据（用于调试和分析）
   */
  exportEventData(): {
    stats: Record<string, EventStats>;
    history: EventHistory[];
    performance: ReturnType<Live2DEventEmitter['getPerformanceReport']>;
    timestamp: number;
  } {
    return {
      stats: this.getEventStats(),
      history: this.getEventHistory(),
      performance: this.getPerformanceReport(),
      timestamp: Date.now()
    };
  }

  /**
   * 导入事件数据（用于恢复状态）
   */
  importEventData(data: ReturnType<Live2DEventEmitter['exportEventData']>): void {
    if (data.stats) {
      this.eventStats.clear();
      Object.entries(data.stats).forEach(([eventType, stats]) => {
        this.eventStats.set(eventType, { ...stats });
      });
    }
    
    if (data.history) {
      this.eventHistory = [...data.history];
    }
  }
}

// 创建全局单例实例
export const live2dEventEmitter = new Live2DEventEmitter();

// 为了向后兼容，也导出默认实例
export default live2dEventEmitter;

/**
 * 预定义的事件类型常量
 */
export const Live2DEvents = {
  // 主题相关事件
  THEME_CHANGE: 'theme-change',
  THEME_LOAD: 'theme-load',
  
  // 音乐相关事件
  MUSIC_PLAY: 'music-play',
  MUSIC_PAUSE: 'music-pause',
  MUSIC_CHANGE: 'music-change',
  MUSIC_END: 'music-end',
  
  // 页面相关事件
  PAGE_LOAD: 'page-load',
  PAGE_CHANGE: 'page-change',
  PAGE_SCROLL: 'page-scroll',
  
  // Live2D状态事件
  LIVE2D_INIT: 'live2d-init',
  LIVE2D_READY: 'live2d-ready',
  LIVE2D_ERROR: 'live2d-error',
  LIVE2D_MESSAGE: 'live2d-message',
  
  // 交互事件
  MOUSE_ENTER: 'mouse-enter',
  MOUSE_LEAVE: 'mouse-leave',
  CLICK: 'click',
  COPY: 'copy',
  
  // 系统事件
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
  
  // 通配符事件（监听所有事件）
  ALL: '*'
} as const;

// 事件类型定义
export type Live2DEventType = typeof Live2DEvents[keyof typeof Live2DEvents];

/**
 * 便捷的事件发送函数（增强版）
 */
export const emitLive2DEvent = (eventType: string, data?: any): void => {
  live2dEventEmitter.emit(eventType, data);
};

/**
 * 主题切换事件助手
 */
export const emitThemeChangeEvent = (newTheme: string, previousTheme: string): void => {
  emitLive2DEvent(Live2DEvents.THEME_CHANGE, {
    newTheme,
    previousTheme,
    isDark: newTheme === 'dark',
    isLight: newTheme === 'light',
    timestamp: Date.now()
  });
};

/**
 * 音乐播放事件助手
 */
export const emitMusicEvent = (action: 'play' | 'pause' | 'change' | 'end', songInfo?: { 
  title: string; 
  artist: string; 
  duration?: number; 
  currentTime?: number;
}): void => {
  emitLive2DEvent(`music-${action}`, {
    ...songInfo,
    timestamp: Date.now()
  });
};

/**
 * Live2D状态事件助手
 */
export const emitLive2DStatusEvent = (status: 'init' | 'ready' | 'error', data?: any): void => {
  const eventMap = {
    init: Live2DEvents.LIVE2D_INIT,
    ready: Live2DEvents.LIVE2D_READY,
    error: Live2DEvents.LIVE2D_ERROR
  };
  
  emitLive2DEvent(eventMap[status], {
    ...data,
    timestamp: Date.now()
  });
};

/**
 * Live2D消息事件助手
 */
export const emitLive2DMessageEvent = (message: string, type: string = 'normal', priority: number = 1): void => {
  emitLive2DEvent(Live2DEvents.LIVE2D_MESSAGE, {
    message,
    type,
    priority,
    timestamp: Date.now()
  });
};

/**
 * 页面事件助手
 */
export const emitPageEvent = (action: 'load' | 'change' | 'scroll', data?: any): void => {
  const eventMap = {
    load: Live2DEvents.PAGE_LOAD,
    change: Live2DEvents.PAGE_CHANGE,
    scroll: Live2DEvents.PAGE_SCROLL
  };
  
  emitLive2DEvent(eventMap[action], {
    ...data,
    timestamp: Date.now()
  });
};