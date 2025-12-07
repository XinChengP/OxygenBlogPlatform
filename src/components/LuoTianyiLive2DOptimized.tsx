'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getAssetPath, getBasePath } from '../utils/assetUtils';
import { live2dEventEmitter } from '../utils/live2dEventEmitter';
import { cn } from '../utils/cn';

// 导入实例管理器
import { live2dInstanceManager } from '../utils/live2dInstanceManager';

// Live2D资源预加载器 - 与实例管理器集成
class Live2DResourcePreloader {
  private static instance: Live2DResourcePreloader;
  private preloadedResources: Set<string> = new Set();
  private preloadPromises: Map<string, Promise<void>> = new Map();
  private isPreloading: boolean = false;
  private instanceManager: typeof live2dInstanceManager;

  constructor() {
    this.instanceManager = live2dInstanceManager;
  }

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
    // 不清除实例管理器的缓存，保持跨页面状态
  }
}

// 消息队列管理器 - 增强版
class MessageQueueManager {
  private queue: Array<{message: string, type: string, priority: number}> = [];
  private isProcessing: boolean = false;
  private currentMessage: string = '';
  private messageCallback: ((message: string) => void) | null = null;
  private instanceManager: typeof live2dInstanceManager;
  private lastMessageTime: number = 0;

  constructor() {
    this.instanceManager = live2dInstanceManager;
  }

  setMessageCallback(callback: (message: string) => void) {
    this.messageCallback = callback;
  }

  addMessage(message: string, type: string = 'normal', priority: number = 1) {
    // 防抖处理
    const now = Date.now();
    if (now - this.lastMessageTime < 500) return;
    this.lastMessageTime = now;
    
    // 消息过滤
    const isDefaultMessage = message.includes('你好') && message.includes('洛天依') && message.includes('！');
    const isGenericGreeting = message === '你好～我是洛天依！' || 
                             message === '你好~我是洛天依！' ||
                             (message.includes('你好') && message.length < 15);
    
    if (isDefaultMessage || isGenericGreeting) return;
    
    this.queue.push({ message, type, priority });
    this.queue.sort((a, b) => b.priority - a.priority); // 高优先级优先
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      
      // 消息状态将在实例状态保存时一并处理
      
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
    this.lastMessageTime = 0;
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

interface LuoTianyiLive2DOptimizedProps {
  className?: string;
}

export default function LuoTianyiLive2DOptimized({ className }: LuoTianyiLive2DOptimizedProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [isVisible, setIsVisible] = useState(true);
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [message, setMessage] = useState('');
    const [messageOpacity, setMessageOpacity] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);
    const [currentPage, setCurrentPage] = useState('');
    const [readingProgress, setReadingProgress] = useState(0);
    const [interactionState, setInteractionState] = useState<'idle' | 'music' | 'theme' | 'page'>('idle');
    const [showCompatibilityWarning, setShowCompatibilityWarning] = useState(false);

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

    // 拖拽处理函数
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (isMinimized) return;
        
        setIsDragging(true);
        const startX = e.clientX - position.x;
        const startY = e.clientY - position.y;
        
        const handleMouseMove = (e: MouseEvent) => {
            setPosition({
                x: e.clientX - startX,
                y: e.clientY - startY
            });
        };
        
        const handleMouseUp = () => {
            setIsDragging(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [isMinimized, position]);

    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (isMinimized) return;
        
        setIsDragging(true);
        const touch = e.touches[0];
        const startX = touch.clientX - position.x;
        const startY = touch.clientY - position.y;
        
        const handleTouchMove = (e: TouchEvent) => {
            const touch = e.touches[0];
            setPosition({
                x: touch.clientX - startX,
                y: touch.clientY - startY
            });
        };
        
        const handleTouchEnd = () => {
            setIsDragging(false);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
        };
        
        document.addEventListener('touchmove', handleTouchMove);
        document.addEventListener('touchend', handleTouchEnd);
    }, [isMinimized, position]);

