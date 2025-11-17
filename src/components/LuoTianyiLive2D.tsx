'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getAssetPath, getBasePath } from '../utils/assetUtils';
import { live2dEventEmitter } from '../utils/live2dEventEmitter';

/**
 * 洛天依Live2D看板娘组件
 * 基于stevenjoezhang/live2d-widget和unsignedzhang/luotianyi-live2d实现
 */
export default function LuoTianyiLive2D() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastMessageTimeRef = useRef<number>(0);
    
    const [isVisible, setIsVisible] = useState(true);
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [message, setMessage] = useState('');
    const [messageOpacity, setMessageOpacity] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    // 关键调试：确认组件被挂载
    useEffect(() => {
        console.log('[LuoTianyiLive2D] 🎯 组件已挂载！组件实例创建成功');
        console.log('[LuoTianyiLive2D] 组件状态:', {
            isLoading,
            isMobileDevice,
            hasCanvas: !!canvasRef.current,
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent.substring(0, 50) : 'undefined'
        });
        
        return () => {
            console.log('[LuoTianyiLive2D] 🎯 组件即将卸载');
        };
    }, []);

    // 自动淡出功能
    const triggerFadeOut = useCallback(() => {
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
        }
        
        fadeTimeoutRef.current = setTimeout(() => {
            setMessageOpacity(0);
        }, 5000);
    }, []);

    // 消息更新函数定义提前，避免useEffect中调用时未定义
    const updateMessage = useCallback((newMessage: string) => {
        // 修复：改进消息过滤逻辑，更好地处理中文消息
        const isDefaultMessage = newMessage.includes('你好') && newMessage.includes('洛天依') && newMessage.includes('！');
        const isGenericGreeting = newMessage === '你好～我是洛天依！' || 
                                 newMessage === '你好~我是洛天依！' ||
                                 (newMessage.includes('你好') && newMessage.length < 15);
        
        // 只过滤掉真正的默认问候语，允许其他正常消息显示
        if (isDefaultMessage || isGenericGreeting) {
            return;
        }
        
        setMessage(newMessage);
        setMessageOpacity(1);
        lastMessageTimeRef.current = Date.now();
        triggerFadeOut();
    }, [triggerFadeOut]);

    // 组件加载确认
    useEffect(() => {
        console.log('[LuoTianyiLive2D] 组件开始加载');
        if (typeof window !== 'undefined') {
            console.log('[LuoTianyiLive2D] 在浏览器环境中运行');
            window.console.log('[LuoTianyiLive2D] 浏览器控制台日志测试');
            
            // 显示一条中性的欢迎消息，不包含主题相关提示
            updateMessage('天依已上线！很高兴见到你～');
            
            // 延迟显示功能提示，但不提及主题
            setTimeout(() => {
                updateMessage('今天也是元气满满的一天呢！');
            }, 3000);
        }
    }, [updateMessage]);

    // 强制更新函数
    const forceUpdate = useCallback(() => {
        setMessage(prev => prev);
    }, []);

    // 处理主题切换事件
    const handleThemeChange = useCallback((event: any) => {
        console.log(`[LuoTianyiLive2D] 收到主题切换事件:`, event);
        console.log(`[LuoTianyiLive2D] 事件数据:`, event.data);
        
        if (!event.data) {
            console.log(`[LuoTianyiLive2D] 警告: 事件数据为空`);
            return;
        }
        
        const { newTheme, previousTheme, isDark, isLight } = event.data;
        
        // 添加防抖机制，避免短时间内重复触发
        const now = Date.now();
        const lastThemeChangeTime = (window as any).__lastThemeChangeTime || 0;
        if (now - lastThemeChangeTime < 1000) { // 1秒内不重复处理
            console.log(`[LuoTianyiLive2D] 主题切换被防抖过滤: ${previousTheme} -> ${newTheme}`);
            return;
        }
        (window as any).__lastThemeChangeTime = now;
        
        console.log(`[LuoTianyiLive2D] 新主题: ${newTheme}, 旧主题: ${previousTheme}`);
        
        const themeMessages = {
            light: [
                '切换到亮色模式了！眼睛会舒服一些～',
                '哇，好明亮啊！像阳光一样温暖☀️',
                '亮色模式开启！今天也是元气满满的一天！',
                '切换到亮色主题了，很适合白天使用呢～'
            ],
            dark: [
                '切换到深色模式了！夜晚模式启动🌙',
                '哇，好酷的黑色！像夜空一样神秘✨',
                '深色模式开启！保护眼睛，从我做起～',
                '切换到深色主题了，很适合夜晚浏览哦～'
            ],
            system: [
                 '跟随系统主题了！智能切换，贴心～',
                '系统主题模式！让设备来决定吧～',
                '跟随系统设置，这样最自然了！'
            ]
        };

        const messages = themeMessages[newTheme as keyof typeof themeMessages] || themeMessages.system;
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        console.log(`[LuoTianyiLive2D] 选择消息: ${randomMessage}`);
        console.log(`[LuoTianyiLive2D] 当前消息状态:`, { message, messageOpacity });
        
        // 强制显示主题消息，绕过所有过滤
        console.log(`[LuoTianyiLive2D] 强制显示主题消息`);
        setMessage(randomMessage);
        setMessageOpacity(1);
        lastMessageTimeRef.current = Date.now();
        triggerFadeOut();
        
        forceUpdate();
        
        console.log(`[LuoTianyiLive2D] 主题切换完成: ${previousTheme} -> ${newTheme}`);
    }, [updateMessage, forceUpdate, triggerFadeOut, message, messageOpacity]);

    // 清理定时器
    useEffect(() => {
        return () => {
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }
        };
    }, []);

    const loadLive2D = useCallback(async () => {
        console.log('[LuoTianyiLive2D] 开始加载Live2D资源...');
        try {
            // 使用工具函数获取基础路径，确保在GitHub Pages环境下正确加载
            const basePath = getBasePath();
            
            // 设置全局变量供message.js使用 - 必须在脚本加载之前设置
            if (typeof window !== 'undefined') {
                // 使用assetUtils中的getAssetPath函数处理路径
                (window as any).message_Path = getAssetPath('/luotianyi-live2d-master/live2d/');
                (window as any).home_Path = window.location.origin;
            }
            
            // 动态加载jQuery
            if (typeof window !== 'undefined' && !window.jQuery) {
                console.log('[LuoTianyiLive2D] jQuery未找到，开始加载jQuery...');
                // 使用多个CDN源作为备份
                const jquerySources = [
                    'https://cdn.bootcss.com/jquery/2.2.4/jquery.min.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.min.js',
                    'https://code.jquery.com/jquery-2.2.4.min.js'
                ];
                
                for (const source of jquerySources) {
                    try {
                        await loadScript(source);
                        console.log(`[LuoTianyiLive2D] jQuery加载成功: ${source}`);
                        break;
                    } catch (error) {
                        console.warn(`[LuoTianyiLive2D] jQuery CDN ${source} 加载失败，尝试下一个源`);
                    }
                }
            }

            // 使用assetUtils中的getAssetPath函数处理路径
            const live2dPath = getAssetPath('/luotianyi-live2d-master/live2d');
            const messagePath = live2dPath; // 消息文件与live2d核心文件在同一目录
            
            console.log('[LuoTianyiLive2D] 开始加载Live2D脚本...');
            await loadScript(`${live2dPath}/js/live2d.js`);
            console.log('[LuoTianyiLive2D] live2d.js 加载成功');
            
            await loadScript(`${messagePath}/js/message.js`);
            console.log('[LuoTianyiLive2D] message.js 加载成功');

            // 等待DOM准备
            setTimeout(() => {
                if (canvasRef.current && window.loadlive2d) {
                    // 使用assetUtils中的getAssetPath函数处理模型文件路径
                    const modelPath = getAssetPath('/luotianyi-live2d-master/live2d/model/tianyi/model.json');
                    console.log('[LuoTianyiLive2D] 开始加载模型:', modelPath);
                    (window as any).loadlive2d("live2d", modelPath);
                    
                    // 设置消息显示
                    setupMessageSystem(basePath);
                    
                    setIsLoading(false);
                    console.log('[LuoTianyiLive2D] Live2D加载完成');
                } else {
                    console.warn('[LuoTianyiLive2D] 模型加载条件不满足:', { 
                        hasCanvas: !!canvasRef.current, 
                        hasLoadLive2d: !!window.loadlive2d 
                    });
                }
            }, 1000);

        } catch (error) {
            console.error('[LuoTianyiLive2D] 加载Live2D失败:', error);
            setIsLoading(false);
        }
    }, []);

    // 主要的Live2D初始化useEffect
    useEffect(() => {
        console.log('[LuoTianyiLive2D] 开始初始化...');
        
        // 检查是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        console.log('[LuoTianyiLive2D] 设备检测:', { isMobile, userAgent: navigator.userAgent.substring(0, 50) });
        
        setIsMobileDevice(isMobile);
        
        if (isMobile) {
            console.log('[LuoTianyiLive2D] 移动设备 detected, 隐藏Live2D');
            setIsVisible(false);
            return;
        }

        console.log('[LuoTianyiLive2D] 非移动设备, 开始加载Live2D...');
        setIsVisible(true);

        // 强制触发loadLive2D
        try {
            console.log('[LuoTianyiLive2D] 调用loadLive2D函数...');
            loadLive2D();
            console.log('[LuoTianyiLive2D] loadLive2D调用完成');
        } catch (error) {
            console.error('[LuoTianyiLive2D] loadLive2D failed:', error);
        }
    }, [loadLive2D]); // 添加loadLive2D依赖

    // 监听主题变化 - 移除可能导致重复更新的MutationObserver
    useEffect(() => {
        if (typeof document === 'undefined') return;
        
        // 仅监听必要的变化，避免过度触发
        const observer = new MutationObserver((mutations) => {
            // 检查是否真的有主题变化，而不是其他属性变化
            const hasThemeChange = mutations.some(mutation => {
                const target = mutation.target as HTMLElement;
                return target.classList.contains('dark') !== (document.documentElement.classList.contains('dark'));
            });
            
            if (hasThemeChange) {
                forceUpdate();
            }
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });
        
        return () => observer.disconnect();
    }, [forceUpdate]);

    // 监听Live2D事件
    useEffect(() => {
        console.log(`[LuoTianyiLive2D] 订阅主题变化事件`);
        const unsubscribe = live2dEventEmitter.on('theme-change', handleThemeChange);
        console.log(`[LuoTianyiLive2D] 主题变化事件订阅成功`);
        
        // 测试事件系统状态 - 仅记录日志，不触发实际事件
        setTimeout(() => {
            console.log(`[LuoTianyiLive2D] 事件系统状态检查:`, {
                hasListeners: live2dEventEmitter.listenerCount('theme-change') > 0,
                listenerCount: live2dEventEmitter.listenerCount('theme-change')
            });
            
            // 显示欢迎消息，但不触发主题切换测试
            // 确保只在第一次加载时显示欢迎消息
            if (!(window as any).__luotianyiWelcomeShown) {
                console.log(`[LuoTianyiLive2D] 显示欢迎消息`);
                updateMessage('天依已上线！很高兴见到你～');
                (window as any).__luotianyiWelcomeShown = true;
            } else {
                console.log(`[LuoTianyiLive2D] 欢迎消息已显示过，跳过`);
            }
        }, 2000);
        
        return () => {
            console.log(`[LuoTianyiLive2D] 取消订阅主题变化事件`);
            unsubscribe();
        };
    }, [handleThemeChange, updateMessage]);

    const loadScript = (src: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.head.appendChild(script);
        });
    };

    const setupMessageSystem = (basePath: string) => {
        // 设置洛天依的消息系统，适配网站主题
        // 重写消息显示函数以支持自动淡出
        const originalShowMessage = (window as any).showMessage;
        (window as any).showMessage = (msg: string, timeout?: number) => {
            // 修复：增强消息处理，确保重要的用户交互消息能够显示
            const isImportantMessage = 
                msg.includes('编辑') || msg.includes('预览') || msg.includes('模式') ||
                msg.includes('保存') || msg.includes('复制') || msg.includes('成功') ||
                msg.includes('撤销') || msg.includes('重做') || msg.includes('清空') ||
                msg.includes('发布') || msg.includes('示例') ||
                msg.includes('唱歌') || msg.includes('音乐') ||
                msg.includes('主题') || msg.includes('亮色') || msg.includes('暗色') || msg.includes('系统') ||
                (msg.length > 5 && !msg.includes('你好～我是洛天依！'));
            
            if (isImportantMessage) {
                // 重要消息直接显示，不经过过滤
                setMessage(msg);
                setMessageOpacity(1);
                lastMessageTimeRef.current = Date.now();
                triggerFadeOut();
            } else {
                // 使用我们的新消息管理函数
                updateMessage(msg);
            }
            
            // 也调用原始的消息函数（如果存在）
            if (originalShowMessage) {
                originalShowMessage(msg, timeout);
            }
        };

        const messageConfig = {
            mouseover: [
                {
                    selector: ".title a, h1, h2, h3",
                    text: ["要看看 {text} 么？", "这是什么呢？好有趣的样子～", "想要了解更多吗？"]
                },
                {
                    selector: ".searchbox, input[type='search']",
                    text: ["在找什么东西呢，需要帮忙吗？", "搜索很重要哦，我来帮你～", "找不到想要的内容吗？"]
                },
                {
                    selector: ".nav-link, .navigation a, a[href]",
                    text: ["这里好像有很好玩的内容！", "要去看其他地方吗？", "导航很重要呢～"]
                }
            ],
            click: [
                {
                    selector: "#landlord #live2d",
                    text: [
                        "想听我唱歌吗？", 
                        "不要动手动脚的！快把手拿开~~", 
                        "真…真的是不知羞耻！", 
                        "再摸的话我可要报警了！⌇●﹏●⌇", 
                        "110吗，这里有个变态一直在摸我(ó﹏ò｡)",
                        "呀！你摸到我了！",
                        "害羞ing...",
                        "天依很萌的！",
                        "我是世界第一吃货殿下哦！"
                    ]
                }
            ]
        };

        // 将配置应用到窗口对象，支持GitHub Pages部署
        // 使用assetUtils中的getAssetPath函数处理路径
        (window as any).message_Path = getAssetPath('/luotianyi-live2d-master/live2d/');
        (window as any).home_Path = window.location.origin;
        (window as any).messageConfig = messageConfig;
        
        // 延迟初始化消息系统，确保DOM完全加载
        setTimeout(() => {
            if (typeof (window as any).initTips === 'function') {
                (window as any).initTips();
            }
        }, 1000);
    };

    const toggleVisibility = () => {
        setIsVisible(!isVisible);
    };

    const getCurrentThemeClass = () => {
        return 'luotianyi-theme';
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div id="landlord" className={`landlord ${getCurrentThemeClass()}`}>
            <div 
                className={`message ${getCurrentThemeClass()}`} 
                style={{ 
                    opacity: messageOpacity,
                    position: 'absolute',
                    top: '-20px',
                    left: '50px',
                    display: message ? 'block' : 'none',
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
                    zIndex: 9997
                }}
            >
                {message}
            </div>
            
            <canvas 
                ref={canvasRef}
                id="live2d" 
                width="280" 
                height="250" 
                className="live2d"
            />
            
            <div id="sing"></div>
            
            <div 
                className={`hide-button ${getCurrentThemeClass()}`}
                onClick={toggleVisibility}
            >
                隐藏
            </div>
            
            <div 
                className={`sing-button ${getCurrentThemeClass()}`}
                onClick={() => {
                    updateMessage('天依想唱歌给你听～');
                }}
            >
                Sing
            </div>
        </div>
    );
}

// 扩展Window类型以包含Live2D相关对象
declare global {
    interface Window {
        loadlive2d?: (canvasId: string, modelPath: string) => void;
        jQuery?: any;
        message_Path?: string;
        home_Path?: string;
        messageConfig?: any;
    }
}