'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getAssetPath, getBasePath } from '../utils/assetUtils';
import { live2dEventEmitter } from '../utils/live2dEventEmitter';

// Live2D资源预加载器
class Live2DResourcePreloader {
  private static instance: Live2DResourcePreloader;
  private preloadedResources: Set<string> = new Set();
  private preloadPromises: Map<string, Promise<void>> = new Map();
  private isPreloading: boolean = false;

  static getInstance() {
    if (!this.instance) {
      this.instance = new Live2DResourcePreloader();
    }
    return this.instance;
  }

  async preloadLive2DResources(basePath: string = '') {
    if (this.isPreloading) return;
    
    const resources = [
      `${basePath}/live2d/js/live2d.js`,
      `${basePath}/live2d/js/message.js`,
      `${basePath}/live2d/model/tianyi/model.json`,
      `${basePath}/live2d/model/tianyi/textures/1.png`
    ];

    this.isPreloading = true;
    
    try {
      // 分批加载，避免阻塞
      const batchSize = 2;
      for (let i = 0; i < resources.length; i += batchSize) {
        const batch = resources.slice(i, i + batchSize);
        await Promise.all(batch.map(url => this.preloadResource(url)));
        
        // 小延迟，给浏览器喘息时间
        if (i + batchSize < resources.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } finally {
      this.isPreloading = false;
    }
  }

  private async preloadResource(url: string): Promise<void> {
    if (this.preloadedResources.has(url)) return;
    
    if (this.preloadPromises.has(url)) {
      return this.preloadPromises.get(url);
    }

    const promise = this.loadResource(url);
    this.preloadPromises.set(url, promise);
    
    try {
      await promise;
      this.preloadedResources.add(url);
    } finally {
      this.preloadPromises.delete(url);
    }
  }

  private loadResource(url: string): Promise<void> {
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
  }

  isResourcePreloaded(url: string): boolean {
    return this.preloadedResources.has(url);
  }

  clearCache() {
    this.preloadedResources.clear();
    this.preloadPromises.clear();
    this.isPreloading = false;
  }
}

// 消息队列管理器
class MessageQueueManager {
  private queue: Array<{message: string, type: string, priority: number}> = [];
  private isProcessing: boolean = false;
  private currentMessage: string = '';
  private messageCallback: ((message: string) => void) | null = null;

  setMessageCallback(callback: (message: string) => void) {
    this.messageCallback = callback;
  }

  addMessage(message: string, type: string = 'normal', priority: number = 1) {
    this.queue.push({ message, type, priority });
    this.queue.sort((a, b) => b.priority - a.priority); // 高优先级优先
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      
      if (this.messageCallback) {
        this.messageCallback(item.message);
      }
      
      // 等待消息显示完成（假设3秒）
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    this.isProcessing = false;
  }

  clear() {
    this.queue = [];
    this.isProcessing = false;
  }
}

// 性能监控器
class Live2DPerformanceMonitor {
  private metrics = {
    initializationTime: 0,
    messageCount: 0,
    resourceLoadTime: 0,
    errorCount: 0
  };
  
  private startTime = 0;

  startMonitoring() {
    this.startTime = performance.now();
  }

  recordInitializationComplete() {
    this.metrics.initializationTime = performance.now() - this.startTime;
  }

  recordMessage() {
    this.metrics.messageCount++;
  }

  recordResourceLoadTime(time: number) {
    this.metrics.resourceLoadTime = time;
  }

  recordError() {
    this.metrics.errorCount++;
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getPerformanceScore(): number {
    let score = 100;
    
    if (this.metrics.initializationTime > 5000) score -= 30;
    else if (this.metrics.initializationTime > 3000) score -= 20;
    else if (this.metrics.initializationTime > 2000) score -= 10;
    
    if (this.metrics.errorCount > 0) score -= this.metrics.errorCount * 15;
    
    return Math.max(0, score);
  }
}

export default function LuoTianyiLive2DOptimized() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [isVisible, setIsVisible] = useState(true);
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [message, setMessage] = useState('');
    const [messageOpacity, setMessageOpacity] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);
    const [currentPage, setCurrentPage] = useState('');
    const [readingProgress, setReadingProgress] = useState(0);
    const [interactionState, setInteractionState] = useState<'idle' | 'music' | 'theme' | 'page'>('idle');

    // 管理器实例
    const preloaderRef = useRef(Live2DResourcePreloader.getInstance());
    const messageQueueRef = useRef(new MessageQueueManager());
    const performanceMonitorRef = useRef(new Live2DPerformanceMonitor());
    
    // 定时器引用
    const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 防抖和节流引用
    const lastMessageTimeRef = useRef<number>(0);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // 页面开始时间
    const pageStartTime = useMemo(() => Date.now(), []);

    // 优化的消息更新函数
    const updateMessage = useCallback((newMessage: string, type: 'normal' | 'interaction' = 'normal') => {
        // 消息过滤逻辑
        const isDefaultMessage = newMessage.includes('你好') && newMessage.includes('洛天依') && newMessage.includes('！');
        const isGenericGreeting = newMessage === '你好～我是洛天依！' || 
                                 newMessage === '你好~我是洛天依！' ||
                                 (newMessage.includes('你好') && newMessage.length < 15);
        
        if (isDefaultMessage || isGenericGreeting) return;
        
        // 防抖处理
        const now = Date.now();
        if (now - lastMessageTimeRef.current < 500) return; // 500ms内不重复处理
        lastMessageTimeRef.current = now;
        
        // 处理交互类型消息
        if (type === 'interaction') {
            setInteractionState('music');
            if (interactionTimeoutRef.current) {
                clearTimeout(interactionTimeoutRef.current);
            }
            interactionTimeoutRef.current = setTimeout(() => {
                setInteractionState('idle');
            }, 3000);
        }
        
        // 使用消息队列
        messageQueueRef.current.addMessage(newMessage, type);
        
        // 性能监控
        performanceMonitorRef.current.recordMessage();
    }, []);

    // 设置消息回调
    useEffect(() => {
        messageQueueRef.current.setMessageCallback((msg) => {
            setMessage(msg);
            setMessageOpacity(1);
            
            // 自动淡出
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }
            
            fadeTimeoutRef.current = setTimeout(() => {
                setMessageOpacity(0);
            }, 5000);
        });
    }, []);

