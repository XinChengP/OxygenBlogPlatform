'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getAssetPath, getBasePath } from '../utils/assetUtils';
import { live2dEventEmitter } from '../utils/live2dEventEmitter';
import live2dMessageManager, { Live2DMessageHelper } from '../utils/live2dMessageManager';
import {
  InteractionMessages
} from '../setting/live2dMessages';
import {
  loadScriptWithRetry,
  loadWithRetry,
  createProgressTracker,
  checkResourceExists,
  type LoadResult
} from '../utils/live2dLoader';

/**
 * 洛天依 Live2D 看板娘组件
 * 基于 stevenjoezhang/live2d-widget 和 unsignedzhang/luotianyi-live2d 实现
 */
interface LuoTianyiLive2DProps {
    // 是否处于隐藏状态（用于首页/404/后台等页面），隐藏时仍保持挂载
    hidden?: boolean;
}

export default function LuoTianyiLive2D({ hidden = false }: LuoTianyiLive2DProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef<boolean>(true); // 用于跟踪组件挂载状态
    const messageAbortRef = useRef<AbortController | null>(null); // 用于清理消息系统事件监听器

    // hidden 由路由控制，每次渲染时同步到 ref，供事件回调读取
    const hiddenRef = useRef<boolean>(hidden);
    hiddenRef.current = hidden;

    // 标记是否已经启动过 Live2D 加载，确保首次进入非隐藏页面后，后续切回隐藏页面不会卸载
    const hasLoadedRef = useRef<boolean>(false);

    const [isVisible, setIsVisible] = useState(true);
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [message, setMessage] = useState('');
    const [messageOpacity, setMessageOpacity] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [loadProgress, setLoadProgress] = useState(0);
    const [isModelReady, setIsModelReady] = useState(false); // 模型内部数据初始化完成才允许点击，防止 hitTest 报错
    const pageStartTimeRef = useRef(Date.now());

    // 自动淡出功能 - 必须在updateMessage之前定义
    const triggerFadeOut = useCallback(() => {
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
        }
        
        fadeTimeoutRef.current = setTimeout(() => {
            setMessageOpacity(0);
        }, 5000);
    }, []);

    // 消息更新函数 - 必须在其他使用它的函数之前定义
    const updateMessage = useCallback((newMessage: string, type: 'normal' | 'interaction' | 'fireworks' = 'normal') => {
        // 隐藏状态下不显示任何消息，避免在首页/404 等页面后台刷屏
        if (hiddenRef.current) {
            return;
        }

        // 确保 newMessage 是有效的字符串，避免 undefined 导致的错误
        if (!newMessage || typeof newMessage !== 'string' || newMessage.trim() === '') {
            return;
        }

        // 烟花模式下不显示消息（除非是烟花消息）
        if (type !== 'fireworks' && live2dMessageManager.isInFireworksMode()) {
            return;
        }

        // 过滤特定的默认问候语，允许其他正常消息和彩蛋消息显示
        const isDefaultMessage = newMessage.includes('你好') && newMessage.includes('洛天依') && newMessage.includes('！');
        const isGenericGreeting = newMessage === '你好～我是洛天依！' ||
                                 newMessage === '你好~我是洛天依！';

        if (isDefaultMessage || isGenericGreeting) {
            return;
        }

        setMessage(newMessage);
        setMessageOpacity(1);
        triggerFadeOut();

        // 确保 live2dMessageManager 的显示状态与实际消息显示状态同步
        if (typeof window !== 'undefined' && (window as any).live2dMessageManager) {
            const manager = (window as any).live2dMessageManager;
            // 重置 isDisplayingMessage 状态，确保后续消息能正常显示
            if (typeof manager.isDisplayingMessage !== 'undefined') {
                manager.isDisplayingMessage = false;
            }
        }
    }, [triggerFadeOut]);

    // 监听 hidden 变化，进入隐藏页面时清空当前消息，避免切回时闪现旧消息
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

    // 组件挂载和卸载清理
    useEffect(() => {
        // 组件挂载时设置为 true
        isMountedRef.current = true;

        // 清理所有定时器和事件监听器
        return () => {
            // 标记组件已卸载
            isMountedRef.current = false;

            // 清理所有定时器
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }

            // 清理消息系统事件监听器
            if (messageAbortRef.current) {
                messageAbortRef.current.abort();
                messageAbortRef.current = null;
            }

            // 清理全局事件监听器
            if (typeof window !== 'undefined') {
                // 清理可能存在的全局定时器
                if ((window as any).__live2dInterval) {
                    clearInterval((window as any).__live2dInterval);
                }
                if ((window as any).__live2dTimeout) {
                    clearTimeout((window as any).__live2dTimeout);
                }
            }
        };
    }, []);

    // 资源预加载函数 - 使用增强加载器
    const preloadLive2DResources = useCallback(async () => {
        const basePath = getAssetPath('/luotianyi-live2d-master');

        // 定义关键资源
        const criticalResources = [
            { url: `${basePath}/live2d/js/live2d.js`, type: 'script' as const },
            { url: `${basePath}/live2d/js/message.js`, type: 'script' as const },
            { url: `${basePath}/live2d/model/tianyi/model.json`, type: 'json' as const },
        ];

        // 创建进度追踪器，仅更新加载进度，不再输出调试日志
        const progressTracker = createProgressTracker(
            criticalResources.length,
            (progress) => {
                setLoadProgress(Math.round(progress));
            }
        );

        // 并行加载关键资源
        const loadPromises = criticalResources.map(async ({ url, type }) => {
            try {
                if (type === 'script') {
                    const result = await loadScriptWithRetry(url, {
                        retryCount: 3,
                        timeout: 30000,
                        retryDelay: 1000
                    });
                    progressTracker.onItemLoaded(result.success);
                    return result.success;
                } else {
                    const result = await loadWithRetry(url, {
                        retryCount: 3,
                        cache: true,
                        timeout: 20000
                    });
                    progressTracker.onItemLoaded(result.success);
                    return result.success;
                }
            } catch {
                progressTracker.onItemLoaded(false);
                return false;
            }
        });

        const results = await Promise.all(loadPromises);
        const successCount = results.filter(r => r).length;

        // 如果关键资源加载失败，记录错误
        if (successCount < criticalResources.length) {
            const failedResources = criticalResources
                .filter((_, index) => !results[index])
                .map(r => r.url);
            console.error('[Live2D] 以下资源加载失败:', failedResources);
        }

        return successCount === criticalResources.length;
    }, []);

    // 自动淡出功能 - 已移至前面定义，避免循环依赖

    // 获取当前页面类型和路径
    const getCurrentPageInfo = useCallback(() => {
        if (typeof window === 'undefined') return { page: '', path: '' };

        const path = window.location.pathname;
        // 页面映射表 - 包含所有现有页面
        const pageMap: { [key: string]: string } = {
            '/': '首页',
            '/about': '关于页面',
            '/archive': '归档页面',
            '/guestbook': '留言板',
            '/settings': '设置页面',
            '/tools': '工具页面',
            '/blogs': '博客文章',
            '/gallery': '画廊页面',
            '/moments': '个人动态',
            '/changelogs': '更新日志',
            '/friends': '友链页面',
            '/links': '相关链接'
        };

        let pageType = '其他页面';
        for (const [route, name] of Object.entries(pageMap)) {
            if (path.startsWith(route)) {
                pageType = name;
                break;
            }
        }

        // 特殊处理博客文章页面（具体文章页）
        if (path.startsWith('/blogs/') && path !== '/blogs') {
            pageType = '博客文章';
        }

        // 特殊处理工具子页面
        if (path.startsWith('/tools/')) {
            pageType = '工具页面';
        }

        return { page: pageType, path };
    }, []);

    // 获取当前主题类名
    const getCurrentThemeClass = useCallback(() => {
        if (typeof window === 'undefined') return '';
        return document.documentElement.classList.contains('dark') ? 'dark' : '';
    }, []);

    // 智能页面感知提示（使用新的消息配置系统）
    const showSmartPageMessage = useCallback(() => {
        const { page } = getCurrentPageInfo();
        // 使用新的智能消息助手
        Live2DMessageHelper.showSmartPageMessage(page);
    }, [getCurrentPageInfo]);

    // 页面停留时间提示（使用新的消息系统）
    const checkPageStayTime = useCallback(() => {
        const stayTime = Date.now() - pageStartTimeRef.current;
        const stayMinutes = Math.floor(stayTime / 60000);
        Live2DMessageHelper.showStayTimeMessage(stayMinutes);
    }, []);

    // 阅读进度检测（使用新的消息系统）
    const detectReadingProgress = useCallback(() => {
        if (typeof window === 'undefined') return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min((scrollTop / scrollHeight) * 100, 100);
        
        Live2DMessageHelper.showReadingProgress(progress);
    }, []);

    // 组件加载确认
    useEffect(() => {
        if (typeof window !== 'undefined') {
            // 获取当前页面信息并显示智能提示 - 增加延迟，避免与欢迎消息冲突
            setTimeout(() => {
                showSmartPageMessage();
            }, 3000); // 从 1.5 秒增加到 3 秒
        }
    }, [showSmartPageMessage]);



    // 处理主题切换事件（使用新的消息系统）
    const handleThemeChange = useCallback((event: any) => {
        if (!event.data) {
            return;
        }

        const { newTheme } = event.data;

        // 添加防抖机制，避免短时间内重复触发
        const now = Date.now();
        const lastThemeChangeTime = (window as any).__lastThemeChangeTime || 0;
        if (now - lastThemeChangeTime < 1000) {
            return;
        }
        (window as any).__lastThemeChangeTime = now;

        // 使用新的消息系统显示主题消息
        Live2DMessageHelper.showThemeMessage(newTheme as 'light' | 'dark' | 'system');
    }, []);



    // 页面停留时间检测
    useEffect(() => {
        const interval = setInterval(() => {
            checkPageStayTime();
        }, 60000); // 每分钟检查一次

        return () => clearInterval(interval);
    }, [checkPageStayTime]);

    // 阅读进度检测 - 只在具体博客文章页面启用，不在博客导航页面显示
    useEffect(() => {
        // 只在具体博客文章页面启用阅读进度检测
        // pathname === '/blogs' 是博客导航页面，应该禁用
        // pathname.startsWith('/blogs/') 是具体文章页面，应该启用
        if (typeof window === 'undefined') return;

        const currentPath = window.location.pathname;
        const isBlogPostPage = currentPath.startsWith('/blogs/') && currentPath !== '/blogs';

        if (!isBlogPostPage) {
            return;
        }

        let lastProgressMessage = 0; // 记录最后一条进度消息的时间，避免重复
        const handleScroll = () => {
            const now = Date.now();
            if (now - lastProgressMessage < 10000) return; // 10 秒内不重复显示进度消息

            detectReadingProgress();
            lastProgressMessage = now;
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [detectReadingProgress]);

    // 页面可见性变化检测（使用新的消息系统）
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                // 页面隐藏时记录时间
                const hiddenTime = Date.now();
                (window as any).__pageHiddenTime = hiddenTime;
            } else {
                // 页面显示时给出欢迎回来提示
                const hiddenTime = (window as any).__pageHiddenTime;
                if (hiddenTime && (Date.now() - hiddenTime) > 30000) {
                    // 如果隐藏时间超过30秒，显示欢迎回来消息
                    Live2DMessageHelper.showWelcomeMessage('WELCOME_BACK');
                }
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    }, []);

    // 复制内容检测（使用新的消息系统）
    useEffect(() => {
        const handleCopy = (event: ClipboardEvent) => {
            // 添加处理标记，避免与原生 message.js 冲突
            const marker = document.createElement('div');
            marker.setAttribute('data-live2d-copy-handled', 'true');
            marker.style.display = 'none';
            document.body.appendChild(marker);

            // 延迟检查，确保复制操作已完成
            setTimeout(() => {
                const selection = window.getSelection()?.toString();
                const clipboardData = event.clipboardData?.getData('text/plain');
                const copiedContent = selection || clipboardData || '';

                if (copiedContent.length > 10) {
                    // 使用新的消息系统显示复制消息
                    Live2DMessageHelper.showCopyMessage();
                }

                // 清理标记
                setTimeout(() => {
                    if (marker.parentNode) {
                        marker.parentNode.removeChild(marker);
                    }
                }, 1000);
            }, 100); // 100ms 延迟确保复制操作完成
        };

        if (typeof document !== 'undefined') {
            // 使用捕获阶段监听，确保能捕获到所有复制事件
            document.addEventListener('copy', handleCopy, true);
            return () => document.removeEventListener('copy', handleCopy, true);
        }
    }, []);

    const loadLive2D = useCallback(async () => {
        // 检查组件是否仍然挂载
        if (!isMountedRef.current) {
            return;
        }

        const startTime = performance.now();

        try {
            // 第一步：预加载资源
            const preloadSuccess = await preloadLive2DResources();

            if (!preloadSuccess) {
                console.warn('[LuoTianyiLive2D] 部分资源预加载失败，尝试继续加载...');
            }

            // 设置全局变量供 message.js 使用 - 必须在脚本加载之前设置
            if (typeof window !== 'undefined') {
                (window as any).message_Path = getAssetPath('/luotianyi-live2d-master/live2d/');
                (window as any).home_Path = window.location.origin;
            }

            // 使用 assetUtils 中的 getAssetPath 函数处理路径
            const live2dPath = getAssetPath('/luotianyi-live2d-master/live2d');
            const messagePath = live2dPath;
            const basePath = getBasePath();

            // 检查关键资源是否存在
            const live2dJsUrl = `${live2dPath}/js/live2d.js`;
            const messageJsUrl = `${messagePath}/js/message.js`;

            const [live2dExists] = await Promise.all([
                checkResourceExists(live2dJsUrl),
                checkResourceExists(messageJsUrl)
            ]);

            if (!live2dExists) {
                throw new Error(`核心脚本不存在: ${live2dJsUrl}`);
            }

            // 辅助函数：检查脚本是否已加载，避免重复注入
            const isScriptLoaded = (src: string) => !!document.querySelector(`script[src="${src}"]`);

            // 并行加载核心脚本（预加载阶段可能已经加载过，这里做去重检查）
            const [live2dResult, messageResult] = await Promise.all([
                isScriptLoaded(live2dJsUrl)
                    ? { success: true, loadTime: 0, retryCount: 0, error: undefined } as LoadResult<void>
                    : loadScriptWithRetry(live2dJsUrl, {
                        retryCount: 3,
                        timeout: 30000,
                        retryDelay: 1000
                    }),
                isScriptLoaded(messageJsUrl)
                    ? { success: true, loadTime: 0, retryCount: 0, error: undefined } as LoadResult<void>
                    : loadScriptWithRetry(messageJsUrl, {
                        retryCount: 3,
                        timeout: 30000,
                        retryDelay: 1000
                    })
            ]);
            
            if (!live2dResult.success) {
                throw new Error(`Live2D核心脚本加载失败: ${live2dResult.error?.message}`);
            }
            
            if (!messageResult.success) {
                console.warn('[LuoTianyiLive2D] 消息脚本加载失败，继续加载模型...');
            }

            // 等待 DOM 准备，增加重试机制
            let retries = 0;
            const maxRetries = 10;
            while (!canvasRef.current && retries < maxRetries && isMountedRef.current) {
                await new Promise(resolve => setTimeout(resolve, 100));
                retries++;
            }

            // 再次检查组件是否仍然挂载
            if (!isMountedRef.current) {
                return;
            }

            if (!canvasRef.current) {
                console.error('[LuoTianyiLive2D] Canvas 元素未找到，重试次数:', retries);
                // 不抛出错误，而是优雅地处理，显示友好的提示
                setMessage('天依初始化中，请稍后再试～');
                setMessageOpacity(1);
                setIsLoading(false);
                return; // 提前返回，避免后续代码执行出错
            }

            if (!window.loadlive2d) {
                throw new Error('Live2D 库未正确加载');
            }

            // 加载模型
            const modelPath = getAssetPath('/luotianyi-live2d-master/live2d/model/tianyi/model.json');

            // 先检查模型文件是否存在
            const modelExists = await checkResourceExists(modelPath);
            if (!modelExists) {
                throw new Error(`模型文件不存在: ${modelPath}`);
            }

            // 加载模型（带超时）
            const modelLoadPromise = new Promise<void>((resolve, reject) => {
                const timeoutId = setTimeout(() => {
                    reject(new Error('模型加载超时'));
                }, 30000);

                try {
                    (window as any).loadlive2d("live2d", modelPath);

                    // 检查模型是否成功加载
                    const checkInterval = setInterval(() => {
                        // 如果 Live2D 对象存在，说明加载成功
                        if ((window as any).Live2D) {
                            clearInterval(checkInterval);
                            clearTimeout(timeoutId);
                            resolve();
                        }
                    }, 100);

                    // 5 秒后如果还没检测到，也认为是成功的
                    setTimeout(() => {
                        clearInterval(checkInterval);
                        clearTimeout(timeoutId);
                        resolve();
                    }, 5000);

                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(error);
                }
            });

            await modelLoadPromise;

            // 设置消息显示（传入 AbortController 以便组件卸载时清理事件监听器）
            if (messageAbortRef.current) {
                messageAbortRef.current.abort();
            }
            messageAbortRef.current = new AbortController();
            setupMessageSystem(basePath, messageAbortRef.current.signal);

            // 延迟隐藏加载状态，确保模型完全渲染
            setTimeout(() => {
                setIsLoading(false);
            }, 800);

            // 额外延迟 2 秒后标记模型就绪，确保 hitTest 内部数据完全初始化
            setTimeout(() => {
                if (isMountedRef.current) {
                    setIsModelReady(true);
                }
            }, 2000);

        } catch (error) {
            console.error('[LuoTianyiLive2D] 加载 Live2D 失败:', error);

            // 显示友好的错误消息
            setMessage('天依加载失败了，刷新页面试试～');
            setMessageOpacity(1);

            // 延迟隐藏加载状态
            setTimeout(() => {
                setIsLoading(false);
            }, 2000);
        }
    }, [preloadLive2DResources]);

    // 主要的 Live2D 初始化 useEffect
    useEffect(() => {
        // 隐藏页面不启动加载，避免在首页/404 等页面初始化 Live2D
        if (hidden) {
            return;
        }

        // 已经加载过则不再重复加载，保证切回隐藏页面再切出时不会重新加载
        if (hasLoadedRef.current) {
            return;
        }
        hasLoadedRef.current = true;
        
        // 启动上下文感知消息监听
        live2dMessageManager.startContextListening();

        // 检查是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        setIsMobileDevice(isMobile);

        if (isMobile) {
            setIsVisible(false);
            return;
        }

        setIsVisible(true);

        // 用于存储事件监听器，以便在卸载时清理
        const eventListeners: Array<{ type: string; listener: EventListenerOrEventListenerObject }> = [];

        // 使用更智能的加载策略
        const initLive2D = () => {
            // 检查组件是否仍然挂载
            if (!isMountedRef.current) {
                return;
            }

            // 确保页面完全加载后再初始化
            if (document.readyState === 'complete') {
                loadLive2D();
            } else if (document.readyState === 'interactive') {
                // DOM 已加载，但资源还在加载中
                const loadHandler = () => {
                    setTimeout(() => {
                        if (isMountedRef.current) {
                            loadLive2D();
                        }
                    }, 300); // 延迟 300ms 确保其他关键资源加载
                };
                window.addEventListener('load', loadHandler);
                eventListeners.push({ type: 'load', listener: loadHandler });
            } else {
                // 页面还在加载中
                const domContentLoadedHandler = () => {
                    setTimeout(() => {
                        if (isMountedRef.current) {
                            loadLive2D();
                        }
                    }, 500); // 延迟 500ms 确保 DOM 完全就绪
                };
                document.addEventListener('DOMContentLoaded', domContentLoadedHandler);
                eventListeners.push({ type: 'DOMContentLoaded', listener: domContentLoadedHandler });
            }
        };

        // 触发 Live2D 加载
        try {
            initLive2D();
        } catch (error) {
            console.error('[LuoTianyiLive2D] loadLive2D failed:', error);
        }

        // 返回清理函数
        return () => {
            // 清理添加的事件监听器
            eventListeners.forEach(({ type, listener }) => {
                if (type === 'load') {
                    window.removeEventListener(type, listener);
                } else {
                    document.removeEventListener(type, listener);
                }
            });
        };
    }, [loadLive2D, hidden]);



    // 监听 Live2D 事件
    useEffect(() => {
        const unsubscribeTheme = live2dEventEmitter.on('theme-change', handleThemeChange);

        // 监听自定义消息事件
        const unsubscribeCustom = live2dEventEmitter.on('custom-message', (event: any) => {
            // 处理事件数据，可能是字符串或包含 message 属性的对象
            const message = typeof event === 'string' ? event : (event?.message || event?.data?.message || '收到消息啦～');
            updateMessage(message);
        });

        // 监听音乐播放事件（使用新的消息系统）
        const unsubscribeMusicPlay = live2dEventEmitter.on('music-play', () => {
            Live2DMessageHelper.showMusicMessage('PLAY');
        });

        const unsubscribeMusicPause = live2dEventEmitter.on('music-pause', () => {
            Live2DMessageHelper.showMusicMessage('PAUSE');
        });

        return () => {
            unsubscribeTheme();
            unsubscribeCustom();
            unsubscribeMusicPlay();
            unsubscribeMusicPause();
        };
    }, [handleThemeChange, updateMessage]);

    const setupMessageSystem = (_basePath: string, signal: AbortSignal) => {
        // 如果组件已卸载，跳过初始化
        if (signal.aborted) {
            return;
        }

        // 确保消息系统只初始化一次
        if ((window as any).messageSystemInitialized) {
            return;
        }

        (window as any).messageSystemInitialized = true;

        // 设置洛天依的消息系统，适配网站主题
        // 重写消息显示函数以支持自动淡出

        // 添加触发频率限制机制
        const triggerLimits = {
            mouseover: new Map<string, number>(), // 记录每个选择器的最后触发时间
            click: new Map<string, number>()
        };

        const THROTTLE_DELAY = 2000; // 2 秒内只允许触发一次

        // 确保 window.showMessage 与 live2dMessageManager 状态同步
        (window as any).showMessage = (msg: string) => {
            // 调用 updateMessage 显示消息
            // 确保只传递有效的字符串，避免 undefined
            if (msg && typeof msg === 'string' && msg.trim() !== '') {
                // 检查是否在烟花模式下，如果是，传递 'fireworks' 类型
                const isFireworksMode = live2dMessageManager.isInFireworksMode();
                const messageType = isFireworksMode ? 'fireworks' : 'normal';
                updateMessage(msg, messageType);
            }

            // 重置 live2dMessageManager 的显示状态，确保后续消息能正常显示
            if (typeof window !== 'undefined' && (window as any).live2dMessageManager) {
                const manager = (window as any).live2dMessageManager;
                // 如果 manager 有 isDisplayingMessage 属性，重置它
                if (typeof manager.isDisplayingMessage !== 'undefined') {
                    manager.isDisplayingMessage = false;
                }
            }
        };

        // 使用新的消息配置系统
        const messageConfig = {
            mouseover: [
                {
                    selector: ".title a, h1, h2, h3",
                    text: InteractionMessages.TITLE_HOVER.messages
                },
                {
                    selector: ".searchbox, input[type='search']",
                    text: InteractionMessages.SEARCH_HOVER.messages
                },
                {
                    selector: "nav a, .nav-link, .navigation a, header a, .navbar a, .menu-item a",
                    text: InteractionMessages.NAVIGATION_HOVER.messages
                }
            ],
            click: [
                {
                    selector: "#landlord #live2d",
                    text: InteractionMessages.LIVE2D_CLICK.messages
                }
            ]
        };

        // 重写消息系统以支持频率限制
        const setupThrottledEvents = () => {
            // 如果组件已卸载，跳过事件绑定
            if (signal.aborted) {
                return;
            }

            // 获取全局的showMessage函数
            const globalShowMessage = (window as any).showMessage;

            // 辅助函数：渲染消息模板
            const renderTip = (text: string, data: any) => {
                if (data && data.text) {
                    // 确保只替换为有效的字符串，避免undefined
                    const replacementText = data.text || '';
                    return text.replace(/{text}/g, replacementText);
                }
                return text;
            };

            // 为mouseover事件添加节流
            messageConfig.mouseover.forEach((tips: any) => {
                // 使用事件委托实现
                const handler = (e: Event) => {
                    // 检查是否处于烟花模式，如果是则跳过
                    if (live2dMessageManager.isInFireworksMode()) {
                        return;
                    }

                    const target = e.target as HTMLElement;
                    if (target.matches(tips.selector)) {
                        e.stopPropagation();

                        // 检查触发频率限制
                        const now = Date.now();
                        const lastTrigger = triggerLimits.mouseover.get(tips.selector) || 0;

                        if (now - lastTrigger < THROTTLE_DELAY) {
                            return; // 跳过这次触发
                        }

                        // 更新最后触发时间
                        triggerLimits.mouseover.set(tips.selector, now);

                        let text = tips.text;
                        if (Array.isArray(tips.text)) {
                            text = tips.text[Math.floor(Math.random() * tips.text.length)];
                        }
                        text = renderTip(text, { text: target.textContent || '' });

                        // 使用全局showMessage函数
                        if (globalShowMessage) {
                            globalShowMessage(text, 3000);
                        }
                    }
                };
                document.addEventListener('mouseover', handler, { signal } as any);
            });

            // 为click事件添加节流
            messageConfig.click.forEach((tips: any) => {
                // 使用事件委托实现
                const handler = (e: Event) => {
                    // 检查是否处于烟花模式，如果是则跳过
                    if (live2dMessageManager.isInFireworksMode()) {
                        return;
                    }

                    const target = e.target as HTMLElement;
                    if (target.matches(tips.selector)) {
                        e.stopPropagation();

                        // 检查触发频率限制
                        const now = Date.now();
                        const lastTrigger = triggerLimits.click.get(tips.selector) || 0;

                        if (now - lastTrigger < THROTTLE_DELAY) {
                            return; // 跳过这次触发
                        }

                        // 更新最后触发时间
                        triggerLimits.click.set(tips.selector, now);

                        let text = tips.text;
                        if (Array.isArray(tips.text)) {
                            text = tips.text[Math.floor(Math.random() * tips.text.length)];
                        }
                        text = renderTip(text, { text: target.textContent || '' });

                        // 使用全局showMessage函数
                        if (globalShowMessage) {
                            globalShowMessage(text, 3000);
                        }
                    }
                };
                document.addEventListener('click', handler, { signal } as any);
            });
        };

        // 将配置应用到窗口对象，支持GitHub Pages部署
        // 使用assetUtils中的getAssetPath函数处理路径
        (window as any).message_Path = getAssetPath('/luotianyi-live2d-master/live2d/');
        (window as any).home_Path = window.location.origin;
        (window as any).messageConfig = messageConfig;

        // 延迟初始化消息系统，确保DOM完全加载
        const timeoutId = setTimeout(() => {
            if (!signal.aborted) {
                // 使用自定义的节流事件系统替代原始initTips
                setupThrottledEvents();
            }
        }, 1000);

        // signal被abort时清理setTimeout
        signal.addEventListener('abort', () => {
            clearTimeout(timeoutId);
        });
    };

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    /**
     * 刷新 Live2D 看板娘
     * 重新加载模型和脚本
     */
    const refreshLive2D = useCallback(async () => {
        // 防止重复点击
        if (isLoading) {
            return;
        }

        // 显示刷新提示消息
        setMessage('天依正在重新加载～');
        setMessageOpacity(1);

        // 重置加载状态
        setIsLoading(true);
        setLoadProgress(0);
        setIsModelReady(false);

        try {
            // 清除可能存在的旧 Live2D 实例
            if (typeof window !== 'undefined') {
                // 清除全局消息系统标记
                (window as any).messageSystemInitialized = false;

                // 如果有 Live2D 实例，尝试清理
                const live2DInstance = (window as any).Live2D;
                if (live2DInstance && live2DInstance.dispose) {
                    try {
                        live2DInstance.dispose();
                    } catch {
                        // 清理旧实例时出错，忽略
                    }
                }
            }

            // 清理旧的消息系统事件监听器
            if (messageAbortRef.current) {
                messageAbortRef.current.abort();
                messageAbortRef.current = null;
            }

            // 延迟一下确保清理完成
            await new Promise(resolve => setTimeout(resolve, 300));

            // 重新加载 Live2D
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
                className={`landlord ${getCurrentThemeClass()}`}
                style={{
                    // 路由隐藏或用户主动隐藏时都不显示，但保持组件挂载
                    display: (hidden || !isVisible) ? 'none' : 'block',
                }}
            >
                {/* 加载进度指示器 - 取消阴影效果 */}
                {isLoading && (
                    <div 
                        className={`loading-overlay ${getCurrentThemeClass()}`}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'transparent', // 改为透明背景，取消阴影
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '12px',
                            zIndex: 10002
                        }}
                    >
                        <div style={{
                            textAlign: 'center',
                            color: '#66ccff', // 使用主题色，提高可见性
                            fontSize: '12px',
                            background: 'rgba(255, 255, 255, 0.9)', // 添加轻微背景提高可读性
                            padding: '10px',
                            borderRadius: '8px',
                            border: '1px solid rgba(102, 204, 255, 0.3)'
                        }}>
                            <div style={{
                                width: '40px', // 减小加载动画大小
                                height: '40px',
                                border: '3px solid rgba(102, 204, 255, 0.3)',
                                borderTop: '3px solid rgba(102, 204, 255, 1)',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                                margin: '0 auto 6px'
                            }}></div>
                            <div>加载中... {loadProgress}%</div>
                        </div>
                    </div>
                )}
                
                <div 
                    className={`message ${getCurrentThemeClass()}`} 
                    style={{ 
                        opacity: messageOpacity,
                        position: 'absolute',
                        top: '-20px',
                        left: '50px',
                        display: (message && typeof message === 'string' && message.trim() !== '') ? 'block' : 'none',
                        transition: 'opacity 0.5s ease-in-out',
                        background: 'rgba(102, 204, 255, 0.2)',
                        padding: '7px',
                        borderRadius: '12px',
                        border: '1px solid rgba(102,204,255,.4)',
                        boxShadow: '0 3px 15px 2px rgba(102,204,255,.4)',
                        color: 'var(--aplayer-fg)',
                        fontSize: '13px',
                        maxWidth: '300px',
                        wordWrap: 'break-word',
                        zIndex: 10001 // 统一使用最高层级，避免被其他动画元素覆盖
                    }}
                >
                    {message || ''}
                </div>
                
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
                
                <div 
                    className={`hide-button ${getCurrentThemeClass()}`}
                    onClick={toggleVisibility}
                >
                    隐藏
                </div>
                
                {/* 刷新按钮 - 重新加载 Live2D */}
                <div 
                    className={`refresh-button ${getCurrentThemeClass()} ${isLoading ? 'loading' : ''}`}
                    onClick={refreshLive2D}
                    title={isLoading ? '加载中...' : '重新加载天依'}
                    style={{
                        opacity: isLoading ? 0.6 : 1,
                        cursor: isLoading ? 'not-allowed' : 'pointer',
                        pointerEvents: isLoading ? 'none' : 'auto'
                    }}
                >
                    <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className="refresh-icon"
                    >
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                    </svg>
                    {isLoading ? '加载中' : '刷新'}
                </div>
            </div>
        </>
    );
}

// 扩展Window类型以包含Live2D相关对象
declare global {
    interface Window {
        loadlive2d?: (canvasId: string, modelPath: string) => void;
        jQuery?: any;
        $?: any;
        message_Path?: string;
        home_Path?: string;
        messageConfig?: any;
        showMessage?: (msg: string, timeout?: number) => void;
        live2dMessageManager?: any;
        __luotianyiWelcomeShown?: boolean;
        __lastThemeChangeTime?: number;
    }
}

// 添加CSS动画样式
const Live2DStyles = () => (
    <style jsx global>{`
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        /* 刷新按钮旋转动画 */
        @keyframes refresh-spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(-360deg); }
        }
        
        /* 刷新按钮加载状态 */
        .refresh-button.loading .refresh-icon {
            animation: refresh-spin 1s linear infinite;
        }
        
        /* 刷新按钮禁用状态 */
        .refresh-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
    `}</style>
);