'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarCheck, Flame, Trophy, Clock, BookOpen } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import DeferredMount from '@/components/core/DeferredMount';
import HeatmapCalendar from './HeatmapCalendar';
import StudyTrendChart from './StudyTrendChart';
import { containerVariants } from '@/utils/animationVariants';
import type { StudyLog, StudyStats, StudyMood } from '@/types/studyLog';
import type { MaimemoStats } from '@/types/maimemo';
import MaimemoCard from './MaimemoCard';

/**
 * 学习打卡页面（客户端）
 *
 * 服务端在构建期读取打卡记录并渲染好 Markdown 正文，
 * 这里只负责统计展示：热力图、统计卡片、科目分布与时间线。
 *
 * 注意：不要从 @/utils/studyLogUtils 导入任何东西，那个文件顶层引入了
 * fs/path，会破坏浏览器端打包。
 */

/** 分钟数格式化为「X 小时 Y 分钟」 */
function formatStudyMinutes(minutes: number): string {
  if (minutes <= 0) return '0 分钟';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} 分钟`;
  if (rest === 0) return `${hours} 小时`;
  return `${hours} 小时 ${rest} 分钟`;
}

interface ClientStudyPageProps {
  /** 打卡记录，按日期倒序，正文已由服务端渲染 */
  logs: StudyLog[];
  /** 汇总统计 */
  stats: StudyStats;
  /** 墨墨背单词数据快照（未同步时为 null，不展示卡片） */
  maimemoStats?: MaimemoStats | null;
}

/** 心情对应的表情与文案 */
const MOOD_CONFIG: Record<StudyMood, { emoji: string; label: string }> = {
  great: { emoji: '🤩', label: '超有状态' },
  good: { emoji: '😊', label: '状态不错' },
  normal: { emoji: '🙂', label: '一般般' },
  hard: { emoji: '😮‍💨', label: '有点吃力' },
};

const WEEKDAYS_CN = ['日', '一', '二', '三', '四', '五', '六'];

/** 2026-10-26 → 2026 年 10 月 26 日 · 周一 */
function formatDateCN(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  const weekday = WEEKDAYS_CN[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${y} 年 ${m} 月 ${d} 日 · 周${weekday}`;
}

