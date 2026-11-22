import type { Metadata } from 'next';
import { siteUrl } from '@/utils/blogScanner';

/*
  links 页面本体是客户端组件（'use client'）无法导出 metadata，
  按 about/friends/guestbook/tools 的既有模式通过嵌套 layout 提供。
*/
export const metadata: Metadata = {
  /*
    页面级 canonical：声明本页规范地址，
    避免搜索引擎把带查询参数的访问形式识别为重复页面。
  */
  alternates: {
    canonical: siteUrl('/links/'),
  },

  title: '友情链接',
  description: '心想的博客朋友们：个人网站与技术博客的友链导航。',
};

export default function LinksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
