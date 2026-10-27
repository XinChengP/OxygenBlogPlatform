import React from 'react';
import { getServerStudyLogs, computeStudyStats } from '@/utils/studyLogUtils';
import { getServerMaimemoStats } from '@/utils/maimemoSync';
import MomentMarkdown from '@/components/moments/MomentMarkdown';
import ClientStudyPage from '@/components/study/ClientStudyPage';
import type { Metadata } from 'next';

/**
 * 学习打卡页面 SEO 元数据配置
 *
 * 功能说明：
 * 1. 设置独立的页面标题和描述，利于搜索引擎收录
 * 2. 配置 Open Graph 和 Twitter Card 用于社交媒体分享
 * 3. 展示 CAD / SolidWorks 等软件学习的每日打卡记录
 */
export const metadata: Metadata = {
  /**
   * 页面标题
   */
  title: '学习打卡',

  /**
   * 页面描述
   * 用于搜索引擎结果页展示
   */
  description: '心想事成的每日学习打卡记录：CAD 制图、SolidWorks 建模等软件学习历程，包含打卡热力图、连续天数与学习时长统计。',

  /**
   * 关键词
   * 帮助搜索引擎理解页面内容
   */
  keywords: ['学习打卡', '学习记录', 'CAD', 'SolidWorks', '热力图', '心想事成', '洛天依'],

  /**
   * Open Graph 配置
   * 用于社交媒体分享
   */
  openGraph: {
    title: '学习打卡 | 心想事成的个人博客',
    description: '心想事成的每日学习打卡记录，见证每一天的积累。',
    type: 'website',
  },

  /**
   * Twitter Card 配置
   */
  twitter: {
    card: 'summary',
    title: '学习打卡 | 心想事成的个人博客',
    description: '心想事成的每日学习打卡记录，见证每一天的积累。',
  },
};

// 构建期读取学习打卡数据
const logs = getServerStudyLogs();
const stats = computeStudyStats(logs);

// 服务器端组件导出
export default async function StudyPage() {
  // 与动态页一致：构建期把 Markdown 渲染成 ReactNode，客户端不再加载 Markdown 解析栈
  const logsWithContent = logs.map(log => ({
    ...log,
    content: '',
    renderedContent: <MomentMarkdown content={log.content} />,
  }));

  // 墨墨背单词数据（未同步过时为 null，前台不展示卡片）
  const maimemoStats = await getServerMaimemoStats();

  return <ClientStudyPage logs={logsWithContent} stats={stats} maimemoStats={maimemoStats} />;
}
