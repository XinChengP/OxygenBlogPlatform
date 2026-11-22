'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { ChevronUpIcon, ChevronDownIcon, SunIcon, MoonIcon, AdjustmentsHorizontalIcon, MusicalNoteIcon, SparklesIcon, FaceSmileIcon } from '@heroicons/react/24/outline';

import { getMusicPlayerVisibility, setMusicPlayerVisibility, onMusicPlayerVisibilityChange } from '@/utils/musicPlayerVisibility';
import { getLive2DVisibility, setLive2DVisibility, onLive2DVisibilityChange } from '@/utils/live2dVisibility';
import { isElectron } from '@/utils/isElectron';
import { throttle } from '@/utils/performanceUtils';
import { fireworksEngine } from '@/utils/fireworksEngine';
import { Z_INDEX } from '@/utils/zIndex';

/**
 * 页面悬浮控制组
 *
 * 提供回到顶部/底部、主题切换、音乐播放器开关与烟花特效。
 * 烟花引擎已抽到 utils/fireworksEngine，组件只负责触发与卸载清理，
 * 避免重渲染重置运行状态、路由切换后特效残留。
 */
/**
 * 浮动控制按钮的公共样式
 *
 * 与全站玻璃体系对齐：原先 6 个按钮各自硬编码
 * bg-gray-200 / dark:bg-gray-700 / rounded-lg / shadow-lg，
 * 是全站少数还停留在"原生控件"观感的区域。
 * 改用 glass-card-strong 令牌后，圆角、边框、阴影、底色随主题变量自动切换，
 * 与导航、目录、卡片等悬浮面板保持同一套玻璃语言。
 */
const CONTROL_BTN_BASE =
  'relative p-3 rounded-xl border glass-card-strong text-foreground hover:text-primary hover:border-primary/40';

/**
 * 主操作与开关开启态样式
 * 保留天依蓝实色强调，避免整组按钮在玻璃化后失去主次关系；
 * 阴影引用 shadow-card 令牌，亮暗模式自动加深。
 */
const CONTROL_BTN_ACTIVE =
  'relative p-3 rounded-xl border border-primary/30 bg-primary text-primary-foreground hover:bg-primary/90 shadow-card';

