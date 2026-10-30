'use client';

import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { getAssetPath } from '../utils/assetUtils';
import { live2dEventEmitter } from '../utils/live2dEventEmitter';
import live2dMessageManager, { Live2DMessageHelper } from '../utils/live2dMessageManager';
import { InteractionMessages } from '../setting/live2dMessages';
import { useLive2DLoader } from '../hooks/useLive2DLoader';
import { fetchHitokoto } from '../utils/live2dHitokoto';
import {
  getLive2DVisibility,
  setLive2DVisibility,
  onLive2DVisibilityChange,
} from '../utils/live2dVisibility';
import Live2DBubble from './Live2DBubble';
import Live2DControls from './Live2DControls';

/** 天依 AI 问答面板：懒加载，仅在首次点「问天依」时下载 */
const TianyiChatPanel = lazy(() => import('./TianyiChatPanel'));

interface LuoTianyiLive2DProps {
  hidden?: boolean;
}

/**
 * 注册页面级交互消息（鼠标悬停标题/导航、点击看板娘）
 *
 * 放在模块作用域，引用恒定，避免组件每次渲染都生成新函数、
 * 导致 useLive2DLoader 的 loadLive2D 依赖变化并反复重建加载监听。
 */
function setupLive2DMessageSystem(_basePath: string, signal: AbortSignal): void {
  if (signal.aborted) return;
  if ((window as any).messageSystemInitialized) return;
  (window as any).messageSystemInitialized = true;

  const triggerLimits = {
    mouseover: new Map<string, number>(),
    click: new Map<string, number>(),
  };
  const THROTTLE_DELAY = 2000;

  const messageConfig = {
    mouseover: [
      { selector: '.title a, h1, h2, h3', text: InteractionMessages.TITLE_HOVER.messages },
      { selector: ".searchbox, input[type='search']", text: InteractionMessages.SEARCH_HOVER.messages },
      { selector: 'nav a, .nav-link, .navigation a, header a, .navbar a, .menu-item a', text: InteractionMessages.NAVIGATION_HOVER.messages },
    ],
    click: [
      { selector: '#landlord #live2d', text: InteractionMessages.LIVE2D_CLICK.messages },
    ],
  };

  const setupThrottledEvents = () => {
    if (signal.aborted) return;

    const renderTip = (text: string, data: any) => {
      if (data && data.text) return text.replace(/{text}/g, data.text || '');
      return text;
    };

    const createHandler = (tips: any, eventType: 'mouseover' | 'click') => (e: Event) => {
      if (live2dMessageManager.isInFireworksMode()) return;
      const target = e.target as HTMLElement;
      if (!target.matches(tips.selector)) return;

      // 节流判断在前，stopPropagation 在后——避免无意义地阻断不相关事件
      const now = Date.now();
      const lastTrigger = triggerLimits[eventType].get(tips.selector) || 0;
      if (now - lastTrigger < THROTTLE_DELAY) return;
      triggerLimits[eventType].set(tips.selector, now);

      // 节流通过后才阻断事件传播
      e.stopPropagation();

      let text = Array.isArray(tips.text) ? tips.text[Math.floor(Math.random() * tips.text.length)] : tips.text;
      text = renderTip(text, { text: target.textContent || '' });
      (window as any).showMessage(text);
    };

    messageConfig.mouseover.forEach((tips: any) => {
      document.addEventListener('mouseover', createHandler(tips, 'mouseover'), { signal } as any);
    });
    messageConfig.click.forEach((tips: any) => {
      document.addEventListener('click', createHandler(tips, 'click'), { signal } as any);
    });
  };

  const timeoutId = setTimeout(() => {
    if (!signal.aborted) setupThrottledEvents();
  }, 1000);
  signal.addEventListener('abort', () => clearTimeout(timeoutId));
}

