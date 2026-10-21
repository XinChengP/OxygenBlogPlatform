'use client';

import React from 'react';
import { getAssetPath } from '@/utils/assetUtils';
import { getResponsiveImageEntry } from '@/utils/blogResponsiveImage';
import { buildResponsiveSrcSet } from '@/utils/responsiveImage';

interface ManifestImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** 原始 public 路径（以 / 开头）或完整外链 */
  src: string;
  /**
   * <img sizes>，仅在存在响应式变体时生效；
   * 用于告诉浏览器实际占位宽度，让它避免下载过大的档位
   */
  sizes: string;
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
  alt = '',
  loading = 'lazy',
  decoding = 'async',
  ...rest
}: ManifestImageProps) {
  const entry = getResponsiveImageEntry(typeof src === 'string' ? src : null);
  const srcSet = buildResponsiveSrcSet(entry);
  const processedSrc =
    typeof src === 'string' && !src.startsWith('http') && !src.startsWith('data:')
      ? getAssetPath(src)
      : src;

  return (
    <img
      src={processedSrc}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      width={entry?.width}
      height={entry?.height}
      alt={alt}
      loading={loading}
      decoding={decoding}
      {...rest}
    />
  );
}
