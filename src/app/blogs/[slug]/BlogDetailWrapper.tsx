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

interface BlogDetailWrapperProps {
  blog: BlogPost;
}

/**
 * 博客详情包装组件
 * 
 * 这是一个客户端组件，用于包装 ClientBlogDetail 组件
 * 使用动态导入禁用 SSR，以避免 Next.js 16 + React 19 的 useContext 错误
 */
export default function BlogDetailWrapper({ blog }: BlogDetailWrapperProps) {
  return <ClientBlogDetail blog={blog} />;
}
