import React from 'react';
import { getServerChangelogs } from '@/utils/changelogUtils';
import ClientChangelogsPage from '@/components/changelogs/ClientChangelogsPage';
import type { Metadata } from 'next';

/**
 * 更新日志页面 SEO 元数据配置
 *
 * 功能说明：
 * 1. 设置独立的页面标题和描述，利于搜索引擎收录
 * 2. 配置 Open Graph 和 Twitter Card 用于社交媒体分享
 * 3. 展示博客开发历程和功能更新
 */
export const metadata: Metadata = {
  /**
   * 页面标题
   */
  title: '更新日志',

  /**
   * 页面描述
   * 用于搜索引擎结果页展示
   */
  description: '查看心想事成的个人博客更新日志，了解网站开发历程、功能更新、性能优化和Bug修复记录。',

  /**
   * 关键词
   * 帮助搜索引擎理解页面内容
   */
  keywords: ['更新日志', '开发日志', '版本记录', '功能更新', '心想事成', '博客开发'],

  /**
   * Open Graph 配置
   * 用于社交媒体分享
   */
  openGraph: {
    title: '更新日志 | 心想事成的个人博客',
    description: '查看心想事成的个人博客更新日志，了解网站开发历程和功能更新。',
    type: 'website',
  },

  /**
   * Twitter Card 配置
   */
  twitter: {
    card: 'summary',
    title: '更新日志 | 心想事成的个人博客',
    description: '查看心想事成的个人博客更新日志，了解网站开发历程和功能更新。',
  },
};

// 服务器端组件读取开发日志数据
const changelogs = getServerChangelogs();

// 服务器端组件导出
export default function ChangelogsPage() {
  return <ClientChangelogsPage changelogs={changelogs} />;
}
