/**
 * 图片查看器组件
 * 支持图片放大查看和轮播
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface ImageViewerProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

export default function ImageViewer({ 
  images, 
  currentIndex, 
  isOpen, 
  onClose, 
  onIndexChange 
}: ImageViewerProps) {
  const [index, setIndex] = useState(currentIndex);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // 同步外部索引
  useEffect(() => {
    setIndex(currentIndex);
    setIsLoading(true);
    setLoadError(false);
  }, [currentIndex]);
  
  // 键盘事件处理
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          navigateImage('prev');
          break;
        case 'ArrowRight':
          navigateImage('next');
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, index]);
  
  // 导航到下一张/上一张图片
  const navigateImage = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, index - 1)
      : Math.min(images.length - 1, index + 1);
    
    if (newIndex !== index) {
      setIndex(newIndex);
      onIndexChange?.(newIndex);
      setIsLoading(true);
      setLoadError(false);
    }
  };
  
  // 图片加载开始
  const handleImageLoadStart = () => {
    setIsLoading(true);
    setLoadError(false);
  };
  
  // 图片加载完成
  const handleImageLoad = () => {
    setIsLoading(false);
    setLoadError(false);
  };
  
  // 图片加载错误
  const handleImageError = () => {
    setIsLoading(false);
    setLoadError(true);
  };
  
  // 点击背景关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  if (!isOpen || images.length === 0) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            zIndex: 9999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
            overflow: 'hidden'
          }}
          onClick={handleBackdropClick}
        >
          {/* 背景遮罩 */}
          <div className="absolute inset-0 bg-black bg-opacity-90" />
          
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          
          {/* 导航按钮 */}
          {images.length > 1 && (
            <>
              <button
                onClick={() => navigateImage('prev')}
                disabled={index === 0}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-6 h-6" />
              </button>
              
              <button
                onClick={() => navigateImage('next')}
                disabled={index === images.length - 1}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 text-white hover:text-gray-300 transition-colors bg-black bg-opacity-50 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-6 h-6" />
              </button>
            </>
          )}
          
          {/* 图片容器 */}
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-full max-h-full"
            >
              {/* 加载中状态 */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-white text-sm">加载中...</span>
                  </div>
                </div>
              )}
              
              {/* 错误状态 */}
              {loadError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg">
                  <div className="flex flex-col items-center">
                    <span className="text-white text-sm mt-2">图片加载失败</span>
                    <button
                      onClick={() => {
                        setIsLoading(true);
                        setLoadError(false);
                      }}
                      className="mt-2 px-3 py-1 text-sm text-white bg-primary/80 rounded hover:bg-primary transition-colors"
                    >
                      重试
                    </button>
                  </div>
                </div>
              )}
              
              <img
                ref={imageRef}
                src={images[index]}
                alt={`图片 ${index + 1}`}
                className="w-full h-full object-contain"
                style={{
                  maxWidth: '100vw',
                  maxHeight: '100vh',
                  objectFit: 'contain'
                }}
                draggable={false}
                onLoadStart={() => setIsLoading(true)}
                onLoad={() => setIsLoading(false)}
                onError={() => setLoadError(true)}
              />
            </motion.div>
          </div>
          
          {/* 图片指示器 */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex space-x-2 bg-black bg-opacity-50 rounded-full p-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIndex(idx);
                      onIndexChange?.(idx);
                    }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === index ? 'bg-white scale-110' : 'bg-gray-400 hover:bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}