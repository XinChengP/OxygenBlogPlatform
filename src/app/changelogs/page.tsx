import React from 'react';
import { getServerChangelogs } from '@/utils/changelogUtils';
import ClientChangelogsPage from '@/components/changelogs/ClientChangelogsPage';
import type { Metadata } from 'next';
// 日志正文在构建期由 rehype-highlight 生成 hljs-* 类名。
// 博客详情页已有同样的页面级引入；这里不引入的话，直接访问 /changelogs
// 展开含代码块的日志时没有任何高亮主题样式。
import 'highlight.js/styles/github-dark.css';

/**
 * 开发日志页面 SEO 元数据配置
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
  title: '开发日志',

  /**
   * 页面描述
   * 用于搜索引擎结果页展示
   */
  description: '查看心想事成的个人博客开发日志，了解网站开发历程、功能更新、性能优化和Bug修复记录。',

  /**
   * 关键词
   * 帮助搜索引擎理解页面内容
   */
  keywords: ['开发日志', '更新日志', '版本记录', '功能更新', '心想事成', '博客开发'],

  /**
   * Open Graph 配置
   * 用于社交媒体分享
   */
  openGraph: {
    title: '开发日志 | 心想事成的个人博客',
    description: '查看心想事成的个人博客开发日志，了解网站开发历程和功能更新。',
    type: 'website',
  },

  /**
   * Twitter Card 配置
   */
  twitter: {
    card: 'summary',
    title: '开发日志 | 心想事成的个人博客',
    description: '查看心想事成的个人博客开发日志，了解网站开发历程和功能更新。',
  },
};

// 服务器端组件读取开发日志数据
const changelogs = getServerChangelogs();

// 服务器端组件导出
export default function ChangelogsPage() {
  // 构建/服务端渲染时间：作为“本月”统计的固定基准，避免静态 HTML 与客户端相隔月份时水合不一致
  const serverRenderedAt = new Date().toISOString();

  /*
    正文由 scripts/generate-changelog-html.tsx 在构建期渲染成独立 HTML 片段，
    页面初始只下发日志元数据；这里把 content 置空，避免 RSC 重复携带全文。
    图表组件仍按 Changelog 类型接收数据，因此保留 content 字段。
  */
  const changelogsWithoutContent = changelogs.map(changelog => ({
    ...changelog,
    content: '',
  }));

  return (
    <ClientChangelogsPage
      changelogs={changelogsWithoutContent}
      generatedAt={serverRenderedAt}
    />
  );
}
