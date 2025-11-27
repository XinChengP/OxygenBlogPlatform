'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import { getAssetPath } from '@/utils/assetUtils';
import { cn } from '@/lib/utils';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  sizes?: string;
  quality?: number;
  placeholder?: 'blur' | 'empty';
  onLoad?: () => void;
  onError?: () => void;
}

// 图片缓存管理
const imageCache = new Map<string, boolean>();

// 预加载关键图片
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (imageCache.has(src)) {
      resolve();
      return;
    }
    
    const img = new Image();
    img.onload = () => {
      imageCache.set(src, true);
      resolve();
    };
    img.onerror = () => {
      imageCache.set(src, false);
      reject(new Error(`Failed to load image: ${src}`));
    };
    img.src = src;
  });
};

// 批量预加载图片
export const preloadImages = async (srcs: string[]): Promise<void> => {
  const promises = srcs.map(src => preloadImage(src));
  await Promise.allSettled(promises);
};

const OptimizedImage = memo(function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  loading = 'lazy',
  sizes,
  quality = 85,
  placeholder = 'blur',
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState('');
  const [blurSrc, setBlurSrc] = useState('');

  // 处理图片路径
  const processedSrc = getAssetPath(src);
  
  // 生成模糊占位图
  const generateBlurDataUrl = useCallback((w: number, h: number) => {
    const svg = `
      <svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f3f4f6;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e5e7eb;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="${w}" height="${h}" fill="url(#grad)" />
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }, []);

  useEffect(() => {
    setImageSrc(processedSrc);
    
    // 生成模糊占位图
    if (placeholder === 'blur' && width && height) {
      setBlurSrc(generateBlurDataUrl(width, height));
    }
    
    // 预加载关键图片
    if (priority) {
      preloadImage(processedSrc).catch(() => {
        setIsError(true);
        onError?.();
      });
    }
  }, [processedSrc, priority, placeholder, width, height, generateBlurDataUrl, onError]);

  const handleLoad = () => {
    setIsLoaded(true);
    imageCache.set(imageSrc, true);
    onLoad?.();
  };

  const handleError = () => {
    setIsError(true);
    imageCache.set(imageSrc, false);
    onError?.();
  };

  // 错误状态显示占位图
  if (isError) {
    return (
      <div 
        className={cn(
          "bg-gray-200 dark:bg-gray-700 flex items-center justify-center",
          className
        )}
        style={{ width, height }}
      >
        <svg 
          className="w-8 h-8 text-gray-400 dark:text-gray-500" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" 
          />
        </svg>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* 模糊占位图 */}
      {placeholder === 'blur' && blurSrc && !isLoaded && (
        <img
          src={blurSrc}
          alt={alt}
          width={width}
          height={height}
          className="absolute inset-0 w-full h-full object-cover blur-sm scale-105"
          aria-hidden="true"
        />
      )}
      
      {/* 实际图片 */}
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        sizes={sizes}
        decoding="async"
        className={cn(
          "w-full h-full object-cover transition-opacity duration-300",
          isLoaded ? 'opacity-100' : 'opacity-0',
          placeholder === 'blur' && !isLoaded && 'blur-sm scale-105'
        )}
        onLoad={handleLoad}
        onError={handleError}
      />
      
      {/* 加载状态指示器 */}
      {!isLoaded && !isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded w-8 h-8"></div>
        </div>
      )}
    </div>
  );
});

OptimizedImage.displayName = 'OptimizedImage';

export default OptimizedImage;