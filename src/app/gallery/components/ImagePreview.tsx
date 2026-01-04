'use client';

import { useState, useEffect, useCallback } from 'react';
import { GalleryImage } from '../../../types/gallery';


// ImagePreview组件属性
interface ImagePreviewProps {
  images: GalleryImage[];
  initialImage: GalleryImage;
  onClose: () => void;
}

// ImagePreview组件
const ImagePreview = ({ images, initialImage, onClose }: ImagePreviewProps) => {
  // 计算初始图片索引
  const initialIndex = images.findIndex(img => img.id === initialImage.id);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  
  // 获取当前图片
  const currentImage = images[currentIndex];
  
  // 键盘事件处理
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'Escape':
        onClose();
        break;
      case 'ArrowLeft':
        setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
        break;
      case 'ArrowRight':
        setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
        break;
      default:
        break;
    }
  }, [onClose, images.length]);
  
  // 添加键盘事件监听
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  // 处理上一张图片
  const handlePrev = () => {
    setCurrentIndex(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };
  
  // 处理下一张图片
  const handleNext = () => {
    setCurrentIndex(prev => (prev === images.length - 1 ? 0 : prev + 1));
  };
  
  // 点击背景关闭预览
  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={handleBackgroundClick}
    >
      {/* 关闭按钮 */}
      <button
        className="absolute top-4 right-4 p-2 text-white hover:text-gray-300 transition-colors duration-200"
        onClick={onClose}
        aria-label="关闭预览"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      {/* 上一张按钮 */}
      <button
        className="absolute left-4 p-2 text-white hover:text-gray-300 transition-colors duration-200"
        onClick={handlePrev}
        aria-label="上一张"
      >
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      {/* 下一张按钮 */}
      <button
        className="absolute right-4 p-2 text-white hover:text-gray-300 transition-colors duration-200"
        onClick={handleNext}
        aria-label="下一张"
      >
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      
      {/* 图片容器 */}
      <div className="relative max-w-[90vw] max-h-[90vh]">
        <img
          src={currentImage.src}
          alt={currentImage.alt}
          className="max-w-full max-h-[90vh] object-contain rounded-lg"
        />
        
        {/* 图片信息 */}
        <div className="absolute bottom-4 left-0 right-0 text-center text-white">
          <p className="text-lg font-medium">{currentImage.alt}</p>
          <p className="text-sm opacity-80">
            {currentIndex + 1} / {images.length} · {currentImage.category}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ImagePreview;