'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BookOpenCheck, Target, Clock, Flame, Sparkles } from 'lucide-react';
import { containerVariants } from '@/utils/animationVariants';
import type { MaimemoStats } from '@/types/maimemo';

/**
 * 英语背单词数据卡片（墨墨背单词开放 API）
 *
 * 数据优先从同源接口 /api/maimemo/stats 运行时获取（Cloudflare Worker 提供，
 * 边缘缓存 10 分钟）；请求失败时回退到构建期快照（initialStats）。
 * 两者都没有时整个卡片不渲染。
 *
 * 展示：累计词数、今日进度、今日学习时长、连续背词天数、
 * 近 30 天新学趋势、今日新学/待复习/顽固词、最近学习的单词。
 */

interface MaimemoCardProps {
  /** 构建期快照（src/data/maimemo-stats.json），可为空 */
  initialStats?: MaimemoStats | null;
  /** 展示的天数，默认 30 天 */
  days?: number;
}

/** 运行时数据接口地址（与 cloudflare/maimemo-stats 的路由一致） */
const STATS_ENDPOINT = '/api/maimemo/stats';
/** 前端请求超时（毫秒） */
const FETCH_TIMEOUT_MS = 8_000;

function dayMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function msToDate(ms: number): string {
  const date = new Date(ms);
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${m}-${d}`;
}

/** 秒数格式化为「X 小时 Y 分钟」 */
function formatStudyTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 分钟';
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const rest = totalMinutes % 60;
  if (hours === 0) return `${rest} 分钟`;
  if (rest === 0) return `${hours} 小时`;
  return `${hours} 小时 ${rest} 分钟`;
}

/** 校验接口返回结构，避免脏数据把卡片渲染崩掉 */
function isValidStats(data: unknown): data is MaimemoStats {
  if (!data || typeof data !== 'object') return false;
  const stats = data as Partial<MaimemoStats>;
  return (
    typeof stats.totalWords === 'number' &&
    typeof stats.dailyNewWords === 'object' &&
    stats.dailyNewWords !== null &&
    typeof stats.updatedAt === 'string'
  );
}

export default function MaimemoCard({ initialStats = null, days = 30 }: MaimemoCardProps) {
  const [stats, setStats] = useState<MaimemoStats | null>(initialStats);

  // 挂载后尝试从同源接口拉取最新数据；失败时保留构建期快照
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    fetch(STATS_ENDPOINT, { signal: controller.signal })
      .then(response => (response.ok ? response.json() : null))
      .then((data: unknown) => {
        if (!cancelled && isValidStats(data)) {
          setStats(data);
        }
      })
      .catch(() => {
        /* 静默失败：本地开发没有 Worker，线上 Worker 故障时用快照兜底 */
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, []);

  /** 近 N 天每日新学单词数；以数据里最新的一天为终点（构建期稳定） */
  const chartData = useMemo(() => {
    if (!stats) return [];
    const dates = Object.keys(stats.dailyNewWords);
    if (dates.length === 0) return [];
    const latestMs = Math.max(...dates.map(dayMs));

    return Array.from({ length: days }, (_, index) => {
      const ms = latestMs - (days - 1 - index) * 86400000;
      const date = msToDate(ms);
      return { date: date.slice(5), words: stats.dailyNewWords[date] || 0 };
    });
  }, [stats, days]);

  /** 近 N 天汇总：总词数、日均、单日最高 */
  const chartSummary = useMemo(() => {
    if (chartData.length === 0) return null;
    const total = chartData.reduce((sum, item) => sum + item.words, 0);
    const max = chartData.reduce((best, item) => (item.words > best.words ? item : best), chartData[0]);
    const activeDays = chartData.filter(item => item.words > 0).length;
    return {
      total,
      average: activeDays > 0 ? Math.round(total / activeDays) : 0,
      max,
    };
  }, [chartData]);

  /** 连续背词天数：锚定在数据中最近有记录的一天，构建期稳定、无水合风险 */
  const streak = useMemo(() => {
    if (!stats) return 0;
    const dateSet = new Set(Object.keys(stats.dailyNewWords));
    const dates = Array.from(dateSet).sort();
    if (dates.length === 0) return 0;

    let cursor = dayMs(dates[dates.length - 1]);
    let count = 0;
    while (dateSet.has(msToDate(cursor))) {
      count += 1;
      cursor -= 86400000;
    }
    return count;
  }, [stats]);

  // 没有任何数据来源时不渲染卡片
  if (!stats) {
    return null;
  }

  const today = stats.today;
  const updatedAtLabel = stats.updatedAt.slice(0, 16).replace('T', ' ');
  const hasChart = chartData.some(item => item.words > 0);
  const recentWords = stats.recentWords || [];

  const tiles = [
    {
      icon: BookOpenCheck,
      label: '累计已背',
      value: `${stats.totalWords}`,
      unit: '词',
    },
    {
      icon: Target,
      label: '今日进度',
      value: today ? `${today.finished}` : '--',
      unit: today ? `/ ${today.total}` : '',
    },
    {
      icon: Sparkles,
      label: '今日新学',
      value: stats.todayNewWords !== undefined ? `${stats.todayNewWords}` : '--',
      unit: stats.todayNewWords !== undefined ? '词' : '',
    },
    {
      icon: Flame,
      label: '连续背词',
      value: `${streak}`,
      unit: '天',
    },
  ];

  return (
    <motion.section
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-50px' }}
      className="mt-8 p-6 rounded-xl border bg-card/95 border-border shadow-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <span className="w-2 h-6 bg-primary rounded-full" />
          <BookOpenCheck className="w-5 h-5 text-primary" />
          英语背单词
        </h2>
        <span className="text-xs text-muted-foreground">
          数据来自墨墨背单词 · 更新于 {updatedAtLabel}
        </span>
      </div>

      {/* 四项核心数据 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {tiles.map(({ icon: Icon, label, value, unit }) => (
          <div
            key={label}
            className="p-4 rounded-lg bg-primary/5 border border-primary/20 text-center"
          >
            <Icon className="w-4 h-4 mx-auto text-primary/70 mb-1.5" />
            <div className="text-xl font-bold text-foreground leading-tight">
              {value}
              {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{label}</div>
          </div>
        ))}
      </div>

      {hasChart ? (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="5 5" stroke="rgba(102, 204, 255, 0.15)" opacity={0.15} vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: '#cbd5e1' }}
                interval={6}
              />
              <YAxis
                stroke="#64748b"
                tick={{ fill: '#64748b', fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                formatter={value => [`${value} 个新词`, '新学单词']}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.96)',
                  border: '1px solid #cbd5e1',
                  borderRadius: '0.75rem',
                  color: '#0f172a',
                }}
              />
              <Bar dataKey="words" name="新学单词" fill="#66ccff" radius={[3, 3, 0, 0]} maxBarSize={18} />
            </BarChart>
          </ResponsiveContainer>

          {chartSummary && (
            <p className="text-center text-xs text-muted-foreground mt-2">
              近 {days} 天新学 <span className="font-medium text-foreground">{chartSummary.total}</span> 词
              · 学习日均 {chartSummary.average} 词
              · 单日最高 {chartSummary.max.words} 词（{chartSummary.max.date}）
            </p>
          )}
        </>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-6">
          暂无每日新学记录（需要墨墨接口返回单词学习数据）
        </p>
      )}

      {/* 词库概况 */}
      {(today?.studyTimeSeconds !== undefined ||
        stats.dueReviews !== undefined ||
        stats.stickingWords !== undefined ||
        recentWords.length > 0) && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {today?.studyTimeSeconds !== undefined && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-xs text-primary"
              title="使用墨墨以来的账号累计学习时长"
            >
              <Clock className="w-3.5 h-3.5" />
              累计学习 {formatStudyTime(today.studyTimeSeconds)}
            </span>
          )}
          {stats.dueReviews !== undefined && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400"
              title="根据最近拉取的单词记录估算，仅供参考"
            >
              待复习 {stats.dueReviews} 词
            </span>
          )}
          {stats.stickingWords !== undefined && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400">
              顽固词 {stats.stickingWords} 个
            </span>
          )}
          {recentWords.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-xs text-muted-foreground">
              最近学习：
              {recentWords.map((word, index) => (
                <span key={word.spelling}>
                  <span className="text-foreground">{word.spelling}</span>
                  {index < recentWords.length - 1 && ' · '}
                </span>
              ))}
            </span>
          )}
        </div>
      )}
    </motion.section>
  );
}
