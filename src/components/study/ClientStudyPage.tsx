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

  // 今日打卡记录：todayStr 只在客户端赋值，首帧为 null
  const todayLog = todayStr ? logs.find(log => log.date === todayStr) : undefined;
  // 今日状态是否已就绪，未就绪时渲染占位文案，避免首帧误报「未打卡」
  const todayReady = todayStr !== null;
  // 今日学习总时长（分钟）
  const todayMinutes = todayLog ? stats.dayMinutes[todayLog.date] ?? 0 : 0;

  // 科目分布条的最大时长，用于计算百分比宽度
  const maxSubjectMinutes = Math.max(1, ...stats.subjectTotals.map(subject => subject.minutes));
  // 日均学习时长（按有打卡的天数算），用于科目分布下方的汇总行
  const averageMinutes = stats.totalDays > 0 ? Math.round(stats.totalMinutes / stats.totalDays) : 0;

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
          description="CAD / SolidWorks 学习记录"
          size="lg"
          className="mb-8"
        />

        {logs.length === 0 ? (
          <>
            {/* 空状态：还没有任何打卡记录 */}
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

            {/* 没有打卡记录时墨墨数据仍可能有效，这里用独立卡片兜底展示 */}
            <MaimemoCard initialStats={maimemoStats ?? null} />
          </>
        ) : (
          <div className="space-y-6">
            {/* ① 今日概览：今日状态与四项累计统计同行排布，桌面端左右分栏、移动端上下堆叠 */}
            <motion.section
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              className="p-5 sm:p-6 rounded-xl border bg-card/95 border-border shadow-card"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-5 md:gap-0">
                {/* 今日状态：桌面端固定宽度并右留白，移动端独占一行 */}
                <div className="flex items-center gap-3 md:w-64 md:shrink-0 md:pr-6">
                  {/* 状态图标：已打卡用日历勾，未打卡用火苗提醒 */}
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {todayLog ? <CalendarCheck className="w-6 h-6" /> : <Flame className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">今日学习</p>
                    {/* nowrap 防止「小时」这类单位在窄屏被拆成两行 */}
                    <p className="text-lg font-semibold text-foreground leading-tight whitespace-nowrap">
                      {/* 首帧（客户端日期未就绪）不显示状态，避免水合时文案跳变 */}
                      {!todayReady
                        ? '读取中…'
                        : todayLog
                          ? `已打卡 · ${formatStudyMinutes(todayMinutes)}`
                          : '还没打卡'}
                    </p>
                    {/* 已打卡显示今日科目；未打卡显示轻量提醒 */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {todayReady && todayLog
                        ? todayLog.subjects.map(subject => (
                            <span
                              key={subject.name}
                              className="inline-flex items-center px-2 py-0.5 rounded-full bg-primary/10 text-[11px] text-primary whitespace-nowrap"
                            >
                              {subject.name} · {formatStudyMinutes(subject.minutes)}
                            </span>
                          ))
                        : todayReady && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-primary">
                              <Flame className="w-3 h-3" />
                              学完记得来记录一笔
                            </span>
                          )}
                    </div>
                  </div>
                </div>

                {/* 四项累计统计：桌面端与状态区并排并用竖线分隔，四等分铺满 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 md:border-l md:border-border/60 md:pl-6">
                  {statCards.map(({ icon: Icon, label, value, unit }) => (
                    <div key={label} className="flex items-center gap-3">
                      <Icon className="w-5 h-5 text-primary shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xl font-bold text-foreground leading-tight whitespace-nowrap">
                          {value}
                          <span className="text-xs font-normal text-muted-foreground ml-1">{unit}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 whitespace-nowrap">{label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* ② 学习数据面板：热力图、科目分布、趋势与英语背单词统一收进一张卡，用分隔线分区 */}
            <motion.section
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              className="rounded-xl border bg-card/95 border-border shadow-card"
            >
              {/* 面板头部 */}
              <header className="flex flex-wrap items-center justify-between gap-3 px-5 sm:px-6 py-4 border-b border-border/60">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="w-2 h-6 bg-primary rounded-full" />
                  学习数据
                </h2>
                <span className="text-xs text-muted-foreground">热力图覆盖最近 52 周</span>
              </header>

              {/* 打卡热力图 */}
              <div className="px-5 sm:px-6 py-5">
                <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                  <span className="w-1.5 h-4 bg-primary rounded-full" />
                  打卡热力图
                </h3>
                <HeatmapCalendar dayMinutes={stats.dayMinutes} />
              </div>

              {/* 近 30 天趋势 + 科目分布：趋势放左列，避免最新几天柱子被右下角看板娘遮挡 */}
              <div className="grid lg:grid-cols-2 border-t border-border/60 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
                <div className="px-5 sm:px-6 py-5">
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-4 bg-primary rounded-full" />
                    近 30 天趋势
                  </h3>
                  <DeferredMount minHeight={220}>
                    <StudyTrendChart dayMinutes={stats.dayMinutes} />
                  </DeferredMount>
                </div>

                <div className="px-5 sm:px-6 py-5">
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                    <span className="w-1.5 h-4 bg-primary rounded-full" />
                    科目分布
                  </h3>
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

                    {/* 汇总行：科目少时也能撑起区块高度，同时补充日均信息 */}
                    {stats.subjectTotals.length > 0 && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-3 border-t border-border/60">
                        <span>日均学习</span>
                        <span className="font-medium text-foreground">{formatStudyMinutes(averageMinutes)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 英语背单词：嵌入模式，作为面板的第四个分区 */}
              <MaimemoCard embedded initialStats={maimemoStats ?? null} />
            </motion.section>

            {/* ③ 学习记录：保持卡片列表，收紧间距让一屏看到更多内容 */}
            <motion.section
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
            >
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <span className="w-2 h-6 bg-primary rounded-full" />
                学习记录
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  共 {logs.length} 天
                </span>
              </h2>

              <div className="space-y-4">
                {logs.map(log => {
                  const dayTotal = stats.dayMinutes[log.date] || 0;
                  const mood = log.mood ? MOOD_CONFIG[log.mood] : null;

                  return (
                    <article
                      key={log.date}
                      className="p-5 rounded-xl border bg-card/95 border-border shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
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
      </div>
    </div>
  );
}
