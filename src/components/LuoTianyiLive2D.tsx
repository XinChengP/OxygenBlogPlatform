'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 洛天依Live2D看板娘组件
 * 基于stevenjoezhang/live2d-widget和unsignedzhang/luotianyi-live2d实现
 */
export default function LuoTianyiLive2D() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isVisible, setIsVisible] = useState(true);
    const [message, setMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);

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
                const basePath = process.env.NODE_ENV === 'production' 
                    ? (process.env.NEXT_PUBLIC_BASE_PATH || '') 
                    : '';
                
                // 设置全局变量供message.js使用 - 必须在脚本加载之前设置
                if (typeof window !== 'undefined') {
                    (window as any).message_Path = `${basePath}/luotianyi-live2d-master/live2d/`;
                    (window as any).home_Path = `${basePath}/`;
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

                // 动态加载Live2D核心文件
                const live2dPath = `${basePath}/luotianyi-live2d-master/live2d`;
                const messagePath = `${basePath}/luotianyi-live2d-master/live2d`;
                
                await loadScript(`${live2dPath}/js/live2d.js`);
                await loadScript(`${messagePath}/js/message.js`);

                // 等待DOM准备
                setTimeout(() => {
                    if (canvasRef.current && window.loadlive2d) {
                        // 初始化Live2D
                        (window as any).loadlive2d("live2d", `${basePath}/luotianyi-live2d-master/live2d/model/tianyi/model.json`);
                        
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
                    selector: "a[href*='music'], .music-player",
                    text: ["音乐！我最喜欢唱歌了～", "这首歌听起来不错呢！", "要一起听音乐吗？"]
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
                        "Hentai！", 
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
        (window as any).message_Path = `${basePath}/luotianyi-live2d-master/live2d/`;
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
                    opacity: 1,
                    position: 'absolute',
                    top: '10px',
                    right: '0',
                    display: 'block'
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
                    setMessage('天依想唱歌给你听～');
                    setTimeout(() => setMessage(''), 3000);
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