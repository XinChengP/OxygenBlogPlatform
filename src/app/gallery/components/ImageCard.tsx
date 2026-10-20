'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GalleryImage, ImageLoadStatus } from '../../../types/gallery';
import { getAssetPath } from '@/utils/assetUtils';
import { RefreshCw, ImageOff } from 'lucide-react';

// ImageCard组件属性
interface ImageCardProps {
  image: GalleryImage;
  onClick: () => void;
  index: number;
  /** 图片加载优先级：high=首屏立即加载，low=懒加载 */
  priority?: 'high' | 'low';
  /** 横向行布局给出的格子宽度（像素）；不传时按瀑布流比例自适应 */
  displayWidth?: number;
  /** 横向行布局给出的画框高度（像素）；不传时用图片比例 */
  displayHeight?: number;
}

// 单个缩略图的最大自动重试次数
const MAX_RETRIES = 2;
// 缩略图加载超时阈值：图床卡住时不要让卡片无限转圈
const THUMB_TIMEOUT_MS = 8000;
// 没有缩略图时，只有明确知道原图很小才允许直接使用原图
const SMALL_ORIGINAL_LIMIT = 512 * 1024;

// ImageCard组件 — 图片画框：悬停显示标题与编号
/**
 * 性能说明（画廊页面卡顿治理）：
 *  1. 卡片只加载清单里的缩略图（640 WebP）。原图也可能有十几 MB，
 *     因此即使缩略图失败/超时也绝不回退到原图，只显示重试入口，
 *     避免一个卡片把 15MB 原图拖进网格。
 *  2. 缩略图请求有 8 秒超时；超时后显示“加载超时 + 重新加载”，
 *     不让卡片永远停在骨架屏。
 *  3. 移除了 framer-motion 包装与悬停位移/缩放：大量卡片各自持有 motion 实例
 *     会持续占用合成线程，现改为纯 CSS 阴影过渡。
 *  4. 图片比例优先取清单宽高（构建期用 sharp 读出），首帧即占好正确位置。
 */
