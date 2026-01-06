'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { GalleryImage, ImageLoadStatus } from '../../../types/gallery';


// ImageCard组件属性
interface ImageCardProps {
  image: GalleryImage;
  onClick: () => void;
}

// ImageCard组件
const ImageCard = ({ image, onClick }: ImageCardProps) => {
  // 图片加载状态
  const [loadStatus, setLoadStatus] = useState<ImageLoadStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(image.src);
  const maxRetries = 3;
  const hasFallback = !!image.fallbackSrc;
  const hasSwitchedToFallback = currentSrc === image.fallbackSrc;
  
  // 重试计时器引用
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 重置图片状态 - 使用useCallback优化
  const resetImageState = useCallback(() => {
    setLoadStatus('loading');
    setRetryCount(0);
    setCurrentSrc(image.src); // 重置为原始URL
  }, [image.src]);
  
  // 图片加载成功处理
  const handleImageLoad = () => {
    setLoadStatus('loaded');
    // 清除重试计时器
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };
  
  // 图片加载失败处理
  const handleImageError = () => {
    if (retryCount < maxRetries) {
      // 重试加载图片
      setLoadStatus('loading');
      setRetryCount(prev => prev + 1);
      
      // 清除之前的计时器
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      
      // 指数退避重试
      const waitTime = 1000 * Math.pow(2, retryCount);
      retryTimerRef.current = setTimeout(() => {
        // 通过重新设置src触发重新加载
        setLoadStatus('loading');
      }, waitTime);
    } else if (!hasSwitchedToFallback && hasFallback) {
      // 达到最大重试次数，且有备用URL，切换到备用URL
      setCurrentSrc(image.fallbackSrc!);
      setRetryCount(0);
      setLoadStatus('loading');
    } else {
      // 达到最大重试次数，且没有备用URL或备用URL也失败了，显示加载失败
      setLoadStatus('failed');
    }
  };
  
  // 组件卸载时清除计时器
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);
  
  // 当image.src变化时重置状态
  useEffect(() => {
    resetImageState();
  }, [image.src, resetImageState]);
  
  return (
    <div 
      className="group relative cursor-pointer overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:shadow-xl dark:hover:shadow-blue-900/30"
      onClick={onClick}
    >
      {/* 图片容器 */}
      <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
        {/* 加载中状态 */}
        {loadStatus === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
            {retryCount > 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                重试中... ({retryCount}/{maxRetries})
              </p>
            )}
          </div>
        )}
        
        {/* 图片 */}
        <img
          src={currentSrc}
          alt={image.alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loadStatus === 'loading' ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        
        {/* 加载失败状态 */}
        {loadStatus === 'failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-700">
            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">图片加载失败</p>
            <button 
              className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              onClick={(e) => {
                e.stopPropagation();
                setLoadStatus('loading');
                setRetryCount(0);
              }}
            >
              点击重试
            </button>
          </div>
        )}
        
        {/* 悬停效果：渐变色叠加层 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
          <div className="p-3 w-full">
            <p className="text-white text-sm truncate">{image.alt}</p>
            <p className="text-white/80 text-xs">{image.category}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCard;