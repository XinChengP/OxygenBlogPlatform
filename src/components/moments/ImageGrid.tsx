'use client';

import { useState, useEffect, useRef } from 'react';
import { getResponsiveImageEntry } from '@/utils/blogResponsiveImage';
import { buildResponsiveSrcSet } from '@/utils/responsiveImage';

interface ImageGridProps {
  images: string[];
  className?: string;
}

/** 网格缩略图 srcset：清单中无条目（外链/扫描缺失）时返回 undefined */
function thumbnailSrcSetOf(src: string): string | undefined {
  return buildResponsiveSrcSet(getResponsiveImageEntry(src));
}

export default function ImageGrid({ images, className = '' }: ImageGridProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);
  /*
    记录缩略图变体加载失败的图片路径。
    这里不能用 useResponsiveImageFallback：缩略图在 map 循环里渲染，
    循环中不允许调用 Hook。改为按路径记录失败集合，效果等价。
  */
  const [failedThumbnails, setFailedThumbnails] = useState<Set<string>>(() => new Set());
  // 缩略图元素引用表，用于水合后补检「水合前就已加载失败」的图片
  const thumbnailRefs = useRef<Map<string, HTMLImageElement>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startIndex, setStartIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  /*
    水合后的失败补检：SSR 输出的 <img> 在解析 HTML 时就开始请求，
    可能在水合绑定 onError 之前就已 404，事件会被错过。
    complete 为 true 且 naturalWidth 为 0 即表示已结束但没拿到图像。
  */
  useEffect(() => {
    const newlyFailed: string[] = [];
    thumbnailRefs.current.forEach((img, src) => {
      if (img.complete && img.naturalWidth === 0) newlyFailed.push(src);
    });
    if (newlyFailed.length === 0) return;
    setFailedThumbnails((prev) => {
      const next = new Set(prev);
      newlyFailed.forEach((src) => next.add(src));
      return next;
    });
  }, [images]);

  if (!images || images.length === 0) {
    return null;
  }

  // 记录某张缩略图的变体加载失败；已记录过则返回同一 Set 引用，避免多余重渲染
  const handleThumbnailError = (src: string) => {
    setFailedThumbnails((prev) => {
      if (prev.has(src)) return prev;
      const next = new Set(prev);
      next.add(src);
      return next;
    });
  };

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
        case 'Escape':
          e.preventDefault();
          setViewerOpen(false);
          break;
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
            // pan-y 允许页面纵向滚动，横向手势仍交给轮播逻辑处理
            touchAction: 'pan-y',
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
                role="button"
                tabIndex={0}
                aria-label={`查看第 ${actualIndex + 1} 张图片`}
                className={`aspect-square overflow-hidden rounded-md cursor-pointer relative group ${
                  isActive ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={() => handleImageClick(actualIndex)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleImageClick(actualIndex);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* 九宫格缩略图：原实现直接引用 1MB 级原图，
                    改用构建期变体（GIF 缩略图为动图 WebP），
                    点开查看器时仍加载原图以保证清晰度 */}
                <img
                  // 变体缺失时重建元素并改用原图，避免整格空白
                  key={failedThumbnails.has(image) ? 'original' : 'responsive'}
                  ref={(el) => {
                    // 记录元素引用供补检使用；卸载时移除，避免持有失效节点
                    if (el) thumbnailRefs.current.set(image, el);
                    else thumbnailRefs.current.delete(image);
                  }}
                  src={image}
                  srcSet={failedThumbnails.has(image) ? undefined : thumbnailSrcSetOf(image)}
                  sizes={failedThumbnails.has(image) ? undefined : '(max-width: 640px) 31vw, 224px'}
                  onError={() => handleThumbnailError(image)}
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
