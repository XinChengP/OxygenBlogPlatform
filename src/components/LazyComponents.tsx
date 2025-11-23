'use client';

import dynamic from 'next/dynamic';

// 动态导入大型组件，优化初始加载性能
export const LazyGiscusComments = dynamic(
  () => import('@/components/GiscusComments').then(mod => mod.default),
  {
    loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg" />,
    ssr: false,
  }
);

export const LazyTableOfContents = dynamic(
  () => import('@/components/TableOfContents').then(mod => mod.default),
  {
    loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg" />,
    ssr: false,
  }
);

export const LazyScrollToTop = dynamic(
  () => import('@/components/ScrollToTop').then(mod => mod.default),
  {
    loading: () => null,
    ssr: false,
  }
);

export const LazyCopyrightNotice = dynamic(
  () => import('@/components/CopyrightNotice').then(mod => mod.default),
  {
    loading: () => <div className="text-center text-sm text-gray-500 dark:text-gray-400">加载中...</div>,
    ssr: false,
  }
);

export const LazySyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then(mod => mod.Prism),
  {
    loading: () => <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">代码加载中...</div>,
    ssr: false,
  }
);

export const LazyParticlesBackground = dynamic(
  () => import('@/components/BackgroundLayer').then(mod => mod.default),
  {
    loading: () => null,
    ssr: false,
  }
);

export const LazyLuoTianyiLive2D = dynamic(
  () => import('@/components/LuoTianyiLive2D').then(mod => mod.default),
  {
    loading: () => null,
    ssr: false,
  }
);

export const LazyMusicPlayer = dynamic(
  () => import('@/components/MusicPlayer').then(mod => mod.default),
  {
    loading: () => null,
    ssr: false,
  }
);

export const LazyTimeline = dynamic(
  () => import('@/components/ui/timeline').then(mod => mod.Timeline),
  {
    loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-96 rounded-lg" />,
    ssr: false,
  }
);

export const LazyRelatedLinks = dynamic(
  () => import('@/components/RelatedLinks').then(mod => mod.default),
  {
    loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg" />,
    ssr: false,
  }
);