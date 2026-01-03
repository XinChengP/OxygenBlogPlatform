'use client';

import { useState, useMemo } from 'react';
import { GalleryImage, ImageCategory, GalleryState } from '../../types/gallery';
import { filterImagesByCategory } from '../../utils/galleryUtils';
import ImageCard from './components/ImageCard';
import ImagePreview from './components/ImagePreview';
import CategoryFilter from './components/CategoryFilter';
import { useBackgroundStyle } from '../../hooks/useBackgroundStyle';

// GalleryClient组件属性
interface GalleryClientProps {
  initialImages: GalleryImage[];
  initialCategories: ImageCategory[];
}

// GalleryClient组件
const GalleryClient = ({ initialImages, initialCategories }: GalleryClientProps) => {
  // 获取背景样式和容器样式
  const { containerStyle } = useBackgroundStyle('gallery');
  
  // 初始化画廊状态
  const [state, setState] = useState<GalleryState>({
    images: initialImages,
    categories: initialCategories,
    selectedCategory: null,
    selectedImage: null,
    isPreviewOpen: false,
    isLoading: false,
    error: null
  });

  // 根据选中的分类过滤图片
  const filteredImages = useMemo(() => {
    return filterImagesByCategory(state.images, state.selectedCategory);
  }, [state.images, state.selectedCategory]);

  // 处理分类选择
  const handleCategoryChange = (category: string | null) => {
    setState(prev => ({
      ...prev,
      selectedCategory: category
    }));
  };

  // 处理图片点击（打开预览）
  const handleImageClick = (image: GalleryImage) => {
    setState(prev => ({
      ...prev,
      selectedImage: image,
      isPreviewOpen: true
    }));
  };

  // 关闭预览
  const handleClosePreview = () => {
    setState(prev => ({
      ...prev,
      isPreviewOpen: false,
      selectedImage: null
    }));
  };

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">洛天依画廊</h1>
      
      <div className="flex flex-col space-y-8">
        {/* 分类过滤 */}
        <CategoryFilter
          categories={state.categories}
          selectedCategory={state.selectedCategory}
          onCategoryChange={handleCategoryChange}
        />
        
        {/* 图片统计 */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          共找到 {filteredImages.length} 张图片
        </div>
        
        {/* 图片展示区域 - 瀑布流布局 */}
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4">
          {filteredImages.length > 0 ? (
            filteredImages.map(image => (
              <div key={image.id} className="mb-4 break-inside-avoid">
                <ImageCard
                  image={image}
                  onClick={() => handleImageClick(image)}
                />
              </div>
            ))
          ) : (
            <div className="text-center py-16 col-span-full">
              <p className="text-gray-500 dark:text-gray-400">
                该分类下暂无图片
              </p>
            </div>
          )}
        </div>
        
        {/* 加载更多按钮（后续实现分批加载） */}
        {state.isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>
      
      {/* 图片预览 */}
      {state.isPreviewOpen && state.selectedImage && (
        <ImagePreview
          images={filteredImages}
          initialImage={state.selectedImage}
          onClose={handleClosePreview}
        />
      )}
      </div>
    </div>
  );
};

export default GalleryClient;