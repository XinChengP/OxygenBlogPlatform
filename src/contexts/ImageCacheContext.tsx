'use client';

import React, { createContext, useContext, useRef, ReactNode } from 'react';

/**
 * 图片缓存上下文 - 用于在路由切换时保持图片加载状态
 */
interface ImageCacheContextType {
  getCachedState: (src: string) => boolean | undefined;
  setCachedState: (src: string, loaded: boolean) => void;
}

const ImageCacheContext = createContext<ImageCacheContextType | undefined>(undefined);

/**
 * 图片缓存提供器 - 包裹应用以启用图片状态缓存
 */
export function ImageCacheProvider({ children }: { children: ReactNode }) {
  const cacheRef = useRef<Map<string, boolean>>(new Map());

  const getCachedState = (src: string): boolean | undefined => {
    return cacheRef.current.get(src);
  };

  const setCachedState = (src: string, loaded: boolean): void => {
    cacheRef.current.set(src, loaded);
  };

  return (
    <ImageCacheContext.Provider value={{ getCachedState, setCachedState }}>
      {children}
    </ImageCacheContext.Provider>
  );
}

/**
 * 使用图片缓存的 Hook
 */
export function useImageCache() {
  const context = useContext(ImageCacheContext);
  if (context === undefined) {
    throw new Error('useImageCache must be used within an ImageCacheProvider');
  }
  return context;
}