import { useState, useEffect, useRef, useCallback } from 'react';
import { live2dEventEmitter } from '../utils/live2dEventEmitter';

// Live2D性能监控Hook
export function useLive2DMonitor() {
  const [metrics, setMetrics] = useState({
    initializationTime: 0,
    messageCount: 0,
    errorCount: 0,
    lastMessageTime: 0
  });
  
  const startTimeRef = useRef<number>(0);
  const messageCountRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);

  const startMonitoring = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  const recordMessage = useCallback(() => {
    messageCountRef.current += 1;
    setMetrics(prev => ({
      ...prev,
      messageCount: messageCountRef.current,
      lastMessageTime: Date.now()
    }));
  }, []);

  const recordError = useCallback(() => {
    errorCountRef.current += 1;
    setMetrics(prev => ({
      ...prev,
      errorCount: errorCountRef.current
    }));
  }, []);

  const recordInitializationComplete = useCallback(() => {
    const initTime = performance.now() - startTimeRef.current;
    setMetrics(prev => ({
      ...prev,
      initializationTime: initTime
    }));
  }, []);

  const getPerformanceScore = useCallback(() => {
    let score = 100;
    
    if (metrics.initializationTime > 5000) score -= 30;
    else if (metrics.initializationTime > 3000) score -= 20;
    else if (metrics.initializationTime > 2000) score -= 10;
    
    if (metrics.errorCount > 0) score -= metrics.errorCount * 15;
    
    return Math.max(0, score);
  }, [metrics]);

  return {
    metrics,
    startMonitoring,
    recordMessage,
    recordError,
    recordInitializationComplete,
    getPerformanceScore
  };
}

// Live2D资源预加载Hook
export function useLive2DPreloader() {
  const [preloadedResources, setPreloadedResources] = useState<Set<string>>(new Set());
  const [isPreloading, setIsPreloading] = useState(false);
  // const [preloadProgress, setPreloadProgress] = useState(0); // 移除未使用的状态
  
  const preloadPromisesRef = useRef<Map<string, Promise<void>>>(new Map());

  const preloadResource = useCallback(async (url: string): Promise<void> => {
    if (preloadedResources.has(url)) return;
    
    if (preloadPromisesRef.current.has(url)) {
      return preloadPromisesRef.current.get(url);
    }

    const promise = loadResource(url);
    preloadPromisesRef.current.set(url, promise);
    
    try {
      await promise;
      setPreloadedResources(prev => new Set([...prev, url]));
    } finally {
      preloadPromisesRef.current.delete(url);
    }
  }, [preloadedResources]);

  const loadResource = (url: string): Promise<void> => {
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = url.endsWith('.js') ? 'script' : 
                url.endsWith('.json') ? 'fetch' : 'image';
      link.href = url;
      
      link.onload = () => resolve();
      link.onerror = () => resolve(); // 即使失败也resolve，不影响主流程
      
      document.head.appendChild(link);
      
      // 设置超时
      setTimeout(() => resolve(), 3000);
    });
  };

  // const preloadLive2DResources = useCallback(async (basePath: string = '') => {
    if (isPreloading) return;
    
    const resources = [
      `${basePath}/live2d/js/live2d.js`,
      `${basePath}/live2d/js/message.js`,
      `${basePath}/live2d/model/tianyi/model.json`,
      `${basePath}/live2d/model/tianyi/textures/1.png`
    ];

    setIsPreloading(true);
    // setPreloadProgress(0); // 移除未使用的进度设置
    
    try {
      // 分批加载，避免阻塞
      const batchSize = 2;
      // let completed = 0; // 移除未使用的计数器
      
      for (let i = 0; i < resources.length; i += batchSize) {
        const batch = resources.slice(i, i + batchSize);
        await Promise.all(batch.map(url => preloadResource(url)));
        
        // completed += batch.length;
        // setPreloadProgress((completed / resources.length) * 100); // 移除进度更新
        
        // 小延迟，给浏览器喘息时间
        if (i + batchSize < resources.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      setIsPreloading(false);
    }
  // }, [isPreloading, preloadResource]); // 注释掉未使用的函数

  // const isResourcePreloaded = useMemo(() => {
  //   return isModelPreloaded && isMessagePreloaded;
  // }, []); // 空依赖数组，避免循环依赖

  return {
    // isResourcePreloaded, // 移除未使用的变量
    isModelPreloaded,
    isMessagePreloaded,
    preloadModel,
    preloadMessage,
    clearPreloadedResources
  };
}

// Live2D消息队列Hook
export function useLive2DMessageQueue() {
  const [currentMessage, setCurrentMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const queueRef = useRef<Array<{message: string, type: string, priority: number}>>([]);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const addMessage = useCallback((message: string, type: string = 'normal', priority: number = 1) => {
    queueRef.current.push({ message, type, priority });
    queueRef.current.sort((a, b) => b.priority - a.priority); // 高优先级优先
    // 移除直接调用processQueue()，避免依赖循环
  }, []); // 移除processQueue依赖

  const processQueue = useCallback(async () => {
    if (isProcessing || queueRef.current.length === 0) return;
    
    setIsProcessing(true);
    
    while (queueRef.current.length > 0) {
      const item = queueRef.current.shift()!;
      
      setCurrentMessage(item.message);
      
      // 等待消息显示完成（假设3秒）
      await new Promise(resolve => {
        processingTimeoutRef.current = setTimeout(resolve, 3000);
      });
    }
    
    setCurrentMessage('');
    setIsProcessing(false);
  }, [isProcessing]); // 移除processQueue依赖，避免循环依赖

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    setIsProcessing(false);
    setCurrentMessage('');
    
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    // 监听队列变化，自动处理消息
    if (queueRef.current.length > 0 && !isProcessing) {
      processQueue();
    }
  }); // 空依赖数组，每次渲染后检查

  return {
    currentMessage,
    // isProcessing, // 移除未使用的变量
    addMessage,
    clearQueue
  };
}

