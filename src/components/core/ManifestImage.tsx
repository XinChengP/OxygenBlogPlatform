'use client';

import React from 'react';
import { getAssetPath } from '@/utils/assetUtils';
import { getResponsiveImageEntry } from '@/utils/blogResponsiveImage';
import { buildResponsiveSrcSet } from '@/utils/responsiveImage';
import { useResponsiveImageFallback } from '@/hooks/useResponsiveImageFallback';

interface ManifestImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** 原始 public 路径（以 / 开头）或完整外链 */
  src: string;
  /**
   * <img sizes>，仅在存在响应式变体时生效；
   * 用于告诉浏览器实际占位宽度，让它避免下载过大的档位
   */
  sizes: string;
  /**
   * 固定使用清单中指定宽度的变体，不再参与 srcset 选档。
   * 用于「页面门面」类图片：希望无论视口/DPR 如何都稳定使用同一档。
   */
  fixedVariantWidth?: number;
}

/**
 * 基于构建期图片清单的响应式 <img>
 *
 * 与 BlogArticleImage 的区别：
 * - 本组件面向页面配置区（博客列表卡片、About 页封面、Moments 网格），
 *   不参与文章灯箱；
 * - 清单中没有条目时（外链、SVG）退化为普通 <img>，与原有行为一致。
 *
 * 清单由 scripts/generate-responsive-images.js 生成，键为
 * Markdown / 配置中的原始 public 路径；GIF 会生成保留动画的 WebP 变体。
 */
export default function ManifestImage({
  src,
  sizes,
  fixedVariantWidth,
  alt = '',
  loading = 'lazy',
  decoding = 'async',
  ...rest
}: ManifestImageProps) {
  const entry = getResponsiveImageEntry(typeof src === 'string' ? src : null);
  /*
    固定档位模式：直接指向清单中该宽度的变体，不输出 srcset。
    这样浏览器不会再按 sizes/DPR 重新选档，切换/重挂载时也不会换图。
    指定档位缺失时退回该图最大的一档，至少比原图小。
  */
  const fixedVariant =
    fixedVariantWidth && entry
      ? entry.variants.find(variant => variant.width === fixedVariantWidth) ??
        entry.variants[entry.variants.length - 1]
      : null;
  const srcSet = fixedVariant ? undefined : buildResponsiveSrcSet(entry);
  // 原图地址：站内路径补 basePath，外链/data 保持原样。变体 404 时回退到这里
  const originalSrc =
    typeof src === 'string' && !src.startsWith('http') && !src.startsWith('data:')
      ? getAssetPath(src)
      : src;
  const processedSrc = fixedVariant ? getAssetPath(fixedVariant.path) : originalSrc;

  /*
    固定档位模式不输出 srcset，但 src 直接指向变体文件，同样可能 404，
    因此把「存在变体引用」显式传给 hook（fixedVariant 或 srcSet 二者有其一）。
  */
  const {
    failed,
    srcSet: finalSrcSet,
    sizes: finalSizes,
    imgKey,
    imgRef,
    onError: handleImageError,
  } = useResponsiveImageFallback(srcSet, srcSet ? sizes : undefined, Boolean(fixedVariant || srcSet));

  return (
    <img
      // 变体失败后 key 变化会重建元素，确保浏览器重新请求原图
      key={imgKey}
      ref={imgRef}
      // 失败后改用原图；固定档位模式失败也回到原图，而不是继续指向缺失的变体
      src={failed ? originalSrc : processedSrc}
      srcSet={finalSrcSet}
      sizes={finalSizes}
      // 回退原图时宽高改用清单里的原图尺寸，避免沿用变体档位尺寸造成比例偏差
      width={failed ? entry?.width : (fixedVariant?.width ?? entry?.width)}
      height={failed ? entry?.height : (fixedVariant?.height ?? entry?.height)}
      alt={alt}
      loading={loading}
      decoding={decoding}
      {...rest}
      // 放在 ...rest 之后：调用方透传的同名属性不会覆盖兜底逻辑
      onError={handleImageError}
    />
  );
}
