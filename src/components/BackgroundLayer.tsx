'use client';

import React from 'react';
import {
  backgroundImage,
  enableBackground,
  backgroundMode,
} from '@/setting/WebSetting';
import { getAssetPath } from '@/utils/assetUtils';
import { usePathname } from 'next/navigation';
import backgroundImageManifest from '@/data/backgroundImageManifest.json';
import { buildResponsiveSrcSet } from '@/utils/responsiveImage';

/**
 * 网站背景组件
 *
 * 直接在服务端输出背景层（不再等 hydration），避免首屏背景“弹出”；
 * 暗色遮罩交给 CSS 的 .dark 选择器，无需读取 resolvedTheme。
 *
 * 背景图使用 <img srcset> 而不是 CSS background-image：
 * 原图 2844×1600 / 460KB，手机下载整张图浪费带宽；构建期已生成
 * 640/1280/1920/2560 WebP，浏览器按视口与 DPR 选合适档位。
 */
const BackgroundLayer = () => {
  const pathname = usePathname();

  if (!enableBackground || !backgroundImage || pathname?.startsWith('/admin')) {
    return null;
  }

  const fullImagePath = getAssetPath(backgroundImage);
  const configuredSource = `/${backgroundImage.replace(/^\/+/, '')}`;
  const manifestIsCurrent = backgroundImageManifest.source === configuredSource;
  const responsiveSrcSet = manifestIsCurrent
    ? buildResponsiveSrcSet(backgroundImageManifest)
    : undefined;

  // backgroundMode 在 WebSetting 中是字面量联合，直接比较会被 TS 判定为无重叠；
  // 用 String 保留未来改成 contain 时的运行期配置能力。
  const objectFit: React.CSSProperties['objectFit'] =
    String(backgroundMode) === 'contain' ? 'contain' : 'cover';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -50,
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <img
        src={fullImagePath}
        srcSet={responsiveSrcSet}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 w-full h-full"
        style={{ objectFit, objectPosition: 'center center' }}
      />
      {/* 暗色遮罩：由 .dark 类切换，无需 JS 参与 */}
      <div className="absolute inset-0 hidden bg-black/40 dark:block" />
    </div>
  );
};

// 使用 React.memo 减少不必要的渲染
export default React.memo(BackgroundLayer);
