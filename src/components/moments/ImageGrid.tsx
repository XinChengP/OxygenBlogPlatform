'use client';

import { useState, useEffect, useRef } from 'react';

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
    // 内嵌查看器逻辑：点击打开，再次点击同一张关闭
    if (viewerOpen && currentIndex === index) {
      setViewerOpen(false);
    } else {
      setCurrentIndex(index);
      setViewerOpen(true);
    }
  };

  const handleIndexChange = (index: number) => {
    setCurrentIndex(index);
  };

  // 键盘事件处理
  useEffect(() => {
    if (!viewerOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          if (currentIndex > 0) {
            handleIndexChange(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentIndex < images.length - 1) {
            handleIndexChange(currentIndex + 1);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [viewerOpen, currentIndex, images.length]);

  // 切换到上一张图片
  const handlePrevImage = () => {
    if (currentIndex > 0) {
      handleIndexChange(currentIndex - 1);
    }
  };

  // 切换到下一张图片
  const handleNextImage = () => {
    if (currentIndex < images.length - 1) {
      handleIndexChange(currentIndex + 1);
    }
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

      {/* 内嵌图片查看器 - 在九个图片下方展开，左右顶满卡片 */}
      {viewerOpen && (
        <div className="mt-4">
          {/* 图片预览区域 */}
          <div className="relative border rounded-lg p-4">
            {/* 图片容器，支持点击左右半边翻页 */}
            <div
              className="relative w-full"
              style={{ maxHeight: '600px' }}
            >
              {/* 左半边点击区域 */}
              {currentIndex > 0 && (
                <div
                  onClick={handlePrevImage}
                  className="absolute left-0 top-0 h-full w-1/3 cursor-pointer z-10"
                  aria-label="上一张"
                />
              )}

              {/* 右半边点击区域 */}
              {currentIndex < images.length - 1 && (
                <div
                  onClick={handleNextImage}
                  className="absolute right-0 top-0 h-full w-1/3 cursor-pointer z-10"
                  aria-label="下一张"
                />
              )}

              {/* 图片 */}
              <img
                src={images[currentIndex]}
                alt={`图片 ${currentIndex + 1}`}
                className="w-full object-contain"
                style={{ maxHeight: '600px' }}
              />
            </div>
          </div>

          {/* 图片导航 */}
          {images.length > 1 && (
            <div className="mt-2 flex justify-center space-x-2">
              {images.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => handleIndexChange(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-primary scale-110' : 'bg-muted-foreground hover:bg-foreground'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
