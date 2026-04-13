'use client';

import React, { useState } from 'react';
import { Changelog, getMonthStats, getQuarterStats, getYearStats } from '@/types/changelogTypes';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import { themeColors } from '@/setting/WebSetting';

/**
 * 时间统计项接口
 */
export interface TimeStatItem {
  label: string;
  count: number;
}

/**
 * 时间统计数据接口
 */
export interface TimeStats {
  month: TimeStatItem[];
  quarter: TimeStatItem[];
  year: TimeStatItem[];
}

/**
 * 统计模式类型
 */
type StatMode = 'month' | 'quarter' | 'year';

/**
 * 时间统计图表组件 Props
 */
interface TimeStatsChartProps {
  changelogs: Changelog[];
  blogTimeStats?: TimeStats;  // 文章时间统计（后台使用）
  momentTimeStats?: TimeStats;  // 动态时间统计（后台使用）
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
 * 使用折线图展示不同时间段的数据趋势
 * 
 * 使用场景：
 * - 前台（日志页面）：只传入 changelogs，显示日志趋势
 * - 后台（仪表盘）：传入 changelogs、blogTimeStats、momentTimeStats，显示三种数据趋势
 */
export default function TimeStatsChart({ changelogs, blogTimeStats, momentTimeStats }: TimeStatsChartProps) {
  // 当前选中的统计模式
  const [mode, setMode] = useState<StatMode>('month');
  const [chartType, setChartType] = useState<'line' | 'area'>('area');

  // 判断是否有文章和动态数据（用于区分前台和后台使用场景）
  const hasBlogStats = blogTimeStats && (blogTimeStats.month.length > 0 || blogTimeStats.quarter.length > 0 || blogTimeStats.year.length > 0);
  const hasMomentStats = momentTimeStats && (momentTimeStats.month.length > 0 || momentTimeStats.quarter.length > 0 || momentTimeStats.year.length > 0);
  const isAdminView = hasBlogStats || hasMomentStats; // 后台视图：显示多种数据

  /**
   * 根据模式获取统计数据
   */
  const getStatsData = () => {
    // 获取日志统计数据
    let changelogStats: Array<{ label: string; count: number }>;
    switch (mode) {
      case 'month':
        changelogStats = getMonthStats(changelogs);
        break;
      case 'quarter':
        changelogStats = getQuarterStats(changelogs);
        break;
      case 'year':
        changelogStats = getYearStats(changelogs);
        break;
      default:
        changelogStats = [];
    }

    // 如果不是后台视图，只返回日志数据
    if (!isAdminView) {
      return changelogStats.map(item => ({
        label: item.label,
        changelogCount: item.count,
        blogCount: 0,
        momentCount: 0,
      }));
    }

    // 后台视图：获取文章和动态统计数据
    const blogStats = blogTimeStats?.[mode] || [];
    const momentStats = momentTimeStats?.[mode] || [];

    // 收集所有时间点
    const allLabels = new Set<string>();
    changelogStats.forEach(item => allLabels.add(item.label));
    blogStats.forEach(item => allLabels.add(item.label));
    momentStats.forEach(item => allLabels.add(item.label));

    // 创建映射以便快速查找
    const changelogMap = new Map(changelogStats.map(item => [item.label, item.count]));
    const blogMap = new Map(blogStats.map(item => [item.label, item.count]));
    const momentMap = new Map(momentStats.map(item => [item.label, item.count]));

    // 合并数据
    return Array.from(allLabels).map(label => ({
      label,
      changelogCount: changelogMap.get(label) || 0,
      blogCount: blogMap.get(label) || 0,
      momentCount: momentMap.get(label) || 0,
    }));
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
      // 季节排序：春夏秋冬
      const seasonOrder: Record<string, number> = { '春': 1, '夏': 2, '秋': 3, '冬': 4 };
      const seasonA = a.label.slice(-1);
      const seasonB = b.label.slice(-1);
      return (seasonOrder[seasonA] || 0) - (seasonOrder[seasonB] || 0);
    }

    return 0;
  });

  // 过滤出有数据的项（至少有一个系列的值不为 0）
  const filteredData = sortedData.filter(
    item => item.changelogCount > 0 || item.blogCount > 0 || item.momentCount > 0
  );

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
        <h3 className="text-base font-bold flex items-center gap-2 mb-2 sm:mb-0 whitespace-nowrap">
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
          {isAdminView ? '内容发布趋势' : '日志时间趋势'}
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
      <div className="w-full flex justify-center" style={{ height: '280px', minWidth: '200px' }}>
        <div className="w-full max-w-lg" style={{ minWidth: '200px' }}>
          {filteredData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart
                  data={filteredData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                <defs>
                  {/* 文章 - 天依蓝渐变 */}
                  <linearGradient id="colorBlog" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#66ccff" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#66ccff" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#66ccff" stopOpacity={0.08} />
                  </linearGradient>
                  {/* 动态 - 粉红色渐变 */}
                  <linearGradient id="colorMoment" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ff6680" stopOpacity={0.5} />
                    <stop offset="50%" stopColor="#ff6680" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#ff6680" stopOpacity={0.08} />
                  </linearGradient>
                  {/* 日志 - 前台用天依蓝，后台用黄色 */}
                  <linearGradient id="colorChangelog" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isAdminView ? "#ffe666" : "#66ccff"} stopOpacity={0.5} />
                    <stop offset="50%" stopColor={isAdminView ? "#ffe666" : "#66ccff"} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={isAdminView ? "#ffe666" : "#66ccff"} stopOpacity={0.08} />
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
                      // 格式：2025 年春 → 2025-春
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
                {/* 后台视图显示图例，前台视图不显示 */}
                {isAdminView && (
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs">{value}</span>
                    )}
                  />
                )}
                {/* 后台视图显示文章趋势 */}
                {isAdminView && (
                  <Area
                    type="monotone"
                    dataKey="blogCount"
                    name="文章"
                    stroke="#66ccff"
                    strokeWidth={3}
                    fill="url(#colorBlog)"
                    dot={{
                      fill: '#66ccff',
                      strokeWidth: 2,
                      r: 4,
                      stroke: 'hsl(var(--background))',
                      fillOpacity: 1,
                    }}
                    activeDot={{ 
                      r: 8, 
                      stroke: 'hsl(var(--background))', 
                      strokeWidth: 3,
                      fill: '#66ccff',
                    }}
                  />
                )}
                {/* 后台视图显示动态趋势 */}
                {isAdminView && (
                  <Area
                    type="monotone"
                    dataKey="momentCount"
                    name="动态"
                    stroke="#ff6680"
                    strokeWidth={3}
                    fill="url(#colorMoment)"
                    dot={{
                      fill: '#ff6680',
                      strokeWidth: 2,
                      r: 4,
                      stroke: 'hsl(var(--background))',
                      fillOpacity: 1,
                    }}
                    activeDot={{ 
                      r: 8, 
                      stroke: 'hsl(var(--background))', 
                      strokeWidth: 3,
                      fill: '#ff6680',
                    }}
                  />
                )}
                {/* 日志趋势 - 始终显示 */}
                <Area
                  type="monotone"
                  dataKey="changelogCount"
                  name="日志"
                  stroke={isAdminView ? "#ffe666" : "#66ccff"}
                  strokeWidth={3}
                  fill="url(#colorChangelog)"
                  dot={{
                    fill: isAdminView ? '#ffe666' : '#66ccff',
                    strokeWidth: 2,
                    r: 4,
                    stroke: 'hsl(var(--background))',
                    fillOpacity: 1,
                  }}
                  activeDot={{ 
                    r: 8, 
                    stroke: 'hsl(var(--background))', 
                    strokeWidth: 3,
                    fill: isAdminView ? '#ffe666' : '#66ccff',
                  }}
                />
              </AreaChart>
            ) : (
              <LineChart
                data={filteredData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
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
                      // 格式：2025 年春 → 2025-春
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
                {/* 后台视图显示图例，前台视图不显示 */}
                {isAdminView && (
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs">{value}</span>
                    )}
                  />
                )}
                {/* 后台视图显示文章趋势 */}
                {isAdminView && (
                  <Line
                    type="monotone"
                    dataKey="blogCount"
                    name="文章"
                    stroke="#66ccff"
                    strokeWidth={3}
                    dot={{
                      fill: '#66ccff',
                      strokeWidth: 2,
                      r: 4,
                      stroke: 'hsl(var(--background))',
                      fillOpacity: 1,
                    }}
                    activeDot={{ 
                      r: 8, 
                      stroke: 'hsl(var(--background))', 
                      strokeWidth: 3,
                      fill: '#66ccff',
                    }}
                  />
                )}
                {/* 后台视图显示动态趋势 */}
                {isAdminView && (
                  <Line
                    type="monotone"
                    dataKey="momentCount"
                    name="动态"
                    stroke="#ff6680"
                    strokeWidth={3}
                    dot={{
                      fill: '#ff6680',
                      strokeWidth: 2,
                      r: 4,
                      stroke: 'hsl(var(--background))',
                      fillOpacity: 1,
                    }}
                    activeDot={{ 
                      r: 8, 
                      stroke: 'hsl(var(--background))', 
                      strokeWidth: 3,
                      fill: '#ff6680',
                    }}
                  />
                )}
                {/* 日志趋势 - 始终显示 */}
                <Line
                  type="monotone"
                  dataKey="changelogCount"
                  name="日志"
                  stroke={isAdminView ? "#ffe666" : "#66ccff"}
                  strokeWidth={3}
                  dot={{
                    fill: isAdminView ? '#ffe666' : '#66ccff',
                    strokeWidth: 2,
                    r: 4,
                    stroke: 'hsl(var(--background))',
                    fillOpacity: 1,
                  }}
                  activeDot={{ 
                    r: 8, 
                    stroke: 'hsl(var(--background))', 
                    strokeWidth: 3,
                    fill: isAdminView ? '#ffe666' : '#66ccff',
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
