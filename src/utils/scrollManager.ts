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
  private scrollTimeout: NodeJS.Timeout | null = null;
  private readonly SCROLL_TIMEOUT = 100;
  private readonly STORAGE_KEY = 'advanced-scroll-positions';
  private readonly HISTORY_KEY = 'navigation-history';
  private hasRestored = false;

  // 存储事件处理函数引用，确保 destroy 时能正确移除
  private boundHandlers: {
    load: () => void;
    beforeunload: () => void;
    popstate: () => void;
    scroll: () => void;
    click: (e: MouseEvent) => void;
    visibilitychange: () => void;
  } | null = null;

  constructor() {
    this.currentPath = window.location.pathname;
    this.loadFromStorage();
    this.setupEventListeners();
  }

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

  private saveToStorage(): void {
    try {
      const positionsObj = Object.fromEntries(this.scrollPositions);
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(positionsObj));
      sessionStorage.setItem(this.HISTORY_KEY, JSON.stringify(this.navigationHistory));
    } catch (error) {
      console.warn('Failed to save scroll positions to storage:', error);
    }
  }

  private setupEventListeners(): void {
    // 保存绑定后的处理函数引用
    this.boundHandlers = {
      load: () => this.restoreScrollPosition(),
      beforeunload: () => this.saveCurrentPosition(),
      popstate: () => this.handlePopState(),
      scroll: () => {
        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => this.saveCurrentPosition(), this.SCROLL_TIMEOUT);
      },
      click: (e: MouseEvent) => this.handleNavigationClick(e),
      visibilitychange: () => {
        if (document.visibilityState === 'hidden') {
          this.saveCurrentPosition();
        } else if (document.visibilityState === 'visible') {
          this.restoreScrollPosition();
        }
      },
    };

    window.addEventListener('load', this.boundHandlers.load);
    window.addEventListener('beforeunload', this.boundHandlers.beforeunload);
    window.addEventListener('popstate', this.boundHandlers.popstate);
    window.addEventListener('scroll', this.boundHandlers.scroll, { passive: true });
    document.addEventListener('click', this.boundHandlers.click);
    document.addEventListener('visibilitychange', this.boundHandlers.visibilitychange);
  }

  private saveCurrentPosition(): void {
    if (this.isNavigating) return;
    const scrollY = window.scrollY;
    this.scrollPositions.set(this.currentPath, scrollY);
    this.saveToStorage();
  }

  private restoreScrollPosition(): void {
    const savedPosition = this.scrollPositions.get(this.currentPath);

    if (savedPosition !== undefined && !this.hasRestored) {
      this.hasRestored = true;
      setTimeout(() => {
        requestAnimationFrame(() => {
          window.scrollTo({
            top: savedPosition,
            behavior: 'instant',
          });
        });
      }, 50);
    }
  }

  private handleNavigationClick(event: MouseEvent): void {
    const link = (event.target as Element).closest('a[href]') as HTMLAnchorElement;
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;
    if (link.hostname !== window.location.hostname) return;

    if (link.pathname === this.currentPath) {
      event.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    this.saveCurrentPosition();
    this.startNavigation(link.pathname);
  }

  private startNavigation(newPath: string): void {
    this.isNavigating = true;
    this.hasRestored = false;
    this.navigationHistory.push(this.currentPath);
    this.currentPath = newPath;

    const isMusicPlaying = (window as any).globalAPlayer && !(window as any).globalAPlayer.paused;

    if (!isMusicPlaying) {
      document.documentElement.classList.add('page-transitioning');
    }

    setTimeout(() => {
      this.isNavigating = false;
      this.restoreScrollPosition();
      document.documentElement.classList.remove('page-transitioning');
    }, 50);
  }

  private handlePopState(): void {
    const newPath = window.location.pathname;
    if (newPath !== this.currentPath) {
      this.currentPath = newPath;
      this.restoreScrollPosition();
    }
  }

  public savePosition(path?: string): void {
    const targetPath = path || this.currentPath;
    this.scrollPositions.set(targetPath, window.scrollY);
    this.saveToStorage();
  }

  public restorePosition(path?: string): void {
    const targetPath = path || this.currentPath;
    const savedPosition = this.scrollPositions.get(targetPath);
    if (savedPosition !== undefined) {
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
    }
  }

  public clearPosition(path: string): void {
    this.scrollPositions.delete(path);
    this.saveToStorage();
  }

  public clearAllPositions(): void {
    this.scrollPositions.clear();
    this.navigationHistory = [];
    this.saveToStorage();
  }

  public getSavedPosition(path: string): number | undefined {
    return this.scrollPositions.get(path);
  }

  public getAllPositions(): Record<string, number> {
    return Object.fromEntries(this.scrollPositions);
  }

  public getNavigationHistory(): string[] {
    return [...this.navigationHistory];
  }

  public destroy(): void {
    if (this.scrollRestorationTimeout) {
      clearTimeout(this.scrollRestorationTimeout);
    }
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    if (this.boundHandlers) {
      window.removeEventListener('load', this.boundHandlers.load);
      window.removeEventListener('beforeunload', this.boundHandlers.beforeunload);
      window.removeEventListener('popstate', this.boundHandlers.popstate);
      window.removeEventListener('scroll', this.boundHandlers.scroll);
      document.removeEventListener('click', this.boundHandlers.click);
      document.removeEventListener('visibilitychange', this.boundHandlers.visibilitychange);
      this.boundHandlers = null;
    }
  }
}

let globalScrollManager: AdvancedScrollManager | null = null;

export function initScrollManager(): AdvancedScrollManager {
  if (!globalScrollManager) {
    globalScrollManager = new AdvancedScrollManager();
  }
  return globalScrollManager;
}

export function getScrollManager(): AdvancedScrollManager | null {
  return globalScrollManager;
}

export function destroyScrollManager(): void {
  if (globalScrollManager) {
    globalScrollManager.destroy();
    globalScrollManager = null;
  }
}
