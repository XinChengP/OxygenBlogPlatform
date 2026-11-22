import { getStudyLogList, getMaimemoStats, getMaimemoTokenStatus } from '@/actions/studyLogActions';
import StudyManageClient from './StudyManageClient';
import type { StudyLog, StudyStats } from '@/types/studyLog';
import type { MaimemoStats, MaimemoTokenStatus } from '@/types/maimemo';

/**
 * 学习打卡管理页面（服务端组件）
 *
 * 负责获取初始数据并传递给客户端组件
 * 注意：在静态导出模式下，actions 被替换为空实现，此处回退到空数据
 */
export default async function StudyManagePage() {
  const [logResult, tokenStatusResult, maimemoResult] = await Promise.all([
    getStudyLogList(),
    getMaimemoTokenStatus(),
    getMaimemoStats(),
  ]);

  const logs: StudyLog[] = logResult.success && logResult.data ? logResult.data.logs : [];
  const stats: StudyStats = logResult.success && logResult.data
    ? logResult.data.stats
    : { totalDays: 0, totalMinutes: 0, currentStreak: 0, longestStreak: 0, subjectTotals: [], dayMinutes: {} };

  const tokenStatus: MaimemoTokenStatus =
    tokenStatusResult.success && tokenStatusResult.data
      ? tokenStatusResult.data
      : { configured: false, source: 'none' };

  const maimemo: MaimemoStats | null =
    maimemoResult.success && maimemoResult.data ? maimemoResult.data : null;

  return (
    <StudyManageClient
      initialLogs={logs}
      initialStats={stats}
      initialTokenStatus={tokenStatus}
      initialMaimemo={maimemo}
    />
  );
}

// 静态导出配置
export const dynamic = 'force-static';
export const revalidate = false;
