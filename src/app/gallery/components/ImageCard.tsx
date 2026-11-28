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

/*
  缩略图重试策略（修复“必须先手动点一次重新加载才能出图”）：
  1. 大陆访问 Cloudflare 边缘常有几秒级抖动，原来的 0.8s / 1.6s 两次重试
     全部落在抖动窗口内，自动重试必然失败，用户只能手动再点一次。
     现改为 1.2s / 3s / 7s 三段退避，覆盖更长的网络恢复窗口。
  2. 超时也纳入自动重试：原实现超时后直接显示失败卡片，没有任何自愈机会，
     而用户点击重试时网络已恢复，于是表现为“手动点一下就能加载”。
  3. 重试期间保持骨架屏并提示“正在重连”，不再闪现失败卡片。
*/
const MAX_RETRIES = 3;
// 每一轮重连前的等待时长（毫秒），索引超出时沿用最后一项
const RETRY_DELAYS = [1200, 3000, 7000];
// 单次缩略图请求的超时阈值：缩略图只有几十 KB，15 秒仍未完成基本可判定为卡死
const THUMB_TIMEOUT_MS = 15000;
// 视口预取范围：与浏览器 loading="lazy" 的预取距离大致对齐
const VIEWPORT_ROOT_MARGIN = '800px 0px';
// 没有缩略图时，只有明确知道原图很小才允许直接使用原图
const SMALL_ORIGINAL_LIMIT = 512 * 1024;

// ImageCard组件 — 图片画框：悬停显示标题与编号
/**
 * 性能说明（画廊页面卡顿治理）：
 *  1. 卡片只加载清单里的缩略图（640 WebP）。原图也可能有十几 MB，
 *     因此即使缩略图失败/超时也绝不回退到原图，只显示重试入口，
 *     避免一个卡片把 15MB 原图拖进网格。
 *  2. 缩略图请求有 15 秒超时，且超时后自动退避重连（最多 3 次）；
 *     只有次数用尽才显示“重新加载”入口，不让卡片永远停在骨架屏，
 *     也不会因为一次网络抖动就把失败卡片摆到用户面前。
 *  3. 移除了 framer-motion 包装与悬停位移/缩放：大量卡片各自持有 motion 实例
 *     会持续占用合成线程，现改为纯 CSS 阴影过渡。
 *  4. 图片比例优先取清单宽高（构建期用 sharp 读出），首帧即占好正确位置。
 *  5. 视口外的懒加载卡片不计时、不重连，避免把“还没开始加载”误判为“加载失败”。
 */
