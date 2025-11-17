'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';
import { useImageCache } from '@/contexts/ImageCacheContext';

/**
 * 图片缓存管理器 - 防止重复加载相同的图片
 */
class ImageCache {
  private static cache = new Map<string, boolean>();
  
  static has(src: string): boolean {
    // 检查全局缓存
    if (typeof window !== 'undefined' && (window as any).__imageCache) {
      return (window as any).__imageCache.has(src);
    }
    return this.cache.has(src);
  }
  
  static set(src: string, loaded: boolean): void {
    // 更新全局缓存
    if (typeof window !== 'undefined') {
      if (!(window as any).__imageCache) {
        (window as any).__imageCache = new Map();
      }
      (window as any).__imageCache.set(src, loaded);
    }
    this.cache.set(src, loaded);
  }
  
  static get(src: string): boolean | undefined {
    // 优先使用全局缓存
    if (typeof window !== 'undefined' && (window as any).__imageCache) {
      return (window as any).__imageCache.get(src);
    }
    return this.cache.get(src);
  }
  
  static clear(): void {
    if (typeof window !== 'undefined' && (window as any).__imageCache) {
      (window as any).__imageCache.clear();
    }
    this.cache.clear();
  }
}

/**
 * 判断是否为外部图片链接
 */
function isExternalImage(src: string): boolean {
  return src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//');
}

/**
 * 处理图片路径，正确添加basePath支持
 * 对于外部图片使用Next.js Image组件，对于本地图片需要手动添加basePath
 */
