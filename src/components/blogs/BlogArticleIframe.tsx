'use client';

import React, { Suspense, lazy } from 'react';
import { useBlogArticleAssets } from '@/components/blogs/BlogArticleContext';

type MarkdownIframeProps = React.ComponentPropsWithoutRef<'iframe'> & {
  node?: unknown;
  allowfullscreen?: boolean | string;
};

// 懒加载 BilibiliIframe 组件
const BilibiliIframe = lazy(() => import('@/components/BilibiliIframe'));

/**
 * 博客正文内嵌 iframe（客户端交互件）
 *
 * 正文由服务端构建期渲染，普通 iframe 的 HTML 会直接进入静态产物；
 * ref 注册与 B 站播放器的懒加载属于客户端行为，集中在本组件内。
 */
export default function BlogArticleIframe({
  src,
  allowfullscreen,
  node,
  ...props
}: MarkdownIframeProps) {
  // node 为 react-markdown 注入的 hast 节点引用，解构弃置避免泄漏进 DOM 属性
  const { iframeRefs } = useBlogArticleAssets();

  // 将字符串 "true" 转换为布尔值 true，确保传递布尔值给React属性
  const shouldAllowFullScreen = allowfullscreen === 'true' || allowfullscreen === true;

  // B站视频特殊处理 - 使用专用组件处理
  const isBilibiliVideo = src?.includes('player.bilibili.com');

  if (isBilibiliVideo && src) {
    return (
      <Suspense fallback={
        <div className="my-8 rounded-xl overflow-hidden shadow-lg bg-muted flex items-center justify-center h-64 md:h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-muted-foreground">B站视频加载中...</p>
          </div>
        </div>
      }>
        <BilibiliIframe
          src={src}
          allowFullScreen={shouldAllowFullScreen}
        />
      </Suspense>
    );
  }

  // 普通iframe处理
  return (
    <div className="my-8 rounded-xl overflow-hidden shadow-lg">
      <iframe
        src={src}
        {...(shouldAllowFullScreen ? { allowFullScreen: true } : {})}
        {...props}
        className="w-full h-64 md:h-96 border-0"
        // 添加ref来跟踪iframe元素
        ref={(el) => {
          if (el) {
            iframeRefs.current.push(el);
          }
        }}
      />
    </div>
  );
}
