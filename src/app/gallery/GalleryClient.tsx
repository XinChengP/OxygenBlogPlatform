'use client';

import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GalleryImage, ImageCategoryTree, GalleryState, ImageSource } from '../../types/gallery';
import {
  filterImagesByCategory,
  fetchRemoteImagesWithFallback,
  buildCategoryTree
} from '../../utils/galleryShared';
import { buildGalleryRows } from '../../utils/galleryLayout';
import ImageCard from './components/ImageCard';
import ImagePreview from './components/ImagePreview';
import { useBackgroundStyle } from '../../hooks/useBackgroundStyle';
import { live2dEventEmitter, Live2DEvents, emitLive2DEvent } from '../../utils/live2dEventEmitter';
import { Live2DMessageHelper } from '../../utils/live2dMessageManager';
import { ArrowRight, X, RefreshCw } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

// 画廊客户端组件属性
interface GalleryClientProps {
  initialImages: GalleryImage[];
  initialCategories: ImageCategoryTree[];
}

// 首屏优先加载的图片数量
const INITIAL_LOAD_COUNT = 8;

// 横向行布局每批追加的行数。桌面端约 4-5 张/行，6 行约等于原来的 24 张。
const ROW_BATCH_SIZE = 6;

// 入场动画的错峰行数上限，避免整页行一起延迟
const MAX_STAGGER_ROWS = 8;

// 服务端渲染时的默认内容宽度；客户端测量后会替换为真实宽度
const DEFAULT_CONTAINER_WIDTH = 1200;

// 客户端首帧用 useLayoutEffect 在绘制前量宽度，服务端降级为 useEffect
const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * 生成图片列表签名，用于判断实时刷新回来的数据是否与当前展示完全一致
 *
 * 签名包含 id、宽高与是否带缩略图：清单新增缩略图或补上宽高时签名会变化，
 * 必须让状态更新生效；而只有轻微无关变化时则可安全跳过整树重渲染。
 */
const buildImagesSignature = (images: GalleryImage[]): string =>
  images
    .map(img => `${img.id}:${img.width ?? ''}x${img.height ?? ''}:${img.thumbnail ? 1 : 0}`)
    .join('|');

