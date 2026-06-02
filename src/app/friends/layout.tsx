import type { Metadata } from 'next';

/**
 * 友情链接页面 SEO 元数据配置
 *
 * 功能说明：
 * 1. 设置独立的页面标题和描述，利于搜索引擎收录
 * 2. 配置 Open Graph 和 Twitter Card 用于社交媒体分享
 * 3. 展示友链交换信息
 */
export const metadata: Metadata = {
  /**
   * 页面标题
   */
  title: '友情链接',

  /**
   * 页面描述
   * 用于搜索引擎结果页展示
   */
  description: '心想事成的友情链接页面，展示互联网上的朋友们。欢迎交换友链，一起在这个广阔的世界中相遇、成长。',

  /**
   * 关键词
   * 帮助搜索引擎理解页面内容
   */
  keywords: ['友情链接', '友链', '朋友', '交换链接', '心想事成', '博客友链'],

  /**
   * Open Graph 配置
   * 用于社交媒体分享
   */
  openGraph: {
    title: '友情链接 | 心想事成的个人博客',
    description: '心想事成的友情链接页面，展示互联网上的朋友们。欢迎交换友链。',
    type: 'website',
  },

  /**
   * Twitter Card 配置
   */
  twitter: {
    card: 'summary',
    title: '友情链接 | 心想事成的个人博客',
    description: '心想事成的友情链接页面，展示互联网上的朋友们。欢迎交换友链。',
  },
};

/**
 * 友情链接页面布局组件
 * 用于包装友链页面的内容，提供 SEO 元数据支持
 */
export default function FriendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
