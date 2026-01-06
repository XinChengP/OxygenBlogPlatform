'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { GalleryImage, ImageCategory, GalleryState } from '../../types/gallery';
import { filterImagesByCategory } from '../../utils/galleryUtils';
import ImageCard from './components/ImageCard';
import ImagePreview from './components/ImagePreview';
import CategoryFilter from './components/CategoryFilter';
import { useBackgroundStyle } from '../../hooks/useBackgroundStyle';
import { live2dEventEmitter, Live2DEvents, emitLive2DEvent } from '../../utils/live2dEventEmitter';

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
  
  // 滚动节流定时器引用
  const scrollThrottleRef = useRef<number>(0);

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
    
    // 发送分类切换事件给Live2D
    emitLive2DEvent(Live2DEvents.INFO, {
      type: 'gallery-category-change',
      category: category || '全部',
      timestamp: Date.now()
    });
    
    // 根据分类发送不同的Live2D消息
    if (category) {
      emitLive2DEvent(Live2DEvents.LIVE2D_MESSAGE, {
        message: `现在正在查看${category}分类的图片~`,
        type: 'gallery',
        priority: 2
      });
    } else {
      emitLive2DEvent(Live2DEvents.LIVE2D_MESSAGE, {
        message: '现在查看全部图片~',
        type: 'gallery',
        priority: 2
      });
    }
  };

  // 处理图片点击（打开预览）
  const handleImageClick = (image: GalleryImage) => {
    setState(prev => ({
      ...prev,
      selectedImage: image,
      isPreviewOpen: true
    }));
    
    // 发送图片点击事件给Live2D
    emitLive2DEvent(Live2DEvents.CLICK, {
      type: 'gallery-image-click',
      imageId: image.id,
      imageSrc: image.src,
      imageCategory: image.category,
      timestamp: Date.now()
    });
    
    // 发送随机Live2D互动消息
    const interactionMessages = [
      '这张图片真好看呢~',
      '洛天依好可爱呀！',
      '喜欢这张图片吗？',
      '这张图的色调很舒服~',
      '看起来真不错！'
    ];
    const randomMessage = interactionMessages[Math.floor(Math.random() * interactionMessages.length)];
    
    emitLive2DEvent(Live2DEvents.LIVE2D_MESSAGE, {
      message: randomMessage,
      type: 'gallery',
      priority: 3
    });
  };

  // 关闭预览
  const handleClosePreview = () => {
    setState(prev => ({
      ...prev,
      isPreviewOpen: false,
      selectedImage: null
    }));
    
    // 发送预览关闭事件给Live2D
    emitLive2DEvent(Live2DEvents.INFO, {
      type: 'gallery-preview-close',
      timestamp: Date.now()
    });
    
    // 发送关闭预览消息
    emitLive2DEvent(Live2DEvents.LIVE2D_MESSAGE, {
      message: '预览已关闭~',
      type: 'gallery',
      priority: 2
    });
  };

  // 画廊加载完成事件
  useEffect(() => {
    emitLive2DEvent(Live2DEvents.PAGE_LOAD, {
      page: 'gallery',
      totalImages: state.images.length,
      totalCategories: state.categories.length,
      timestamp: Date.now()
    });
    
    // 发送欢迎消息
    emitLive2DEvent(Live2DEvents.LIVE2D_MESSAGE, {
      message: '欢迎来到洛天依画廊！这里有很多好看的图片~',
      type: 'gallery',
      priority: 1
    });
  }, [state.images.length, state.categories.length]);

  // 监听画廊预览状态变化
  useEffect(() => {
    if (state.isPreviewOpen && state.selectedImage) {
      // 发送预览打开事件给Live2D
      emitLive2DEvent(Live2DEvents.INFO, {
        type: 'gallery-preview-open',
        imageId: state.selectedImage.id,
        imageSrc: state.selectedImage.src,
        imageCategory: state.selectedImage.category,
        timestamp: Date.now()
      });
      
      // 发送预览打开消息
      emitLive2DEvent(Live2DEvents.LIVE2D_MESSAGE, {
        message: '正在查看大图~',
        type: 'gallery',
        priority: 2
      });
    }
  }, [state.isPreviewOpen, state.selectedImage]);

  // 监听画廊滚动事件
  useEffect(() => {
    const handleScroll = () => {
      // 使用setTimeout实现节流，避免频繁发送事件
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
      }
      
      scrollThrottleRef.current = window.setTimeout(() => {
        // 发送滚动事件给Live2D
        emitLive2DEvent(Live2DEvents.PAGE_SCROLL, {
          page: 'gallery',
          scrollY: window.scrollY,
          scrollPercentage: Math.round((window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100),
          timestamp: Date.now()
        });
        
        // 随机发送滚动互动消息
        const scrollMessages = [
          '正在浏览画廊~',
          '看看还有什么好看的图片吧！',
          '这么多好看的图片，都不知道选哪张了~',
          '继续往下看看吧~'
        ];
        
        if (Math.random() > 0.7) { // 30%概率发送消息
          const randomMessage = scrollMessages[Math.floor(Math.random() * scrollMessages.length)];
          emitLive2DEvent(Live2DEvents.LIVE2D_MESSAGE, {
            message: randomMessage,
            type: 'gallery',
            priority: 1
          });
        }
      }, 1000);
    };
    
    // 添加滚动事件监听
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      // 清除定时器
      if (scrollThrottleRef.current) {
        clearTimeout(scrollThrottleRef.current);
      }
      // 移除滚动事件监听
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 监听Live2D事件，响应交互
  useEffect(() => {
    // 监听Live2D点击事件
    const handleLive2DClick = () => {
      // Live2D被点击时，发送画廊互动消息
      const live2dClickMessages = [
        '你也喜欢洛天依吗？',
        '点击图片可以查看大图哦~',
        '画廊里有很多好看的图片呢！',
        '试试切换不同的分类吧~'
      ];
      
      const randomMessage = live2dClickMessages[Math.floor(Math.random() * live2dClickMessages.length)];
      emitLive2DEvent(Live2DEvents.LIVE2D_MESSAGE, {
        message: randomMessage,
        type: 'gallery',
        priority: 3
      });
    };
    
    // 监听Live2D消息事件
    const handleLive2DMessage = (event: any) => {
      if (event.data?.type === 'gallery-interaction') {
        console.log('[Gallery] 收到Live2D互动请求:', event.data);
        // 可以在这里添加更多互动逻辑
      }
    };
    
    // 订阅Live2D事件
    const unsubscribeClick = live2dEventEmitter.on(Live2DEvents.CLICK, handleLive2DClick);
    const unsubscribeMessage = live2dEventEmitter.on(Live2DEvents.LIVE2D_MESSAGE, handleLive2DMessage);
    
    return () => {
      // 取消订阅
      unsubscribeClick();
      unsubscribeMessage();
    };
  }, []);

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