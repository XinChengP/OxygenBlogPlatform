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

  /*
    标题必须和页面 H1「相关链接」一致。
    此前写成了「友情链接」，与 /friends/ 的标题完全相同，
    两个页面在搜索结果里看起来是重复内容，容易被 Bing 合并或忽略。
  */
  title: '相关链接',
  description:
    '心想事成的相关链接与资源导航：收录常用的技术文档、设计素材、VOCALOID 与洛天依相关站点，方便按需查找，持续补充。',

  keywords: ['相关链接', '资源导航', '技术文档', '设计素材', '洛天依', 'VOCALOID'],

  openGraph: {
    title: '相关链接 | 心想事成的个人博客',
    description: '心想事成的相关链接与资源导航，收录常用技术文档、设计素材与 VOCALOID 站点。',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: '相关链接 | 心想事成的个人博客',
    description: '心想事成的相关链接与资源导航，收录常用技术文档、设计素材与 VOCALOID 站点。',
  },
};

export default function LinksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
