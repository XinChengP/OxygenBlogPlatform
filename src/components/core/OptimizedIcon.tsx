import React from 'react';
import Image from 'next/image';
import { getAssetPath } from '@/utils/assetUtils';

interface OptimizedIconProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

/**
 * 优化的图标组件 - 专门用于GitHub Pages部署
 * 自动处理静态资源路径，确保图标在生产和开发环境都能正确加载
 */
export default function OptimizedIcon({ 
  src, 
  alt, 
  width = 24, 
  height = 24, 
  className = '',
  priority = true 
}: OptimizedIconProps) {
  // 确保src是字符串类型
  const srcString = String(src);
  
  // 检查是否为本地静态资源（非外部URL）
  const isLocalAsset = !srcString.startsWith('http') && !srcString.startsWith('data:');
  
  // 本地资源使用getAssetPath处理路径
  const imageSrc = isLocalAsset ? getAssetPath(srcString) : srcString;
  
  return (
    <Image
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized={true} // 禁用Next.js图片优化，确保兼容性
      loading="eager" // 立即加载图标
    />
  );
}