export default function ScrollToTop() {
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();

  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [showThemeButton, setShowThemeButton] = useState(false);
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(false);
  const [live2dVisible, setLive2dVisible] = useState(true);
  // next-themes 在服务端无法获取用户真实主题，挂载后再渲染主题相关图标
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMusicPlayerVisible(getMusicPlayerVisibility());
    setLive2dVisible(getLive2DVisibility());
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 监听滚动事件 - 100ms 节流
  useEffect(() => {
    const handleScroll = throttle(() => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      setIsAtTop(scrollTop < 50);
      setIsAtBottom(scrollTop + windowHeight >= documentHeight - 50);

      // 页面顶部时自动收起设置面板
      if (scrollTop < 50) {
        setShowThemeButton(false);
      }
    }, 100);

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 监听音乐播放器显示状态变化
  useEffect(() => {
    const unsubscribe = onMusicPlayerVisibilityChange((visible) => {
      setMusicPlayerVisible(visible);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 监听 Live2D 看板娘显示状态变化
  useEffect(() => {
    const unsubscribe = onLive2DVisibilityChange((visible) => {
      setLive2dVisible(visible);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // 路由切换与组件卸载时停止烟花，避免遮罩残留到新页面
  useEffect(() => {
    return () => fireworksEngine.stop();
  }, []);

  useEffect(() => {
    fireworksEngine.stop();
  }, [pathname]);

  const scrollTo = useCallback((top: number) => {
    // Electron 桌面端始终用平滑滚动，不受系统减少动态效果影响
    const reduceMotion = !isElectron() && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
  }, []);

  const scrollToTop = useCallback(() => scrollTo(0), [scrollTo]);

  const scrollToBottom = useCallback(
    () => scrollTo(document.documentElement.scrollHeight),
    [scrollTo],
  );

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const toggleThemeButton = useCallback(() => {
    setShowThemeButton(prev => !prev);
  }, []);

  const toggleMusicPlayer = useCallback(() => {
    const newVisibility = !musicPlayerVisible;
    setMusicPlayerVisibility(newVisibility);
    setMusicPlayerVisible(newVisibility);
  }, [musicPlayerVisible]);

  const toggleLive2D = useCallback(() => {
    const newVisibility = !live2dVisible;
    setLive2DVisibility(newVisibility);
    setLive2dVisible(newVisibility);
  }, [live2dVisible]);

  const startFireworks = useCallback(() => {
    fireworksEngine.start();
  }, []);

  return (
    <div
      className={`fixed bottom-6 right-6 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) transform ${isAtTop ? 'translate-x-[150%] opacity-0 scale-90' : 'translate-x-0 opacity-100 scale-100'}`}
      style={{
        zIndex: Z_INDEX.floatingControls,
        transformStyle: 'preserve-3d',
        willChange: 'transform, opacity',
      }}
    >
      <div className="flex flex-col space-y-2">
        {/* Live2D 看板娘开关 */}
        <button
          onClick={toggleLive2D}
          className={`${live2dVisible ? CONTROL_BTN_ACTIVE : CONTROL_BTN_BASE} shadow-card transition-all duration-300 transform hover:scale-110 ${showThemeButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95 pointer-events-none'}`}
          style={{
            transitionDelay: showThemeButton ? '0.05s' : '0s',
            display: showThemeButton ? 'flex' : 'none',
          }}
          aria-label={live2dVisible ? '隐藏天依' : '显示天依'}
          title={live2dVisible ? '隐藏天依' : '显示天依'}
        >
          <FaceSmileIcon className={`h-5 w-5 ${!live2dVisible ? 'opacity-50' : ''}`} />
          {!live2dVisible && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-0.5 bg-foreground/60 transform rotate-45"></div>
            </div>
          )}
        </button>

        {/* 音乐播放器开关 */}
        <button
          onClick={toggleMusicPlayer}
          className={`${musicPlayerVisible ? CONTROL_BTN_ACTIVE : CONTROL_BTN_BASE} shadow-card transition-all duration-300 transform hover:scale-110 ${showThemeButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95 pointer-events-none'}`}
          style={{
            transitionDelay: showThemeButton ? '0.1s' : '0s',
            display: showThemeButton ? 'flex' : 'none',
          }}
          aria-label={musicPlayerVisible ? '隐藏音乐播放器' : '显示音乐播放器'}
          title={musicPlayerVisible ? '隐藏音乐播放器' : '显示音乐播放器'}
        >
          <MusicalNoteIcon className={`h-5 w-5 ${!musicPlayerVisible ? 'opacity-50' : ''}`} />
          {!musicPlayerVisible && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-0.5 bg-foreground/60 transform rotate-45"></div>
            </div>
          )}
        </button>

        {/* 烟花按钮 */}
        <button
          onClick={startFireworks}
          className={`${CONTROL_BTN_BASE} shadow-card transition-all duration-300 transform hover:scale-110 ${showThemeButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95 pointer-events-none'}`}
          style={{
            transitionDelay: showThemeButton ? '0.15s' : '0s',
            display: showThemeButton ? 'flex' : 'none',
          }}
          aria-label="放烟花"
          title="放烟花"
        >
          <SparklesIcon className="h-5 w-5" />
        </button>

        {/* 主题切换 */}
        <button
          onClick={toggleTheme}
          className={`${CONTROL_BTN_BASE} shadow-card transition-all duration-300 transform hover:scale-110 ${showThemeButton ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-5 scale-95 pointer-events-none'}`}
          style={{
            transitionDelay: showThemeButton ? '0.2s' : '0s',
            display: showThemeButton ? 'flex' : 'none',
          }}
          aria-label="切换主题"
          title={mounted ? (theme === 'dark' ? '切换到浅色模式' : '切换到深色模式') : '切换到深色模式'}
        >
          {mounted ? (theme === 'dark' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />) : <SunIcon className="h-5 w-5" />}
        </button>

        {/* 设置按钮 */}
        <button
          onClick={toggleThemeButton}
          className={`${CONTROL_BTN_BASE} shadow-card transition-all duration-300 transform hover:scale-110`}
          aria-label="设置"
          title="设置"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
        </button>

        {/* 回到顶部 */}
        <button
          onClick={scrollToTop}
          className={`${CONTROL_BTN_ACTIVE} transition-all duration-300 transform enabled:hover:scale-110 ${isAtTop ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="回到顶部"
          title="回到顶部"
          disabled={isAtTop}
        >
          <ChevronUpIcon className="h-5 w-5" />
        </button>

        {/* 转到页底 */}
        <button
          onClick={scrollToBottom}
          className={`${CONTROL_BTN_BASE} shadow-card transition-all duration-300 transform enabled:hover:scale-110 ${isAtBottom ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="转到页底"
          title="转到页底"
          disabled={isAtBottom}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
