'use client';

import { useState } from 'react';
import ImageViewer from './ImageViewer';

interface ImageGridProps {
  images: string[];
  className?: string;
}

export default function ImageGrid({ images, className = '' }: ImageGridProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) {
    return null;
  }

  const handleImageClick = (index: number) => {
    setCurrentIndex(index);
    setViewerOpen(true);
  };

  const handleCloseViewer = () => {
    setViewerOpen(false);
  };

  const handleIndexChange = (index: number) => {
    setCurrentIndex(index);
  };

  // 根据图片数量确定布局类名
  const getGridClassName = () => {
    if (images.length === 1) {
      return 'grid-cols-1';
    } else if (images.length === 2) {
      return 'grid-cols-2';
    } else if (images.length === 3) {
      return 'grid-cols-3';
    } else if (images.length === 4) {
      return 'grid-cols-2';
    } else if (images.length === 5 || images.length === 6) {
      return 'grid-cols-3';
    } else if (images.length === 7 || images.length === 8 || images.length === 9) {
      return 'grid-cols-3';
    }
    return 'grid-cols-3';
  };

  return (
    <div className={`mt-4 ${className}`}>
      <div className={`grid ${getGridClassName()} gap-1`}>
        {images.slice(0, 9).map((image, index) => (
          <div
            key={index}
            className="aspect-square overflow-hidden rounded-md cursor-pointer relative group"
            onClick={() => handleImageClick(index)}
          >
            <img
              src={image}
              alt={`图片 ${index + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
            {/* 显示图片数量超过9张时的提示 */}
            {index === 8 && images.length > 9 && (
              <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center text-white font-medium">
                +{images.length - 9}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 图片查看器 */}
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
