'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  onClick?: () => void;
  /**
   * 模糊占位符图片URL（低分辨率版本）
   * 用于实现渐进式加载效果
   */
  blurDataURL?: string;
  /**
   * 是否启用WebP格式自动转换
   * 默认启用
   */
  enableWebP?: boolean;
  /**
   * 图片填充模式
   */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /**
   * 图片圆角
   */
  borderRadius?: string;
}

/**
 * 优化的图片组件 - 增强版懒加载实现
 * 
 * 核心功能：
 * 1. 智能懒加载 - 使用 Intersection Observer 实现精确的图片进入视口检测
 * 2. 模糊占位符 - 支持渐进式加载，先显示模糊小图再过渡到清晰大图
 * 3. WebP自动转换 - 自动检测浏览器支持并转换图片格式
 * 4. 加载状态管理 - 优雅的加载动画和错误处理
 * 5. 性能优化 - 减少重绘重排，使用GPU加速
 * 
 * @param props - 组件属性
 * @returns 优化后的图片组件
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  loading = 'lazy',
  placeholder,
  quality = 80,
  onClick,
  blurDataURL,
  enableWebP = true,
  objectFit = 'cover',
  borderRadius,
}: OptimizedImageProps) {
  // 状态管理
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const [shouldLoad, setShouldLoad] = useState(priority || loading === 'eager');
  const [isInViewport, setIsInViewport] = useState(false);
  
  // 引用管理
  const imgRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  /**
   * 检测浏览器是否支持WebP格式
   * 通过创建canvas并尝试转换为WebP来检测
   * 
   * @returns 是否支持WebP
   */
  const checkWebPSupport = useCallback((): boolean => {
    try {
      const canvas = document.createElement('canvas');
      if (canvas.getContext && canvas.getContext('2d')) {
        // 尝试将空canvas转换为WebP格式
        return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  /**
   * 将图片URL转换为WebP格式
   * 仅对本地图片进行转换，外部URL保持原样
   * 
   * @param url - 原始图片URL
   * @returns 转换后的URL
   */
  const convertToWebP = useCallback((url: string): string => {
    // 不转换外部URL、Data URL和已经是WebP的图片
    if (url.startsWith('http') || url.startsWith('data:') || url.endsWith('.webp')) {
      return url;
    }
    
    // 检查浏览器是否支持WebP
    if (!checkWebPSupport()) {
      return url;
    }
    
    // 尝试将常见图片格式转换为WebP
    const webpExtensions = ['.jpg', '.jpeg', '.png'];
    const hasConvertibleExtension = webpExtensions.some(ext => 
      url.toLowerCase().endsWith(ext)
    );
    
    if (hasConvertibleExtension) {
      // 移除原扩展名并添加.webp
      const baseUrl = url.replace(/\.(jpg|jpeg|png)$/i, '');
      return `${baseUrl}.webp`;
    }
    
    return url;
  }, [checkWebPSupport]);

  /**
   * 处理图片路径和格式
   * 包括路径处理和WebP转换
   */
  useEffect(() => {
    const srcString = String(src);
    const isLocalAsset = !srcString.startsWith('http') && !srcString.startsWith('data:');
    
    // 处理本地资源路径
    let processedSrc = isLocalAsset ? getAssetPath(srcString) : srcString;
    
    // 如果启用WebP，尝试转换格式
    if (enableWebP && shouldLoad) {
      processedSrc = convertToWebP(processedSrc);
    }
    
    setImageSrc(processedSrc);
  }, [src, enableWebP, shouldLoad, convertToWebP]);

  /**
   * 设置 Intersection Observer 实现智能懒加载
   * 当图片进入视口一定距离时才开始加载
   */
  useEffect(() => {
    // 如果优先加载或已经应该加载，不需要观察
    if (priority || loading === 'eager' || shouldLoad) {
      return;
    }

    const element = imgRef.current;
    if (!element) return;

    // 创建 Intersection Observer
    // rootMargin 设置为 200px，提前200px开始加载
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInViewport(true);
            setShouldLoad(true);
            // 停止观察，因为已经触发加载
            observerRef.current?.unobserve(element);
          }
        });
      },
      {
        root: null,
        rootMargin: '200px 0px', // 提前200px开始加载
        threshold: 0.01, // 只要有1%进入视口就触发
      }
    );

    observerRef.current.observe(element);

    // 清理函数
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [priority, loading, shouldLoad]);

  /**
   * 图片加载完成回调
   * 添加延迟确保过渡动画流畅
   */
  const handleLoad = useCallback(() => {
    // 使用 requestAnimationFrame 确保在下一帧设置状态
    // 这样可以避免与模糊占位符的闪烁
    requestAnimationFrame(() => {
      setIsLoaded(true);
    });
  }, []);

  /**
   * 图片加载错误回调
   * 如果WebP加载失败，尝试回退到原格式
   */
  const handleError = useCallback(() => {
    const srcString = String(src);
    
    // 如果当前是WebP格式且加载失败，尝试回退到原格式
    if (imageSrc.endsWith('.webp') && !srcString.endsWith('.webp')) {
      const isLocalAsset = !srcString.startsWith('http') && !srcString.startsWith('data:');
      const originalSrc = isLocalAsset ? getAssetPath(srcString) : srcString;
      setImageSrc(originalSrc);
    } else {
      setIsError(true);
    }
  }, [imageSrc, src]);

  // 生成默认的SVG占位符
  const defaultPlaceholder = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${width || 400}" height="${height || 300}" viewBox="0 0 ${width || 400} ${height || 300}"%3E%3Crect width="${width || 400}" height="${height || 300}" fill="%23f3f4f6"/%3E%3C/svg%3E`;
  
  // 最终使用的占位符
  const finalPlaceholder = placeholder || defaultPlaceholder;
  
  // 错误状态下的回退图片
  const errorPlaceholder = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${width || 400}" height="${height || 300}" viewBox="0 0 ${width || 400} ${height || 300}"%3E%3Crect width="${width || 400}" height="${height || 300}" fill="%23fee2e2"/%3E%3Ctext x="50%25" y="50%25" font-size="14" fill="%23dc2626" text-anchor="middle" dominant-baseline="middle"%3E加载失败%3C/text%3E%3C/svg%3E`;
  
  // 实际显示的图片源
  const finalSrc = isError ? errorPlaceholder : (shouldLoad ? imageSrc : finalPlaceholder);
  
  // 是否显示模糊占位符
  const showBlurPlaceholder = blurDataURL && !isLoaded && !isError && shouldLoad;

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`} 
      style={{ 
        width, 
        height,
        borderRadius,
        // 使用contain布局避免布局偏移
        aspectRatio: width && height ? `${width}/${height}` : undefined,
      }}
    >
      {/* 模糊占位符 - 渐进式加载效果 */}
      {showBlurPlaceholder && (
        <div
          className="absolute inset-0 z-10 transition-opacity duration-500"
          style={{
            backgroundImage: `url(${blurDataURL})`,
            backgroundSize: objectFit,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: isLoaded ? 'blur(0px)' : 'blur(20px)',
            opacity: isLoaded ? 0 : 1,
            transform: isLoaded ? 'scale(1)' : 'scale(1.1)', // 轻微缩放避免模糊边缘
          }}
        />
      )}

      {/* 骨架屏加载动画 - 在没有模糊占位符时显示 */}
      {!blurDataURL && !isLoaded && shouldLoad && !isError && (
        <div 
          className="absolute inset-0 z-10 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      )}

      {/* 实际图片 */}
      <img
        src={finalSrc}
        alt={alt}
        width={width}
        height={height}
        className="w-full h-full transition-all duration-500"
        style={{
          objectFit,
          opacity: isLoaded ? 1 : 0,
          transform: isLoaded ? 'scale(1)' : 'scale(1.05)',
          // 使用GPU加速
          willChange: isLoaded ? 'auto' : 'transform, opacity',
        }}
        onLoad={handleLoad}
        onError={handleError}
        onClick={onClick}
        crossOrigin="anonymous"
        decoding={priority ? 'sync' : 'async'}
      />

      {/* 错误提示覆盖层 */}
      {isError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-20">
          <div className="text-center">
            <svg 
              className="w-8 h-8 mx-auto mb-2 text-gray-400" 
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
            <span className="text-xs text-gray-500">图片加载失败</span>
          </div>
        </div>
      )}

      {/* CSS动画定义 */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * 生成图片的模糊占位符
 * 用于服务端生成低分辨率预览图
 * 
 * @param src - 图片源地址
 * @param width - 目标宽度
 * @returns Base64编码的模糊图片
 */
export async function generateBlurPlaceholder(
  src: string, 
  width: number = 16
): Promise<string> {
  // 这里可以集成实际的图片处理库（如sharp）来生成真实的模糊图
  // 目前返回一个默认的灰色占位符
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}"%3E%3Crect width="100%25" height="100%25" fill="%23f3f4f6"/%3E%3C/svg%3E`;
}