const ImageCard = ({
  image,
  onClick,
  index,
  priority = 'low',
  displayWidth,
  displayHeight,
}: ImageCardProps) => {
  // 图片加载状态：loading=骨架屏（含自动重连等待）、loaded=已出图、failed=重试用尽
  const [loadStatus, setLoadStatus] = useState<ImageLoadStatus>('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [retryToken, setRetryToken] = useState(0);
  // 清单未提供宽高时的兜底比例，图片加载完成后用真实尺寸校正
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null);
  /*
    是否已接近视口。

    视口外的卡片由浏览器 loading="lazy" 推迟发起请求。如果照旧从挂载起就计时，
    会在用户滚动到该行之前误判“加载超时”，滚过去看到的就是一张失败卡片，
    实际上图片刚开始下载、点一次重试就能出图——这正是用户反馈的现象之一。
    现在只有进入视口附近才开始计时与重连；首屏高优先级图片直接置为 true。
  */
  const [isNearViewport, setIsNearViewport] = useState(priority === 'high');

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

  // 画框节点：供 IntersectionObserver 判断卡片是否接近视口
  const frameRef = useRef<HTMLDivElement>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 重试次数用 ref 同步保存：超时、onError、原生 error 可能在同一轮连续触发，
  // 只依赖 state 闭包会读到旧值，导致重复排定重连或提前耗尽次数
  const retryCountRef = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);

  // 当前实际请求地址；重试时追加一次性参数，强制浏览器重新发起请求
  const currentSrc = retryToken === 0
    ? baseSrc
    : `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}_retry=${retryToken}`;

  // 换图/换分类时重置全部加载状态
  useEffect(() => {
    setLoadStatus('loading');
    setRetryCount(0);
    retryCountRef.current = 0;
    setRetryToken(0);
    setNaturalRatio(null);
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [baseSrc]);

  // 接近视口后才开始观察：进入预取范围即标记，之后不再撤销（图片已交给浏览器管理）
  useEffect(() => {
    if (isNearViewport) return;

    const target = frameRef.current;
    if (!target) return;

    // 不支持 IntersectionObserver 的环境（部分内嵌浏览器）退化为立即计时
    if (typeof IntersectionObserver === 'undefined') {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: VIEWPORT_ROOT_MARGIN }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [isNearViewport]);

  /**
   * 统一的重连调度：错误与超时都走这里，次数用尽才落到 failed。
   * 重连期间保持骨架屏，避免失败卡片闪现后再消失。
   */
  const scheduleRetry = useCallback(() => {
    // 已经排定重连时直接返回，防止同一轮事件重复排定
    if (retryTimerRef.current) return;

    if (retryCountRef.current >= MAX_RETRIES) {
      setLoadStatus('failed');
      return;
    }

    const delay = RETRY_DELAYS[Math.min(retryCountRef.current, RETRY_DELAYS.length - 1)];
    retryCountRef.current += 1;
    setRetryCount(retryCountRef.current);
    setLoadStatus('loading');

    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      // 追加一次性参数，强制浏览器绕开缓存的失败响应重新发起请求
      setRetryToken(token => token + 1);
    }, delay);
  }, []);

  // 单次请求超时：只对真正开始请求的卡片计时。超时同样进入自动重连，而不是直接失败
  useEffect(() => {
    if (!currentSrc) {
      setLoadStatus('failed');
      return;
    }

    // 视口外的懒加载卡片还没发请求，不能按超时处理
    if (!isNearViewport) return;

    // 已结算的状态不再计时，避免加载完成后重复排定重连
    if (loadStatus === 'loaded' || loadStatus === 'failed') return;

    const timer = setTimeout(scheduleRetry, THUMB_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [currentSrc, isNearViewport, retryToken, loadStatus, scheduleRetry]);

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
        return;
      }

      // 视口外的懒加载图片尚未真正请求，complete 为 true 也不代表失败
      if (!isNearViewport) return;

      // 失败统一交给自动重连，次数用尽才会显示失败卡片
      scheduleRetry();
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
  }, [currentSrc, knownRatio, isNearViewport, scheduleRetry]);

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
    // 已经出图，取消待执行的重连
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, [knownRatio]);

  // 加载错误直接进入统一重连队列（退避时间由 scheduleRetry 决定）
  const handleImageError = useCallback(() => {
    scheduleRetry();
  }, [scheduleRetry]);

  const handleManualRetry = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    // 手动重试重新开始计数，之前等待中的重连一并取消
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    retryCountRef.current = 0;
    setRetryCount(0);
    setRetryToken(token => token + 1);
    setLoadStatus('loading');
  }, []);

  const showFailure = loadStatus === 'failed';

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
        ref={frameRef}
        className="relative overflow-hidden rounded-lg border border-border/70 bg-muted/40 shadow-card group-hover:shadow-[var(--card-shadow-hover)] transition-shadow duration-300"
        style={
          displayHeight
            ? { height: `${displayHeight}px`, width: '100%' }
            : { aspectRatio }
        }
      >
        {/* 加载中状态 - 骨架屏效果（自动重连期间同样保持骨架屏） */}
        {loadStatus === 'loading' && (
          <div className="absolute inset-0 bg-gradient-to-r from-muted via-muted/60 to-muted animate-pulse flex items-center justify-center">
            {retryCount > 0 && (
              <p className="text-xs text-muted-foreground">
                正在重连... ({retryCount}/{MAX_RETRIES})
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

        {/* 失败状态：自动重连次数用尽后才出现，只重试缩略图，不回退原图 */}
        {showFailure && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted px-3 text-center">
            <ImageOff className="w-9 h-9 text-muted-foreground/60 mb-2" />
            <p className="text-xs text-muted-foreground mb-3">
              {baseSrc ? '作品暂时无法展出' : '暂无可用缩略图'}
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
