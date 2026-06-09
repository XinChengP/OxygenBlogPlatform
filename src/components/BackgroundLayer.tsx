'use client';

import React, { useEffect, useState } from 'react';
import {
  backgroundImage,
  enableBackground,
  backgroundMode,
  backgroundFixed
} from '@/setting/WebSetting';
import { useTheme } from 'next-themes';
import { getAssetPath } from '@/utils/assetUtils';
import { usePathname } from 'next/navigation';

/**
 * 网站背景组件
 * 使用 CSS background-image 在最底层显示背景图片
 * 在暗黑模式下添加黑色滤镜效果
 * 
 * 注意：所有 hooks 必须在条件返回之前调用，遵循 React Hooks 规则
 */
const BackgroundLayer = () => {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();
  const [isClient, setIsClient] = useState(false);

  // 确保组件在客户端挂载后再渲染，避免主题不匹配
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 在所有 hooks 调用之后再进行条件返回
  if (!isClient || !enableBackground || !backgroundImage || pathname?.startsWith('/admin')) {
    return null;
  }

  // 使用工具函数处理背景图片路径，确保 GitHub Pages 兼容性
  const fullImagePath = getAssetPath(backgroundImage);

  // 判断是否为暗黑模式
  const isDark = resolvedTheme === 'dark';

  const backgroundStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    zIndex: -50,
    backgroundImage: isDark
      ? `linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.3)), url("${fullImagePath}")`
      : `url("${fullImagePath}")`,
    backgroundSize: backgroundMode === 'cover' ? 'cover' : backgroundMode === 'contain' ? 'contain' : 'cover',
    backgroundPosition: 'center center',
    backgroundRepeat: 'no-repeat',
    backgroundAttachment: backgroundFixed ? 'fixed' : 'scroll',
    pointerEvents: 'none' as const,
  };

  return (
    <div
      style={backgroundStyle}
      aria-hidden="true"
    />
  );
};

// 使用 React.memo 减少不必要的渲染
export default React.memo(BackgroundLayer);
