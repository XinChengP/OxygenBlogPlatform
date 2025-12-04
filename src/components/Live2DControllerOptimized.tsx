'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { live2dEventEmitter, Live2DEvents, emitLive2DStatusEvent } from '@/utils/live2dEventEmitter';
import { live2dResourceManager } from '@/utils/live2dResourceManager';
import { useLive2DOptimized } from '@/hooks/useLive2DOptimized';

// 动态导入LuoTianyiLive2D组件，实现代码分割和懒加载
const LuoTianyiLive2D = dynamic(
  () => import('./LuoTianyiLive2DOptimized'),
  {
    loading: () => null, // 加载时不显示任何内容
    ssr: false, // 禁用服务端渲染
  }
);

// 已知路由列表
const KNOWN_ROUTES = [
  '/',
  '/about',
  '/archive',
  '/blogs',
  '/guestbook',
  '/settings',
  '/tools/pinyin-converter',
  '/tools/markdown-editor',
];

// 404页面路由模式
const NOT_FOUND_PATTERNS = [
  /\/blogs\/[^/]+/,
  /\/tools\/[^/]+/,
];

export default function Live2DControllerOptimized() {
  const pathname = usePathname();
  const [showLive2D, setShowLive2D] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const controllerRef = useRef<{
    mounted: boolean;
    initialized: boolean;
    resourcePreloadStarted: boolean;
  }>({
    mounted: false,
    initialized: false,
    resourcePreloadStarted: false
  });

  // 使用优化的Live2D Hook
  const {
    isVisible,
    metrics,
    initialize,
    getStatus
  } = useLive2DOptimized();

  /**
   * 检查是否为已知路由
   */
  const isKnownRoute = useCallback((path: string): boolean => {
    // 检查是否在已知路由列表中
    if (KNOWN_ROUTES.includes(path)) {
      return true;
    }
    
    // 检查是否为404页面模式
    return NOT_FOUND_PATTERNS.some(pattern => pattern.test(path));
  }, []);

  /**
   * 检查是否应该在当前页面显示Live2D
   */
  const shouldShowLive2D = useCallback((path: string): boolean => {
    // 只在已知路由或博客文章页面显示
    return isKnownRoute(path);
  }, [isKnownRoute]);

  /**
   * 初始化Live2D控制器
   */
  const initializeController = useCallback(async () => {
    if (controllerRef.current.initialized) return;
    
    console.log('[Live2DControllerOptimized] 初始化控制器');
    
    try {
      // 初始化Live2D
      if (!controllerRef.current.resourcePreloadStarted) {
        controllerRef.current.resourcePreloadStarted = true;
        await initialize();
      }
      
      controllerRef.current.initialized = true;
      emitLive2DStatusEvent('init', { 
        pathname,
        timestamp: Date.now(),
        preloadStatus: getStatus()
      });
      
      console.log('[Live2DControllerOptimized] 控制器初始化完成');
    } catch (error) {
      console.error('[Live2DControllerOptimized] 控制器初始化失败:', error);
      setLoadError('初始化失败');
      emitLive2DStatusEvent('error', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        phase: 'initialization'
      });
    }
  }, [initialize, getStatus, pathname]);

  /**
   * 处理路由变化
   */
  useEffect(() => {
    if (!controllerRef.current.mounted) return;
    
    console.log(`[Live2DControllerOptimized] 路由变化: ${pathname}`);
    
    const shouldShow = shouldShowLive2D(pathname);
    setShowLive2D(shouldShow);
    
    // 触发页面变化事件
    live2dEventEmitter.emit(Live2DEvents.PAGE_CHANGE, {
      pathname,
      shouldShowLive2D: shouldShow,
      timestamp: Date.now()
    });
    
    // 如果应该显示但还没初始化，进行初始化
    if (shouldShow && !controllerRef.current.initialized) {
      initializeController();
    }
  }, [pathname, shouldShowLive2D, initializeController]);

  /**
   * 组件挂载时的初始化
   */
  useEffect(() => {
    controllerRef.current.mounted = true;
    
    console.log('[Live2DControllerOptimized] 组件挂载');
    
    // 检查初始路由
    const shouldShow = shouldShowLive2D(pathname);
    setShowLive2D(shouldShow);
    
    if (shouldShow) {
      // 延迟初始化，避免阻塞页面加载
      const initTimer = setTimeout(() => {
        if (controllerRef.current.mounted) {
          initializeController();
        }
      }, 500);
      
      return () => clearTimeout(initTimer);
    }
    
    return () => {
      controllerRef.current.mounted = false;
    };
  }, []);

  /**
   * 组件卸载时的清理
   */
  useEffect(() => {
    return () => {
      console.log('[Live2DControllerOptimized] 组件卸载');
      
      controllerRef.current.mounted = false;
      
      // 发送卸载事件
      live2dEventEmitter.emit('live2d-unmount', {
        timestamp: Date.now(),
        finalStatus: getStatus()
      });
    };
  }, [getStatus]);

  /**
   * 监听Live2D可见性变化
   */
  useEffect(() => {
    if (showLive2D && isVisible) {
      setIsLoading(false);
      setLoadError(null);
      
      emitLive2DStatusEvent('ready', {
        pathname,
        timestamp: Date.now()
      });
      
      console.log('[Live2DControllerOptimized] Live2D组件就绪');
    }
  }, [showLive2D, isVisible, pathname]);



  // 如果不需要显示，返回null
  if (!showLive2D) {
    return null;
  }

  // 如果还在初始化中，显示加载状态
  if (isLoading) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-sm text-gray-600 dark:text-gray-300">Live2D 加载中...</span>
          </div>
        </div>
      </div>
    );
  }

  // 如果加载失败，显示错误信息
  if (loadError) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-red-50 dark:bg-red-900/20 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-red-200 dark:border-red-800">
          <div className="flex items-center space-x-2">
            <div className="text-red-500 text-sm">⚠️</div>
            <span className="text-sm text-red-600 dark:text-red-400">Live2D 加载失败</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Live2D 组件 */}
      <LuoTianyiLive2D />
    </div>
  );
}