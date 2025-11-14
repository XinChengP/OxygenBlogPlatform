'use client';

import { 
  backgroundImage, 
  enableBackground, 
  backgroundMode, 
  backgroundFixed
} from '@/setting/WebSetting';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { getAssetPath } from '@/utils/assetUtils';

/**
 * 网站背景组件
 * 使用 CSS background-image 在最底层显示背景图片
 * 在暗黑模式下添加黑色滤镜效果
 */
export default function BackgroundLayer() {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 确保组件在客户端挂载后再渲染，避免主题不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!enableBackground || !backgroundImage || !mounted) {
    return null;
  }

  // 使用工具函数处理背景图片路径，确保GitHub Pages兼容性
  const fullImagePath = getAssetPath(backgroundImage);

  // 判断是否为暗黑模式
  const isDark = resolvedTheme === 'dark';


  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -50,
        backgroundImage: isDark 
          ? `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("${fullImagePath}")`
          : `url("${fullImagePath}")`,
        backgroundSize: backgroundMode === 'cover' ? 'cover' : backgroundMode === 'contain' ? 'contain' : 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: backgroundFixed ? 'fixed' : 'scroll',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}