    // 优化的设备检测
    useEffect(() => {
        const checkDevice = () => {
            const userAgent = navigator.userAgent.toLowerCase();
            const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod'];
            const isMobile = mobileKeywords.some(keyword => userAgent.includes(keyword));
            
            // 检查屏幕尺寸
            const isSmallScreen = window.innerWidth < 768;
            
            setIsMobileDevice(isMobile || isSmallScreen);
        };
        
        checkDevice();
        window.addEventListener('resize', checkDevice);
        
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    // 优化的初始化
    useEffect(() => {
        console.log('[LuoTianyiLive2D] 开始优化初始化');
        performanceMonitorRef.current.startMonitoring();
        
        const initializeLive2D = async () => {
            try {
                // 设置初始化超时
                initializationTimeoutRef.current = setTimeout(() => {
                    console.warn('[LuoTianyiLive2D] 初始化超时，强制完成');
                    setIsLoading(false);
                    performanceMonitorRef.current.recordInitializationComplete();
                }, 10000);
                
                // 预加载资源
                const basePath = getAssetPath('/luotianyi-live2d-master');
                await preloaderRef.current.preloadLive2DResources(basePath);
                
                // 延迟初始化，避免阻塞页面渲染
                setTimeout(() => {
                    loadLive2DScript();
                }, 1000);
                
            } catch (error) {
                console.error('[LuoTianyiLive2D] 初始化失败:', error);
                performanceMonitorRef.current.recordError();
                setIsLoading(false);
            }
        };
        
        const loadLive2DScript = () => {
            if (typeof window === 'undefined') return;
            
            // 检查是否已经加载
            if ((window as any).live2d) {
                setupLive2D();
                return;
            }
            
            const script = document.createElement('script');
            const basePath = getAssetPath('/luotianyi-live2d-master');
            script.src = `${basePath}/live2d/js/live2d.js`;
            
            script.onload = () => {
                console.log('[LuoTianyiLive2D] Live2D脚本加载成功');
                setupLive2D();
            };
            
            script.onerror = () => {
                console.error('[LuoTianyiLive2D] Live2D脚本加载失败');
                performanceMonitorRef.current.recordError();
                setIsLoading(false);
            };
            
            document.head.appendChild(script);
        };
        
        const setupLive2D = () => {
            if (!canvasRef.current) return;
            
            try {
                // 清理初始化超时
                if (initializationTimeoutRef.current) {
                    clearTimeout(initializationTimeoutRef.current);
                }
                
                // 初始化Live2D
                const basePath = getAssetPath('/luotianyi-live2d-master');
                
                // 加载模型配置
                fetch(`${basePath}/live2d/model/tianyi/model.json`)
                    .then(response => response.json())
                    .then(modelConfig => {
                        console.log('[LuoTianyiLive2D] 模型配置加载成功');
                        
                        // 设置canvas尺寸
                        const canvas = canvasRef.current!;
                        canvas.width = 280;
                        canvas.height = 250;
                        
                        // 初始化Live2D模型
                        if ((window as any).live2d) {
                            (window as any).live2d.initialize(canvas, modelConfig);
                            
                            // 延迟完成初始化
                            setTimeout(() => {
                                setIsLoading(false);
                                performanceMonitorRef.current.recordInitializationComplete();
                                
                                // 显示欢迎消息
                                setTimeout(() => {
                                    updateMessage('天依已经准备好陪伴你啦～');
                                }, 500);
                            }, 500);
                        }
                    })
                    .catch(error => {
                        console.error('[LuoTianyiLive2D] 模型配置加载失败:', error);
                        performanceMonitorRef.current.recordError();
                        setIsLoading(false);
                    });
                    
            } catch (error) {
                console.error('[LuoTianyiLive2D] Live2D设置失败:', error);
                performanceMonitorRef.current.recordError();
                setIsLoading(false);
            }
        };
        
        // 延迟初始化，避免阻塞页面渲染
        const initTimer = setTimeout(() => {
            initializeLive2D();
        }, 500);
        
        return () => {
            clearTimeout(initTimer);
            if (initializationTimeoutRef.current) {
                clearTimeout(initializationTimeoutRef.current);
            }
        };
    }, [updateMessage]);

    // 优化的页面信息获取
    const getCurrentPageInfo = useCallback(() => {
        if (typeof window === 'undefined') return { page: '', path: '' };
        
        const path = window.location.pathname;
        const pageMap = {
            '/': '首页',
            '/about': '关于页面',
            '/archive': '归档页面',
            '/guestbook': '留言板',
            '/settings': '设置页面',
            '/tools': '工具页面',
            '/blogs': '博客文章'
        };
        
        let pageType = '其他页面';
        for (const [route, name] of Object.entries(pageMap)) {
            if (path.startsWith(route)) {
                pageType = name;
                break;
            }
        }
        
        if (path.includes('/blogs/') && path !== '/blogs/') {
            pageType = '博客文章';
        }
        
        return { page: pageType, path };
    }, []);

    // 优化的智能页面消息
    const showSmartPageMessage = useCallback(() => {
        const { page } = getCurrentPageInfo();
        const hour = new Date().getHours();
        
        const pageMessages = {
            '首页': [
                '欢迎来到歆橙的博客！这里有很多有趣的内容哦～',
                '首页是博客的门面呢，设计得很漂亮吧？',
                '从这里开始探索博主的精彩世界吧！'
            ],
            '关于页面': [
                '想了解博主更多信息吗？这里有很多有趣的故事哦～',
                '关于页面能让我们更好地了解博主的背景和兴趣～',
                '每个博主的关于页面都很有特色呢！'
            ],
            '归档页面': [
                '这里记录了博主的所有创作历程呢～',
                '归档页面就像时间胶囊，记录着点点滴滴～',
                '可以按时间顺序回顾博主的成长轨迹哦！'
            ],
            '留言板': [
                '留言板是和大家交流的好地方，有什么想说的吗？',
                '这里可以留下你的想法和建议，博主会很开心的～',
                '天依也喜欢热闹的留言板呢！'
            ],
            '博客文章': [
                '开始阅读新文章了呢，天依陪你一起～',
                '这篇文章看起来很有意思，期待你的感想～',
                '博主的文笔真不错，天依也学到了很多呢～'
            ],
            '工具页面': [
                '工具页面有很多实用的功能哦，试试看吧～',
                '这里的小工具会让你的体验更加便利呢！',
                '天依也觉得这些工具很实用呢～'
            ],
            '设置页面': [
                '想要个性化你的浏览体验吗？这里可以调整各种设置哦～',
                '设置页面让你可以按照自己的喜好来定制界面～',
                '天依也喜欢个性化的设置呢！'
            ],
            '其他页面': [
                '欢迎来到这个页面！天依在这里等你哦～',
                '这是一个特别的页面呢，有什么新发现吗？',
                '天依会在这里陪伴你浏览每一个页面～'
            ]
        };
        
        const timeGreetings = {
            night: '夜深了，注意休息哦～',
            morning: '早上好！今天也要充满活力哦～',
            afternoon: '下午好！午后的阳光很适合阅读呢～',
            evening: '晚上好！天依陪你度过美好的夜晚～'
        };
        
        let timeGreeting = '';
        if (hour < 6) timeGreeting = timeGreetings.night;
        else if (hour < 12) timeGreeting = timeGreetings.morning;
        else if (hour < 18) timeGreeting = timeGreetings.afternoon;
        else timeGreeting = timeGreetings.evening;
        
        const messages = pageMessages[page as keyof typeof pageMessages] || pageMessages['其他页面'];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        // 30%概率显示时间问候
        const finalMessage = Math.random() < 0.3 ? timeGreeting : randomMessage;
        
        updateMessage(finalMessage);
    }, [getCurrentPageInfo, updateMessage]);

    // 优化的主题切换处理
    const handleThemeChange = useCallback((event: any) => {
        if (!event.data) return;
        
        const { newTheme, previousTheme } = event.data;
        
        // 防抖处理
        const now = Date.now();
        const lastThemeChangeTime = (window as any).__lastThemeChangeTime || 0;
        if (now - lastThemeChangeTime < 1000) return;
        (window as any).__lastThemeChangeTime = now;
        
        const themeMessages = {
            light: [
                '切换到亮色模式了！眼睛会舒服一些～',
                '哇，好明亮啊！像阳光一样温暖☀️',
                '亮色模式开启！今天也是元气满满的一天！'
            ],
            dark: [
                '切换到深色模式了！夜晚模式启动🌙',
                '哇，好酷的黑色！像夜空一样神秘✨',
                '深色模式开启！保护眼睛，从我做起～'
            ],
            system: [
                '跟随系统主题了！智能切换，贴心～',
                '系统主题模式！让设备来决定吧～',
                '跟随系统设置，这样最自然了！'
            ]
        };

        const messages = themeMessages[newTheme as keyof typeof themeMessages] || themeMessages.system;
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        updateMessage(randomMessage, 'interaction');
    }, [updateMessage]);

    // 优化的阅读进度检测
    const detectReadingProgress = useCallback(() => {
        if (typeof window === 'undefined') return;
        
        // 节流处理
        if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
        }
        
        scrollTimeoutRef.current = setTimeout(() => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = Math.min((scrollTop / scrollHeight) * 100, 100);
            
            setReadingProgress(progress);
            
            // 只在关键进度点给出提示
            const keyPoints = [25, 50, 75];
            const currentPoint = keyPoints.find(point => 
                progress >= point && progress < point + 5
            );
            
            if (currentPoint) {
                const messages = {
                    25: '已经阅读了四分之一了呢，继续加油哦～',
                    50: '一半了！这篇文章很吸引人吧？',
                    75: '快要读完了呢，有什么感想吗？'
                };
                
                updateMessage(messages[currentPoint as keyof typeof messages]);
            }
        }, 200); // 200ms节流
    }, [updateMessage]);

