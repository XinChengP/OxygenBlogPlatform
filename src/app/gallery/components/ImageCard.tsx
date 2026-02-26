'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GalleryImage, ImageLoadStatus } from '../../../types/gallery';
import { getAssetPath } from '@/utils/assetUtils';
import { RefreshCw, ImageOff, Tag } from 'lucide-react';

// ImageCard组件属性
interface ImageCardProps {
  image: GalleryImage;
  onClick: () => void;
  index: number;
}

// ImageCard组件
const ImageCard = ({ image, onClick, index }: ImageCardProps) => {
  // 图片加载状态
  const [loadStatus, setLoadStatus] = useState<ImageLoadStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [currentSrc, setCurrentSrc] = useState(image.src);
  const maxRetries = 3;
  const hasFallback = !!image.fallbackSrc;
  const hasSwitchedToFallback = currentSrc === image.fallbackSrc;
  
  // 重试计时器引用
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 处理图片路径 - 使用getAssetPath确保GitHub Pages兼容性
  const processImagePath = useCallback((path: string) => {
    return getAssetPath(path);
  }, []);

  // 重置图片状态 - 使用useCallback优化
  const resetImageState = useCallback(() => {
    setLoadStatus('loading');
    setRetryCount(0);
    setCurrentSrc(processImagePath(image.src));
  }, [image.src, processImagePath]);
  
  // 图片加载成功处理
  const handleImageLoad = () => {
    setLoadStatus('loaded');
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };
  
  // 图片加载失败处理
  const handleImageError = () => {
    if (retryCount < maxRetries) {
      setLoadStatus('loading');
      setRetryCount(prev => prev + 1);
      
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
      
      const waitTime = 1000 * Math.pow(2, retryCount);
      retryTimerRef.current = setTimeout(() => {
        setLoadStatus('loading');
      }, waitTime);
    } else if (!hasSwitchedToFallback && hasFallback) {
      setCurrentSrc(processImagePath(image.fallbackSrc!));
      setRetryCount(0);
      setLoadStatus('loading');
    } else {
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
    <motion.div 
      className="group relative cursor-pointer overflow-hidden rounded-lg shadow-md transition-all duration-300"
      onClick={onClick}
      whileHover={{ 
        y: -4, 
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.02 }}
    >
      {/* 图片容器 */}
      <div className="aspect-square relative bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {/* 加载中状态 - 骨架屏效果 */}
        {loadStatus === 'loading' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
            <div className="relative w-full h-full">
              {/* 骨架屏动画 */}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 animate-pulse"></div>
              {/* 加载指示器 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 dark:border-gray-600"></div>
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary absolute top-0 left-0"></div>
                </div>
                {retryCount > 0 && (
                  <motion.p 
                    className="text-xs text-muted-foreground mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    重试中... ({retryCount}/{maxRetries})
                  </motion.p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* 图片 */}
        <motion.img
          src={currentSrc}
          alt={image.alt}
          className={`w-full h-full object-cover transition-all duration-500 ${loadStatus === 'loading' ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.3 }}
        />
        
        {/* 加载失败状态 */}
        {loadStatus === 'failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-200 dark:bg-gray-700">
            <ImageOff className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">图片加载失败</p>
            <motion.button 
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20"
              onClick={(e) => {
                e.stopPropagation();
                setLoadStatus('loading');
                setRetryCount(0);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className="w-3 h-3" />
              点击重试
            </motion.button>
          </div>
        )}
        
        {/* 悬停效果：渐变色叠加层 */}
        <motion.div 
          className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end"
          initial={false}
        >
          <div className="p-4">
            <p className="text-white text-sm font-medium truncate mb-1">{image.alt}</p>
            <div className="flex items-center gap-1">
              <Tag className="w-3 h-3 text-primary" />
              <span className="text-white/80 text-xs">{image.category}</span>
            </div>
          </div>
        </motion.div>

        {/* 分类标签 - 左上角 */}
        <motion.div 
          className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          initial={{ y: -10, opacity: 0 }}
          whileHover={{ y: 0, opacity: 1 }}
        >
          <span className="text-xs px-2 py-1 rounded-full bg-primary/80 text-white backdrop-blur-sm">
            {image.category}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ImageCard;
