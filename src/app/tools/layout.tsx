import type { Metadata } from 'next';

/**
 * 小工具页面 SEO 元数据配置
 *
 * 功能说明：
 * 1. 设置独立的页面标题和描述，利于搜索引擎收录
 * 2. 配置 Open Graph 和 Twitter Card 用于社交媒体分享
 * 3. 展示博客提供的实用工具
 */
export const metadata: Metadata = {
  /**
   * 页面标题
   */
  title: '小工具',

  /**
   * 页面描述
   * 用于搜索引擎结果页展示
   */
  description: '心想事成的实用小工具集合，包含拼音转换器、Markdown编辑器、洛克王国队伍分析等多种工具。免费使用，无需注册。',

  /**
   * 关键词
   * 帮助搜索引擎理解页面内容
   */
  keywords: ['小工具', '实用工具', '拼音转换', 'Markdown编辑器', '心想事成', '在线工具'],

  /**
   * Open Graph 配置
   * 用于社交媒体分享
   */
  openGraph: {
    title: '小工具 | 心想事成的个人博客',
    description: '心想事成的实用小工具集合，包含拼音转换器、Markdown编辑器等多种工具。',
    type: 'website',
  },

  /**
   * Twitter Card 配置
   */
  twitter: {
    card: 'summary',
    title: '小工具 | 心想事成的个人博客',
    description: '心想事成的实用小工具集合，包含拼音转换器、Markdown编辑器等多种工具。',
  },
};

/**
 * 小工具页面布局组件
 * 用于包装工具页面的内容，提供 SEO 元数据支持
 */
export default function ToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