    // 优化的页面停留时间检测
    const checkPageStayTime = useCallback(() => {
        const stayTime = Date.now() - pageStartTime;
        const stayMinutes = Math.floor(stayTime / 60000);
        
        const keyMinutes = [5, 10, 15, 30];
        const currentKey = keyMinutes.find(min => 
            stayMinutes >= min && stayMinutes < min + 1
        );
        
        if (currentKey) {
            const messages = {
                5: '你已经在这里停留了5分钟呢，天依很开心能陪伴你～',
                10: '10分钟了！看来你对这个内容很感兴趣呢～',
                15: '15分钟了！天依很享受这段共处的时光～',
                30: '半小时了！长时间阅读要注意休息眼睛哦～'
            };
            
            updateMessage(messages[currentKey as keyof typeof messages]);
        }
    }, [pageStartTime, updateMessage]);

    // 事件监听器
    useEffect(() => {
        // 监听主题切换
        live2dEventEmitter.on('themeChange', handleThemeChange);
        
        return () => {
            live2dEventEmitter.off('themeChange', handleThemeChange);
        };
    }, [handleThemeChange]);

    // 页面初始化完成后的处理
    useEffect(() => {
        if (!isLoading) {
            // 显示智能页面消息
            setTimeout(() => {
                showSmartPageMessage();
            }, 1000);
            
            // 延迟显示欢迎消息
            setTimeout(() => {
                updateMessage('天依已经准备好陪伴你啦～');
            }, 3000);
        }
    }, [isLoading, showSmartPageMessage, updateMessage]);