// GalleryClient组件
const GalleryClient = ({ initialImages, initialCategories }: GalleryClientProps) => {
  // 获取背景样式和容器样式
  const { containerStyle } = useBackgroundStyle('gallery');

  // 初始化画廊状态（分类筛选从 URL 恢复，便于分享与前进后退）
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

  // 增量渲染：当前已渲染的行数与滚动加载哨兵
  const [visibleRowCount, setVisibleRowCount] = useState(ROW_BATCH_SIZE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // 横向行布局依赖真实内容宽度；服务端先按默认宽度生成，客户端绘制前校正
  const galleryWidthRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(DEFAULT_CONTAINER_WIDTH);

  useIsomorphicLayoutEffect(() => {
    const target = galleryWidthRef.current;
    if (!target) return;

    let frame = 0;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const applyWidth = () => {
      const width = target.clientWidth;
      if (width > 0) {
        setContainerWidth(prev => (Math.abs(prev - width) < 1 ? prev : width));
      }
    };

    const scheduleWidthCheck = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        frame = requestAnimationFrame(applyWidth);
      }, 120);
    };

    applyWidth();
    // 静态导出首帧的宽度可能在字体/滚动条布局稳定前测到旧值，
    // 这里补几次延迟复测；真实浏览器窗口缩放仍由 observer/resize 负责。
    const settleTimers = [80, 250, 800].map(ms => setTimeout(applyWidth, ms));
    const clearSettleTimers = () => {
      settleTimers.forEach(timer => clearTimeout(timer));
    };

    // ResizeObserver 在真实浏览器里足够，但部分内嵌/模拟环境不派发观察回调，
    // 这里再用 window.resize 兜底；两者都经过 120ms 防抖。
    window.addEventListener('resize', scheduleWidthCheck);

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        window.removeEventListener('resize', scheduleWidthCheck);
        clearSettleTimers();
        if (debounceTimer) clearTimeout(debounceTimer);
        if (frame) cancelAnimationFrame(frame);
      };
    }

    const observer = new ResizeObserver(scheduleWidthCheck);
    observer.observe(target);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', scheduleWidthCheck);
      clearSettleTimers();
      if (debounceTimer) clearTimeout(debounceTimer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  // 浏览器前进/后退或首次挂载时同步筛选状态
  useEffect(() => {
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      setState(prev => ({
        ...prev,
        selectedCategory: params.get('category'),
        selectedSubCategory: params.get('sub'),
      }));
      setVisibleRowCount(ROW_BATCH_SIZE);
    };
    syncFromUrl();
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  // 滚动节流定时器引用
  const scrollThrottleRef = useRef<number>(0);

  // ===== 浏览器端手动刷新图床数据 =====
  // 首屏直接使用构建期快照，不在挂载时自动拉 manifest：
  // 图床慢时一次刷新要 10-20 秒，还会在后台替换图片列表、打断用户浏览。
  // 需要识别图床新增文件夹时，由用户点击“刷新图库”触发。
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshInFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshRemoteImages = useCallback(async () => {
    if (refreshInFlightRef.current) return;

    refreshInFlightRef.current = true;
    setIsRefreshing(true);
    setRefreshError(null);

    try {
      const freshImages = await fetchRemoteImagesWithFallback();

      if (!mountedRef.current) return;
      if (freshImages.length === 0) {
        setRefreshError('图库刷新失败，请稍后重试');
        return;
      }

      setState(prev => {
        const currentRemoteImages = prev.images.filter(
          img => img.source === ImageSource.Remote
        );
        // 数据完全一致时跳过 setState，避免整树重渲染
        if (
          buildImagesSignature(freshImages) ===
          buildImagesSignature(currentRemoteImages)
        ) {
          return prev;
        }

        const localImages = prev.images.filter(
          img => img.source === ImageSource.Local
        );
        const mergedImages = [...localImages, ...freshImages];
        return {
          ...prev,
          images: mergedImages,
          categories: buildCategoryTree(mergedImages),
        };
      });
    } catch {
      if (mountedRef.current) {
        setRefreshError('图库刷新失败，请稍后重试');
      }
    } finally {
      refreshInFlightRef.current = false;
      if (mountedRef.current) setIsRefreshing(false);
    }
  }, []);

  // 根据选中的分类和子分类过滤图片
  const filteredImages = useMemo(() => {
    return filterImagesByCategory(state.images, state.selectedCategory, state.selectedSubCategory);
  }, [state.images, state.selectedCategory, state.selectedSubCategory]);

  /*
    行布局是 append-stable 的关键：先从完整图片列表一次性算出所有行，
    渲染时只按行数截取。后续追加批次只会新增末尾的行，已有行的 DOM、
    尺寸和位置都不变，不会再出现 CSS 多列瀑布流那种整页重排。
  */
  const rows = useMemo(
    () => buildGalleryRows(filteredImages, containerWidth),
    [filteredImages, containerWidth]
  );

  // 切换分类后回到第一批，避免沿用上一个分类的已加载行数
  useEffect(() => {
    setVisibleRowCount(ROW_BATCH_SIZE);
  }, [state.selectedCategory, state.selectedSubCategory]);

  const visibleRows = useMemo(
    () => rows.slice(0, visibleRowCount),
    [rows, visibleRowCount]
  );

  // 当前已展示的图片（按行 flatten，用于计数）
  const visibleImages = useMemo(
    () => visibleRows.flatMap(row => row.items.map(item => item.image)),
    [visibleRows]
  );

  // 灯箱按视觉顺序翻页：横竖方穿插后的顺序与用户看到的顺序一致
  const orderedImages = useMemo(
    () => rows.flatMap(row => row.items.map(item => item.image)),
    [rows]
  );

  // 接近底部时追加下一批行；同时保留手动按钮，供无 IntersectionObserver 的环境使用
  useEffect(() => {
    if (visibleRowCount >= rows.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const target = loadMoreRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setVisibleRowCount(count =>
            Math.min(count + ROW_BATCH_SIZE, rows.length)
          );
        }
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [visibleRowCount, rows.length]);

  // 当前选中主分类的子分类列表
  const activeSubCategories = useMemo(() => {
    if (!state.selectedCategory) return [];
    return state.categories.find(c => c.name === state.selectedCategory)?.subCategories || [];
  }, [state.categories, state.selectedCategory]);

  // 处理分类选择
  const handleCategoryChange = (category: string | null, subCategory?: string | null) => {
    setVisibleRowCount(ROW_BATCH_SIZE);
    setState(prev => ({
      ...prev,
      selectedCategory: category,
      selectedSubCategory: subCategory || null
    }));

    // 同步到 URL（静态导出下查询参数只在客户端生效）
    const params = new URLSearchParams(window.location.search);
    if (category) params.set('category', category);
    else params.delete('category');
    if (subCategory) params.set('sub', subCategory);
    else params.delete('sub');
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}`,
    );

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
    window.addEventListener('scroll', handleScroll, { passive: true });

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
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              已展示 {visibleImages.length} / {filteredImages.length} 件作品
            </span>
            <button
              type="button"
              onClick={refreshRemoteImages}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:cursor-wait disabled:opacity-60"
              title="重新拉取图床清单，识别新上传的图片"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? '刷新中…' : '刷新图库'}
            </button>
          </div>
          {refreshError && (
            <p className="text-xs text-destructive" role="alert">{refreshError}</p>
          )}
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

        {/* 宽度测量锚点：横向行布局需要真实内容宽度 */}
        <div ref={galleryWidthRef} aria-hidden className="h-0 w-full" />

        {/* ===== 横向行展区 ===== */}
        {filteredImages.length > 0 ? (
          /*
            渲染策略（稳定性与性能）：
            - 行列表由 buildGalleryRows 从完整图片列表一次性算出，按行截取渲染。
              追加批次只新增末尾行，已有行的 DOM、尺寸和位置都不变，消除滚动
              加载时 CSS 多列瀑布流整页重排的问题。
            - 每行用一次 CSS 入场动画，只给前 MAX_STAGGER_ROWS 行错峰，
              避免几百个动画实例持续占用主线程。
            - 行容器加 gallery-row-visible（content-visibility: auto）：
              视口外的行由浏览器跳过绘制与样式计算，等效于轻量虚拟化。
          */
          <>
            <div className="flex flex-col overflow-x-clip">
              {visibleRows.map((row, rowIndex) => (
                <div
                  key={row.id}
                  className="gallery-row gallery-row-visible gallery-card-in"
                  style={{
                    gap: `${row.gap}px`,
                    marginBottom: `${row.kind === 'emoticon' ? (containerWidth < 768 ? 12 : 16) : (containerWidth < 480 ? 18 : 24)}px`,
                    animationDelay: rowIndex < MAX_STAGGER_ROWS ? `${rowIndex * 0.04}s` : '0s',
                    containIntrinsicSize: `auto ${row.height + 2}px`,
                  }}
                >
                  {row.items.map(item => (
                    <ImageCard
                      key={item.image.id}
                      image={item.image}
                      onClick={() => handleImageClick(item.image)}
                      index={item.index}
                      // 前 INITIAL_LOAD_COUNT 张图片设置高优先级，其余懒加载
                      priority={item.index < INITIAL_LOAD_COUNT ? 'high' : 'low'}
                      displayWidth={item.width}
                      displayHeight={row.height}
                    />
                  ))}
                </div>
              ))}
            </div>

            {visibleRowCount < rows.length ? (
              <div ref={loadMoreRef} className="mt-10 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleRowCount(count =>
                      Math.min(count + ROW_BATCH_SIZE, rows.length)
                    )
                  }
                  className="px-5 py-2.5 rounded-full border border-border bg-card/90 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors shadow-card"
                >
                  加载更多作品
                </button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  已显示 {visibleImages.length} / {filteredImages.length}
                </span>
              </div>
            ) : (
              rows.length > ROW_BATCH_SIZE && (
                <p className="mt-10 text-center text-xs text-muted-foreground tabular-nums">
                  已显示全部 {filteredImages.length} 件作品
                </p>
              )
            )}
          </>
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
          images={orderedImages}
          initialImage={state.selectedImage}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
};

export default GalleryClient;
