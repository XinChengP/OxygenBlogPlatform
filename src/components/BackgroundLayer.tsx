'use client';

import { 
  backgroundImage, 
  enableBackground, 
  backgroundMode, 
  backgroundFixed
} from '@/setting/WebSetting';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

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

  // 处理 basePath，确保在不同环境下都能正确加载图片
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  // 确保backgroundImage以/开头
  const imagePath = backgroundImage.startsWith('/') ? backgroundImage : `/${backgroundImage}`;
  // 在开发环境中，不需要basePath
  const fullImagePath = process.env.NODE_ENV === 'development' ? imagePath : `${basePath}${imagePath}`;

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