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
    const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    const [isVisible, setIsVisible] = useState(true);
    const [isMobileDevice, setIsMobileDevice] = useState(false);
    const [message, setMessage] = useState('');
    const [messageOpacity, setMessageOpacity] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('');
    const [pageStartTime, setPageStartTime] = useState(Date.now());
    const [readingProgress, setReadingProgress] = useState(0);
    const [interactionState, setInteractionState] = useState<'idle' | 'music' | 'theme' | 'page'>('idle');

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
    const updateMessage = useCallback((newMessage: string, type: 'normal' | 'interaction' = 'normal') => {
        // 修复：改进消息过滤逻辑，更好地处理中文消息
        const isDefaultMessage = newMessage.includes('你好') && newMessage.includes('洛天依') && newMessage.includes('！');
        const isGenericGreeting = newMessage === '你好～我是洛天依！' || 
                                 newMessage === '你好~我是洛天依！' ||
                                 (newMessage.includes('你好') && newMessage.length < 15);
        
        // 只过滤掉真正的默认问候语，允许其他正常消息显示
        if (isDefaultMessage || isGenericGreeting) {
            return;
        }
        
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
        
        setMessage(newMessage);
        setMessageOpacity(1);
        lastMessageTimeRef.current = Date.now();
        triggerFadeOut();
    }, [triggerFadeOut]);

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
            // 清理所有定时器
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }
            if (interactionTimeoutRef.current) {
                clearTimeout(interactionTimeoutRef.current);
            }
        };
    }, []);

    // 自动淡出功能 - 已移至前面定义，避免循环依赖

    // 获取当前页面类型和路径
    const getCurrentPageInfo = useCallback(() => {
        if (typeof window === 'undefined') return { page: '', path: '' };
        
        const path = window.location.pathname;
        const pageMap: { [key: string]: string } = {
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
        
        // 特殊处理博客文章页面
        if (path.includes('/blogs/') && path !== '/blogs/') {
            pageType = '博客文章';
        }
        
        return { page: pageType, path };
    }, []);

    // 智能页面感知提示
    const showSmartPageMessage = useCallback(() => {
        const { page, path } = getCurrentPageInfo();
        const now = new Date();
        const hour = now.getHours();
        
        const pageMessages = {
            '首页': [
                '欢迎来到天依的博客！这里有很多有趣的内容哦～',
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
        
        // 时间相关的问候
        let timeGreeting = '';
        if (hour < 6) {
            timeGreeting = '夜深了，注意休息哦～';
        } else if (hour < 12) {
            timeGreeting = '早上好！今天也要充满活力哦～';
        } else if (hour < 18) {
            timeGreeting = '下午好！午后的阳光很适合阅读呢～';
        } else {
            timeGreeting = '晚上好！天依陪你度过美好的夜晚～';
        }
        
        const messages = pageMessages[page as keyof typeof pageMessages] || pageMessages['其他页面'];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        // 30%概率显示时间问候，70%概率显示页面相关消息
        const finalMessage = Math.random() < 0.3 ? timeGreeting : randomMessage;
        
        updateMessage(finalMessage);
    }, [getCurrentPageInfo, updateMessage]);

    // 页面停留时间提示
    const checkPageStayTime = useCallback(() => {
        const stayTime = Date.now() - pageStartTime;
        const stayMinutes = Math.floor(stayTime / 60000);
        
        if (stayMinutes >= 5 && stayMinutes < 6) {
            updateMessage('你已经在这里停留了5分钟呢，天依很开心能陪伴你～');
        } else if (stayMinutes >= 10 && stayMinutes < 11) {
            updateMessage('10分钟了！看来你对这个内容很感兴趣呢～');
        } else if (stayMinutes >= 15 && stayMinutes < 16) {
            updateMessage('15分钟了！天依很享受这段共处的时光～');
        } else if (stayMinutes >= 30 && stayMinutes < 31) {
            updateMessage('半小时了！长时间阅读要注意休息眼睛哦～');
        }
    }, [pageStartTime, updateMessage]);

    // 阅读进度检测
    const detectReadingProgress = useCallback(() => {
        if (typeof window === 'undefined') return;
        
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = Math.min((scrollTop / scrollHeight) * 100, 100);
        
        setReadingProgress(progress);
        
        // 根据阅读进度给出提示
        if (progress >= 25 && progress < 30) {
            updateMessage('已经阅读了四分之一了呢，继续加油哦～');
        } else if (progress >= 50 && progress < 55) {
            updateMessage('一半了！这篇文章很吸引人吧？');
        } else if (progress >= 75 && progress < 80) {
            updateMessage('快要读完了呢，有什么感想吗？');
        }
    }, [updateMessage]);

    // 组件加载确认
    useEffect(() => {
        console.log('[LuoTianyiLive2D] 组件开始加载');
        if (typeof window !== 'undefined') {
            console.log('[LuoTianyiLive2D] 在浏览器环境中运行');
            window.console.log('[LuoTianyiLive2D] 浏览器控制台日志测试');
            
            // 获取当前页面信息并显示智能提示
            setTimeout(() => {
                showSmartPageMessage();
            }, 1500);
            
            // 延迟显示功能提示
            setTimeout(() => {
                updateMessage('今天也是元气满满的一天呢！');
            }, 3000);
        }
    }, [updateMessage, showSmartPageMessage]);

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
            console.log('[LuoTianyiLive2D] 当前不是博客文章页面，禁用阅读进度检测:', currentPath);
            return;
        }
        
        console.log('[LuoTianyiLive2D] 当前是博客文章页面，启用阅读进度检测:', currentPath);

        const handleScroll = () => {
            detectReadingProgress();
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, [detectReadingProgress]);

    // 页面可见性变化检测
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
                    const welcomeBackMessages = [
                        '你回来啦！天依一直在这里等你～',
                        '欢迎回来！继续刚才的阅读吧～',
                        '天依没有离开过哦～',
                        '页面重新可见了呢，太好了！',
                        '天依想念你了～'
                    ];
                    const randomMessage = welcomeBackMessages[Math.floor(Math.random() * welcomeBackMessages.length)];
                    updateMessage(randomMessage);
                }
            }
        };

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    }, [updateMessage]);

    // 复制内容检测 - 优化版本
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
                
                console.log('React复制事件检测:', {
                    selection: selection?.substring(0, 50) + '...',
                    clipboardData: clipboardData?.substring(0, 50) + '...',
                    length: copiedContent.length,
                    timestamp: Date.now()
                });
                
                if (copiedContent.length > 10) {
                    const copyMessages = [
                        '复制了什么有趣的内容呢？',
                        '天依看到你在复制内容哦～',
                        '记得注明出处哦，尊重原创很重要！',
                        '复制的知识要好好利用呢～',
                        '天依也学到了新知识！'
                    ];
                    const randomMessage = copyMessages[Math.floor(Math.random() * copyMessages.length)];
                    // 使用较高优先级(5)确保复制消息能正常显示，并标记为交互类型
                    updateMessage(randomMessage, 'interaction');
                    console.log('React显示复制消息:', randomMessage);
                }
                
                // 清理标记
                setTimeout(() => {
                    if (marker.parentNode) {
                        marker.parentNode.removeChild(marker);
                    }
                }, 1000);
            }, 100); // 100ms延迟确保复制操作完成
        };

        if (typeof document !== 'undefined') {
            // 使用捕获阶段监听，确保能捕获到所有复制事件
            document.addEventListener('copy', handleCopy, true);
            return () => document.removeEventListener('copy', handleCopy, true);
        }
    }, [updateMessage]);

    // 节日和特殊日期检测
    useEffect(() => {
        const checkSpecialDate = () => {
            const now = new Date();
            const month = now.getMonth() + 1;
            const date = now.getDate();
            const dayOfWeek = now.getDay();
            const hours = now.getHours();

            // 节日消息
            const holidayMessages: { [key: string]: string[] } = {
                '1-1': ['新年快乐！天依祝你新的一年顺顺利利～', '新年的第一天，要开心哦！'],
                '2-14': ['情人节快乐！天依给你送爱心～', '今天是个充满爱的日子呢～'],
                '4-1': ['愚人节快乐！天依才不会骗你呢～', '今天要小心恶作剧哦～'],
                '5-1': ['劳动节快乐！天依也要努力唱歌～', '辛苦了，今天好好休息吧～'],
                '6-1': ['儿童节快乐！天依也要过儿童节～', '今天要做个快乐的小朋友～'],
                '7-7': ['七夕节快乐！牛郎织女今天相会呢～', '中国的情人节，真浪漫～'],
                '8-15': ['中秋节快乐！天依想吃月饼～', '月圆人团圆，真美好呢～'],
                '10-1': ['国庆节快乐！天依为祖国歌唱～', '祖国生日快乐！'],
                '12-25': ['圣诞节快乐！天依给你送礼物～', '圣诞老人有没有给你送礼物呢？'],
                '12-31': ['一年又要结束了呢～', '跨年夜，天依陪你一起度过～']
            };

            // 特殊日期
            const specialDates: { [key: string]: string[] } = {
                '7-12': ['天依的生日！今天是我的生日～', '今天天依生日，要开心哦～'],
            };

            // 时间相关的问候
            const timeGreetings: { [key: string]: string[] } = {
                'morning': ['早上好！新的一天要加油哦～', '早安！今天也要元气满满～'],
                'noon': ['中午好！记得吃午饭哦～', '中午了，休息一下眼睛吧～'],
                'afternoon': ['下午好！天依陪你度过午后时光～', '下午茶时间，来杯咖啡吧～'],
                'evening': ['晚上好！天依陪你度过美好夜晚～', '夜晚降临，天依的歌声陪伴你～'],
                'night': ['夜深了，早点休息哦～', '晚安！做个好梦，天依在梦里等你～']
            };

            // 星期相关的问候
            const weekGreetings: { [key: string]: string[] } = {
                '0': ['周日快乐！明天又是新的一周～', '周末的最后一天，好好休息吧～'],
                '1': ['周一快乐！新的一周要加油哦～', '星期一，新的开始～'],
                '5': ['周五快乐！明天就是周末了～', '辛苦一周了，明天可以好好休息～'],
                '6': ['周六快乐！周末要好好放松～', '周末时光，天依陪你一起度过～']
            };

            // 检查节日
            const holidayKey = `${month}-${date}`;
            if (holidayMessages[holidayKey]) {
                const messages = holidayMessages[holidayKey];
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                updateMessage(randomMessage);
                return;
            }

            // 检查特殊日期（天依相关）
            const specialKey = `${month}-${date}`;
            if (specialDates[specialKey]) {
                const messages = specialDates[specialKey];
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                updateMessage(randomMessage);
                return;
            }

            // 检查星期
            if (weekGreetings[dayOfWeek.toString()]) {
                const messages = weekGreetings[dayOfWeek.toString()];
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                updateMessage(randomMessage);
                return;
            }

            // 检查时间问候
            let timeKey = '';
            if (hours >= 6 && hours < 12) {
                timeKey = 'morning';
            } else if (hours >= 12 && hours < 14) {
                timeKey = 'noon';
            } else if (hours >= 14 && hours < 18) {
                timeKey = 'afternoon';
            } else if (hours >= 18 && hours < 22) {
                timeKey = 'evening';
            } else {
                timeKey = 'night';
            }

            if (timeGreetings[timeKey]) {
                const messages = timeGreetings[timeKey];
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                updateMessage(randomMessage);
            }
        };

        // 页面加载时检查一次
        checkSpecialDate();

        // 每小时检查一次（用于时间问候）
        const interval = setInterval(checkSpecialDate, 3600000);

        return () => clearInterval(interval);
    }, [updateMessage]);

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
        const unsubscribeTheme = live2dEventEmitter.on('theme-change', handleThemeChange);
        console.log(`[LuoTianyiLive2D] 主题变化事件订阅成功`);
        
        // 监听自定义消息事件
        console.log(`[LuoTianyiLive2D] 订阅自定义消息事件`);
        const unsubscribeCustom = live2dEventEmitter.on('custom-message', (event: any) => {
            console.log(`[LuoTianyiLive2D] 收到自定义消息事件:`, event);
            // 处理事件数据，可能是字符串或包含message属性的对象
            const message = typeof event === 'string' ? event : (event?.message || event?.data?.message || '收到消息啦～');
            console.log(`[LuoTianyiLive2D] 提取的消息内容:`, message);
            updateMessage(message);
        });
        console.log(`[LuoTianyiLive2D] 自定义消息事件订阅成功`);
        
        // 测试事件系统状态 - 仅记录日志，不触发实际事件
        setTimeout(() => {
            console.log(`[LuoTianyiLive2D] 事件系统状态检查:`, {
                hasThemeListeners: live2dEventEmitter.listenerCount('theme-change') > 0,
                themeListenerCount: live2dEventEmitter.listenerCount('theme-change'),
                hasCustomListeners: live2dEventEmitter.listenerCount('custom-message') > 0,
                customListenerCount: live2dEventEmitter.listenerCount('custom-message')
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
            console.log(`[LuoTianyiLive2D] 取消订阅所有事件`);
            unsubscribeTheme();
            unsubscribeCustom();
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
        
        // 添加触发频率限制机制
        const triggerLimits = {
            mouseover: new Map<string, number>(), // 记录每个选择器的最后触发时间
            click: new Map<string, number>()
        };
        
        const THROTTLE_DELAY = 2000; // 2秒内只允许触发一次
        
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
                    selector: "nav a, .nav-link, .navigation a, header a, .navbar a, .menu-item a",
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

        // 重写消息系统以支持频率限制
        const setupThrottledEvents = () => {
            if (typeof (window as any).jQuery !== 'undefined') {
                const $ = (window as any).jQuery;
                
                // 获取全局的showMessage函数
                const globalShowMessage = (window as any).showMessage;
                
                // 为mouseover事件添加节流
                $.each(messageConfig.mouseover, function (index: number, tips: any) {
                    $(document).on('mouseover', tips.selector, function (this: HTMLElement, e: Event) {
                        e.stopPropagation();
                        
                        // 检查触发频率限制
                        const now = Date.now();
                        const lastTrigger = triggerLimits.mouseover.get(tips.selector) || 0;
                        
                        if (now - lastTrigger < THROTTLE_DELAY) {
                            return; // 跳过这次触发
                        }
                        
                        // 更新最后触发时间
                        triggerLimits.mouseover.set(tips.selector, now);
                        
                        var text = tips.text;
                        if (Array.isArray(tips.text)) text = tips.text[Math.floor(Math.random() * tips.text.length)];
                        text = text.renderTip({ text: $(this).text() });
                        
                        // 使用全局showMessage函数
                        if (globalShowMessage) {
                            globalShowMessage(text, 3000);
                        }
                    });
                });
                
                // 为click事件添加节流
                $.each(messageConfig.click, function (index: number, tips: any) {
                    $(document).on('click', tips.selector, function (this: HTMLElement, e: Event) {
                        e.stopPropagation();
                        
                        // 检查触发频率限制
                        const now = Date.now();
                        const lastTrigger = triggerLimits.click.get(tips.selector) || 0;
                        
                        if (now - lastTrigger < THROTTLE_DELAY) {
                            return; // 跳过这次触发
                        }
                        
                        // 更新最后触发时间
                        triggerLimits.click.set(tips.selector, now);
                        
                        var text = tips.text;
                        if (Array.isArray(tips.text)) text = tips.text[Math.floor(Math.random() * tips.text.length)];
                        text = text.renderTip({ text: $(this).text() });
                        
                        // 使用全局showMessage函数
                        if (globalShowMessage) {
                            globalShowMessage(text, 3000);
                        }
                    });
                });
            }
        };

        // 将配置应用到窗口对象，支持GitHub Pages部署
        // 使用assetUtils中的getAssetPath函数处理路径
        (window as any).message_Path = getAssetPath('/luotianyi-live2d-master/live2d/');
        (window as any).home_Path = window.location.origin;
        (window as any).messageConfig = messageConfig;
        
        // 延迟初始化消息系统，确保DOM完全加载
        setTimeout(() => {
            // 使用自定义的节流事件系统替代原始initTips
            setupThrottledEvents();
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
                    zIndex: 10001 // 统一使用最高层级，避免被其他动画元素覆盖
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