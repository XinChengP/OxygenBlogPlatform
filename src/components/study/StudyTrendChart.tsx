'use client';

import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

/**
 * 近 30 天学习时长趋势图
 *
 * 与 changelogs 的统计图表保持一致的配色与坐标轴风格；
 * 由父组件用 DeferredMount 包裹，避免 recharts 体积影响首屏。
 */

interface StudyTrendChartProps {
  /** 每天的学习分钟数（date -> minutes） */
  dayMinutes: Record<string, number>;
  /** 展示的天数，默认 30 天 */
  days?: number;
}

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

export default function StudyTrendChart({ dayMinutes, days = 30 }: StudyTrendChartProps) {
  const data = useMemo(() => {
    const dates = Object.keys(dayMinutes);
    // 无数据时以今天为终点铺出 0 值趋势，避免图表空白报错
    const latestMs = dates.length > 0 ? Math.max(...dates.map(dayMs)) : Date.now();

    return Array.from({ length: days }, (_, index) => {
      const ms = latestMs - (days - 1 - index) * 86400000;
      const date = msToDate(ms);
      return { date: date.slice(5), minutes: dayMinutes[date] || 0 };
    });
  }, [dayMinutes, days]);

  const hasData = data.some(item => item.minutes > 0);

  if (!hasData) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
        暂无学习记录，打卡后这里会出现趋势图
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="studyTrendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#66ccff" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#66ccff" stopOpacity={0.02} />
          </linearGradient>
        </defs>
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
          formatter={value => [`${value} 分钟`, '学习时长']}
          labelFormatter={label => `${label}`}
          contentStyle={{
            backgroundColor: 'rgba(255, 255, 255, 0.96)',
            border: '1px solid #cbd5e1',
            borderRadius: '0.75rem',
            color: '#0f172a',
          }}
        />
        <Area
          type="monotone"
          dataKey="minutes"
          stroke="#66ccff"
          strokeWidth={2}
          fill="url(#studyTrendGradient)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
