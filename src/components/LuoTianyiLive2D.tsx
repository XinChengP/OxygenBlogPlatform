'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { getAssetPath, getBasePath } from '../utils/assetUtils';

/**
 * 洛天依Live2D看板娘组件
 * 基于stevenjoezhang/live2d-widget和unsignedzhang/luotianyi-live2d实现
 */
export default function LuoTianyiLive2D() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastMessageTimeRef = useRef<number>(0);
    
    const [isVisible, setIsVisible] = useState(true);
    const [message, setMessage] = useState('');
    const [messageOpacity, setMessageOpacity] = useState(1);
    const [isLoading, setIsLoading] = useState(true);

    // 自动淡出功能
    const triggerFadeOut = useCallback(() => {
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
        }
        
        fadeTimeoutRef.current = setTimeout(() => {
            setMessageOpacity(0);
        }, 5000);
    }, []);

  // useEffect将在组件挂载时执行，依赖loadLive2D函数

    // 消息管理功能
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

    // 清理定时器
    useEffect(() => {
        return () => {
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }
        };
    }, []);

    const loadLive2D = useCallback(async () => {
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
                // 使用多个CDN源作为备份
                const jquerySources = [
                    'https://cdn.bootcss.com/jquery/2.2.4/jquery.min.js',
                    'https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.min.js',
                    'https://code.jquery.com/jquery-2.2.4.min.js'
                ];
                
                for (const source of jquerySources) {
                    try {
                        await loadScript(source);
                        break;
                    } catch (error) {
                        console.warn(`jQuery CDN ${source} 加载失败，尝试下一个源`);
                    }
                }
            }

            // 使用assetUtils中的getAssetPath函数处理路径
            const live2dPath = getAssetPath('/luotianyi-live2d-master/live2d');
            const messagePath = live2dPath; // 消息文件与live2d核心文件在同一目录
            
            await loadScript(`${live2dPath}/js/live2d.js`);
            await loadScript(`${messagePath}/js/message.js`);

            // 等待DOM准备
            setTimeout(() => {
                if (canvasRef.current && window.loadlive2d) {
                    // 使用assetUtils中的getAssetPath函数处理模型文件路径
                    const modelPath = getAssetPath('/luotianyi-live2d-master/live2d/model/tianyi/model.json');
                    (window as any).loadlive2d("live2d", modelPath);
                    
                    // 设置消息显示
                    setupMessageSystem(basePath);
                    
                    setIsLoading(false);
                }
            }, 1000);

        } catch (error) {
            console.error('加载Live2D失败:', error);
            setIsLoading(false);
        }
    }, []);

    // 主要的Live2D初始化useEffect
    useEffect(() => {
        // 检查是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            setIsVisible(false);
            return;
        }

        // 强制触发loadLive2D
        try {
            loadLive2D();
        } catch (error) {
            console.error('[LuoTianyiLive2D] loadLive2D failed:', error);
        }
    }, [loadLive2D]); // 添加loadLive2D依赖

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