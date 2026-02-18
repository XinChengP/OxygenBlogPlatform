/**
 * 图片查看器组件
 * 支持图片放大查看和轮播
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  XMarkIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ArrowsPointingOutIcon
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
  
  // 同步外部索引
  useEffect(() => {
    setIndex(currentIndex);
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
          setIsZoomed(!isZoomed);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, index, isZoomed]);
  
  // 导航到下一张/上一张图片
  const navigateImage = (direction: 'prev' | 'next') => {
    const newIndex = direction === 'prev' 
      ? Math.max(0, index - 1)
      : Math.min(images.length - 1, index + 1);
    
    if (newIndex !== index) {
      setIndex(newIndex);
      onIndexChange?.(newIndex);
      setIsZoomed(false);
    }
  };
  
  // 切换缩放状态
  const toggleZoom = () => {
    setIsZoomed(!isZoomed);
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
              onClick={toggleZoom}
              className="p-2 text-white hover:text-gray-300 transition-colors"
              title={isZoomed ? '缩小' : '放大'}
            >
              <ArrowsPointingOutIcon className="w-5 h-5" />
            </button>
            <span className="text-white text-sm">
              {index + 1} / {images.length}
            </span>
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
          <div className="relative w-full h-full flex items-center justify-center p-4">
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ 
                opacity: 1, 
                scale: isZoomed ? 1.5 : 1,
                rotateY: 0 
              }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-full max-h-full"
            >
              <img
                src={images[index]}
                alt={`图片 ${index + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                draggable={false}
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
            按 ESC 关闭 • 方向键切换 • 空格键缩放
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}