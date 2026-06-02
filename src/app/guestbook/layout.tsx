import type { Metadata } from 'next';

/**
 * 留言板页面 SEO 元数据配置
 *
 * 功能说明：
 * 1. 设置独立的页面标题和描述，利于搜索引擎收录
 * 2. 配置 Open Graph 和 Twitter Card 用于社交媒体分享
 * 3. 鼓励访客留言互动
 */
export const metadata: Metadata = {
  /**
   * 页面标题
   */
  title: '留言板',

  /**
   * 页面描述
   * 用于搜索引擎结果页展示
   */
  description: '欢迎来到心想事成的留言板！在这里留下您的想法、建议或想说的话。基于 GitHub Discussions 的评论系统，支持 Markdown 格式。',

  /**
   * 关键词
   * 帮助搜索引擎理解页面内容
   */
  keywords: ['留言板', '留言', '评论', '互动', '心想事成', 'GitHub Discussions'],

  /**
   * Open Graph 配置
   * 用于社交媒体分享
   */
  openGraph: {
    title: '留言板 | 心想事成的个人博客',
    description: '欢迎来到心想事成的留言板！在这里留下您的想法、建议或想说的话。',
    type: 'website',
  },

  /**
   * Twitter Card 配置
   */
  twitter: {
    card: 'summary',
    title: '留言板 | 心想事成的个人博客',
    description: '欢迎来到心想事成的留言板！在这里留下您的想法、建议或想说的话。',
  },
};

/**
 * 留言板页面布局组件
 * 用于包装留言板页面的内容，提供 SEO 元数据支持
 */
export default function GuestbookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
