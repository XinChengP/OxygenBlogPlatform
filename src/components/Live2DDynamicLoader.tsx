'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

/**
 * Live2D 动态加载包装组件
 *
 * 由于 layout.tsx 是服务端组件，不能直接使用 next/dynamic 的 ssr: false，
 * 因此通过这个 'use client' 包装组件来禁用服务端渲染，避免水合问题。
 *
 * 门控策略（避免无意义下载）：
 * - 首页 / 404 / 后台不加载；
 * - 触屏设备（pointer: coarse）、省流量模式、减少动态效果时不加载；
 * - 其余页面在空闲时段（requestIdleCallback）才加载模型代码，
 *   不和首屏内容抢带宽与主线程。
 * - 一旦加载过就保持挂载，路由切到首页时只隐藏，避免反复初始化模型。
 */
const Live2DController = dynamic(() => import('./Live2DController'), {
    ssr: false,
});

export default function Live2DDynamicLoader() {
    const pathname = usePathname();
    const [shouldMount, setShouldMount] = useState(false);
    const mountedRef = useRef(false);

    const isHiddenRoute = useMemo(() => {
        if (pathname === null) return true;
        return (
            pathname === '/' ||
            pathname === '/404' ||
            pathname === '/not-found' ||
            pathname.startsWith('/_not-found') ||
            pathname.startsWith('/admin')
        );
    }, [pathname]);

    useEffect(() => {
        if (mountedRef.current || isHiddenRoute) return;
        if (typeof window === 'undefined') return;

        // 检测 Electron 环境：preload.js 会在 window 上挂 electronAPI
        // 桌面端不走省流量、触屏、减少动态效果这些移动端/浏览器端限制
        const isElectron = typeof (window as any).electronAPI !== 'undefined';

        if (!isElectron) {
            // 触屏设备上组件本身也会隐藏，直接在下载前跳过
            if (window.matchMedia('(pointer: coarse)').matches) return;
            // 系统设置了「减少动态效果」时不加载，避免喧宾夺主
            // 注意：Electron 会继承 Windows 的「关闭所有不必要的动画」
            // 设置，导致这条检查误判，所以桌面端直接跳过
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

            const navigatorWithHints = navigator as Navigator & {
                connection?: { saveData?: boolean };
            };
            if (navigatorWithHints.connection?.saveData) return;
        }

        const start = () => {
            if (mountedRef.current) return;
            // 空闲回调触发时再确认一次 404（body.not-found 由 not-found 页写入）
            if (document.body.classList.contains('not-found')) return;
            mountedRef.current = true;
            setShouldMount(true);
        };

        const idleWindow = window as Window & {
            requestIdleCallback?: (cb: () => void, options: { timeout: number }) => number;
            cancelIdleCallback?: (handle: number) => void;
        };

        let idleId: number | null = null;
        let timer: ReturnType<typeof setTimeout> | null = null;

        if (typeof idleWindow.requestIdleCallback === 'function') {
            idleId = idleWindow.requestIdleCallback(start, { timeout: 3000 });
        } else {
            timer = setTimeout(start, 2000);
        }

        return () => {
            if (idleId !== null) idleWindow.cancelIdleCallback?.(idleId);
            if (timer !== null) clearTimeout(timer);
        };
    }, [isHiddenRoute]);

    if (!shouldMount) return null;

    return <Live2DController />;
}