function processImagePath(src: string): string {
  // 如果是外部链接，直接返回
  if (isExternalImage(src)) {
    return src;
  }
  
  // 在开发环境中，直接使用原始路径
  if (process.env.NODE_ENV === 'development') {
    return src;
  }
  
  // 在生产环境中，优先使用NEXT_PUBLIC_BASE_PATH，如果没有则使用NEXT_PUBLIC_GITHUB_REPO_NAME构建basePath
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || 
                   (process.env.NEXT_PUBLIC_GITHUB_REPO_NAME ? `/${process.env.NEXT_PUBLIC_GITHUB_REPO_NAME}` : '');
  
  // 如果是相对路径（如 ./assets/example.svg 或 ../assets/example.svg），转换为绝对路径
  if (src.startsWith('./') || src.startsWith('../')) {
    // 移除相对路径前缀，转换为从public目录开始的路径
    const cleanPath = src.replace(/^\.\.?\//, '');
    return basePath ? `${basePath}/${cleanPath}` : `/${cleanPath}`;
  }
  
  // 如果已经是绝对路径（以/开头），添加basePath
  if (src.startsWith('/')) {
    return basePath ? `${basePath}${src}` : src;
  }
  
  // 其他情况，假设是相对于public目录的路径
  return basePath ? `${basePath}/${src}` : `/${src}`;
}

interface OptimizedImageProps {
  src: string;
  alt: string;
  title?: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
}

export default function OptimizedImage({
  src,
  alt,
  title,
  className = '',
  width = 800,
  height = 600,
  priority = true // 默认设置为true，让所有图片立即加载
}: OptimizedImageProps) {
  const { getCachedState, setCachedState } = useImageCache();
  
  // 检查图片是否已经在缓存中 - 修复缓存检查逻辑
  const cachedLoaded = useMemo(() => {
    const contextCache = getCachedState(src);
    const localCache = ImageCache.get(src);
    return contextCache ?? localCache;
  }, [src, getCachedState]);
  
  // 修复：只有当缓存明确为false时才设置为false，否则保持当前状态
  const [isLoaded, setIsLoaded] = useState(() => {
    // 如果缓存明确为true，则设置为true
    if (cachedLoaded === true) return true;
    // 如果缓存明确为false，则设置为false
    if (cachedLoaded === false) return false;
    // 如果缓存为undefined（未缓存），则默认为false
    return false;
  });
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(true); // 默认设置为true，立即显示所有图片
  const [isMounted, setIsMounted] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  
  // 防止重复请求的状态管理
  const loadingStateRef = useRef<'idle' | 'loading' | 'loaded' | 'error'>(cachedLoaded === true ? 'loaded' : 'idle');

  // 使用 useMemo 缓存处理后的图片路径和外部链接判断，避免重复计算
  const processedSrc = useMemo(() => processImagePath(src), [src]);
  const isExternal = useMemo(() => isExternalImage(src), [src]);
  
  // 改进的状态重置逻辑：避免在路由切换时重复重置
  const prevSrcRef = useRef(src);
  useEffect(() => {
    if (prevSrcRef.current !== src) {
      prevSrcRef.current = src;
      // 只有在真正需要重新加载时才重置状态
      if (loadingStateRef.current !== 'loaded') {
        loadingStateRef.current = 'idle';
        setIsLoaded(false);
        setHasError(false);
      }
    }
  }, [src]);

  // 确保组件已挂载，避免水合不匹配
  useEffect(() => {
    setIsMounted(true);
    
    // 页面卸载时清理缓存（可选，防止内存泄漏）
    return () => {
      // 只清理错误状态的缓存，保留成功加载的图片缓存
      if (loadingStateRef.current === 'error') {
        ImageCache.set(src, false);
      }
    };
  }, [src]);

  // 移除懒加载逻辑，所有图片立即加载
  useEffect(() => {
    // 不再使用 Intersection Observer，所有图片都立即设置为可见
    setIsInView(true);
  }, []);

  // 防止闪烁：使用稳定的key和缓存机制，只在必要时更新
  const imageKey = useMemo(() => {
    return `${src}-${width}-${height}`;
  }, [src, width, height]);

  // 改进的服务端渲染处理：使用更稳定的占位符避免水合不匹配
  if (!isMounted) {
    return (
      <div ref={imgRef} className={`relative overflow-hidden rounded-lg max-w-full shadow-lg ${className}`}>
        <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center" style={{ width, height: height }}>
          <div className="text-gray-400 dark:text-gray-500 text-sm flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            图片
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        ref={imgRef}
        className={`flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 text-gray-400 dark:text-gray-500 p-8 rounded-lg min-h-[200px] max-w-full shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}
        style={{ opacity: 1, transition: 'opacity 0.3s ease-in-out' }}
      >
        <div className="text-center">
          <div className="text-5xl mb-3 opacity-60">🖼️</div>
          <div className="text-sm font-medium">图片加载失败</div>
          {alt && <div className="text-xs text-gray-400 dark:text-gray-500 mt-2 opacity-80">{alt}</div>}
          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 opacity-60">请检查网络连接或稍后重试</div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden rounded-xl max-w-full shadow-lg ${className}`}
      key={imageKey}
    >
      <div className="relative" style={{ width, height: height }}>
        {!isLoaded && (
          <div
            className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center z-20 animate-pulse"
            style={{ opacity: isLoaded ? 0 : 1, transition: 'opacity 0.3s ease-in-out' }}
          >
            <div className="text-gray-400 dark:text-gray-500 text-sm flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              加载中...
            </div>
          </div>
        )}

        {isInView && (
          <div
            className={isLoaded ? 'opacity-100' : 'opacity-0'}
            style={{ transition: 'opacity 0.3s ease-in-out' }}
          >
            {isExternal ? (
              <img
                src={processedSrc}
                alt={alt}
                title={title}
                loading={priority ? 'eager' : 'lazy'}
                className="w-full h-full object-contain"
                style={{ width, height: height }}
                onLoad={() => {
                  if (loadingStateRef.current === 'idle' || loadingStateRef.current === 'loading') {
                    loadingStateRef.current = 'loaded';
                    setIsLoaded(true);
                    // 缓存已加载的图片到两个缓存系统 - 确保缓存正确设置
                    ImageCache.set(src, true);
                    setCachedState(src, true);
                    console.log(`图片加载成功并缓存: ${src}`);
                  }
                }}
                onError={() => {
                  if (loadingStateRef.current === 'idle' || loadingStateRef.current === 'loading') {
                    loadingStateRef.current = 'error';
                    setHasError(true);
                  }
                }}
                onLoadStart={() => {
                  if (loadingStateRef.current === 'idle') {
                    loadingStateRef.current = 'loading';
                  }
                }}
                decoding="async"
              />
            ) : (
              <Image
                src={processedSrc}
                alt={alt}
                title={title}
                width={width}
                height={height}
                className="w-full h-full object-contain"
                style={{ width, height: height }}
                loading={priority ? 'eager' : 'lazy'}
                priority={priority}
                placeholder="blur"
                blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
                onLoad={() => {
                  if (loadingStateRef.current === 'idle' || loadingStateRef.current === 'loading') {
                    loadingStateRef.current = 'loaded';
                    setIsLoaded(true);
                    // 缓存已加载的图片到两个缓存系统
                    ImageCache.set(src, true);
                    setCachedState(src, true);
                  }
                }}
                onError={() => {
                  if (loadingStateRef.current === 'idle' || loadingStateRef.current === 'loading') {
                    loadingStateRef.current = 'error';
                    setHasError(true);
                  }
                }}
                onLoadStart={() => {
                  if (loadingStateRef.current === 'idle') {
                    loadingStateRef.current = 'loading';
                  }
                }}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
              />
            )}
          </div>
        )}

        {(alt || title) && isLoaded && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white text-sm p-3 text-center block">
            {alt || title}
          </div>
        )}
      </div>
    </div>
  );
}
