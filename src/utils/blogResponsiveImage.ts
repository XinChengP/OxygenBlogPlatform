import blogImageManifest from '@/data/blogImageManifest.json';
import type { ResponsiveImageEntry } from '@/utils/responsiveImage';

const images = (blogImageManifest as { images: Record<string, ResponsiveImageEntry> }).images;

/**
 * 按正文里的原始 public 路径查找构建期生成的博客图片尺寸清单。
 *
 * 清单由 scripts/generate-responsive-images.js 生成，键与 Markdown /
 * coverImage 中的路径一致（形如 /Blogabout/xxx/1.png）。
 */
export function getResponsiveImageEntry(src?: string | null): ResponsiveImageEntry | null {
  if (!src) return null;
  return images[src] ?? null;
}
