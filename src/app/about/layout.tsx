import type { Metadata } from 'next';

/**
 * 关于页面 SEO 元数据配置
 *
 * 功能说明：
 * 1. 设置独立的页面标题和描述，利于搜索引擎收录
 * 2. 配置 Open Graph 和 Twitter Card 用于社交媒体分享
 * 3. 展示博主个人信息和博客介绍
 */
export const metadata: Metadata = {
  /**
   * 页面标题
   */
  title: '关于我',

  /**
   * 页面描述
   * 用于搜索引擎结果页展示
   */
  description: '了解心想事成的个人信息、技术栈、兴趣爱好和联系方式。一个热爱洛天依、喜欢折腾技术的大学生。',

  /**
   * 关键词
   * 帮助搜索引擎理解页面内容
   */
  keywords: ['关于我', '个人介绍', '技术栈', '联系方式', '心想事成', '洛天依'],

  /**
   * Open Graph 配置
   * 用于社交媒体分享
   */
  openGraph: {
    title: '关于我 | 心想事成的个人博客',
    description: '了解心想事成的个人信息、技术栈、兴趣爱好和联系方式。',
    type: 'website',
  },

  /**
   * Twitter Card 配置
   */
  twitter: {
    card: 'summary',
    title: '关于我 | 心想事成的个人博客',
    description: '了解心想事成的个人信息、技术栈、兴趣爱好和联系方式。',
  },
};

/**
 * 关于页面布局组件
 * 用于包装关于页面的内容，提供 SEO 元数据支持
 */
export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
