import manifest from '@/data/blogImageManifest.json';
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

const images = (manifest as { images: Record<string, ResponsiveImageEntry> }).images;

/**
 * 按正文里的原始 public 路径查找构建期生成的响应式尺寸清单。
 *
 * 清单由 scripts/generate-responsive-images.js 生成，键与 Markdown /
 * coverImage 中的路径一致（形如 /Blogabout/xxx/1.png）。
 */
export function getResponsiveImageEntry(src?: string | null): ResponsiveImageEntry | null {
  if (!src) return null;
  return images[src] ?? null;
}

/**
 * 生成可直接交给 <img srcSet> 的候选串；没有变体时返回 undefined，
 * 浏览器会回退到 src 原图。
 */
export function buildResponsiveSrcSet(entry: ResponsiveImageEntry | null): string | undefined {
  if (!entry || entry.variants.length === 0) return undefined;
  return entry.variants
    .map(variant => `${getAssetPath(variant.path)} ${variant.width}w`)
    .join(', ');
}
