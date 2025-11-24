/**
 * 高级滚动管理器
 * 提供更智能的滚动位置管理和页面切换体验
 */

export class AdvancedScrollManager {
  private scrollPositions: Map<string, number> = new Map();
  private navigationHistory: string[] = [];
  private currentPath: string = '';
  private isNavigating: boolean = false;
  private scrollRestorationTimeout: NodeJS.Timeout | null = null;
  private readonly SCROLL_TIMEOUT = 100;
  private readonly STORAGE_KEY = 'advanced-scroll-positions';
  private readonly HISTORY_KEY = 'navigation-history';
  private hasRestored = false; // 添加标记防止重复恢复

  constructor() {
    this.currentPath = window.location.pathname;
    this.loadFromStorage();
    this.setupEventListeners();
  }

  /**
   * 从本地存储加载滚动位置
   */
  private loadFromStorage(): void {
    try {
      const savedPositions = sessionStorage.getItem(this.STORAGE_KEY);
      const savedHistory = sessionStorage.getItem(this.HISTORY_KEY);
      
      if (savedPositions) {
        const positions = JSON.parse(savedPositions);
        this.scrollPositions = new Map(Object.entries(positions));
      }
      
      if (savedHistory) {
        this.navigationHistory = JSON.parse(savedHistory);
      }
    } catch (error) {
      console.warn('Failed to load scroll positions from storage:', error);
    }
  }

  /**
   * 保存到本地存储
   */
  private saveToStorage(): void {
    try {
      const positionsObj = Object.fromEntries(this.scrollPositions);
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(positionsObj));
      sessionStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.navigationHistory));
    } catch (error) {
      console.warn('Failed to save scroll positions to storage:', error);
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 页面加载时恢复滚动位置
    window.addEventListener('load', () => this.restoreScrollPosition());
    
    // 页面卸载时保存滚动位置
    window.addEventListener('beforeunload', () => this.saveCurrentPosition());
    
    // 监听导航事件
    document.addEventListener('click', (event) => this.handleNavigationClick(event));
    
    // 监听浏览器历史记录变化
    window.addEventListener('popstate', () => this.handlePopState());
    
    // 监听滚动事件（节流）
    let scrollTimeout: NodeJS.Timeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => this.saveCurrentPosition(), this.SCROLL_TIMEOUT);
    }, { passive: true });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.saveCurrentPosition();
      } else if (document.visibilityState === 'visible') {
        this.restoreScrollPosition();
      }
    });
  }

  /**
   * 保存当前滚动位置
   */
  private saveCurrentPosition(): void {
    if (this.isNavigating) return;
    
    const scrollY = window.scrollY;
    this.scrollPositions.set(this.currentPath, scrollY);
    this.saveToStorage();
  }

  /**
   * 恢复滚动位置
   */
  private restoreScrollPosition(): void {
    const savedPosition = this.scrollPositions.get(this.currentPath);
    
    if (savedPosition !== undefined && !this.hasRestored) {
      this.hasRestored = true; // 防止重复恢复
      
      // 延迟恢复，避免阻塞首屏渲染
      setTimeout(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: savedPosition,
            behavior: 'instant' // 使用即时滚动避免闪烁
          });
        });
      }, 50); // 50ms延迟
    }
  }

  /**
   * 处理导航点击事件
   */
  private handleNavigationClick(event: MouseEvent): void {
    const link = (event.target as Element).closest('a[href]') as HTMLAnchorElement;
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    // 检查是否为外部链接
    if (link.hostname !== window.location.hostname) return;

    // 如果是当前页面，滚动到顶部
    if (link.pathname === this.currentPath) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // 保存当前位置并开始导航
    this.saveCurrentPosition();
    this.startNavigation(link.pathname);
  }

  /**
   * 开始导航
   */
  private startNavigation(newPath: string): void {
    this.isNavigating = true;
    this.hasRestored = false; // 重置恢复标记
    this.navigationHistory.push(this.currentPath);
    this.currentPath = newPath;
    
    // 检查音乐播放器是否正在播放
    const isMusicPlaying = (window as any).globalAPlayer && !(window as any).globalAPlayer.paused;
    
    if (!isMusicPlaying) {
      // 只有在音乐未播放时才添加页面过渡效果
      document.documentElement.classList.add('page-transitioning');
    }
    
    // 导航完成后恢复滚动位置
    setTimeout(() => {
      this.isNavigating = false;
      this.restoreScrollPosition();
      document.documentElement.classList.remove('page-transitioning');
    }, 50);
  }

  /**
   * 处理浏览器历史记录变化（后退/前进）
   */
  private handlePopState(): void {
    const newPath = window.location.pathname;
    
    if (newPath !== this.currentPath) {
      this.currentPath = newPath;
      this.restoreScrollPosition();
    }
  }

  /**
   * 手动保存当前页面的滚动位置
   */
  public savePosition(path?: string): void {
    const targetPath = path || this.currentPath;
    this.scrollPositions.set(targetPath, window.scrollY);
    this.saveToStorage();
  }

  /**
   * 手动恢复滚动位置
   */
  public restorePosition(path?: string): void {
    const targetPath = path || this.currentPath;
    const savedPosition = this.scrollPositions.get(targetPath);
    
    if (savedPosition !== undefined) {
      window.scrollTo({
        top: savedPosition,
        behavior: 'instant'
      });
    }
  }

  /**
   * 清除指定路径的滚动位置
   */
  public clearPosition(path: string): void {
    this.scrollPositions.delete(path);
    this.saveToStorage();
  }

  /**
   * 清除所有滚动位置
   */
  public clearAllPositions(): void {
    this.scrollPositions.clear();
    this.navigationHistory = [];
    this.saveToStorage();
  }

  /**
   * 获取保存的滚动位置
   */
  public getSavedPosition(path: string): number | undefined {
    return this.scrollPositions.get(path);
  }

  /**
   * 获取所有保存的滚动位置
   */
  public getAllPositions(): Record<string, number> {
    return Object.fromEntries(this.scrollPositions);
  }

  /**
   * 获取导航历史
   */
  public getNavigationHistory(): string[] {
    return [...this.navigationHistory];
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    if (this.scrollRestorationTimeout) {
      clearTimeout(this.scrollRestorationTimeout);
    }
    
    // 移除事件监听器
    window.removeEventListener('load', () => this.restoreScrollPosition());
    window.removeEventListener('beforeunload', () => this.saveCurrentPosition());
    window.removeEventListener('popstate', () => this.handlePopState());
    document.removeEventListener('click', (event) => this.handleNavigationClick(event));
    document.removeEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.saveCurrentPosition();
      }
    });
  }
}

/**
 * 全局滚动管理器实例
 */
let globalScrollManager: AdvancedScrollManager | null = null;

/**
 * 初始化滚动管理器
 */
export function initScrollManager(): AdvancedScrollManager {
  if (!globalScrollManager) {
    globalScrollManager = new AdvancedScrollManager();
  }
  return globalScrollManager;
}

/**
 * 获取滚动管理器实例
 */
export function getScrollManager(): AdvancedScrollManager | null {
  return globalScrollManager;
}

/**
 * 销毁滚动管理器
 */
export function destroyScrollManager(): void {
  if (globalScrollManager) {
    globalScrollManager.destroy();
    globalScrollManager = null;
  }
}