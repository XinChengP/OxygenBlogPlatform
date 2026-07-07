import { useCallback, useRef } from 'react';
import { getAssetPath, getBasePath } from '../utils/assetUtils';
import {
  loadScriptWithRetry,
  loadWithRetry,
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
 * 使用权重累加真实回调进度，修复进度条永远 0% 的问题
 */
async function preloadLive2DResources(
  setLoadProgress: (v: number) => void
): Promise<PreloadResult> {
  const basePath = getAssetPath('/luotianyi-live2d-master');
  // 给关键资源分配权重：核心 Live2D 库最大，message 和 model.json 较小
  const criticalResources = [
    { url: `${basePath}/live2d/js/live2d.js`, type: 'script' as const, weight: 5 },
    { url: `${basePath}/live2d/js/message.js`, type: 'script' as const, weight: 2 },
    { url: `${basePath}/live2d/model/tianyi/model.json`, type: 'json' as const, weight: 1 },
  ];

  // 累计权重用于计算真实进度（成功或失败都算完成，避免进度条卡住）
  const totalWeight = criticalResources.reduce((sum, r) => sum + r.weight, 0);
  let completedWeight = 0;

  const updateProgress = () => {
    const percent = Math.min(100, Math.round((completedWeight / totalWeight) * 70));
    setLoadProgress(percent);
  };

  // 立即把进度推到 0% 之外的可见值，避免用户看到永远的 0%
  setLoadProgress(5);

  const loadPromises = criticalResources.map(async ({ url, type, weight }) => {
    try {
      let success: boolean;
      if (type === 'script') {
        // 脚本加载：减少 retryCount 从 3 到 2，避免最坏情况 120s 等待
        const result = await loadScriptWithRetry(url, {
          retryCount: 2,
          timeout: 20000,
          retryDelay: 800,
        });
        success = result.success;
      } else {
        // model.json：仅用于提前确认，不参与脚本执行
        const result = await loadWithRetry(url, {
          retryCount: 2,
          timeout: 15000,
          cache: true,
        });
        success = result.success;
      }
      completedWeight += weight;
      updateProgress();
      return success;
    } catch {
      completedWeight += weight;
      updateProgress();
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
      setLoadProgress(0);

      // 步骤 1：预加载关键资源（脚本 + model.json）
      if (!hasLoadedResourcesRef.current) {
        const preloadResult = await preloadLive2DResources(setLoadProgress);
        if (!preloadResult.success) {
          // 资源加载失败时给出明确提示，但仍允许后续流程尝试挽救
          console.warn('[LuoTianyiLive2D] 部分资源预加载失败，尝试继续加载...');
        }
        hasLoadedResourcesRef.current = true;
      } else {
        // 已加载过资源的情况：直接把进度推到下一阶段
        setLoadProgress(70);
      }

      if (!isMountedRef.current) return;

      // 步骤 2：设置全局路径变量（Live2D 脚本依赖这两个变量）
      if (typeof window !== 'undefined') {
        (window as any).message_Path = getAssetPath('/luotianyi-live2d-master/live2d/');
        (window as any).home_Path = window.location.origin;
      }

      const basePath = getBasePath();

      // 步骤 3：等待 canvas 元素挂载（最多 1s）
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

      // 步骤 4：校验 Live2D 全局函数是否就绪
      if (!window.loadlive2d) {
        throw new Error('Live2D 库未正确加载，请检查脚本');
      }

      setLoadProgress(80);

      // 步骤 5：调用 loadlive2d 加载模型
      const modelPath = getAssetPath('/luotianyi-live2d-master/live2d/model/tianyi/model.json');

      // 修复：删除原先 5 秒无条件 resolve 的逻辑，
      // 现在只依赖 window.Live2D 出现才算成功；30s 仍兜底超时
      const modelLoadPromise = new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => reject(new Error('模型加载超时')), 30000);
        try {
          (window as any).loadlive2d('live2d', modelPath);
          const checkInterval = setInterval(() => {
            if ((window as any).Live2D) {
              clearInterval(checkInterval);
              clearTimeout(timeoutId);
              setLoadProgress(95);
              resolve();
            }
          }, 100);
        } catch (error) {
          clearTimeout(timeoutId);
          reject(error);
        }
      });

      await modelLoadPromise;
      setLoadProgress(100);

      // 步骤 6：建立消息系统（与 canvas 渲染解耦）
      if (messageAbortRef.current) {
        messageAbortRef.current.abort();
      }
      messageAbortRef.current = new AbortController();
      setupMessageSystem(basePath, messageAbortRef.current.signal);

      // 模型已经就绪，关闭加载层
      setTimeout(() => setIsLoading(false), 300);
      setTimeout(() => {
        if (isMountedRef.current) setIsModelReady(true);
      }, 1500);
    } catch (error) {
      console.error('[LuoTianyiLive2D] 加载 Live2D 失败:', error);
      setMessage('天依加载失败了，刷新页面试试～');
      setMessageOpacity(1);
      setTimeout(() => setIsLoading(false), 2000);
    }
  }, [isMountedRef, canvasRef, setLoadProgress, setIsLoading, setIsModelReady, setMessage, setMessageOpacity, setupMessageSystem, messageAbortRef]);

  return { loadLive2D };
}
