'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
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
}

// ImageCard组件 — 展签式卡片：自然比例图片 + 美术馆图注
const ImageCard = ({ image, onClick, index, priority = 'low' }: ImageCardProps) => {
  // 图片加载状态
  const [loadStatus, setLoadStatus] = useState<ImageLoadStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [retryToken, setRetryToken] = useState(0);
  const [usingFallback, setUsingFallback] = useState(false);
  const [naturalRatio, setNaturalRatio] = useState<number | null>(
    image.width && image.height ? image.width / image.height : null,
  );
  const maxRetries = 3;
  const hasFallback = !!image.fallbackSrc;

  // 展签编号：01、02……
  const plaqueNo = String(index + 1).padStart(2, '0');
  // 优先使用真实比例；清单未提供宽高时先按 4:5 占位，加载完成后用 naturalWidth 校正
  const aspectRatio = naturalRatio ?? 4 / 5;

  // 重试计时器引用
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 处理图片路径 - 使用getAssetPath确保GitHub Pages兼容性
  const processImagePath = useCallback((path: string) => {
    return getAssetPath(path);
  }, []);

  const baseSrc = usingFallback && image.fallbackSrc
    ? processImagePath(image.fallbackSrc)
    : image.src;

  // 重试时追加一次性参数，强制浏览器重新发起请求（同一失败 URL 不会再次触发 error）
  const currentSrc = retryToken === 0
    ? baseSrc
    : `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}_retry=${retryToken}`;

  // 重置图片状态 - 使用useCallback优化
  const resetImageState = useCallback(() => {
    setLoadStatus('loading');
    setRetryCount(0);
    setRetryToken(0);
    setUsingFallback(false);
    setNaturalRatio(
      image.width && image.height ? image.width / image.height : null,
    );
  }, [image.src, image.width, image.height]);

  // 图片加载成功处理
  const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    setLoadStatus('loaded');
    // 清单缺失宽高时，用真实尺寸校正比例，避免所有图片被裁成 4:5
    const { naturalWidth, naturalHeight } = event.currentTarget;
    if (naturalWidth > 0 && naturalHeight > 0) {
      setNaturalRatio(naturalWidth / naturalHeight);
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  // 图片加载失败处理
  const handleImageError = () => {
    if (retryCount < maxRetries) {
      setLoadStatus('loading');
      const nextRetry = retryCount + 1;
      setRetryCount(nextRetry);

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }

      const waitTime = 1000 * Math.pow(2, retryCount);
      retryTimerRef.current = setTimeout(() => {
        // 换一个带时间戳的 URL，浏览器才会真正重新请求
        setRetryToken(token => token + 1);
        setLoadStatus('loading');
      }, waitTime);
    } else if (!usingFallback && hasFallback) {
      setUsingFallback(true);
      setRetryCount(0);
      setRetryToken(0);
      setLoadStatus('loading');
    } else {
      setLoadStatus('failed');
    }
  };

  // 组件卸载时清除计时器
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // 当image.src变化时重置状态
  useEffect(() => {
    resetImageState();
  }, [image.src, resetImageState]);

  return (
    <motion.figure
      className="group cursor-pointer"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`查看作品：${image.alt}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.25 }}
    >
      {/* 画框：细边框 + 略偏移的底衬阴影，营造装裱感 */}
      <motion.div
        className="relative overflow-hidden rounded-lg border border-border/70 bg-muted/40 shadow-card group-hover:shadow-[var(--card-shadow-hover)] transition-shadow duration-300"
        style={{ aspectRatio }}
      >
        {/* 加载中状态 - 骨架屏效果 */}
        {loadStatus === 'loading' && (
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse flex items-center justify-center">
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">重试中... ({retryCount}/{maxRetries})</p>
            )}
          </div>
        )}

        {/*
          图片：淡入与悬停缩放共用一个 transition 声明，避免类冲突。

          此处刻意不设置 crossOrigin="anonymous"：
          图床主地址 jsDelivr 在部分图片上会 302 重定向到 raw.githubusercontent.com，
          该域名不返回 Access-Control-Allow-Origin 头；img 一旦带 crossOrigin 就按跨域校验处理，
          图片会被 CORS 策略拦截而加载失败（画廊只能显示"作品暂时无法展出"）。
          展示型 img 无需 CORS 头，去掉后无论是否发生重定向都能正常显示。
        */}
        <img
          src={currentSrc}
          alt={image.alt}
          className={`w-full h-full object-cover transition-[opacity,transform] duration-500 ease-out group-hover:scale-[1.04] ${loadStatus === 'loading' ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          referrerPolicy="no-referrer"
          loading={priority === 'high' ? 'eager' : 'lazy'}
          decoding="async"
        />

        {/* 加载失败状态 */}
        {loadStatus === 'failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
            <ImageOff className="w-10 h-10 text-muted-foreground/60 mb-2" />
            <p className="text-xs text-muted-foreground mb-3">作品暂时无法展出</p>
            <motion.button
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20"
              onClick={(e) => {
                e.stopPropagation();
                setLoadStatus('loading');
                setRetryCount(0);
                setUsingFallback(false);
                setRetryToken(token => token + 1);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw className="w-3 h-3" />
              重新加载
            </motion.button>
          </div>
        )}

        {/* 悬停信息层：底部渐变 + 标题浮现 */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end pointer-events-none">
          <p className="p-4 text-white text-sm font-medium leading-snug line-clamp-2">
            {image.alt}
            {image.subCategory && (
              <span className="block text-white/70 text-xs mt-0.5">{image.subCategory}</span>
            )}
          </p>
        </div>

        {/* 右上角编号角标（悬停浮现） */}
        <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-full bg-black/45 text-white/90 text-[10px] tracking-widest tabular-nums backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {plaqueNo}
        </span>
      </motion.div>

      {/* 展签图注：小型玻璃底托保证任意背景上可读，编号 + 标题 + 分类 */}
      <figcaption className="pt-2.5">
        <div className="inline-flex items-baseline gap-2.5 max-w-full rounded-md bg-card/75 backdrop-blur-md border border-border/40 px-2.5 py-1.5 shadow-sm">
          <span className="text-[11px] font-semibold text-primary tabular-nums shrink-0">
            {plaqueNo}
          </span>
          <span className="text-[13px] text-foreground/95 truncate">
            {image.alt}
          </span>
          <span className="ml-auto text-[10px] uppercase tracking-[0.15em] text-muted-foreground shrink-0">
            {image.category}
          </span>
        </div>
      </figcaption>
    </motion.figure>
  );
};

export default ImageCard;
