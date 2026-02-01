import React, { useState, useEffect } from 'react';
import { getAssetPath } from '@/utils/assetUtils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  placeholder?: string;
  quality?: number;
}

/**
 * 优化的图片组件 - 专门用于GitHub Pages部署
 * 提供以下功能：
 * 1. 自动处理静态资源路径
 * 2. 支持图片懒加载
 * 3. 提供加载占位符
 * 4. 错误处理和回退
 * 5. 图片缓存优化
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  loading = 'lazy',
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"%3E%3Crect width="400" height="300" fill="%23f3f4f6"/%3E%3C/svg%3E',
  quality = 80
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  
  // 处理图片路径和加载
  useEffect(() => {
    // 确保src是字符串类型
    const srcString = String(src);
    
    // 检查是否为本地静态资源（非外部URL）
    const isLocalAsset = !srcString.startsWith('http') && !srcString.startsWith('data:');
    
    // 本地资源使用getAssetPath处理路径
    const processedSrc = isLocalAsset ? getAssetPath(srcString) : srcString;
    
    setImageSrc(processedSrc);
  }, [src]);
  
  const handleLoad = () => {
    setIsLoaded(true);
  };
  
  const handleError = () => {
    setIsError(true);
  };
  
  // 如果图片加载失败，使用占位符
  const finalSrc = isError ? placeholder : imageSrc;
  
  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {/* 加载占位符 */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-md"
          style={{ width, height }}
        >
          {placeholder && (
            <img
              src={placeholder}
              alt="Loading"
              className="w-full h-full object-cover"
            />
          )}
        </div>
      )}
      
      {/* 实际图片 */}
      <img
        src={finalSrc}
        alt={alt}
        width={width}
        height={height}
        className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        // 添加缓存控制
        crossOrigin="anonymous"
      />
    </div>
  );
}
