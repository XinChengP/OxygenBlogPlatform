'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GalleryImage, ImageCategoryTree, GalleryState } from '../../types/gallery';
import { filterImagesByCategory } from '../../utils/galleryUtils';
import ImageCard from './components/ImageCard';
import ImagePreview from './components/ImagePreview';
import { useBackgroundStyle } from '../../hooks/useBackgroundStyle';
import { live2dEventEmitter, Live2DEvents, emitLive2DEvent } from '../../utils/live2dEventEmitter';
import { Live2DMessageHelper } from '../../utils/live2dMessageManager';
import { ArrowRight, X } from 'lucide-react';
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
  // 获取背景样式和容器样式
  const { containerStyle } = useBackgroundStyle('gallery');

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

  // 根据选中的分类和子分类过滤图片
  const filteredImages = useMemo(() => {
    return filterImagesByCategory(state.images, state.selectedCategory, state.selectedSubCategory);
  }, [state.images, state.selectedCategory, state.selectedSubCategory]);

  // 当前选中主分类的子分类列表
  const activeSubCategories = useMemo(() => {
    if (!state.selectedCategory) return [];
    return state.categories.find(c => c.name === state.selectedCategory)?.subCategories || [];
  }, [state.categories, state.selectedCategory]);

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

  // 分类胶囊通用样式
  const pillBase = 'px-4 py-1.5 rounded-full text-sm border transition-colors duration-200 cursor-pointer select-none';
  const pillActive = 'bg-primary text-primary-foreground border-primary font-medium';
  const pillIdle = 'border-border text-muted-foreground hover:text-foreground hover:border-primary/40 bg-card/50';

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 pb-24">
        {/* 页面头部 */}
        <PageHeader
          title="画廊"
          description="佬，嘿嘿，我亲爱的佬"
          size="lg"
          className="mb-8"
        />

        {/* ===== 分类胶囊导航 ===== */}
        <motion.nav
          className="mb-10 space-y-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleCategoryChange(null)}
              className={`${pillBase} ${!state.selectedCategory ? pillActive : pillIdle}`}
            >
              全部
            </button>
            {state.categories.map(cat => (
              <button
                key={cat.slug || cat.name}
                onClick={() => handleCategoryChange(cat.name, null)}
                className={`${pillBase} ${state.selectedCategory === cat.name ? pillActive : pillIdle}`}
              >
                {cat.icon && <span className="mr-1">{cat.icon}</span>}
                {cat.name}
                <span className="ml-1.5 text-xs opacity-60 tabular-nums">{cat.count}</span>
              </button>
            ))}
          </div>

          {/* 子分类第二行 */}
          <AnimatePresence>
            {activeSubCategories.length > 0 && (
              <motion.div
                className="flex flex-wrap items-center gap-2 pl-4 border-l-2 border-primary/30"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
              >
                <button
                  onClick={() => handleCategoryChange(state.selectedCategory, null)}
                  className={`${pillBase} text-xs py-1 ${!state.selectedSubCategory ? 'bg-primary/15 text-primary border-primary/40' : 'border-transparent text-foreground/60 hover:text-foreground'}`}
                >
                  全部{state.selectedCategory}
                </button>
                {activeSubCategories.map(sub => (
                  <button
                    key={sub.slug || sub.name}
                    onClick={() => handleCategoryChange(state.selectedCategory, sub.name)}
                    className={`${pillBase} text-xs py-1 ${state.selectedSubCategory === sub.name ? 'bg-primary/15 text-primary border-primary/40' : 'border-transparent text-foreground/60 hover:text-foreground'}`}
                  >
                    {sub.name}
                    <span className="ml-1 opacity-60 tabular-nums">{sub.count}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 当前筛选提示 */}
          {(state.selectedCategory || state.selectedSubCategory) && (
            <div className="flex items-center gap-2 pt-1 text-xs text-foreground/70">
              <span>当前展区：</span>
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {state.selectedCategory}{state.selectedSubCategory ? ` · ${state.selectedSubCategory}` : ''}
              </span>
              <button
                onClick={() => handleCategoryChange(null)}
                className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                返回全部
              </button>
            </div>
          )}
        </motion.nav>

        {/* ===== 瀑布流展区 ===== */}
        {filteredImages.length > 0 ? (
          <motion.div
            className="columns-2 sm:columns-3 xl:columns-4 gap-5"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.04 } }
            }}
          >
            {filteredImages.map((image, index) => (
              <motion.div
                key={image.id}
                className="mb-6 break-inside-avoid"
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
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
            className="text-center py-28 border border-dashed border-border rounded-2xl"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-5xl mb-5">🖼️</p>
            <h3 className="text-lg font-semibold text-foreground mb-2">本展区暂无展品</h3>
            <p className="text-muted-foreground text-sm mb-6">策展人正在布展中，先去别的展区逛逛吧</p>
            <button
              onClick={() => handleCategoryChange(null)}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
            >
              返回全部展品
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {/* 加载中状态 */}
        {state.isLoading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
  );
};

export default GalleryClient;
