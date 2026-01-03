'use client';

import { useState } from 'react';
import { GalleryImage, ImageLoadStatus } from '../../../types/gallery';
import OptimizedImage from '../../../components/ui/OptimizedImage';

// ImageCard组件属性
interface ImageCardProps {
  image: GalleryImage;
  onClick: () => void;
}

// ImageCard组件
const ImageCard = ({ image, onClick }: ImageCardProps) => {
  // 图片加载状态
  const [loadStatus, setLoadStatus] = useState<ImageLoadStatus>('loading');
  
  // 图片加载成功处理
  const handleImageLoad = () => {
    setLoadStatus('loaded');
  };
  
  // 图片加载失败处理
  const handleImageError = () => {
    setLoadStatus('failed');
  };
  
  return (
    <div 
      className="group relative cursor-pointer overflow-hidden rounded-lg shadow-md transition-all duration-300 hover:shadow-xl dark:hover:shadow-blue-900/30"
      onClick={onClick}
    >
      {/* 图片容器 */}
      <div className="aspect-square relative bg-gray-100 dark:bg-gray-800">
        {/* 加载中状态 */}
        {loadStatus === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* 图片 */}
        <OptimizedImage
          src={image.src}
          alt={image.alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loadStatus === 'loading' ? 'opacity-0' : 'opacity-100'}`}
          loading="lazy"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        
        {/* 加载失败状态 */}
        {loadStatus === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
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