// Live2D懒加载Hook
export function useLive2DLazy() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasLoaded) {
        setIsVisible(true);
        setHasLoaded(true);
        
        // 加载完成后断开观察器
        if (observerRef.current) {
          observerRef.current.disconnect();
          observerRef.current = null;
        }
      }
    });
  }, [hasLoaded]);

  const startObserving = useCallback((element: HTMLDivElement) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: '50px'
    });

    observerRef.current.observe(element);
  }, [handleIntersection]);

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  return {
    isVisible,
    hasLoaded,
    containerRef,
    startObserving
  };
}

// Live2D事件管理Hook
export function useLive2DEvents() {
  const [events, setEvents] = useState<string[]>([]);
  
  const addEvent = useCallback((event: string) => {
    setEvents(prev => [...prev, event]);
    
    // 限制事件数量，避免内存泄漏
    setEvents(prev => prev.slice(-50));
  }, []);

  // const clearEvents = useCallback(() => {
  //   setEvents([]);
  // }, []); // 注释掉未使用的函数

  // 监听Live2D事件
  useEffect(() => {
    const handleLive2DEvent = (event: any) => {
      addEvent(`Live2D: ${event.type} - ${new Date().toLocaleTimeString()}`);
    };

    live2dEventEmitter.on('live2dEvent', handleLive2DEvent);

    return () => {
      live2dEventEmitter.off('live2dEvent', handleLive2DEvent);
    };
  }, [addEvent]);

  return {
    events,
    // addEvent, // 移除未使用的变量
    // clearEvents // 移除未使用的变量
  };
}

// Live2D设备检测Hook
export function useLive2DDeviceDetection() {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({
    userAgent: '',
    screenWidth: 0,
    screenHeight: 0,
    isTouchDevice: false
  });

  const checkDevice = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod'];
    const isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword));
    
    // 检查屏幕尺寸
    const isSmallScreen = window.innerWidth < 768;
    
    // 检查触摸设备
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    setIsMobileDevice(isMobile || isSmallScreen);
    setDeviceInfo({
      userAgent,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      isTouchDevice
    });
  }, []);

  useEffect(() => {
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, [checkDevice]);

  return {
    isMobileDevice,
    deviceInfo,
    checkDevice
  };
}

// 主Live2D优化Hook
export function useLive2DOptimized() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const {
    metrics,
    startMonitoring,
    recordMessage,
    recordError,
    recordInitializationComplete,
    getPerformanceScore
  } = useLive2DMonitor();
  
  const {
    preloadedResources,
    isPreloading,
    // preloadProgress, // 移除未使用的变量
    preloadLive2DResources,
    // isResourcePreloaded, // 移除未使用的变量
    clearCache
  } = useLive2DPreloader();
  
  const {
    currentMessage,
    // isProcessing, // 移除未使用的变量
    addMessage,
    clearQueue
  } = useLive2DMessageQueue();
  
  const {
    isVisible,
    hasLoaded
    // containerRef, // 移除未使用的变量
    // startObserving // 移除未使用的变量
  } = useLive2DLazy();
  
  const {
    events,
    // addEvent, // 移除未使用的变量
    // clearEvents // 移除未使用的变量
  } = useLive2DEvents();
  
  const {
    isMobileDevice,
    deviceInfo,
    checkDevice
  } = useLive2DDeviceDetection();

  const initialize = useCallback(async (basePath: string = '') => {
    try {
      setIsLoading(true);
      setError(null);
      
      // 开始性能监控
      startMonitoring();
      
      // 预加载资源
      await preloadLive2DResources(basePath);
      
      // 初始化完成
      setIsInitialized(true);
      recordInitializationComplete();
      
      // 延迟完成加载状态
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      recordError();
      setIsLoading(false);
    }
  }, [startMonitoring, preloadLive2DResources, recordInitializationComplete, recordError]);

  const sendMessage = useCallback((message: string, type: string = 'normal') => {
    if (!isInitialized) return;
    
    addMessage(message, type);
    recordMessage();
  }, [isInitialized, addMessage, recordMessage]);

  const getStatus = useCallback(() => {
    return {
      isInitialized,
      isLoading,
      isPreloading,
      // preloadProgress, // 移除未使用的变量
      error,
      isVisible,
      hasLoaded,
      isMobileDevice,
      performanceScore: getPerformanceScore(),
      metrics
    };
  }, [
    isInitialized,
    isLoading,
    isPreloading,
    // preloadProgress, // 移除未使用的变量
    error,
    isVisible,
    hasLoaded,
    isMobileDevice,
    getPerformanceScore,
    metrics
  ]);

  return {
    // 状态
    isInitialized,
    isLoading,
    error,
    isVisible,
    hasLoaded,
    isMobileDevice,
    
    // 数据
    currentMessage,
    preloadedResources,
    // preloadProgress, // 移除未使用的变量
    deviceInfo,
    events,
    metrics,
    
    // 方法
    initialize,
    sendMessage,
    clearCache,
    clearQueue,
    // clearEvents, // 移除未使用的变量
    checkDevice,
    // startObserving, // 移除未使用的变量
    getPerformanceScore,
    getStatus
  };
}