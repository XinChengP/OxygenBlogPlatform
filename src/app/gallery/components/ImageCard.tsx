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
}

// 单个候选地址的最大重试次数（重试耗尽后换下一个候选地址）
const MAX_RETRIES_PER_SOURCE = 2;

// ImageCard组件 — 展签式卡片：自然比例图片 + 美术馆图注
/**
 * 性能说明（画廊页面卡顿治理）：
 *  1. 卡片图片优先使用清单里的缩略图（thumbnail，宽 640 WebP，约为原图 1/20 体积），
 *     原图只在预览大图时加载；缩略图缺失或失败时自动回退原图，老清单也能正常展示。
 *  2. 移除了 framer-motion 包装与悬停位移/缩放：559 张卡片各自持有 motion 实例
 *     会持续占用合成线程，是滚动掉帧的主因，现改为纯 CSS 阴影过渡。
 *  3. 移除了图注与角标的 backdrop-blur：单卡片 2~3 个模糊层 × 559 张，滚动时
 *     GPU 需要每帧重算模糊，改为半透明纯色底后滚动显著顺畅。
 *  4. 图片比例优先取清单宽高（构建期用 sharp 读出），首帧即占好正确位置，
 *     不再依赖图片 onLoad 校正，消除 559 次瀑布流整列重排。
 */
const ImageCard = ({ image, onClick, index, priority = 'low' }: ImageCardProps) => {
  // 图片加载状态
  const [loadStatus, setLoadStatus] = useState<ImageLoadStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [retryToken, setRetryToken] = useState(0);
  // 当前使用的候选地址下标（0=缩略图，1=原图，2=备用源）
  const [sourceIndex, setSourceIndex] = useState(0);
  // 清单未提供宽高时的兜底比例，图片加载完成后用真实尺寸校正
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);

  // 候选地址链：缩略图 → 原图 → 备用源。
  // 先过滤空值再映射，避免对 undefined 调用 getAssetPath；Set 去重防止
  // thumbnail 与原图指向同一 URL 时出现无意义的重复重试。
  const sources = useMemo(() => {
    const raw = [image.thumbnail, image.src, image.fallbackSrc];
    const unique = Array.from(new Set(raw.filter((item): item is string => Boolean(item))));
    return unique.map(item => getAssetPath(item));
  }, [image.thumbnail, image.src, image.fallbackSrc]);

  // 展签编号：01、02……
  const plaqueNo = String(index + 1).padStart(2, '0');
  // 比例来源优先级：清单宽高（构建期实测） > 本次加载实测 > 4:5 保守占位
  const knownRatio = image.width && image.height ? image.width / image.height : null;
  const aspectRatio = knownRatio ?? naturalRatio ?? 4 / 5;

  // 重试计时器引用
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 当前实际请求地址；重试时追加一次性参数，强制浏览器重新发起请求
  const baseSrc = sources[Math.min(sourceIndex, sources.length - 1)] ?? '';
  const currentSrc = retryToken === 0
    ? baseSrc
    : `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}_retry=${retryToken}`;

  // 图片切换（换图/换分类）时重置全部加载状态
  useEffect(() => {
    setLoadStatus('loading');
    setRetryCount(0);
    setRetryToken(0);
    setSourceIndex(0);
    setNaturalRatio(null);
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [sources]);

  // 组件卸载时清除计时器，避免对已卸载组件更新状态
  useEffect(() => {
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  // 图片加载成功处理
  const handleImageLoad = useCallback((event: React.SyntheticEvent<HTMLImageElement>) => {
    setLoadStatus('loaded');
    // 仅在清单缺失宽高时用真实尺寸校正比例，避免无谓的状态更新与重排
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

  // 图片加载失败处理：先按候选地址重试，重试耗尽后换下一个候选地址
  const handleImageError = useCallback(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
    }

    if (retryCount < MAX_RETRIES_PER_SOURCE) {
      const nextRetry = retryCount + 1;
      setRetryCount(nextRetry);
      setLoadStatus('loading');
      // 指数退避，避免同一失败地址被瞬间连续请求
      const waitTime = 800 * Math.pow(2, retryCount);
      retryTimerRef.current = setTimeout(() => {
        setRetryToken(token => token + 1);
      }, waitTime);
      return;
    }

    if (sourceIndex < sources.length - 1) {
      // 换下一个候选地址（如缩略图失败 → 原图），重试计数清零
      setSourceIndex(prev => prev + 1);
      setRetryCount(0);
      setRetryToken(0);
      setLoadStatus('loading');
      return;
    }

    setLoadStatus('failed');
  }, [retryCount, sourceIndex, sources.length]);

  // 手动重新加载（失败态卡片上的按钮）：从第一个候选地址重新开始
  const handleManualRetry = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setSourceIndex(0);
    setRetryCount(0);
    setRetryToken(token => token + 1);
    setLoadStatus('loading');
  }, []);

  return (
    <figure
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
    >
      {/* 画框：细边框 + 略偏移的底衬阴影，营造装裱感（悬停只加深阴影，不做位移/缩放） */}
      <div
        className="relative overflow-hidden rounded-lg border border-border/70 bg-muted/40 shadow-card group-hover:shadow-[var(--card-shadow-hover)] transition-shadow duration-300"
        style={{ aspectRatio }}
      >
        {/* 加载中状态 - 骨架屏效果 */}
        {loadStatus === 'loading' && (
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse flex items-center justify-center">
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                重试中... ({retryCount}/{MAX_RETRIES_PER_SOURCE})
              </p>
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
          width={image.width}
          height={image.height}
          className={`w-full h-full object-cover transition-opacity duration-300 ${loadStatus === 'loading' ? 'opacity-0' : 'opacity-100'}`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          referrerPolicy="no-referrer"
          loading={priority === 'high' ? 'eager' : 'lazy'}
          fetchPriority={priority === 'high' ? 'high' : 'low'}
          decoding="async"
        />

        {/* 加载失败状态 */}
        {loadStatus === 'failed' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted">
            <ImageOff className="w-10 h-10 text-muted-foreground/60 mb-2" />
            <p className="text-xs text-muted-foreground mb-3">作品暂时无法展出</p>
            <button
              className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 cursor-pointer"
              onClick={handleManualRetry}
            >
              <RefreshCw className="w-3 h-3" />
              重新加载
            </button>
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

      {/* 展签图注：半透明底托保证任意背景上可读，编号 + 标题 + 分类 */}
      <figcaption className="pt-2.5">
        <div className="inline-flex items-baseline gap-2.5 max-w-full rounded-md bg-card/90 border border-border/40 px-2.5 py-1.5 shadow-sm">
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
    </figure>
  );
};

export default ImageCard;
