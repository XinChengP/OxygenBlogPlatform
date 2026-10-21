'use client';

import { useEffect } from 'react';
import { getAssetPath } from '@/utils/assetUtils';

/**
 * Service Worker 注册器（public/sw.js）
 *
 * 行为规则：
 * - 仅生产构建注册：
 *   开发模式下 SW 会把 dev server 输出的无哈希 chunk 强缓存，
 *   表现为「改代码不生效」「热更新失效」，与本站 dev 的 no-store 约定冲突。
 * - 开发模式下主动注销可能残留的旧注册，避免历史问题延续；
 * - 注册挂在 window load 之后，不与首屏 LCP 资源竞争；
 * - 注册失败静默：浏览器禁用 SW 或隐私模式下站点功能不受影响。
 *
 * 缓存策略本身见 public/sw.js 顶部注释。
 */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      // 清理可能残留的开发环境 SW，避免影响本地调试
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => r.unregister()))
        .catch(() => undefined);
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register(getAssetPath('/sw.js'), { scope: getAssetPath('/') })
        .catch(() => {
          // 注册失败（UserPreference / 文件不存在）不影响站点运行
        });
    };

    if (document.readyState === 'complete') {
      register();
    } else {
      window.addEventListener('load', register, { once: true });
    }
  }, []);

  return null;
}
