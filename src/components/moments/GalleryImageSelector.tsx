'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { GalleryImage } from '@/types/gallery';
import { getGalleryImages, getGalleryCategories, filterGalleryImagesByCategory } from '@/utils/galleryClientUtils';

interface GalleryImageSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (images: string[]) => void;
  maxImages?: number;
  selectedImages?: string[];
}

export default function GalleryImageSelector({
  isOpen,
  onClose,
  onSelect,
  maxImages = 100,
  selectedImages = []
}: GalleryImageSelectorProps) {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>(selectedImages);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载画廊图片
  useEffect(() => {
    if (isOpen) {
      loadGalleryImages();
    }
  }, [isOpen]);

  const loadGalleryImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const galleryImages = await getGalleryImages();
      setImages(galleryImages);
      setCategories(getGalleryCategories(galleryImages));
    } catch (err) {
      setError('加载画廊图片失败');
      console.error('加载画廊图片失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 过滤后的图片
  const filteredImages = filterGalleryImagesByCategory(images, selectedCategory);

  // 处理图片选择
  const handleImageSelect = (imageUrl: string) => {
    setSelected(prev => {
      if (prev.includes(imageUrl)) {
        // 取消选择
        return prev.filter(url => url !== imageUrl);
      } else {
        // 添加选择（不超过最大限制）
        if (prev.length >= maxImages) {
          return prev;
        }
        return [...prev, imageUrl];
      }
    });
  };

  // 处理确认选择
  const handleConfirm = () => {
    onSelect(selected);
    onClose();
  };

  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selected.length === filteredImages.length) {
      // 取消全选
      setSelected([]);
    } else {
      // 全选（不超过最大限制）
      const allUrls = filteredImages.map(img => img.src);
      setSelected(allUrls.slice(0, maxImages));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* 选择器面板 */}
      <div className="relative bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">从画廊选择图片</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-muted transition-colors"
            aria-label="关闭"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 工具栏 */}
        <div className="p-4 border-b flex flex-wrap items-center gap-2">
          {/* 分类筛选 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">分类:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2 py-1 text-xs rounded-full transition-colors ${selectedCategory === null ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
              >
                全部
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-2 py-1 text-xs rounded-full transition-colors ${selectedCategory === category ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* 选择信息 */}
          <div className="ml-auto text-sm">
            已选择 {selected.length}/{maxImages}
          </div>

          {/* 全选按钮 */}
          {filteredImages.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-sm text-primary hover:underline"
            >
              {selected.length === filteredImages.length ? '取消全选' : '全选'}
            </button>
          )}
        </div>

        {/* 图片网格 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-destructive">{error}</p>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">暂无图片</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {filteredImages.map((image, index) => {
                const isSelected = selected.includes(image.src);
                return (
                  <div
                    key={index}
                    className={`aspect-square overflow-hidden rounded-md cursor-pointer relative group ${isSelected ? 'ring-2 ring-primary' : ''}`}
                    onClick={() => handleImageSelect(image.src)}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {/* 选择标记 */}
                    {isSelected && (
                      <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-1">
                        <CheckIcon className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-end p-4 border-t gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border hover:bg-muted transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            disabled={selected.length === 0}
          >
            确认选择 ({selected.length})
          </button>
        </div>
      </div>
    </div>
  );
}
