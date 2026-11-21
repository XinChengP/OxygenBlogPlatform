import blogImageManifest from '@/data/blogImageManifest.json';
import type { ResponsiveImageEntry } from '@/utils/responsiveImage';

const images = (blogImageManifest as { images: Record<string, ResponsiveImageEntry> }).images;

/**
 * 按正文里的原始 public 路径查找构建期生成的博客图片尺寸清单。
 *
 * 清单由 scripts/generate-responsive-images.js 生成，键与 Markdown /
 * coverImage 中的路径一致（形如 /Blogabout/xxx/1.png）。
 *
 * 必须做解码兜底的原因：
 * react-markdown 会对 Markdown 语法图片的地址做百分号编码
 * （/Blogabout/中文.webp → /Blogabout/%E4%B8%AD%E6%96%87.webp），
 * 而清单键是生成脚本用解码后的原始路径写入的。
 * 若直接拿编码后的字符串查表，中文文件名的图片会永远 miss：
 * 组件拿不到 variants，就不输出 srcset、也不输出宽高，
 * 最终浏览器加载的仍然是原图（构建生成的 WebP 被白白浪费）。
 * 手写 HTML <img> 的地址不经过该编码，所以此前只有部分图片正常。
 */
export function getResponsiveImageEntry(src?: string | null): ResponsiveImageEntry | null {
  if (!src) return null;

  // 先按原样查：未编码的路径（手写 HTML <img>、frontmatter 封面）走这里
  if (images[src]) return images[src];

  // 生成脚本会剥离查询串与哈希，这里同步处理后再查一次
  const withoutQuery = src.replace(/[?#].*$/, '');
  if (images[withoutQuery]) return images[withoutQuery];

  // 百分号编码还原（中文文件名的主要场景）
  try {
    return images[decodeURI(withoutQuery)] ?? null;
  } catch {
    // 路径里存在非法百分号序列时保持原样返回，避免解码抛错中断渲染
    return null;
  }
}
