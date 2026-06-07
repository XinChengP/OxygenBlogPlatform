'use client';

import { useState, useEffect, useRef } from 'react';
import ImageViewer from './ImageViewer';

interface ImageGridProps {
  images: string[];
  className?: string;
}

export default function ImageGrid({ images, className = '' }: ImageGridProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startIndex, setStartIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  if (!images || images.length === 0) {
    return null;
  }

  const handleImageClick = (index: number) => {
    console.log('Image clicked at index:', index);
    // 如果预览已经打开，再次点击关闭预览
    if (viewerOpen) {
      setViewerOpen(false);
    } else {
      setCurrentIndex(index);
      setViewerOpen(true);
    }
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
  };

  const handleIndexChange = (index: number) => {
    setCurrentIndex(index);
  };

  // 轮播控制函数
  const handleCarouselPrev = () => {
    if (carouselStartIndex > 0) {
      setCarouselStartIndex(carouselStartIndex - 1);
    }
  };

  const handleCarouselNext = () => {
    if (carouselStartIndex < images.length - 9) {
      setCarouselStartIndex(carouselStartIndex + 1);
    }
  };



  // 拖拽处理函数
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setStartIndex(carouselStartIndex);
    
    // 处理鼠标和触摸事件
    if ('touches' in e) {
      setStartX(e.touches[0].clientX);
    } else {
      setStartX(e.clientX);
    }
  };

  const handleDragMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    // 处理鼠标和触摸事件
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - startX;
    
    // 根据拖拽距离计算新的起始索引
    // 每张图片的宽度约为容器宽度的1/9
    const imageWidth = (carouselRef.current?.offsetWidth || 0) / 9;
    const indexDelta = Math.round(deltaX / imageWidth);
    
    const newIndex = Math.max(0, Math.min(images.length - 9, startIndex - indexDelta));
    setCarouselStartIndex(newIndex);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragCancel = () => {
    setIsDragging(false);
  };

  return (
    <div className={`mt-4 ${className}`}>
      <div className="relative">
        {/* 图片网格 - 支持拖拽 */}
        <div 
          ref={carouselRef}
          className="grid grid-cols-9 gap-1 cursor-grab active:cursor-grabbing"
          style={{
            userSelect: 'none',
            touchAction: 'none',
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none'
          }}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragCancel}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onTouchCancel={handleDragCancel}
        >
          {/* 渲染当前轮播页的图片 */}
          {images.slice(carouselStartIndex, carouselStartIndex + 9).map((image, index) => {
            const actualIndex = carouselStartIndex + index;
            const isActive = viewerOpen && actualIndex === currentIndex;
            return (
              <div
                key={actualIndex}
                className={`aspect-square overflow-hidden rounded-md cursor-pointer relative group ${
                  isActive ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={() => handleImageClick(actualIndex)}
                style={{ cursor: 'pointer' }}
              >
              <img
                src={image}
                alt={`图片 ${actualIndex + 1}`}
                className={`w-full h-full object-cover transition-all duration-300 ${
                  isActive ? 'scale-105 brightness-105' : 'group-hover:scale-105'
                }`}
                loading="lazy"
              />
            </div>
          );
        })}
        </div>
        

      </div>

      {/* 复用 ImageViewer 组件，消除内嵌查看器的重复实现 */}
      <ImageViewer
        images={images}
        currentIndex={currentIndex}
        isOpen={viewerOpen}
        onClose={handleCloseViewer}
        onIndexChange={handleIndexChange}
      />
    </div>
  );
}
