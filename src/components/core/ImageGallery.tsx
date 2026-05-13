'use client';

import { useState } from 'react';
import OptimizedImage from './OptimizedImage';

interface ImageItem {
  src: string;
  alt: string;
}

interface ImageGalleryProps {
  images: ImageItem[];
  columns?: number;
  gap?: string;
  className?: string;
}

export default function ImageGallery({ 
  images, 
  columns = 2, 
  gap = '0.5rem',
  className = '' 
}: ImageGalleryProps) {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  if (!images || images.length === 0) {
    return null;
  }

  const handleImageClick = (index: number) => {
    setSelectedImage(index);
  };

  const handleClose = () => {
    setSelectedImage(null);
  };

  return (
    <>
      <div 
        className={`grid gap-${gap === '0.5rem' ? '2' : gap === '1rem' ? '4' : '2'} ${className}`}
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: gap,
        }}
      >
        {images.map((image, index) => (
          <div
            key={index}
            className="relative overflow-hidden rounded-xl cursor-pointer group"
            onClick={() => handleImageClick(index)}
          >
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              className="w-full h-auto transition-transform duration-300 group-hover:scale-105"
              objectFit="contain"
            />
            {image.alt && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-white text-sm">{image.alt}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedImage !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors text-2xl"
            onClick={handleClose}
          >
            ×
          </button>
          <img
            src={images[selectedImage].src}
            alt={images[selectedImage].alt}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export { ImageGallery };
