'use client';

import { useEffect, useRef } from 'react';
import { enableHomeFX } from '@/setting/HomeFXSetting';
import { enableBackground, backgroundImage } from '@/setting/WebSetting';
import type { HomeFxController } from './homeFxEngine';

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

interface NavigatorWithHints extends Navigator {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
}

/**
 * 首页背景特效层。
 *
 * 只负责挂载 canvas 和延迟加载引擎；引擎本身与 React 状态解耦，
 * 这样首页水合、打字机和内容渲染不会被逐帧动画拖累。
 */
export default function HomeBackgroundFX() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enableHomeFX || !enableBackground || !backgroundImage) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const navigatorWithHints = navigator as NavigatorWithHints;
    if (navigatorWithHints.connection?.saveData) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (motionQuery.matches) return;

    const lite =
      window.matchMedia('(pointer: coarse)').matches ||
      (navigatorWithHints.hardwareConcurrency ?? 8) <= 4 ||
      (navigatorWithHints.deviceMemory ?? 8) <= 4;

    let cancelled = false;
    let controller: HomeFxController | null = null;
    let idleHandle: number | null = null;

    const idleWindow = window as IdleWindow;
    const useIdle = typeof idleWindow.requestIdleCallback === 'function';

    const start = () => {
      idleHandle = null;
      import('./homeFxEngine')
        .then(({ mountHomeFx }) => {
          const target = canvasRef.current;
          if (cancelled || !target) return;
          controller = mountHomeFx(target, { lite });
          target.dataset.ready = 'true';
        })
        .catch(() => {
          // 特效加载失败时保持纯背景，不影响首页其它内容
        });
    };

    if (useIdle) {
      idleHandle = idleWindow.requestIdleCallback!(start, { timeout: 2000 });
    } else {
      idleHandle = window.setTimeout(start, 1200);
    }

    return () => {
      cancelled = true;

      if (idleHandle !== null) {
        if (useIdle) idleWindow.cancelIdleCallback?.(idleHandle);
        else window.clearTimeout(idleHandle);
      }

      controller?.destroy();
      controller = null;
      canvas.removeAttribute('data-ready');
    };
  }, []);

  if (!enableHomeFX || !enableBackground || !backgroundImage) return null;

  return <canvas ref={canvasRef} className="home-fx" aria-hidden="true" />;
}
