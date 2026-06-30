import { useCallback, useRef } from 'react';
import { getAssetPath, getBasePath } from '../utils/assetUtils';
import {
  loadScriptWithRetry,
  loadWithRetry,
  createProgressTracker,
  checkResourceExists,
  type LoadResult,
} from '../utils/live2dLoader';

interface PreloadResult {
  success: boolean;
  failedResources?: string[];
}

interface LoadLive2DOptions {
  isMountedRef: React.RefObject<boolean>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  setLoadProgress: (v: number) => void;
  setIsLoading: (v: boolean) => void;
  setIsModelReady: (v: boolean) => void;
  setMessage: (v: string) => void;
  setMessageOpacity: (v: number) => void;
  setupMessageSystem: (basePath: string, signal: AbortSignal) => void;
  messageAbortRef: React.RefObject<AbortController | null>;
}

/**
 * 预加载 Live2D 关键资源
 */
async function preloadLive2DResources(): Promise<PreloadResult> {
  const basePath = getAssetPath('/luotianyi-live2d-master');
  const criticalResources = [
    { url: `${basePath}/live2d/js/live2d.js`, type: 'script' as const },
    { url: `${basePath}/live2d/js/message.js`, type: 'script' as const },
    { url: `${basePath}/live2d/model/tianyi/model.json`, type: 'json' as const },
  ];

  const progressTracker = createProgressTracker(
    criticalResources.length,
    () => {}
  );

  const loadPromises = criticalResources.map(async ({ url, type }) => {
    try {
      if (type === 'script') {
        const result = await loadScriptWithRetry(url, {
          retryCount: 3,
          timeout: 30000,
          retryDelay: 1000,
        });
        progressTracker.onItemLoaded(result.success);
        return result.success;
      } else {
        const result = await loadWithRetry(url, {
          retryCount: 3,
          cache: true,
          timeout: 20000,
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
  const successCount = results.filter(Boolean).length;

  if (successCount < criticalResources.length) {
    const failedResources = criticalResources
      .filter((_, i) => !results[i])
      .map((r) => r.url);
    console.error('[Live2D] 以下资源加载失败:', failedResources);
    return { success: false, failedResources };
  }

  return { success: true };
}

/**
 * 加载 Live2D 模型的自定义 Hook
 */
export function useLive2DLoader({
  isMountedRef,
  canvasRef,
  setLoadProgress,
  setIsLoading,
  setIsModelReady,
  setMessage,
  setMessageOpacity,
  setupMessageSystem,
  messageAbortRef,
}: LoadLive2DOptions) {
  const hasLoadedResourcesRef = useRef(false);

  const loadLive2D = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      if (!hasLoadedResourcesRef.current) {
        const preloadResult = await preloadLive2DResources();
        if (!preloadResult.success) {
          console.warn('[LuoTianyiLive2D] 部分资源预加载失败，尝试继续加载...');
        }
        hasLoadedResourcesRef.current = true;
      }

      if (typeof window !== 'undefined') {
        (window as any).message_Path = getAssetPath('/luotianyi-live2d-master/live2d/');
        (window as any).home_Path = window.location.origin;
      }

      const live2dPath = getAssetPath('/luotianyi-live2d-master/live2d');
      const messagePath = live2dPath;
      const basePath = getBasePath();

      const live2dJsUrl = `${live2dPath}/js/live2d.js`;
      const messageJsUrl = `${messagePath}/js/message.js`;

      const [live2dExists] = await Promise.all([
        checkResourceExists(live2dJsUrl),
        checkResourceExists(messageJsUrl),
      ]);

      if (!live2dExists) {
        throw new Error(`核心脚本不存在: ${live2dJsUrl}`);
      }

      const isScriptLoaded = (src: string) =>
        !!document.querySelector(`script[src="${src}"]`);

      const [live2dResult, messageResult] = await Promise.all([
        isScriptLoaded(live2dJsUrl)
          ? ({ success: true, loadTime: 0, retryCount: 0, error: undefined } as LoadResult<void>)
          : loadScriptWithRetry(live2dJsUrl, {
              retryCount: 3,
              timeout: 30000,
              retryDelay: 1000,
            }),
        isScriptLoaded(messageJsUrl)
          ? ({ success: true, loadTime: 0, retryCount: 0, error: undefined } as LoadResult<void>)
          : loadScriptWithRetry(messageJsUrl, {
              retryCount: 3,
              timeout: 30000,
              retryDelay: 1000,
            }),
      ]);

      if (!live2dResult.success) {
        throw new Error(`Live2D核心脚本加载失败: ${live2dResult.error?.message}`);
      }

      if (!messageResult.success) {
        console.warn('[LuoTianyiLive2D] 消息脚本加载失败，继续加载模型...');
      }

      let retries = 0;
      const maxRetries = 10;
      while (!canvasRef.current && retries < maxRetries && isMountedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        retries++;
      }

      if (!isMountedRef.current) return;

      if (!canvasRef.current) {
        console.error('[LuoTianyiLive2D] Canvas 元素未找到，重试次数:', retries);
        setMessage('天依初始化中，请稍后再试～');
        setMessageOpacity(1);
        setIsLoading(false);
        return;
      }

      if (!window.loadlive2d) {
        throw new Error('Live2D 库未正确加载');
      }

      const modelPath = getAssetPath('/luotianyi-live2d-master/live2d/model/tianyi/model.json');
      const modelExists = await checkResourceExists(modelPath);
      if (!modelExists) {
        throw new Error(`模型文件不存在: ${modelPath}`);
      }

      const modelLoadPromise = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('模型加载超时')), 30000);
        try {
          (window as any).loadlive2d('live2d', modelPath);
          const checkInterval = setInterval(() => {
            if ((window as any).Live2D) {
              clearInterval(checkInterval);
              clearTimeout(timeoutId);
              resolve();
            }
          }, 100);
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

      if (messageAbortRef.current) {
        messageAbortRef.current.abort();
      }
      messageAbortRef.current = new AbortController();
      setupMessageSystem(basePath, messageAbortRef.current.signal);

      setTimeout(() => setIsLoading(false), 800);
      setTimeout(() => {
        if (isMountedRef.current) setIsModelReady(true);
      }, 2000);
    } catch (error) {
      console.error('[LuoTianyiLive2D] 加载 Live2D 失败:', error);
      setMessage('天依加载失败了，刷新页面试试～');
      setMessageOpacity(1);
      setTimeout(() => setIsLoading(false), 2000);
    }
  }, [isMountedRef, canvasRef, setIsLoading, setIsModelReady, setMessage, setMessageOpacity, setupMessageSystem, messageAbortRef]);

  return { loadLive2D };
}