export default function ClientStudyPage({ logs, stats, maimemoStats }: ClientStudyPageProps) {
  // 今天是否已打卡：只在客户端取当前日期，避免静态导出时的水合不一致
  const [todayStr, setTodayStr] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    setTodayStr(`${now.getFullYear()}-${m}-${d}`);
  }, []);

  const todayNotCheckedIn = todayStr !== null && logs.length > 0 && stats.dayMinutes[todayStr] === undefined;

  // 科目分布条的最大时长，用于计算百分比宽度
  const maxSubjectMinutes = Math.max(1, ...stats.subjectTotals.map(subject => subject.minutes));

  const statCards = [
    { icon: CalendarCheck, label: '累计打卡', value: `${stats.totalDays}`, unit: '天' },
    { icon: Flame, label: '连续打卡', value: `${stats.currentStreak}`, unit: '天' },
    { icon: Trophy, label: '最长连续', value: `${stats.longestStreak}`, unit: '天' },
    { icon: Clock, label: '累计时长', value: (stats.totalMinutes / 60).toFixed(1), unit: '小时' },
  ];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-[80px] pb-16">
        <PageHeader
          title="学习打卡"
          description="CAD / SolidWorks 学习记录，见证每一天的积累"
          size="lg"
          className="mb-10"
        />

        {todayNotCheckedIn && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="mb-8 flex justify-center"
          >
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
              <Flame className="w-4 h-4" />
              今天还没打卡，学完记得来记录一笔～
            </span>
          </motion.div>
        )}

        {logs.length === 0 ? (
          /* 空状态：还没有任何打卡记录 */
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="p-10 rounded-xl border bg-card/95 border-border shadow-card text-center"
          >
            <BookOpen className="w-12 h-12 mx-auto text-primary/60 mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">还没有打卡记录</h2>
            <p className="text-muted-foreground mb-6">
              学习结束后在项目根目录运行一条命令，就能完成今天的打卡：
            </p>
            <code className="inline-block px-4 py-2 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground">
              npm run study -- &quot;今天学了修剪和偏移命令&quot; -s CAD -m 60
            </code>
            <p className="text-sm text-muted-foreground mt-6">
              也可以手动在 <code>src/content/study-log/</code> 目录新建 <code>YYYY-MM-DD.md</code> 文件，
              数据格式见 <code>docs/study-log.md</code>
            </p>
          </motion.div>
        ) : (
          <div className="space-y-8">            {/* 统计卡片 */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
            >
              {statCards.map(({ icon: Icon, label, value, unit }) => (
                <div
                  key={label}
                  className="p-5 rounded-xl border bg-card/95 border-border shadow-card text-center"
                >
                  <Icon className="w-6 h-6 mx-auto text-primary mb-2" />
                  <div className="text-2xl font-bold text-foreground">
                    {value}
                    <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{label}</div>
                </div>
              ))}
            </motion.div>

            {/* 打卡热力图 */}
            <motion.section
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              className="p-6 rounded-xl border bg-card/95 border-border shadow-card"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-5">
                <span className="w-2 h-6 bg-primary rounded-full" />
                打卡热力图
              </h2>
              <HeatmapCalendar dayMinutes={stats.dayMinutes} />
            </motion.section>

            {/* 科目分布 + 近 30 天趋势 */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              className="grid lg:grid-cols-2 gap-6"
            >
              <div className="p-6 rounded-xl border bg-card/95 border-border shadow-card">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-5">
                  <span className="w-2 h-6 bg-primary rounded-full" />
                  科目分布
                </h2>
                <div className="space-y-4">
                  {stats.subjectTotals.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      记录里还没有科目时长，打卡时用 -s 和 -m 参数补上吧
                    </p>
                  )}
                  {stats.subjectTotals.map((subject, index) => (
                    <div key={subject.name}>
                      <div className="flex items-center justify-between text-sm mb-1.5">
                        <span className="font-medium text-foreground">{subject.name}</span>
                        <span className="text-muted-foreground">
                          {formatStudyMinutes(subject.minutes)} · {subject.days} 天
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-border/40 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(4, (subject.minutes / maxSubjectMinutes) * 100)}%` }}
                          transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-6 rounded-xl border bg-card/95 border-border shadow-card">
                <h2 className="text-lg font-semibold flex items-center gap-2 mb-5">
                  <span className="w-2 h-6 bg-primary rounded-full" />
                  近 30 天趋势
                </h2>
                <DeferredMount minHeight={220}>
                  <StudyTrendChart dayMinutes={stats.dayMinutes} />
                </DeferredMount>
              </div>
            </motion.div>

            {/* 时间线 */}
            <motion.section
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-5">
                <span className="w-2 h-6 bg-primary rounded-full" />
                学习记录
              </h2>

              <div className="space-y-6">
                {logs.map(log => {
                  const dayTotal = stats.dayMinutes[log.date] || 0;
                  const mood = log.mood ? MOOD_CONFIG[log.mood] : null;

                  return (
                    <article
                      key={log.date}
                      className="p-6 rounded-xl border bg-card/95 border-border shadow-card"
                    >
                      <header className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="text-lg font-semibold text-foreground">
                            {formatDateCN(log.date)}
                          </h3>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            {log.subjects.map(subject => (
                              <span
                                key={subject.name}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-xs text-primary"
                              >
                                {subject.name} · {formatStudyMinutes(subject.minutes)}
                              </span>
                            ))}
                            {log.subjects.length > 1 && (
                              <span className="text-xs text-muted-foreground">
                                共 {formatStudyMinutes(dayTotal)}
                              </span>
                            )}
                          </div>
                        </div>
                        {mood && (
                          <span
                            title={mood.label}
                            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-card border border-border text-sm"
                          >
                            <span aria-hidden>{mood.emoji}</span>
                            <span className="text-xs text-muted-foreground">{mood.label}</span>
                          </span>
                        )}
                      </header>

                      {log.renderedContent && (
                        <div className="mt-4 text-sm sm:text-[15px]">{log.renderedContent}</div>
                      )}

                      {log.tags.length > 0 && (
                        <footer className="flex gap-2 flex-wrap mt-4 pt-3 border-t border-border/60">
                          {log.tags.map(tag => (
                            <span key={tag} className="text-xs text-muted-foreground">#{tag}</span>
                          ))}
                        </footer>
                      )}
                    </article>
                  );
                })}
              </div>
            </motion.section>
          </div>
        )}

        {/* 英语背单词卡片（优先运行时拉取，构建期快照兜底；都无数据时组件自身不渲染） */}
        <MaimemoCard initialStats={maimemoStats ?? null} />
      </div>
    </div>
  );
}