    // 阅读进度检测（仅在博客文章页面）
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const currentPath = window.location.pathname;
        const isBlogPostPage = currentPath.startsWith('/blogs/') && currentPath !== '/blogs';
        
        if (!isBlogPostPage) return;
        
        const handleScroll = () => {
            detectReadingProgress();
        };
        
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [detectReadingProgress]);

    // 页面停留时间检测
    useEffect(() => {
        const interval = setInterval(() => {
            checkPageStayTime();
        }, 60000); // 每分钟检查一次
        
        return () => clearInterval(interval);
    }, [checkPageStayTime]);

    // 清理函数
    useEffect(() => {
        return () => {
            // 清理所有定时器
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }
            if (interactionTimeoutRef.current) {
                clearTimeout(interactionTimeoutRef.current);
            }
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            
            // 清理消息队列
            messageQueueRef.current.clear();
            
            // 清理缓存
            preloaderRef.current.clearCache();
        };
    }, []);

    // 性能报告
    const getPerformanceReport = useCallback(() => {
        const metrics = performanceMonitorRef.current.getMetrics();
        const score = performanceMonitorRef.current.getPerformanceScore();
        
        return {
            metrics,
            score,
            isOptimized: score >= 80
        };
    }, []);

    // 移动端设备隐藏
    if (isMobileDevice) {
        return null;
    }

    return (
        <div 
            ref={containerRef}
            className={`fixed right-8 bottom-8 z-50 transition-all duration-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none'
            }`}
            style={{ 
                filter: 'drop-shadow(0 4px 20px rgba(0, 0, 0, 0.15))',
                contain: 'layout style paint' // 优化渲染性能
            }}
        >
            {/* 加载状态 */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-lg backdrop-blur-sm">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                        <div className="text-sm text-gray-600">天依加载中... {loadProgress}%</div>
                    </div>
                </div>
            )}
            
            {/* 消息气泡 */}
            {message && (
                <div 
                    className="absolute bottom-full mb-4 right-0 max-w-xs"
                    style={{ 
                        opacity: messageOpacity,
                        transition: 'opacity 0.3s ease-in-out',
                        contain: 'layout style paint'
                    }}
                >
                    <div className="bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200">
                        <div className="text-sm text-gray-800 leading-relaxed">{message}</div>
                        <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-white border-r border-b border-gray-200"></div>
                    </div>
                </div>
            )}
            
            {/* Live2D画布 */}
            <canvas
                ref={canvasRef}
                className="cursor-pointer hover:scale-105 transition-transform duration-200"
                width={280}
                height={250}
                style={{ 
                    contain: 'layout style paint',
                    willChange: 'transform' // 优化动画性能
                }}
            />
            
            {/* 交互状态指示器 */}
            {interactionState !== 'idle' && (
                <div className="absolute top-2 right-2 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
            )}
        </div>
    );
}