    const toggleMinimize = useCallback(() => {
        setIsMinimized(prev => !prev);
    }, []);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
    }, []);

    const handleRefresh = useCallback(() => {
        // 刷新Live2D模型
        if (canvasRef.current) {
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (context) {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }
        }
        
        // 重新初始化
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            updateMessage('刷新完成！天依重新上线啦～');
        }, 1000);
    }, [updateMessage]);

    // 设置消息回调 - 集成实例管理器
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
            const isMobileDevice = mobileKeywords.some(keyword => userAgent.includes(keyword));
            
            // 检查屏幕尺寸
            const isSmallScreen = window.innerWidth < 768;
            
            setIsMobileDevice(isMobileDevice || isSmallScreen);
            setIsMobile(isMobileDevice || isSmallScreen);
        };
        
        checkDevice();
        
        const handleResize = () => {
            checkDevice();
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // 浏览器兼容性检测
    useEffect(() => {
        const checkCompatibility = () => {
            // 检查WebGL支持
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                console.warn('[LuoTianyiLive2D] 浏览器不支持WebGL');
                setShowCompatibilityWarning(true);
                return;
            }
            
            // 检查Web Audio API支持
            if (!(window as any).AudioContext && !(window as any).webkitAudioContext) {
                console.warn('[LuoTianyiLive2D] 浏览器不支持Web Audio API');
            }
        };
        
        checkCompatibility();
    }, []);

    // 初始化Live2D - 优化版本
    useEffect(() => {
        if (isMobileDevice) return;
        
        performanceMonitorRef.current.startMonitoring();
        
        // 检查实例管理器中是否有保存的状态
        const instanceId = 'luotianyi-main';
        const savedState = live2dInstanceManager.getInstanceState(instanceId);
        if (savedState) {
            console.log('[LuoTianyiLive2D] 恢复保存的实例状态');
            setMessage(savedState.lastMessage || '');
            setIsLoading(false);
            return;
        }
        
        // 预加载资源
        preloaderRef.current.preloadLive2DResources(getAssetPath(''));
        
        // 加载Live2D脚本
        const loadLive2DScript = () => {
            return new Promise<void>((resolve) => {
                if ((window as any).live2d) {
                    resolve();
                    return;
                }
                
                const script = document.createElement('script');
                script.src = getAssetPath('/luotianyi-live2d-master/live2d/js/live2d.js');
                script.async = true;
                
                script.onload = () => {
                    console.log('[LuoTianyiLive2D] Live2D脚本加载成功');
                    resolve();
                };
                
                script.onerror = () => {
                    console.error('[LuoTianyiLive2D] Live2D脚本加载失败');
                    setIsLoading(false);
                    resolve();
                };
                
                document.head.appendChild(script);
            });
        };
        
        // 设置Live2D
        const setupLive2D = async () => {
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
                            
                            // 使用 requestAnimationFrame 优化渲染时机
                            requestAnimationFrame(() => {
                                setIsLoading(false);
                                performanceMonitorRef.current.recordInitializationComplete();
                                
                                // 显示欢迎消息
                                requestAnimationFrame(() => {
                                    updateMessage('天依已经准备好陪伴你啦～');
                                });
                            });
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
            setupLive2D();
        }, 500);
        
        return () => {
            clearTimeout(initTimer);
            if (initializationTimeoutRef.current) {
                clearTimeout(initializationTimeoutRef.current);
            }
        };
    }, [updateMessage, isMobileDevice]);

    // 监听页面变化
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const handleRouteChange = () => {
            const currentPath = window.location.pathname;
            setCurrentPage(currentPath);
            
            // 页面变化时显示智能消息
            const pageMessages: Record<string, string> = {
                '/': '欢迎来到首页！天依在这里等你～',
                '/about': '关于页面！想了解更多关于天依吗？',
                '/archive': '归档页面！这里有很多精彩内容～',
                '/guestbook': '留言板！给天依留言吧～',
                '/settings': '设置页面！可以调整天依的设置哦～',
                '/tools/pinyin-converter': '拼音转换器！天依来帮你转换拼音～',
                '/tools/markdown-editor': 'Markdown编辑器！天依陪你一起写作～'
            };
            
            const message = pageMessages[currentPath] || `来到了新页面！天依陪你探索${currentPath}～`;
            updateMessage(message, 'interaction');
        };
        
        // 初始页面检测
        handleRouteChange();
        
        // 监听路由变化（简化版本）
        const originalPushState = window.history.pushState;
        window.history.pushState = function(...args) {
            originalPushState.apply(this, args);
            setTimeout(handleRouteChange, 100);
        };
        
        window.addEventListener('popstate', handleRouteChange);
        
        return () => {
            window.history.pushState = originalPushState;
            window.removeEventListener('popstate', handleRouteChange);
        };
    }, [updateMessage]);

    // 监听复制事件
    useEffect(() => {
        const handleCopy = () => {
            updateMessage('复制成功！天依已经记录下来了～', 'interaction');
        };
        
        document.addEventListener('copy', handleCopy, true);
        return () => document.removeEventListener('copy', handleCopy, true);
    }, [updateMessage]);

    // 监听滚动事件
    const detectReadingProgress = useCallback(() => {
        if (typeof window === 'undefined') return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min((scrollTop / scrollHeight) * 100, 100);
        
        setReadingProgress(progress);
        
        // 阅读进度消息
        if (progress > 80) {
            updateMessage('你已经阅读了大部分内容，真厉害！', 'interaction');
        } else if (progress > 50) {
            updateMessage('阅读进度已经过半了，继续加油～', 'interaction');
        }
    }, [updateMessage]);

    // 主题切换处理
    const handleThemeChange = useCallback((event: any) => {
        const theme = typeof event === 'string' ? event : event?.data?.theme || 'default';
        const themeMessages: Record<string, string> = {
            'blue': '切换到蓝色主题！这是天依最喜欢的颜色～',
            'purple': '切换到紫色主题！神秘而优雅～',
            'pink': '切换到粉色主题！可爱又温馨～',
            'green': '切换到绿色主题！清新自然～',
            'orange': '切换到橙色主题！活力满满～',
            'red': '切换到红色主题！热情如火～',
            'yellow': '切换到黄色主题！阳光灿烂～',
            'indigo': '切换到靛蓝色主题！深邃优雅～',
            'teal': '切换到青色主题！清爽怡人～',
            'cyan': '切换到青色主题！清澈透明～'
        };
        
        const message = themeMessages[theme] || `切换到${theme}主题！天依很喜欢这个颜色～`;
        updateMessage(message, 'interaction');
    }, [updateMessage]);

    // 页面停留时间检测
    const checkPageStayTime = useCallback(() => {
        const stayTime = Math.floor((Date.now() - pageStartTime) / 1000 / 60); // 分钟
        
        const currentKey = stayTime >= 30 ? 30 : 
                          stayTime >= 15 ? 15 : 
                          stayTime >= 10 ? 10 : 
                          stayTime >= 5 ? 5 : null;
        
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
            // 延迟显示欢迎消息
            setTimeout(() => {
                updateMessage('天依已经准备好陪伴你啦～');
            }, 3000);
        }
    }, [isLoading, updateMessage]);

    // 阅读进度检测（仅在博客文章页面）
    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        const currentPath = window.location.pathname;
        const isBlogPostPage = currentPath.startsWith('/blogs/') && currentPath !== '/blogs';
        
        if (!isBlogPostPage) return;
        
        let lastScrollY = 0;
        let scrollTimeout: NodeJS.Timeout;
        
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            
            // 清除之前的定时器
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
            
            // 延迟执行，优化性能
            scrollTimeout = setTimeout(() => {
                if (currentScrollY > lastScrollY + 50) {
                    updateMessage('页面滚动得很快呢，在找什么吗？');
                } else if (currentScrollY > lastScrollY + 200) {
                    updateMessage('滚动得好快！有什么着急的事情吗？');
                }
                
                lastScrollY = currentScrollY;
                detectReadingProgress();
            }, 100);
        };
        
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeout) {
                clearTimeout(scrollTimeout);
            }
        };
    }, [detectReadingProgress, updateMessage]);

    // 页面停留时间检测
    useEffect(() => {
        const pageEnterTime = Date.now();
        
        const checkPageStayTime = () => {
            const stayTime = Date.now() - pageEnterTime;
            
            // 如果页面停留时间超过30分钟，显示消息
            if (stayTime > 30 * 60 * 1000) {
                updateMessage('你已经在这里停留了很长时间呢，记得休息一下哦～');
            }
        };
        
        const interval = setInterval(checkPageStayTime, 5 * 60 * 1000); // 每5分钟检查一次
        
        return () => clearInterval(interval);
    }, [updateMessage]);

    // 清理函数 - 优化生命周期管理
    useEffect(() => {
        return () => {
            console.log('[LuoTianyiLive2D] 组件卸载，开始清理工作');
            
            // 清理所有定时器
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
                fadeTimeoutRef.current = null;
            }
            if (interactionTimeoutRef.current) {
                clearTimeout(interactionTimeoutRef.current);
                interactionTimeoutRef.current = null;
            }
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
                scrollTimeoutRef.current = null;
            }
            
            // 清理消息队列
            messageQueueRef.current.clear();
            
            // 保存当前状态到实例管理器
            // 这里可以添加内存清理逻辑，但目前先记录警告
            
            // 清理预加载器缓存（保留实例管理器的缓存）
            preloaderRef.current.clearCache();
            
            // 清理DOM引用
            if (canvasRef.current) {
                canvasRef.current = null;
            }
            
            // 强制清理内存（如果可用）
            if ((window as any).gc) {
                try {
                    (window as any).gc();
                    console.log('[LuoTianyiLive2D] 执行垃圾回收');
                } catch (error) {
                    console.warn('[LuoTianyiLive2D] 垃圾回收执行失败:', error);
                }
            }
            
            console.log('[LuoTianyiLive2D] 清理工作完成');
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

    // 设置全局消息函数 - 保持与原版兼容
    useEffect(() => {
        // 保存原始函数（如果存在）
        const originalShowMessage = (window as any).showMessage;
        
        // 设置全局消息函数
        (window as any).showMessage = function(text: string, timeout?: number) {
            console.log('[LuoTianyiLive2D] 全局消息调用:', text);
            
            // 重要消息判断
            const isImportantMessage = text.includes('复制') || 
                                     text.includes('天依') || 
                                     text.includes('欢迎') ||
                                     text.includes('你好') ||
                                     text.includes('加油') ||
                                     text.includes('辛苦') ||
                                     text.includes('注意');
            
            // 触发频率限制
            const now = Date.now();
            const messageKey = `live2d_message_${Math.floor(now / 1000)}`;
            const lastMessageTime = sessionStorage.getItem(messageKey);
            
            if (lastMessageTime && !isImportantMessage) {
                console.log('[LuoTianyiLive2D] 消息频率限制，跳过:', text);
                return;
            }
            
            sessionStorage.setItem(messageKey, now.toString());
            
            // 使用内部消息系统显示
            updateMessage(text, 'interaction');
            
            // 自动淡出逻辑
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }
            
            fadeTimeoutRef.current = setTimeout(() => {
                setMessage('');
            }, timeout || 5000);
        };
        
        // 设置全局访问点
        (window as any).live2dOptimized = {
            showMessage: (window as any).showMessage,
            getPerformanceReport,
            messageQueue: messageQueueRef.current,
            isReady: () => !isLoading && !isError
        };
        
        console.log('[LuoTianyiLive2D] 全局消息函数已设置');
        
        return () => {
            // 恢复原始函数
            if (originalShowMessage) {
                (window as any).showMessage = originalShowMessage;
            } else {
                delete (window as any).showMessage;
            }
            
            // 清理全局访问点
            delete (window as any).live2dOptimized;
            
            console.log('[LuoTianyiLive2D] 全局消息函数已清理');
        };
    }, [updateMessage, getPerformanceReport, isLoading, isError]);

    // 智能页面消息
    const showSmartPageMessage = useCallback(() => {
        if (typeof window === 'undefined') return;
        
        const currentPath = window.location.pathname;
        const time = new Date().getHours();
        
        let message = '';
        
        // 时间相关的问候
        if (time >= 6 && time < 12) {
            message = '早上好！今天也要加油哦～';
        } else if (time >= 12 && time < 18) {
            message = '下午好！工作学习辛苦了～';
        } else if (time >= 18 && time < 22) {
            message = '晚上好！今天过得怎么样呢～';
        } else {
            message = '夜深了，注意休息哦～';
        }
        
        // 页面特定的消息
        const pageMessages: Record<string, string> = {
            '/': '欢迎来到首页！',
            '/about': '想了解更多关于天依吗？',
            '/archive': '这里有很多精彩内容～',
            '/guestbook': '给天依留言吧～',
            '/settings': '可以调整天依的设置哦～',
            '/tools/pinyin-converter': '天依来帮你转换拼音～',
            '/tools/markdown-editor': '天依陪你一起写作～'
        };
        
        if (pageMessages[currentPath]) {
            message += ' ' + pageMessages[currentPath];
        }
        
        updateMessage(message, 'interaction');
    }, [updateMessage]);

    // 移动端设备隐藏
    if (isMobileDevice) {
        return null;
    }

    // 导入兼容性警告组件
    const BrowserCompatibilityWarning = showCompatibilityWarning ? 
        require('./BrowserCompatibilityWarning').default : null;

    return (
        <>
            {BrowserCompatibilityWarning && (
                <BrowserCompatibilityWarning 
                    onDismiss={() => setShowCompatibilityWarning(false)}
                />
            )}
            
            <div className={cn(
                "fixed z-50 transition-all duration-300",
                isMinimized ? "w-16 h-16" : "w-80 h-96",
                isMobile ? "bottom-4 right-4" : "bottom-8 right-8",
                isDragging ? "cursor-grabbing" : "cursor-grab",
                className
            )}
            ref={containerRef}
            style={{
                left: position.x,
                top: position.y,
                transform: isDragging ? 'scale(1.05)' : 'scale(1)'
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            >
                {/* 主要内容 */}
                <canvas
                    ref={canvasRef}
                    id="live2d-main"
                    className={cn(
                        "w-full h-full rounded-lg transition-opacity duration-300",
                        isMinimized ? "opacity-0 pointer-events-none" : "opacity-100"
                    )}
                    width={300}
                    height={400}
                />
                
                {/* 控制按钮 */}
                <div className={cn(
                    "absolute top-2 right-2 flex flex-col space-y-1 transition-opacity duration-300",
                    isMinimized ? "opacity-0 pointer-events-none" : "opacity-100"
                )}>
                    <button
                        onClick={toggleMinimize}
                        className="w-8 h-8 bg-white/80 dark:bg-gray-800/80 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
                        title={isMinimized ? "展开" : "最小化"}
                    >
                        {isMinimized ? "🗖" : "🗕"}
                    </button>
                    
                    <button
                        onClick={toggleMute}
                        className="w-8 h-8 bg-white/80 dark:bg-gray-800/80 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
                        title={isMuted ? "开启声音" : "静音"}
                    >
                        {isMuted ? "🔇" : "🔊"}
                    </button>
                    
                    <button
                        onClick={handleRefresh}
                        className="w-8 h-8 bg-white/80 dark:bg-gray-800/80 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 shadow-sm"
                        title="刷新"
                    >
                        🔄
                    </button>
                </div>
                
                {/* 消息气泡 */}
                {message && (
                    <div className={cn(
                        "absolute top-12 left-1/2 transform -translate-x-1/2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs z-10 transition-all duration-300",
                        "border border-gray-200 dark:border-gray-700"
                    )}>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{message}</p>
                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white dark:bg-gray-800 rotate-45 border-r border-b border-gray-200 dark:border-gray-700"></div>
                    </div>
                )}
                
                {/* 加载指示器 */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-gray-900/50 rounded-lg">
                        <div className="flex flex-col items-center space-y-2">
                            <div className="w-8 h-8 border-4 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin"></div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">正在加载天依...</p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
