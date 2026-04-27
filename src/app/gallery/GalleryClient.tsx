'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GalleryImage, ImageCategory, ImageCategoryTree, GalleryState } from '../../types/gallery';
import { filterImagesByCategory } from '../../utils/galleryUtils';
import ImageCard from './components/ImageCard';
import ImagePreview from './components/ImagePreview';
import CategoryFilter from './components/CategoryFilter';
import { useBackgroundStyle } from '../../hooks/useBackgroundStyle';
import { live2dEventEmitter, Live2DEvents, emitLive2DEvent } from '../../utils/live2dEventEmitter';
import { Live2DMessageHelper } from '../../utils/live2dMessageManager';
import { Image, Grid3X3, ChevronDown, Filter } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

// GalleryClient组件属性
interface GalleryClientProps {
  initialImages: GalleryImage[];
  initialCategories: ImageCategoryTree[];
}

// 首屏优先加载的图片数量
const INITIAL_LOAD_COUNT = 20;

// GalleryClient组件
const GalleryClient = ({ initialImages, initialCategories }: GalleryClientProps) => {
  // 调试日志：输出接收到的初始数据
  console.log('[GalleryClient] 接收到的初始数据:', {
    imagesCount: initialImages.length,
    categoriesCount: initialCategories.length,
    categories: initialCategories.map(c => ({
      name: c.name,
      count: c.count,
      slug: c.slug,
      hasSubCategories: !!c.subCategories,
      subCategoriesCount: c.subCategories?.length || 0
    }))
  });
  
  // 获取背景样式和容器样式
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('gallery');
  
  // 移动端侧边栏折叠状态 - 默认展开以避免 hydration mismatch
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  // 客户端挂载状态
  const [isMounted, setIsMounted] = useState<boolean>(false);
  
  // 初始化画廊状态
  const [state, setState] = useState<GalleryState>({
    images: initialImages,
    categories: initialCategories as ImageCategoryTree[],
    selectedCategory: null,
    selectedSubCategory: null,
    selectedImage: null,
    isPreviewOpen: false,
    isLoading: false,
    error: null
  });

  // 滚动节流定时器引用
  const scrollThrottleRef = useRef<number>(0);

  // 毛玻璃样式函数 - 与归档页面保持一致
  const getGlassStyle = (baseStyle: string) => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };

  // 根据选中的分类和子分类过滤图片
  const filteredImages = useMemo(() => {
    return filterImagesByCategory(state.images, state.selectedCategory, state.selectedSubCategory);
  }, [state.images, state.selectedCategory, state.selectedSubCategory]);

  // 客户端挂载后设置状态
  useEffect(() => {
    setIsMounted(true);
    // 移动端默认折叠侧边栏
    if (window.innerWidth < 1024) {
      setIsSidebarCollapsed(true);
    }
  }, []);

  // 处理分类选择
  const handleCategoryChange = (category: string | null, subCategory?: string | null) => {
    setState(prev => ({
      ...prev,
      selectedCategory: category,
      selectedSubCategory: subCategory || null
    }));

    // 发送分类切换事件给Live2D
    emitLive2DEvent(Live2DEvents.INFO, {
      type: 'gallery-category-change',
      category: category || '全部',
      subCategory: subCategory || null,
      timestamp: Date.now()
    });

    // 根据分类和子分类发送不同的Live2D消息（使用配置化消息）
    Live2DMessageHelper.showGalleryMessage('CATEGORY_CHANGE', {
      category: category ? (subCategory ? `${category}-${subCategory}` : category) : '全部'
    });
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

    // 发送图片点击消息（使用配置化消息）
    Live2DMessageHelper.showGalleryMessage('IMAGE_CLICK');
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

    // 发送关闭预览消息（使用配置化消息）
    Live2DMessageHelper.showGalleryMessage('PREVIEW_CLOSE');
  };

  // 画廊加载完成事件
  useEffect(() => {
    emitLive2DEvent(Live2DEvents.PAGE_LOAD, {
      page: 'gallery',
      totalImages: state.images.length,
      totalCategories: state.categories.length,
      timestamp: Date.now()
    });

    // 发送欢迎消息（使用配置化消息）
    Live2DMessageHelper.showGalleryMessage('PAGE_VISIT');
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

      // 发送预览打开消息（使用配置化消息）
      Live2DMessageHelper.showGalleryMessage('IMAGE_PREVIEW');
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

        // 低概率发送滚动浏览消息（使用配置化消息）
        if (Math.random() > 0.7) { // 30%概率发送消息
          Live2DMessageHelper.showGalleryMessage('SCROLL');
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* 页面头部 - 添加入场动画 */}
        <PageHeader
          title="画廊"
          description="佬，嘿嘿，我亲爱的佬"
          size="lg"
          className="mb-8"
        />

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 移动端折叠按钮 */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:hidden mb-2"
          >
            <button
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={getGlassStyle("w-full px-4 py-3 rounded-lg border flex items-center justify-between")}
            >
              <span className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-primary" />
                <span className="font-medium text-foreground">分类筛选</span>
              </span>
              <motion.span
                animate={{ rotate: isSidebarCollapsed ? 0 : 180 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </motion.span>
            </button>
          </motion.div>

          {/* 左侧分类导航区域 - 使用CSS控制显示/隐藏，避免hydration问题 */}
          <motion.aside
            initial={false}
            animate={{ 
              opacity: isMounted && !isSidebarCollapsed ? 1 : 0,
              height: isMounted && !isSidebarCollapsed ? 'auto' : 0
            }}
            transition={{ duration: 0.3 }}
            className={`w-full lg:w-64 lg:sticky lg:top-24 lg:h-fit overflow-hidden lg:overflow-visible lg:opacity-100 lg:h-auto`}
          >
            <div className={`${isSidebarCollapsed ? 'hidden lg:block' : 'block'}`}>
              <CategoryFilter
                categories={state.categories}
                selectedCategory={state.selectedCategory}
                selectedSubCategory={state.selectedSubCategory}
                onCategoryChange={handleCategoryChange}
                getGlassStyle={getGlassStyle}
              />
            </div>
          </motion.aside>
          
          {/* 右侧图片展示区域 */}
          <motion.div 
            className="flex-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* 图片统计 - 优化样式 */}
            <motion.div 
              className={getGlassStyle("mb-6 px-4 py-3 rounded-lg border flex items-center justify-between")}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <div className="flex items-center gap-2">
                <Grid3X3 className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  共找到 <span className="text-primary font-semibold">
                    {filteredImages.length}
                  </span> 张图片
                </span>
              </div>
              {(state.selectedCategory || state.selectedSubCategory) && (
                <span className="text-sm px-3 py-1 rounded-full bg-primary/20 text-primary font-medium">
                  {state.selectedCategory}{state.selectedSubCategory ? ` - ${state.selectedSubCategory}` : ''}
                </span>
              )}
            </motion.div>
            
            {/* 图片展示区域 - 网格布局 */}
            {filteredImages.length > 0 ? (
              <motion.div
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
              >
                {/* 渲染所有图片，通过原生懒加载控制实际加载时机 */}
                {filteredImages.map((image, index) => (
                  <motion.div
                    key={image.id}
                    className="h-full"
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    <ImageCard
                      image={image}
                      onClick={() => handleImageClick(image)}
                      index={index}
                      // 前 INITIAL_LOAD_COUNT 张图片设置高优先级，其余懒加载
                      priority={index < INITIAL_LOAD_COUNT ? 'high' : 'low'}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              /* 空状态设计 */
              <motion.div 
                className={getGlassStyle("text-center py-20 rounded-lg border")}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <div className="text-6xl mb-6">🖼️</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  该分类下暂无图片
                </h3>
                <p className="text-muted-foreground mb-6">
                  试试切换其他分类，或者稍后再来看看
                </p>
                <button
                  onClick={() => handleCategoryChange(null)}
                  className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
                >
                  查看全部图片
                </button>
              </motion.div>
            )}
            
            {/* 加载更多按钮（后续实现分批加载） */}
            {state.isLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            )}
          </motion.div>
        </div>
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
  );
};

export default GalleryClient;
