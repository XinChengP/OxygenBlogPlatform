'use client';

import React from 'react';
import {
  backgroundImage,
  enableBackground,
  backgroundMode,
} from '@/setting/WebSetting';
import { getAssetPath } from '@/utils/assetUtils';
import { usePathname } from 'next/navigation';

/**
 * 网站背景组件
 *
 * 直接在服务端输出背景层（不再等 hydration），避免首屏背景“弹出”；
 * 暗色遮罩交给 CSS 的 .dark 选择器，无需读取 resolvedTheme。
 * 容器本身是 fixed，不再额外设置 background-attachment: fixed
 * （该属性在移动端会增加滚动重绘，且对 fixed 元素没有视觉收益）。
 */
const BackgroundLayer = () => {
  const pathname = usePathname();

  if (!enableBackground || !backgroundImage || pathname?.startsWith('/admin')) {
    return null;
  }

  const fullImagePath = getAssetPath(backgroundImage);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -50,
        backgroundImage: `url("${fullImagePath}")`,
        backgroundSize:
          backgroundMode === 'cover'
            ? 'cover'
            : backgroundMode === 'contain'
              ? 'contain'
              : 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        pointerEvents: 'none',
      }}
    >
      {/* 暗色遮罩：由 .dark 类切换，无需 JS 参与 */}
      <div className="absolute inset-0 hidden bg-black/40 dark:block" />
    </div>
  );
};

// 使用 React.memo 减少不必要的渲染
export default React.memo(BackgroundLayer);
