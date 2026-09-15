'use client';

import dynamic from 'next/dynamic';

// 动态导入 ClientBlogDetail 组件，禁用 SSR 以避免 useContext 错误
const ClientBlogDetail = dynamic(() => import('./ClientBlogDetail'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">加载文章中...</p>
      </div>
    </div>
  )
});

interface BlogPost {
  title: string;
  date: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  readTime: number;
  excerpt: string;
  content: string;
  slug: string;
  author?: string;
  series?: string;
  seriesOrder?: number;
  coverImage?: string;
  language?: string;
  canonicalUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  reference?: Array<{description: string; link: string}>;
  hidden?: boolean;
}

interface SeriesArticle {
  title: string;
  slug: string;
  seriesOrder: number;
  date: string;
}

/**
 * 相关文章条目接口
 *
 * 与 SeriesArticle 的区别：系列导航只关心「标题 + 顺序」，
 * 而相关文章卡片要展示分类、摘要与阅读时长，因此需要携带更多字段。
 * 类型定义与 page.tsx、客户端组件保持一致，避免三处结构漂移。
 */
interface RelatedPost {
  title: string;
  slug: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  readTime: number;
  coverImage?: string;
  series?: string;
}

interface BlogDetailWrapperProps {
  blog: BlogPost;
  seriesArticles: SeriesArticle[];
  /**
   * 相关文章推荐列表
   *
   * 由服务端在构建期完成打分与排序后传入，客户端只负责展示与分批切换。
   * 设成可选是为了兼容可能的直接调用场景，缺失时组件内部会自行跳过该区域。
   */
  relatedArticles?: RelatedPost[];
}

/**
 * 博客详情包装组件
 * 
 * 这是一个客户端组件，用于包装 ClientBlogDetail 组件
 * 使用动态导入禁用 SSR，以避免 Next.js 16 + React 19 的 useContext 错误
 */
export default function BlogDetailWrapper({
  blog,
  seriesArticles,
  relatedArticles = [],
}: BlogDetailWrapperProps) {
  return (
    <ClientBlogDetail
      blog={blog}
      seriesArticles={seriesArticles}
      relatedArticles={relatedArticles}
    />
  );
}
