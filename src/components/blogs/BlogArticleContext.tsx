'use client';

import { createContext, useContext } from 'react';
import type { PreviewImage } from '@/types/gallery';

interface BlogArticleAssets {
  /** 文章内已出现过的图片地址集合，用于防止重复收集 */
  imageSrcSetRef: React.MutableRefObject<Set<string>>;
  /** 按出现顺序收集的文章图片列表，供灯箱左右切换使用 */
  articleImagesRef: React.MutableRefObject<PreviewImage[]>;
  /** 文章内所有 iframe 元素引用，供卸载时统一清理 */
  iframeRefs: React.MutableRefObject<Array<HTMLIFrameElement | null>>;
  /** 点击图片时打开灯箱的回调 */
  onImageClick: (image: PreviewImage) => void;
}

/**
 * 博客正文内交互资源上下文
 *
 * 正文由服务端组件（ServerBlogMarkdown）在构建期渲染，
 * 其中图片、iframe 等交互元素是独立的客户端组件，无法通过 props
 * 从服务端接收函数或 ref，只能经由本 Context 从详情页取得。
 * Provider 挂在 ClientBlogDetail 内，服务端渲染的子树插入其下即可共享。
 */
const BlogArticleContext = createContext<BlogArticleAssets | null>(null);

export function BlogArticleProvider({
  value,
  children,
}: {
  value: BlogArticleAssets;
  children: React.ReactNode;
}) {
  return (
    <BlogArticleContext.Provider value={value}>
      {children}
    </BlogArticleContext.Provider>
  );
}

export function useBlogArticleAssets(): BlogArticleAssets {
  const assets = useContext(BlogArticleContext);
  if (!assets) {
    throw new Error('useBlogArticleAssets 必须在 BlogArticleProvider 内使用');
  }
  return assets;
}
