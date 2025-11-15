'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

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

    // 消息管理功能
    const updateMessage = useCallback((newMessage: string) => {
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

    useEffect(() => {
        // 检查是否为移动设备
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            setIsVisible(false);
            return;
        }

        const loadLive2D = async () => {
            try {
                // 获取BasePath支持GitHub Pages部署
                const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
                
                // 设置全局变量供message.js使用 - 必须在脚本加载之前设置
                if (typeof window !== 'undefined') {
                    // 确保路径以/开头，即使basePath为空
                    const fullPath = basePath ? `${basePath}/luotianyi-live2d-master/live2d/` : '/luotianyi-live2d-master/live2d/';
                    (window as any).message_Path = fullPath;
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

                // 动态加载Live2D核心文件 - 确保路径以/开头
                const live2dPath = basePath ? `${basePath}/luotianyi-live2d-master/live2d` : '/luotianyi-live2d-master/live2d';
                const messagePath = live2dPath; // 消息文件与live2d核心文件在同一目录
                
                await loadScript(`${live2dPath}/js/live2d.js`);
                await loadScript(`${messagePath}/js/message.js`);

                // 等待DOM准备
                setTimeout(() => {
                    if (canvasRef.current && window.loadlive2d) {
                        // 初始化Live2D - 确保路径以/开头
                        const modelPath = basePath ? `${basePath}/luotianyi-live2d-master/live2d/model/tianyi/model.json` : '/luotianyi-live2d-master/live2d/model/tianyi/model.json';
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
        };

        // 延迟加载以确保其他资源先加载
        const timer = setTimeout(loadLive2D, 2000);
        return () => clearTimeout(timer);
    }, []);

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
        (window as any).showMessage = (msg: string) => {
            if (originalShowMessage) {
                originalShowMessage(msg);
            }
            // 使用我们的新消息管理函数
            updateMessage(msg);
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
                    selector: ".nav-link, .navigation a",
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
        // 确保路径以/开头
        (window as any).message_Path = basePath ? `${basePath}/luotianyi-live2d-master/live2d/` : '/luotianyi-live2d-master/live2d/';
        (window as any).home_Path = window.location.origin;
        (window as any).messageConfig = messageConfig;
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
                    display: 'block',
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
                {message || '你好～我是洛天依！'}
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