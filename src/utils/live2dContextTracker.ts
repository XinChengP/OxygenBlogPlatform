/**
 * Live2D 上下文追踪器
 * 用于追踪用户行为并提供上下文信息，支持智能消息选择
 */

export interface BehaviorContext {
  // 时间上下文
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  isLateNight: boolean; // 0-5点
  
  // 页面上下文
  currentPage: string;
  pageVisitCount: number;
  timeOnPage: number; // 秒
  
  // 行为上下文
  scrollSpeed: 'slow' | 'normal' | 'fast';
  isInactive: boolean; // 3分钟无操作
  lastActivityTime: number;
  
  // 访问历史
  recentPages: string[];
  returnVisits: number; // 10秒内返回次数
}

type ContextChangeHandler = (context: BehaviorContext) => void;

export class Live2DContextTracker {
  private context: BehaviorContext;
  private handlers: Set<ContextChangeHandler> = new Set();
  private inactiveTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollBuffer: number[] = [];
  private lastScrollTime: number = 0;
  private pageStartTime: number = Date.now();
  private recentPageChanges: number[] = [];
  private updateTimer: ReturnType<typeof setInterval> | null = null;
  
  constructor() {
    this.context = this.getInitialContext();
    this.setupEventListeners();
    this.startTimers();
  }
  
  private getInitialContext(): BehaviorContext {
    return {
      timeOfDay: this.getTimeOfDay(),
      isLateNight: this.isLateNight(),
      currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
      pageVisitCount: 1,
      timeOnPage: 0,
      scrollSpeed: 'normal',
      isInactive: false,
      lastActivityTime: Date.now(),
      recentPages: [],
      returnVisits: 0
    };
  }
  
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }
  
  private isLateNight(): boolean {
    const hour = new Date().getHours();
    return hour >= 0 && hour < 6;
  }
  
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;
    
    // 监听用户活动
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, () => this.onActivity(), { passive: true });
    });
    
    // 监听滚动速度
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
    
    // 监听页面切换
    window.addEventListener('popstate', () => this.onPageChange());
    
    // 监听路由变化（Next.js）
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.onPageChange();
    };
  }
  
  private startTimers(): void {
    // 每分钟更新页面停留时间
    this.updateTimer = setInterval(() => {
      this.context.timeOnPage = Math.floor((Date.now() - this.pageStartTime) / 1000);
      this.notifyHandlers();
    }, 60000);
    
    // 每小时更新时间上下文
    setInterval(() => {
      this.context.timeOfDay = this.getTimeOfDay();
      this.context.isLateNight = this.isLateNight();
      this.notifyHandlers();
    }, 3600000);
  }
  
  private onActivity(): void {
    this.context.lastActivityTime = Date.now();
    this.context.isInactive = false;
    
    if (this.inactiveTimer) {
      clearTimeout(this.inactiveTimer);
    }
    
    // 3分钟无操作触发
    this.inactiveTimer = setTimeout(() => {
      this.context.isInactive = true;
      this.notifyHandlers();
    }, 180000); // 3分钟
  }
  
  private onScroll(): void {
    const now = Date.now();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // 记录滚动位置和时间
    this.scrollBuffer.push(scrollTop);
    this.lastScrollTime = now;
    
    // 只保留最近1秒的滚动数据
    this.scrollBuffer = this.scrollBuffer.filter((_, i) => {
      const timeDiff = now - (this.lastScrollTime - (this.scrollBuffer.length - i) * 16);
      return timeDiff < 1000;
    });
    
    // 计算滚动速度
    if (this.scrollBuffer.length >= 2) {
      const first = this.scrollBuffer[0];
      const last = this.scrollBuffer[this.scrollBuffer.length - 1];
      const distance = Math.abs(last - first);
      
      if (distance > 500) {
        this.context.scrollSpeed = 'fast';
      } else if (distance > 100) {
        this.context.scrollSpeed = 'normal';
      } else {
        this.context.scrollSpeed = 'slow';
      }
      
      this.notifyHandlers();
    }
  }
  
  private onPageChange(): void {
    const currentPath = window.location.pathname;
    
    // 记录最近访问的页面
    this.context.recentPages.unshift(this.context.currentPage);
    if (this.context.recentPages.length > 5) {
      this.context.recentPages.pop();
    }
    
    // 检测是否是返回访问（10秒内）
    const now = Date.now();
    this.recentPageChanges.push(now);
    this.recentPageChanges = this.recentPageChanges.filter(t => now - t < 10000);
    this.context.returnVisits = this.recentPageChanges.length - 1;
    
    // 更新当前页面
    this.context.currentPage = currentPath;
    this.context.pageVisitCount++;
    this.context.timeOnPage = 0;
    this.pageStartTime = now;
    
    // 重置滚动速度
    this.context.scrollSpeed = 'normal';
    
    this.notifyHandlers();
  }
  
  getContext(): BehaviorContext {
    return { ...this.context };
  }
  
  onBehaviorChange(handler: ContextChangeHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  
  private notifyHandlers(): void {
    const context = this.getContext();
    this.handlers.forEach(handler => {
      try {
        handler(context);
      } catch (error) {
        console.warn('[Live2DContextTracker] Handler error:', error);
      }
    });
  }
  
  destroy(): void {
    if (this.inactiveTimer) {
      clearTimeout(this.inactiveTimer);
    }
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    this.handlers.clear();
  }
}

// 创建全局单例
export const live2dContextTracker = new Live2DContextTracker();
