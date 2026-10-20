'use client';

import { useState } from 'react';
import { getAssetPath } from '@/utils/assetUtils';
import type { PreviewImage } from '@/types/gallery';
import { isVideoUrl, type MarkdownImgProps } from '@/components/blogs/BlogMarkdownBase';
import { useBlogArticleAssets } from '@/components/blogs/BlogArticleContext';
import {
  buildResponsiveSrcSet,
  getResponsiveImageEntry,
} from '@/utils/responsiveImage';

/**
 * 博客正文图片（客户端交互件）
 *
 * 正文由服务端构建期渲染，本组件以客户端组件身份嵌入：
 * - 渲染时是普通 <img>，因此图片直接出现在静态 HTML 中（SEO 可见）
 * - 水合后把图片注册进文章灯箱列表，点击可放大并左右切换
 * - 构建期为每张图生成 640/1280/1920 WebP 变体，按视口选择，
 *   手机不再下载并解码 4000px 以上的原图
 */
export default function BlogArticleImage({ src, alt, node, ...props }: MarkdownImgProps) {
  // node 是 react-markdown 注入的 hast 节点引用，解构出来弃置，
  // 避免随 ...props 展开成 DOM 属性（node="[object Object]"）
  const { imageSrcSetRef, articleImagesRef, onImageClick } = useBlogArticleAssets();

  /*
    清单键使用未加 basePath 的原始路径；getAssetPath 只负责部署前缀，
    若用它查清单，在非根路径部署时会查不到。
  */
  const responsiveEntry = getResponsiveImageEntry(typeof src === 'string' ? src : null);

  /*
    有清单尺寸时首帧就能确定横竖图，SSR HTML 与首屏布局直接正确；
    没有清单（外链、SVG 等）时仍用原来的 onLoad 探测兜底。
  */
  const [detectedLandscape, setDetectedLandscape] = useState(false);
  const isLandscape = responsiveEntry
    ? responsiveEntry.width > responsiveEntry.height
    : detectedLandscape;

  // 处理 GitHub Pages 基础路径
  const processedSrc = typeof src === 'string' && src ? getAssetPath(src) : src;
  const responsiveSrcSet = buildResponsiveSrcSet(responsiveEntry);
  const responsiveSizes = responsiveEntry
    ? responsiveEntry.width > responsiveEntry.height
      ? '(max-width: 768px) 100vw, 896px'
      : '(max-width: 480px) 100vw, 400px'
    : undefined;

  // 如果处理后的地址是视频文件，则使用 video 标签渲染
  // 视频不加入文章图片灯箱，也不支持点击放大
  if (typeof processedSrc === 'string' && isVideoUrl(processedSrc)) {
    return (
      <>
        <video
          src={processedSrc}
          controls
          preload="metadata"
          className="rounded-xl shadow-lg mx-auto h-auto my-4 max-w-full block"
        >
          您的浏览器不支持视频播放，请
          <a href={processedSrc} className="text-primary underline">下载视频</a>
          查看。
        </video>
        {alt && (
          // 使用 em 标签显示视频描述，样式与图片描述保持一致
          <em className="block text-sm text-muted-foreground mt-2 mb-4 italic text-center">{alt}</em>
        )}
      </>
    );
  }

  // 按出现顺序收集文章内图片到灯箱列表（保持渲染期收集）
  // 必须在渲染期而非 useEffect：ClientBlogDetail 在 slug 变化时会于渲染阶段
  // 清空列表，子组件随后渲染并重新注册；若放在 effect 里，父组件的 effect
  // 晚于子组件渲染执行，会把刚注册的图片全部抹掉，灯箱列表将永远为空。
  // imageSrcSetRef 去重保证 StrictMode 双渲染 / 重复挂载不会重复收集。
  if (typeof processedSrc === 'string' && processedSrc && !imageSrcSetRef.current.has(processedSrc)) {
    imageSrcSetRef.current.add(processedSrc);
    articleImagesRef.current.push({
      id: `blog-img-${articleImagesRef.current.length}`,
      src: processedSrc,
      alt: alt || '图片',
    });
  }

  const handleImageClick = () => {
    if (typeof processedSrc !== 'string') return;
    const existingImage = articleImagesRef.current.find(
      (img) => img.src === processedSrc
    );
    if (existingImage) {
      onImageClick(existingImage);
    }
  };

  return (
    // 使用 React.Fragment 避免添加额外元素，防止在 p 标签内嵌套块级元素
    <>
      <img
        src={processedSrc}
        srcSet={responsiveSrcSet}
        sizes={responsiveSizes}
        width={responsiveEntry?.width}
        height={responsiveEntry?.height}
        alt={alt || '图片'}
        className={`rounded-xl shadow-lg mx-auto h-auto my-4 cursor-pointer hover:opacity-90 transition-opacity ${
          isLandscape ? 'max-w-full' : 'max-w-[400px]'
        }`}
        loading="lazy"
        decoding="async"
        // 有构建期尺寸时不再需要 onLoad 探测；外链/无清单图片仍走兜底
        onLoad={(e) => {
          if (responsiveEntry) return;
          const target = e.currentTarget;
          setDetectedLandscape(target.naturalWidth > target.naturalHeight);
        }}
        onClick={handleImageClick}
        role="button"
        tabIndex={0}
        aria-label={`查看大图：${alt || '图片'}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleImageClick();
          }
        }}
        {...props}
      />
      {alt && (
        // 使用 em 标签显示图片描述，避免嵌套块级元素
        <em className="block text-sm text-muted-foreground mt-2 mb-4 italic text-center">{alt}</em>
      )}
    </>
  );
}
