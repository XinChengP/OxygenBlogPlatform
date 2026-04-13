'use client';

import React, { useState, useMemo } from 'react';
import { Changelog, getTypeStats, getChangelogTypeLabel, ChangelogType } from '@/types/changelogTypes';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';
import { motion } from 'framer-motion';

/**
 * 时间统计项接口
 */
interface TimeStatItem {
  label: string;
  count: number;
}

/**
 * 时间统计数据接口
 */
interface TimeStats {
  month: TimeStatItem[];
  quarter: TimeStatItem[];
  year: TimeStatItem[];
}

/**
 * 类型统计环形图组件 Props
 */
interface TypeStatsChartProps {
  changelogs: Changelog[];
  blogTimeStats?: TimeStats;  // 文章时间统计（后台使用）
  momentTimeStats?: TimeStats;  // 动态时间统计（后台使用）
}

/**
 * 类型颜色映射
 * 配色方案：天依蓝、紫色、粉色、橙色、黄绿色、绿色
 */
const TYPE_COLORS: Record<ChangelogType, string> = {
  feature: '#66ccff',   // 新功能 - 天依蓝
  optimize: '#9966ff',  // 优化 - 紫色
  fix: '#ff66cc',       // 修复 - 粉色
  docs: '#ff9966',      // 文档 - 橙色
  style: '#ccff66',     // 样式 - 黄绿色
  refactor: '#66ff99',  // 重构 - 绿色
};

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
 * 装饰性背景效果
 */
const BackgroundDecoration = () => (
  <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
    <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-accent/10 rounded-full blur-xl animate-pulse" />
    <div className="absolute bottom-1/3 left-1/3 w-12 h-12 bg-primary/5 rounded-full blur-lg animate-pulse" style={{ animationDelay: '1.5s' }} />
  </div>
);

/**
 * 自定义 Tooltip 组件
 */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-4 rounded-xl border backdrop-blur-md bg-card/95 border-border shadow-xl"
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: payload[0].color }}
          />
          <p className="text-sm font-semibold text-foreground">{payload[0].name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">数量：</span>
          <span className="text-lg font-bold" style={{ color: payload[0].color }}>
            {payload[0].value} 条
          </span>
          <span className="text-xs text-muted-foreground">
            ({((payload[0].value / payload[0].payload.total) * 100).toFixed(1)}%)
          </span>
        </div>
      </motion.div>
    );
  }
  return null;
};

/**
 * 自定义活跃扇形组件
 */
const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;
  
  return (
    <g style={{ filter: `drop-shadow(0 0 8px ${fill}cc) drop-shadow(0 0 12px ${fill}66)` }}>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="hsl(var(--background))"
        strokeWidth={3}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 16}
        fill={fill}
      />
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill="hsl(var(--foreground))"
        className="text-lg font-bold"
      >
        {payload.label}
      </text>
      <text
        x={cx}
        y={cy + 15}
        textAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        className="text-sm"
      >
        {(percent * 100).toFixed(1)}%
      </text>
    </g>
  );
};

/**
 * 自定义 Legend 图标
 */
const renderCustomLegendIcon = (props: any) => {
  const { color } = props;
  return (
    <div
      className="w-3 h-3 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
};

/**
 * 类型统计环形图组件
 * 使用环形图展示不同类型更新的占比
 */
export default function TypeStatsChart({ changelogs }: TypeStatsChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const data = getTypeStats(changelogs);

  // 按数量降序排序
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  // 计算总数
  const totalCount = sortedData.reduce((sum, item) => sum + item.count, 0);

  // 为数据添加总数（用于 tooltip）
  const dataWithTotal = sortedData.map(item => ({
    ...item,
    total: totalCount,
  }));

  // 鼠标悬停处理
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  // 点击处理
  const onPieClick = (_: any, index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <motion.div
      className="p-4 rounded-xl border transition-all duration-500 backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75 hover:shadow-xl relative overflow-hidden"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <BackgroundDecoration />

      {/* 卡片头部 */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border/30">
        <h3 className="text-base font-bold flex items-center gap-2 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </motion.div>
          类型分布
        </h3>
        {sortedData.length > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: "spring" }}
            className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10"
          >
            <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
            <span className="text-sm font-semibold text-primary">{totalCount}</span>
          </motion.div>
        )}
      </div>

      {/* 图表区域 */}
      <div className="w-full relative" style={{ height: '280px', minWidth: '200px' }}>
        {sortedData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dataWithTotal}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="count"
                  nameKey="label"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  onClick={onPieClick}
                >
                  {dataWithTotal.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={TYPE_COLORS[entry.type]}
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                      style={{
                        filter: activeIndex === index
                          ? `drop-shadow(0 0 8px ${TYPE_COLORS[entry.type]}cc) drop-shadow(0 0 12px ${TYPE_COLORS[entry.type]}66)`
                          : 'none',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* 环形中间悬浮信息显示区域 */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                {activeIndex !== null ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    key={activeIndex}
                  >
                    {/* 类型名称 */}
                    <div
                      className="text-sm font-bold mb-1"
                      style={{ color: TYPE_COLORS[sortedData[activeIndex].type] }}
                    >
                      {sortedData[activeIndex].label}
                    </div>
                    {/* 数量 */}
                    <div className="text-2xl font-bold text-foreground leading-tight">
                      {sortedData[activeIndex].count}
                    </div>
                    {/* 百分比 */}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {((sortedData[activeIndex].count / totalCount) * 100).toFixed(1)}%
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* 默认显示总计 */}
                    <div className="text-xs text-muted-foreground mb-1">总计</div>
                    <div className="text-2xl font-bold text-foreground leading-tight">
                      {totalCount}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">条记录</div>
                  </motion.div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <svg className="w-12 h-12 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm">暂无数据</span>
          </div>
        )}
      </div>

      {/* 统计摘要 */}
      {sortedData.length > 0 && (
        <motion.div
          className="mt-4 pt-3 border-t border-border/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="grid grid-cols-2 gap-2">
            {sortedData.map((item, index) => (
              <motion.div
                key={item.type}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="group flex items-center justify-between text-xs p-2.5 rounded-xl bg-gradient-to-r from-muted/60 to-muted/40 hover:from-muted/80 hover:to-muted/60 transition-all duration-300 cursor-pointer border border-border/30 hover:border-border/60 shadow-sm hover:shadow-md"
                onClick={() => setActiveIndex(index)}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center gap-2">
                  <motion.div
                    animate={activeIndex === index ? { scale: 1.4 } : { scale: 1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="w-3.5 h-3.5 rounded-full shadow-md"
                    style={{ 
                      backgroundColor: TYPE_COLORS[item.type],
                      boxShadow: activeIndex === index ? `0 0 10px ${TYPE_COLORS[item.type]}` : 'none'
                    }}
                  />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors truncate whitespace-nowrap overflow-hidden font-medium">
                    {item.label}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-foreground whitespace-nowrap text-sm">{item.count}</span>
                  <span className="text-[10px] text-muted-foreground ml-1 whitespace-nowrap">
                    ({((item.count / totalCount) * 100).toFixed(0)}%)
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
