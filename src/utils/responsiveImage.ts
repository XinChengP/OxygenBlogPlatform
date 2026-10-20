import { getAssetPath } from '@/utils/assetUtils';

export interface ResponsiveImageVariant {
  width: number;
  height: number;
  path: string;
}

export interface ResponsiveImageEntry {
  width: number;
  height: number;
  variants: ResponsiveImageVariant[];
}

/**
 * 生成可直接交给 <img srcSet> 的候选串；没有变体时返回 undefined，
 * 浏览器会回退到 src 原图。
 *
 * 这里刻意不导入任何图片清单：BackgroundLayer 是全局组件，
 * 不能让博客图片清单（59KB）跟着进入全站首载包。
 */
export function buildResponsiveSrcSet(entry: ResponsiveImageEntry | null): string | undefined {
  if (!entry || entry.variants.length === 0) return undefined;
  return entry.variants
    .map(variant => `${getAssetPath(variant.path)} ${variant.width}w`)
    .join(', ');
}