export default function LuoTianyiLive2D({ hidden = false }: LuoTianyiLive2DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const messageAbortRef = useRef<AbortController | null>(null);
  const hiddenRef = useRef<boolean>(hidden);
  hiddenRef.current = hidden;
  const hasLoadedRef = useRef<boolean>(false);

  // 从 localStorage 读取用户上次选择的显隐偏好，首次访问默认显示
  const [isVisible, setIsVisible] = useState(() => getLive2DVisibility());
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [message, setMessage] = useState('');
  const [messageOpacity, setMessageOpacity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [isModelReady, setIsModelReady] = useState(false);
  // 天依 AI 问答面板开关
  const [chatOpen, setChatOpen] = useState(false);
  // 主题类名（'dark' | ''）：用 state 承载并监听 html class 变化，
  // 保证切换主题时气泡/控件立即重渲染同步（此前是渲染时快照，
  // 切主题后组件不重渲染，类名停留在旧主题直到下一次无关更新）
  const [themeClass, setThemeClass] = useState('');
  const pageStartTimeRef = useRef(Date.now());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncThemeClass = () => {
      setThemeClass(document.documentElement.classList.contains('dark') ? 'dark' : '');
    };
    syncThemeClass();
    const observer = new MutationObserver(syncThemeClass);
    observer.observe(document.documentElement, { attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const triggerFadeOut = useCallback((duration: number = 5000) => {
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    fadeTimeoutRef.current = setTimeout(() => setMessageOpacity(0), duration);
  }, []);

  const updateMessage = useCallback(
    (newMessage: string, type: 'normal' | 'interaction' | 'fireworks' = 'normal', duration: number = 5000) => {
      if (hiddenRef.current) return;
      if (!newMessage || typeof newMessage !== 'string' || newMessage.trim() === '') return;
      if (type !== 'fireworks' && live2dMessageManager.isInFireworksMode()) return;
      // 彩蛋消息显示期间，拦下绕过消息管理器的直连消息（一言定时器、custom-message 事件等）。
      // 这些入口直接落到气泡上、不经过 showMessage，管理器的优先级机制对它们无效，
      // 若不在此处兜底，彩蛋往往还没读完就被顶掉。彩蛋自身的显示会被放行（内容相同）。
      if (type !== 'fireworks' && live2dMessageManager.shouldBlockDirectMessage(newMessage)) return;

      setMessage(newMessage);
      setMessageOpacity(1);
      triggerFadeOut(duration);
    },
    [triggerFadeOut]
  );

  // 组件挂载时立即桥接 window.showMessage → React updateMessage
  // 不依赖 Live2D 异步加载，确保 smart page message (3s)、一言 timer (45s) 等早期消息不会丢失
  useEffect(() => {
    if (typeof window === 'undefined') return;
    (window as any).showMessage = (msg: string, timeout?: number) => {
      if (msg && typeof msg === 'string' && msg.trim() !== '') {
        const isFireworksMode = live2dMessageManager.isInFireworksMode();
        // 透传 timeout 作为气泡停留时长，未提供时使用默认值
        updateMessage(msg, isFireworksMode ? 'fireworks' : 'normal', timeout);
      }
    };
  }, [updateMessage]);

  useEffect(() => {
    if (hidden) {
      setMessage('');
      setMessageOpacity(0);
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
    }
  }, [hidden]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
      if (messageAbortRef.current) {
        messageAbortRef.current.abort();
        messageAbortRef.current = null;
      }
      if (typeof window !== 'undefined') {
        if ((window as any).__live2dInterval) clearInterval((window as any).__live2dInterval);
        if ((window as any).__live2dTimeout) clearTimeout((window as any).__live2dTimeout);
      }
      // 卸载时释放上下文监听，避免 handler 泄漏导致重复消息
      live2dMessageManager.stopContextListening();
    };
  }, []);

  const { loadLive2D } = useLive2DLoader({
    isMountedRef,
    canvasRef,
    setLoadProgress,
    setIsLoading,
    setIsModelReady,
    setMessage,
    setMessageOpacity,
    setupMessageSystem: setupLive2DMessageSystem,
    messageAbortRef,
  });

  const getCurrentPageInfo = useCallback(() => {
    if (typeof window === 'undefined') return { page: '', path: '' };
    const path = window.location.pathname;
    const pageMap: Record<string, string> = {
      '/': '首页',
      '/about': '关于页面',
      '/archive': '归档页面',
      '/guestbook': '留言板',
      '/settings': '设置页面',
      '/tools': '工具页面',
      '/blogs': '博客文章',
      '/gallery': '画廊页面',
      '/moments': '个人动态',
      '/changelogs': '开发日志',
      '/friends': '友链页面',
      '/links': '相关链接',
    };
    let pageType = '其他页面';
    for (const [route, name] of Object.entries(pageMap)) {
      if (path.startsWith(route)) {
        pageType = name;
        break;
      }
    }
    if (path.startsWith('/blogs/') && path !== '/blogs') pageType = '博客文章';
    if (path.startsWith('/tools/')) pageType = '工具页面';
    return { page: pageType, path };
  }, []);

  const showSmartPageMessage = useCallback(() => {
    const { page } = getCurrentPageInfo();
    Live2DMessageHelper.showSmartPageMessage(page);
  }, [getCurrentPageInfo]);

  const checkPageStayTime = useCallback(() => {
    const stayMinutes = Math.floor((Date.now() - pageStartTimeRef.current) / 60000);
    Live2DMessageHelper.showStayTimeMessage(stayMinutes);
  }, []);

  const detectReadingProgress = useCallback(() => {
    if (typeof window === 'undefined') return;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = Math.min((scrollTop / scrollHeight) * 100, 100);
    Live2DMessageHelper.showReadingProgress(progress);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => showSmartPageMessage(), 3000);
    return () => clearTimeout(timer);
  }, [showSmartPageMessage]);

  const handleThemeChange = useCallback((event: any) => {
    if (!event.data) return;
    const { newTheme } = event.data;
    const now = Date.now();
    const lastTime = (window as any).__lastThemeChangeTime || 0;
    if (now - lastTime < 1000) return;
    (window as any).__lastThemeChangeTime = now;
    Live2DMessageHelper.showThemeMessage(newTheme as 'light' | 'dark' | 'system');
  }, []);

  useEffect(() => {
    if (isMobileDevice) return;
    const interval = setInterval(checkPageStayTime, 60000);
    return () => clearInterval(interval);
  }, [checkPageStayTime, isMobileDevice]);

  // 一言定时器：每 45 秒从 v1.hitokoto.cn 拉一句随机句子显示
  // 使用递归 setTimeout：页面隐藏时暂停请求，连续失败时按退避间隔重试
  useEffect(() => {
    if (hidden || isMobileDevice) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let failureCount = 0;

    const schedule = (delay: number) => {
      timer = setTimeout(run, delay);
    };

    const run = async () => {
      if (cancelled) return;
      // 页面隐藏时跳过本次请求，直接按正常间隔等待下一轮，避免后台无谓请求
      if (typeof document !== 'undefined' && document.hidden) {
        schedule(45000);
        return;
      }
      const text = await fetchHitokoto();
      if (cancelled) return;
      if (text) {
        failureCount = 0;
        updateMessage(text);
        schedule(45000);
      } else {
        // 失败退避：45s → 90s → 180s，上限 180s
        failureCount = Math.min(failureCount + 1, 2);
        schedule(45000 * Math.pow(2, failureCount));
      }
    };

    schedule(45000);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [updateMessage, hidden, isMobileDevice]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currentPath = window.location.pathname;
    if (!(currentPath.startsWith('/blogs/') && currentPath !== '/blogs')) return;

    let lastProgressMessage = 0;
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastProgressMessage < 10000) return;
      detectReadingProgress();
      lastProgressMessage = now;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [detectReadingProgress]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        (window as any).__pageHiddenTime = Date.now();
      } else {
        const hiddenTime = (window as any).__pageHiddenTime;
        if (hiddenTime && Date.now() - hiddenTime > 30000) {
          Live2DMessageHelper.showWelcomeMessage('WELCOME_BACK');
        }
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
  }, []);

  useEffect(() => {
    const handleCopy = (_event: ClipboardEvent) => {
      setTimeout(() => {
        const selection = window.getSelection()?.toString();
        if ((selection || '').length > 10) {
          Live2DMessageHelper.showCopyMessage();
        }
      }, 100);
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('copy', handleCopy, true);
      return () => document.removeEventListener('copy', handleCopy, true);
    }
  }, []);

  useEffect(() => {
    if (hidden) return;
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setIsMobileDevice(isMobile);
    if (isMobile) {
      setIsVisible(false);
      return;
    }

    // 移动端不加载看板娘，也不启动上下文监听
    live2dMessageManager.startContextListening();
    setIsVisible(true);

    const eventListeners: Array<{ type: string; listener: EventListenerOrEventListenerObject }> = [];

    const initLive2D = () => {
      if (!isMountedRef.current) return;
      if (document.readyState === 'complete') {
        loadLive2D();
      } else if (document.readyState === 'interactive') {
        const loadHandler = () => {
          setTimeout(() => {
            if (isMountedRef.current) loadLive2D();
          }, 300);
        };
        window.addEventListener('load', loadHandler);
        eventListeners.push({ type: 'load', listener: loadHandler });
      } else {
        const domContentLoadedHandler = () => {
          setTimeout(() => {
            if (isMountedRef.current) loadLive2D();
          }, 500);
        };
        document.addEventListener('DOMContentLoaded', domContentLoadedHandler);
        eventListeners.push({ type: 'DOMContentLoaded', listener: domContentLoadedHandler });
      }
    };

    try {
      initLive2D();
    } catch (error) {
      console.error('[LuoTianyiLive2D] loadLive2D failed:', error);
    }

    return () => {
      eventListeners.forEach(({ type, listener }) => {
        if (type === 'load') window.removeEventListener(type, listener);
        else document.removeEventListener(type, listener);
      });
    };
  }, [loadLive2D, hidden]);

  useEffect(() => {
    const unsubscribeTheme = live2dEventEmitter.on('theme-change', handleThemeChange);
    const unsubscribeCustom = live2dEventEmitter.on('custom-message', (event: any) => {
      const msg = typeof event === 'string' ? event : event?.message || event?.data?.message || '收到消息啦～';
      updateMessage(msg);
    });
    const unsubscribeMusicPlay = live2dEventEmitter.on('music-play', () => Live2DMessageHelper.showMusicMessage('PLAY'));
    const unsubscribeMusicPause = live2dEventEmitter.on('music-pause', () => Live2DMessageHelper.showMusicMessage('PAUSE'));

    return () => {
      unsubscribeTheme();
      unsubscribeCustom();
      unsubscribeMusicPlay();
      unsubscribeMusicPause();
    };
  }, [handleThemeChange, updateMessage]);

  // 订阅全局显隐状态变化（右下角悬浮按钮触发时同步到此组件）
  useEffect(() => {
    const unsubscribe = onLive2DVisibilityChange((visible) => {
      setIsVisible(visible);
    });
    return unsubscribe;
  }, []);

  // 内部 toggle 也需同步写入全局状态，保证双向一致
  // 注意：setLive2DVisibility 必须放在 updater 函数外面，
  // 因为 updater 是在 React 渲染阶段同步执行的，
  // 若在里面 dispatch CustomEvent → 触发 ScrollToTop 的 setState，
  // 会报 "Cannot update a component while rendering a different component"
  const toggleVisibility = useCallback(() => {
    const next = !isVisible;
    setIsVisible(next);
    setLive2DVisibility(next);
  }, [isVisible]);

  const refreshLive2D = useCallback(async () => {
    if (isLoading) return;
    setMessage('天依正在重新加载～');
    setMessageOpacity(1);
    setIsLoading(true);
    setLoadProgress(0);
    setIsModelReady(false);

    try {
      if (typeof window !== 'undefined') {
        (window as any).messageSystemInitialized = false;
      }
      if (messageAbortRef.current) {
        messageAbortRef.current.abort();
        messageAbortRef.current = null;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
      await loadLive2D();
      setMessage('天依已重新加载！');
      setMessageOpacity(1);
      triggerFadeOut();
    } catch (error) {
      console.error('[LuoTianyiLive2D] 刷新失败:', error);
      setMessage('刷新失败了，请刷新页面试试～');
      setMessageOpacity(1);
      setIsLoading(false);
      triggerFadeOut();
    }
  }, [loadLive2D, triggerFadeOut, isLoading]);

  return (
    <>
      <Live2DStyles />
      <div
        id="landlord"
        className={`landlord ${themeClass}`}
        style={{ display: hidden || !isVisible ? 'none' : 'block' }}
      >
        <Live2DBubble
          message={message}
          opacity={messageOpacity}
          isLoading={isLoading}
          loadProgress={loadProgress}
          isVisible={isVisible}
          themeClass={themeClass}
        />

        <canvas
          ref={canvasRef}
          id="live2d"
          width="280"
          height="250"
          className="live2d"
          style={{
            opacity: isLoading ? 0.3 : 1,
            transition: 'opacity 0.3s ease-in-out',
            pointerEvents: isModelReady ? 'auto' : 'none',
          }}
        />

        <Live2DControls
          isVisible={isVisible}
          isLoading={isLoading}
          onToggle={toggleVisibility}
          onRefresh={refreshLive2D}
          onAsk={() => setChatOpen((prev) => !prev)}
          chatOpen={chatOpen}
          themeClass={themeClass}
        />

        {/* 天依 AI 问答面板：懒加载，挂在看板娘上方 */}
        {chatOpen && (
          <Suspense fallback={null}>
            <TianyiChatPanel onClose={() => setChatOpen(false)} />
          </Suspense>
        )}
      </div>
    </>
  );
}

declare global {
  interface Window {
    loadlive2d?: (canvasId: string, modelPath: string) => void;
    showMessage?: (msg: string, timeout?: number) => void;
    message_Path?: string;
    home_Path?: string;
    __luotianyiWelcomeShown?: boolean;
    __lastThemeChangeTime?: number;
  }
}

const Live2DStyles = () => (
  <style jsx global>{`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes refresh-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(-360deg); }
    }
    .refresh-button.loading .refresh-icon {
      animation: refresh-spin 1s linear infinite;
    }
    .refresh-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `}</style>
);
