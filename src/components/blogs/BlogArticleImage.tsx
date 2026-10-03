'use client';

import { useEffect, useState } from 'react';
import { getAssetPath } from '@/utils/assetUtils';
import type { PreviewImage } from '@/types/gallery';
import { isVideoUrl, type MarkdownImgProps } from '@/components/blogs/BlogMarkdownBase';
import { useBlogArticleAssets } from '@/components/blogs/BlogArticleContext';

/**
 * 博客正文图片（客户端交互件）
 *
 * 正文由服务端构建期渲染，本组件以客户端组件身份嵌入：
 * - 渲染时是普通 <img>，因此图片直接出现在静态 HTML 中（SEO 可见）
 * - 水合后把图片注册进文章灯箱列表，点击可放大并左右切换
 * - 通过 onLoad 获取自然尺寸，横图放宽限制、竖图限宽 400px
 */
export default function BlogArticleImage({ src, alt, node, ...props }: MarkdownImgProps) {
  // node 是 react-markdown 注入的 hast 节点引用，解构出来弃置，
  // 避免随 ...props 展开成 DOM 属性（node="[object Object]"）
  const { imageSrcSetRef, articleImagesRef, onImageClick } = useBlogArticleAssets();
  const [isLandscape, setIsLandscape] = useState(false);

  // 处理 GitHub Pages 基础路径
  const processedSrc = typeof src === 'string' && src ? getAssetPath(src) : src;

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

  // 按出现顺序收集文章内图片到灯箱列表
  // 原实现写在渲染期（StrictMode 下会重复收集），现移到挂载后执行一次；
  // 点击事件只可能发生在水合之后，注册时序等价
  useEffect(() => {
    if (typeof processedSrc !== 'string' || !processedSrc) return;
    if (imageSrcSetRef.current.has(processedSrc)) return;

    imageSrcSetRef.current.add(processedSrc);
    articleImagesRef.current.push({
      id: `blog-img-${articleImagesRef.current.length}`,
      src: processedSrc,
      alt: alt || '图片',
    });
  }, [processedSrc, alt, imageSrcSetRef, articleImagesRef]);

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
        alt={alt || '图片'}
        className={`rounded-xl shadow-lg mx-auto h-auto my-4 cursor-pointer hover:opacity-90 transition-opacity ${
          isLandscape ? 'max-w-full' : 'max-w-[400px]'
        }`}
        loading="lazy"
        // 使用 img 标签自身的 onLoad 事件获取自然尺寸，避免 new Image() 产生额外预加载请求
        onLoad={(e) => {
          const target = e.currentTarget;
          setIsLandscape(target.naturalWidth > target.naturalHeight);
        }}
        onClick={handleImageClick}
        {...props}
      />
      {alt && (
        // 使用 em 标签显示图片描述，避免嵌套块级元素
        <em className="block text-sm text-muted-foreground mt-2 mb-4 italic text-center">{alt}</em>
      )}
    </>
  );
}