const ImageCard = ({
  image,
  onClick,
  index,
  priority = 'low',
  displayWidth,
  displayHeight,
}: ImageCardProps) => {
  // 图片加载状态
  const [loadStatus, setLoadStatus] = useState<ImageLoadStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [retryToken, setRetryToken] = useState(0);
  // 清单未提供宽高时的兜底比例，图片加载完成后用真实尺寸校正
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);

  /*
    网格只使用缩略图。没有缩略图时：
    - 如果清单明确给出原图体积且不超过 512KB，可以直接用原图；
    - 否则宁可显示“暂无缩略图”，也不冒下载十几 MB 原图的风险。
  */
  const baseSrc = useMemo(() => {
    if (image.thumbnail) return getAssetPath(image.thumbnail);
    if (image.size !== undefined && image.size <= SMALL_ORIGINAL_LIMIT) {
      return getAssetPath(image.src);
    }
    return '';
  }, [image.thumbnail, image.src, image.size]);

  // 展签编号：01、02……
  const plaqueNo = String(index + 1).padStart(2, '0');
  // 比例来源优先级：清单宽高（构建期实测） > 本次加载实测 > 4:5 保守占位
  const knownRatio = image.width && image.height ? image.width / image.height : null;
  const aspectRatio = knownRatio ?? naturalRatio ?? 4 / 5;

  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // 当前实际请求地址；重试时追加一次性参数，强制浏览器重新发起请求
  const currentSrc = retryToken === 0
    ? baseSrc
    : `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}_retry=${retryToken}`;

  // 换图/换分类时重置全部加载状态
  useEffect(() => {
    setLoadStatus('loading');
    setRetryCount(0);
    setRetryToken(0);
    setNaturalRatio(null);
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [baseSrc]);

  // 每次真正发起请求时启动超时计时；loaded 后计时器即使触发也不会改状态
  useEffect(() => {
    if (!currentSrc) {
      setLoadStatus('failed');
      return;
    }

    const timer = setTimeout(() => {
      setLoadStatus(status => (status === 'loaded' ? status : 'timeout'));
    }, THUMB_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [currentSrc]);

  // 服务端直出的图片可能在水合前就完成加载，React 的 onLoad 不会触发。
  // 这里直接给原生 img 挂 load/error：挂载时若已 complete 立即结算，
  // 否则等原生事件，避免图片已下载却一直停留在骨架屏。
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    const settle = () => {
      if (img.naturalWidth > 0) {
        setLoadStatus('loaded');
        if (!knownRatio) {
          setNaturalRatio(img.naturalWidth / img.naturalHeight);
        }
      } else {
        setLoadStatus('failed');
      }
    };

    if (img.complete) {
      settle();
      return;
    }

    img.addEventListener('load', settle);
    img.addEventListener('error', settle);
    return () => {
      img.removeEventListener('load', settle);
      img.removeEventListener('error', settle);
    };
  }, [currentSrc, knownRatio]);

  // 组件卸载时清除计时器
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setLoadStatus('loaded');
    if (!knownRatio) {
      const { naturalWidth, naturalHeight } = event.currentTarget;
      if (naturalWidth > 0 && naturalHeight > 0) {
        setNaturalRatio(naturalWidth / naturalHeight);
      }
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [knownRatio]);

  const handleImageError = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }

    if (retryCount < MAX_RETRIES) {
      const nextRetry = retryCount + 1;
      setRetryCount(nextRetry);
      setLoadStatus('loading');
      retryTimerRef.current = setTimeout(() => {
        setRetryToken(token => token + 1);
      }, 800 * Math.pow(2, retryCount));
      return;
    }

    setLoadStatus('failed');
  }, [retryCount]);

  const handleManualRetry = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setRetryCount(0);
    setRetryToken(token => token + 1);
    setLoadStatus('loading');
  }, []);

  const showFailure = loadStatus === 'failed' || loadStatus === 'timeout';

  return (
    <figure
      className="group cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`查看作品：${image.alt}`}
      style={
        displayWidth
          ? { width: `${displayWidth}px`, flex: '0 0 auto' }
          : undefined
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/* 画框：细边框 + 略偏移的底衬阴影，营造装裱感（悬停只加深阴影，不做位移/缩放） */}
      <div
        className="relative overflow-hidden rounded-lg border border-border/70 bg-muted/40 shadow-card group-hover:shadow-[var(--card-shadow-hover)] transition-shadow duration-300"
        style={
          displayHeight
            ? { height: `${displayHeight}px`, width: '100%' }
            : { aspectRatio }
        }
      >
        {/* 加载中状态 - 骨架屏效果 */}
        {loadStatus === 'loading' && (
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse flex items-center justify-center">
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                重试中... ({retryCount}/{MAX_RETRIES})
              </p>
            )}
          </div>
        )}

        {currentSrc && (
          <img
            ref={imgRef}
            src={currentSrc}
            alt={image.alt}
            width={image.width}
            height={image.height}
            className={`w-full h-full object-cover transition-opacity duration-300 ${loadStatus === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
            referrerPolicy="no-referrer"
            loading={priority === 'high' ? 'eager' : 'lazy'}
            fetchPriority={priority === 'high' ? 'high' : 'low'}
            decoding="async"
          />
        )}

        {/* 失败 / 超时状态：只重试缩略图，不回退原图 */}
        {showFailure && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted px-3 text-center">
            <ImageOff className="w-9 h-9 text-muted-foreground/60 mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              {baseSrc
                ? (loadStatus === 'timeout' ? '缩略图加载超时' : '作品暂时无法展出')
                : '暂无可用缩略图'}
            </p>
            {baseSrc && (
              <button
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 cursor-pointer"
                onClick={handleManualRetry}
              >
                <RefreshCw className="w-3 h-3" />
                重新加载
              </button>
            )}
          </div>
        )}

        {/* 悬停信息层：底部渐变 + 标题浮现（纯渐变，无毛玻璃，避免滚动时重算模糊） */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end pointer-events-none">
          <p className="p-4 text-white text-sm font-medium leading-snug line-clamp-2">
            {image.alt}
            {image.subCategory && (
              <span className="block text-white/70 text-xs mt-0.5">{image.subCategory}</span>
            )}
          </p>
        </div>

        {/* 右上角编号角标（悬停浮现，半透明底替代毛玻璃） */}
        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/60 text-white/90 text-[10px] tracking-widest tabular-nums opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {plaqueNo}
        </span>
      </div>
    </figure>
  );
};

export default ImageCard;
