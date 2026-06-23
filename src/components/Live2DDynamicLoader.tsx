'use client';

import dynamic from 'next/dynamic';
import React from 'react';

/**
 * Live2D 动态加载包装组件
 *
 * 由于 layout.tsx 是服务端组件，不能直接使用 next/dynamic 的 ssr: false，
 * 因此通过这个 'use client' 包装组件来禁用服务端渲染，避免水合问题。
 */
const Live2DController = dynamic(() => import('./Live2DController'), {
    ssr: false,
});

export default function Live2DDynamicLoader() {
    return <Live2DController />;
}
