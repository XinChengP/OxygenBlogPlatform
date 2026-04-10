'use client';

import React, { useState } from 'react';
import { Changelog, getMonthStats, getQuarterStats, getYearStats } from '@/types/changelogTypes';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { themeColors } from '@/setting/WebSetting';

/**
 * 统计模式类型
 */
type StatMode = 'month' | 'quarter' | 'year';

/**
 * 时间统计图表组件 Props
 */
interface TimeStatsChartProps {
  changelogs: Changelog[];
}

/**
 * 动画变体配置
 */
const containerVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as const,
    },
  },
};

/**
 * 时间统计图表组件
 * 使用折线图展示不同时间段的更新数量
 */
export default function TimeStatsChart({ changelogs }: TimeStatsChartProps) {
  // 当前选中的统计模式
  const [mode, setMode] = useState<StatMode>('month');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  // 根据模式获取统计数据
  const getStatsData = () => {
    switch (mode) {
      case 'month':
        return getMonthStats(changelogs);
      case 'quarter':
        return getQuarterStats(changelogs);
      case 'year':
        return getYearStats(changelogs);
      default:
        return [];
    }
  };

  const data = getStatsData();

  // 按时间排序（从早到晚）
  const sortedData = [...data].sort((a, b) => {
    // 提取年份（更精确的匹配）
    const yearMatchA = a.label.match(/(\d{4})/);
    const yearMatchB = b.label.match(/(\d{4})/);
    const yearA = yearMatchA ? parseInt(yearMatchA[1]) : 0;
    const yearB = yearMatchB ? parseInt(yearMatchB[1]) : 0;

    if (yearA !== yearB) {
      return yearA - yearB;
    }

    if (mode === 'month') {
      const monthMatchA = a.label.match(/(\d+)月/);
      const monthMatchB = b.label.match(/(\d+)月/);
      const monthA = monthMatchA ? parseInt(monthMatchA[1]) : 0;
      const monthB = monthMatchB ? parseInt(monthMatchB[1]) : 0;
      return monthA - monthB;
    } else if (mode === 'quarter') {
      const quarterMatchA = a.label.match(/Q(\d+)/);
      const quarterMatchB = b.label.match(/Q(\d+)/);
      const quarterA = quarterMatchA ? parseInt(quarterMatchA[1]) : 0;
      const quarterB = quarterMatchB ? parseInt(quarterMatchB[1]) : 0;
      return quarterA - quarterB;
    }

    return 0;
  });

  // 模式按钮配置
  const modeButtons: { value: StatMode; label: string }[] = [
    { value: 'month', label: '月' },
    { value: 'quarter', label: '季' },
    { value: 'year', label: '年' },
  ];

  return (
    <motion.div
      className="p-4 rounded-xl border transition-all duration-500 backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75 hover:shadow-xl relative overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 卡片头部 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 pb-3 border-b border-border/30">
        <h3 className="text-base font-bold flex items-center gap-2 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent mb-2 sm:mb-0 whitespace-nowrap">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </motion.div>
          时间趋势
        </h3>

        <div className="flex items-center gap-3">
          {/* 图表类型切换 */}
          <button
            onClick={() => setChartType(chartType === 'line' ? 'area' : 'line')}
            className="p-1.5 rounded-lg bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
            title={chartType === 'line' ? '切换为面积图' : '切换为折线图'}
          >
            {chartType === 'line' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            )}
          </button>

          {/* 模式切换按钮 */}
          <div className="flex gap-1 bg-muted/30 p-1 rounded-lg">
            {modeButtons.map((btn) => (
              <motion.button
                key={btn.value}
                onClick={() => setMode(btn.value)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`text-xs px-3 py-1 rounded-md transition-all font-medium ${
                  mode === btn.value
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {btn.label}
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="w-full flex justify-center" style={{ height: '280px' }}>
        <div className="w-full max-w-lg">
          {sortedData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart
                  data={sortedData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                <defs>
                  {/* 天依蓝三层渐变背景 */}
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={themeColors.primary} stopOpacity={0.5} />
                    <stop offset="50%" stopColor={themeColors.accent} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={themeColors.secondary} stopOpacity={0.08} />
                  </linearGradient>
                  {/* 天依蓝到青色渐变描边 */}
                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={themeColors.primary} />
                    <stop offset="50%" stopColor={themeColors.accent} />
                    <stop offset="100%" stopColor={themeColors.primary} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" stroke="hsl(var(--border))" opacity={0.15} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    if (mode === 'month') {
                      return value.replace('年', '-').replace('月', '');
                    } else if (mode === 'quarter') {
                      // 格式：2025年春 → 2025-春
                      return value.replace('年', '-');
                    }
                    return value;
                  }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))',
                    fontWeight: 600,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="更新数量"
                  stroke="url(#strokeGradient)"
                  strokeWidth={4}
                  fill="url(#colorCount)"
                  dot={{
                    fill: themeColors.primary,
                    strokeWidth: 3,
                    r: 5,
                    stroke: 'hsl(var(--background))',
                    fillOpacity: 1,
                  }}
                  activeDot={{ 
                    r: 9, 
                    stroke: 'hsl(var(--background))', 
                    strokeWidth: 4,
                    fill: themeColors.primary,
                  }}
                />
              </AreaChart>
            ) : (
              <LineChart
                data={sortedData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  {/* 天依蓝到青色渐变描边 */}
                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={themeColors.primary} />
                    <stop offset="50%" stopColor={themeColors.accent} />
                    <stop offset="100%" stopColor={themeColors.primary} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="5 5" stroke="hsl(var(--border))" opacity={0.15} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => {
                    if (mode === 'month') {
                      return value.replace('年', '-').replace('月', '');
                    } else if (mode === 'quarter') {
                      // 格式：2025年春 → 2025-春
                      return value.replace('年', '-');
                    }
                    return value;
                  }}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                  }}
                  itemStyle={{
                    color: 'hsl(var(--foreground))',
                    fontWeight: 600,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="更新数量"
                  stroke="url(#strokeGradient)"
                  strokeWidth={4}
                  dot={{
                    fill: themeColors.primary,
                    strokeWidth: 3,
                    r: 5,
                    stroke: 'hsl(var(--background))',
                    fillOpacity: 1,
                  }}
                  activeDot={{ 
                    r: 9, 
                    stroke: 'hsl(var(--background))', 
                    strokeWidth: 4,
                    fill: themeColors.primary,
                  }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm">暂无数据</span>
          </div>
        )}
        </div>
      </div>
    </motion.div>
  );
}
