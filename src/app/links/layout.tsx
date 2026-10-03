import type { Metadata } from 'next';

/*
  links 页面本体是客户端组件（'use client'）无法导出 metadata，
  按 about/friends/guestbook/tools 的既有模式通过嵌套 layout 提供。
*/
export const metadata: Metadata = {
  title: '友情链接',
  description: '心想的博客朋友们：个人网站与技术博客的友链导航。',
};

export default function LinksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
