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
  ChevronRightIcon,
  ArrowsPointingOutIcon,
  ExclamationCircleIcon
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
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  
  // 同步外部索引
  useEffect(() => {
    setIndex(currentIndex);
    // 重置状态
    setIsZoomed(false);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
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
        case ' ':
          e.preventDefault();
          toggleZoom();
          break;
        case '+':
        case '=':
          e.preventDefault();
          handleZoomIn();
          break;
        case '-':
          e.preventDefault();
          handleZoomOut();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, index, zoomLevel, position]);
  
  // 导航到下一张/上一张图片
  const navigateImage = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, index - 1)
      : Math.min(images.length - 1, index + 1);
    
    if (newIndex !== index) {
      setIndex(newIndex);
      onIndexChange?.(newIndex);
      // 重置状态
      setIsZoomed(false);
      setZoomLevel(1);
      setPosition({ x: 0, y: 0 });
      setIsLoading(true);
      setLoadError(false);
    }
  };
  
  // 切换缩放状态
  const toggleZoom = () => {
    if (isZoomed) {
      resetZoom();
    } else {
      setIsZoomed(true);
      setZoomLevel(1.5);
    }
  };
  
  // 放大图片
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev * 1.2, 5));
    setIsZoomed(true);
  };
  
  // 缩小图片
  const handleZoomOut = () => {
    setZoomLevel(prev => {
      const newLevel = prev / 1.2;
      if (newLevel <= 1) {
        setIsZoomed(false);
        setPosition({ x: 0, y: 0 });
        return 1;
      }
      return newLevel;
    });
  };
  
  // 重置缩放
  const resetZoom = () => {
    setIsZoomed(false);
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  };
  
  // 拖拽开始
  const handleDragStart = (e: React.MouseEvent) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };
  
  // 拖拽中
  const handleDragMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ 
        x: e.clientX - dragStart.x, 
        y: e.clientY - dragStart.y 
      });
    }
  };
  
  // 拖拽结束
  const handleDragEnd = () => {
    setIsDragging(false);
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
          
          {/* 工具栏 */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 flex items-center space-x-2 bg-black bg-opacity-50 rounded-full px-4 py-2">
            <button
              onClick={handleZoomOut}
              className="p-1 text-white hover:text-gray-300 transition-colors"
              title="缩小"
            >
              -
            </button>
            <button
              onClick={toggleZoom}
              className="p-2 text-white hover:text-gray-300 transition-colors"
              title={isZoomed ? '重置缩放' : '放大'}
            >
              <ArrowsPointingOutIcon className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1 text-white hover:text-gray-300 transition-colors"
              title="放大"
            >
              +
            </button>
            <span className="text-white text-sm min-w-[80px] text-center">
              {index + 1} / {images.length}
            </span>
            {isZoomed && (
              <span className="text-white text-xs">
                {Math.round(zoomLevel * 100)}%
              </span>
            )}
          </div>
          
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
          <div 
            className="relative w-full h-full flex items-center justify-center p-4"
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: zoomLevel,
                x: position.x,
                y: position.y,
                rotateY: 0 
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-full max-h-full cursor-zoom-in"
              style={{ cursor: isZoomed ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
              onMouseDown={handleDragStart}
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
                    <ExclamationCircleIcon className="w-8 h-8 text-red-400" />
                    <span className="text-white text-sm mt-2">图片加载失败</span>
                    <button
                      onClick={() => {
                        setIsLoading(true);
                        setLoadError(false);
                        // 重新加载图片
                        if (imageRef.current) {
                          imageRef.current.src = images[index] + '?t=' + Date.now();
                        }
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
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                draggable={false}
                onLoadStart={handleImageLoadStart}
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
            </motion.div>
          </div>
          
          {/* 缩略图导航 */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex space-x-2 bg-black bg-opacity-50 rounded-full p-2">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setIndex(idx);
                      onIndexChange?.(idx);
                      setIsZoomed(false);
                    }}
                    className={`w-3 h-3 rounded-full transition-all ${
                      idx === index 
                        ? 'bg-white scale-110' 
                        : 'bg-gray-400 hover:bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}
          
          {/* 提示信息 */}
          <div className="absolute bottom-4 right-4 z-10 text-white text-xs opacity-70">
            按 ESC 关闭 • 方向键切换 • 空格键缩放 • +/- 调整 • 0 重置
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}