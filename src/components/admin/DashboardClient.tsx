'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  MessageSquare,
  Image,
  Plus,
  Upload,
  Settings,
  CheckCircle2,
  Clock,
  Tag,
  Folder,
  History,
  ArrowRight,
  ExternalLink,
  Database,
  HelpCircle,
  LayoutDashboard,
  ChevronRight,
  ScrollText,
  ClipboardList,
  Type,
} from 'lucide-react';
import { AdminCard } from '@/components/admin';
import { cn } from '@/utils/cn';
import type { DashboardStats } from '@/utils/adminUtils';
import { Changelog, ChangelogType, getTypeStats, getChangelogTypeLabel, getMonthStats, getQuarterStats, getYearStats } from '@/types/changelogTypes';
import { PieChart, Pie, Cell, Tooltip as ReTooltip, ResponsiveContainer, Sector, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, AreaChart, Area } from 'recharts';
import { themeColors } from '@/setting/WebSetting';

/**
 * 仪表盘客户端组件属性接口
 */
interface DashboardClientProps {
  /** 统计数据 */
  stats: DashboardStats;
}

/**
 * 动画配置
 */
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] as const,
    },
  },
};

/**
 * 数字动画组件
 * 数字从0递增到目标值的动画效果
 */
const AnimatedNumber: React.FC<{ value: number; duration?: number }> = ({ 
  value, 
  duration = 1.5 
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  React.useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / (duration * 1000), 1);
      
      // 使用 easeOutExpo 缓动函数
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.floor(easeOutExpo * value));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{displayValue.toLocaleString()}</span>;
};

/**
 * 快捷操作卡片属性接口
 */
interface QuickActionCardProps {
  /** 图标组件 */
  icon: React.ElementType;
  /** 标签 */
  label: string;
  /** 描述文字 */
  description: string;
  /** 链接地址 */
  href: string;
  /** 图标背景渐变 */
  gradient: string;
  /** 图标颜色 */
  iconColor: string;
  /** 延迟动画 */
  delay?: number;
}

/**
 * 快捷操作卡片组件
 * 2x2网格布局，带有hover动效
 */
const QuickActionCard: React.FC<QuickActionCardProps> = ({
  icon: Icon,
  label,
  description,
  href,
  gradient,
  iconColor,
  delay = 0,
}) => {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: delay * 0.1 }}
        whileHover={{ 
          scale: 1.03,
          y: -5,
          boxShadow: '0 25px 50px -12px rgba(102, 204, 255, 0.25)'
        }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'relative overflow-hidden rounded-2xl p-6',
          'bg-white dark:bg-gray-800',
          'border border-gray-200/50 dark:border-gray-700/50',
          'shadow-lg shadow-gray-200/50 dark:shadow-gray-900/30',
          'transition-all duration-300',
          'cursor-pointer group'
        )}
      >
        {/* 背景渐变效果 */}
        <div className={cn(
          'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          gradient
        )} />
        
        {/* 顶部光效 */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#66ccff]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* 内容 */}
        <div className="relative">
          {/* 图标 */}
          <motion.div 
            className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center mb-4',
              'bg-gradient-to-br shadow-lg',
              gradient
            )}
            whileHover={{ rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5 }}
          >
            <Icon className={cn('w-7 h-7', iconColor)} />
          </motion.div>

          {/* 标题 */}
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-[#66ccff] transition-colors">
            {label}
          </h3>
          
          {/* 描述 */}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>

          {/* 箭头 */}
          <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-1">
            <ArrowRight className="w-5 h-5 text-[#66ccff]" />
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

/**
 * 数据概览卡片属性接口
 */
interface StatOverviewCardProps {
  /** 图标组件 */
  icon: React.ElementType;
  /** 数值 */
  value: number;
  /** 标签 */
  label: string;
  /** 渐变背景 */
  gradient: string;
  /** 图标颜色 */
  iconColor: string;
  /** 延迟动画 */
  delay?: number;
}

/**
 * 数据概览卡片组件
 * 4列并排布局，带有数字动效
 */
const StatOverviewCard: React.FC<StatOverviewCardProps> = ({
  icon: Icon,
  value,
  label,
  gradient,
  iconColor,
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      whileHover={{ y: -3 }}
      className={cn(
        'relative overflow-hidden rounded-xl p-4',
        'bg-white dark:bg-gray-800',
        'border border-gray-200/50 dark:border-gray-700/50',
        'shadow-md',
        'transition-all duration-300'
      )}
    >
      {/* 背景装饰 */}
      <div className={cn('absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-20', gradient)} />
      
      <div className="relative flex items-center space-x-3">
        {/* 图标 */}
        <div className={cn('p-3 rounded-xl', gradient)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>
        
        {/* 数据 */}
        <div className="flex-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            <AnimatedNumber value={value} />
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * 文章分类环形图属性接口
 */
interface CategoryPieChartProps {
  /** 分类数据 */
  categories: { name: string; count: number }[];
  /** 选中的分类 */
  selectedCategory: string | null;
  /** 选择回调 */
  onSelect: (name: string | null) => void;
}

/**
 * 文章分类环形图组件
 * 使用 recharts 绘制，与日志类型分布图保持一致
 */
const CategoryPieChart: React.FC<CategoryPieChartProps> = ({
  categories,
  selectedCategory,
  onSelect,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // 颜色配置
  const colors = [
    '#66ccff', '#9966ff', '#ff66cc', '#ff9966', '#66ff99',
    '#ff6666', '#66ffff', '#ffcc66', '#cc66ff', '#66ffcc'
  ];

  if (categories.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-8">
        <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无分类数据</p>
      </div>
    );
  }

  // 按数量降序排序
  const sortedData = [...categories].sort((a, b) => b.count - a.count);

  // 计算总数
  const totalCount = sortedData.reduce((sum, item) => sum + item.count, 0);

  // 为数据添加颜色
  const dataWithColor = sortedData.map((item, index) => ({
    ...item,
    label: item.name,
    color: colors[index % colors.length],
  }));

  // 为数据添加总数（用于 tooltip）
  const dataWithTotal = dataWithColor.map(item => ({
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
      variants={chartContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <BackgroundDecoration />

      {/* 卡片头部 */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border/30">
        <h3 className="text-base font-bold flex items-center gap-2 text-[#66ccff]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-5 h-5 text-[#66ccff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </motion.div>
          博客文章分类分布
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
      <div className="w-full relative" style={{ height: '280px' }}>
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
                      fill={entry.color}
                      stroke="hsl(var(--background))"
                      strokeWidth={3}
                      style={{
                        filter: activeIndex === index
                          ? `drop-shadow(0 0 8px ${entry.color}cc) drop-shadow(0 0 12px ${entry.color}66)`
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
                    {/* 分类名称 */}
                    <div
                      className="text-sm font-bold mb-1"
                      style={{ color: dataWithColor[activeIndex].color }}
                    >
                      {dataWithColor[activeIndex].name}
                    </div>
                    {/* 数量 */}
                    <div className="text-2xl font-bold text-foreground leading-tight">
                      {dataWithColor[activeIndex].count}
                    </div>
                    {/* 百分比 */}
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {((dataWithColor[activeIndex].count / totalCount) * 100).toFixed(1)}%
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
                    <div className="text-xs text-muted-foreground mt-0.5">篇文章</div>
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
            {dataWithColor.map((item, index) => (
              <motion.div
                key={item.name}
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
                      backgroundColor: item.color,
                      boxShadow: activeIndex === index ? `0 0 10px ${item.color}` : 'none'
                    }}
                  />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors truncate whitespace-nowrap overflow-hidden font-medium">
                    {item.name}
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
};

/**
 * 环形进度组件
 */
interface CircularProgressProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max,
  size = 100,
  strokeWidth = 6,
  color = '#66ccff',
}) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* 背景圆环 */}
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* 进度圆环 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      {/* 中心文字 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color }}>{percentage}%</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{value}/{max}</span>
      </div>
    </div>
  );
};

/**
 * 标签云组件
 */
interface TagCloudProps {
  tags: { name: string; count: number }[];
  /** 选中的标签 */
  selectedTag: string | null;
  /** 选择回调 */
  onSelect: (name: string | null) => void;
}

const TagCloud: React.FC<TagCloudProps> = ({ tags, selectedTag, onSelect }) => {
  if (tags.length === 0) {
    return (
      <div className="text-center text-gray-400 dark:text-gray-500 py-8">
        <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">暂无标签数据</p>
      </div>
    );
  }

  const maxCount = Math.max(...tags.map(t => t.count));
  
  return (
    <div className="flex flex-wrap gap-2">
      {tags.slice(0, 20).map((tag, index) => {
        const size = maxCount > 0 ? 0.75 + (tag.count / maxCount) * 0.5 : 1;
        const isSelected = selectedTag === tag.name;
        
        return (
          <motion.button
            key={tag.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onSelect(isSelected ? null : tag.name)}
            className={cn(
              'inline-flex items-center px-3 py-1.5 rounded-full text-sm',
              'transition-all duration-300',
              isSelected
                ? 'bg-[#66ccff] text-white shadow-lg shadow-[#66ccff]/30'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-[#66ccff]/10 hover:text-[#66ccff]'
            )}
            style={{ fontSize: `${size}rem` }}
          >
            {tag.name}
            <span className={cn(
              'ml-1.5 text-xs',
              isSelected ? 'text-white/80' : 'text-gray-400'
            )}>
              {tag.count}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};

/**
 * 统计项卡片属性接口
 */
interface TrendCardProps {
  /** 图标组件 */
  icon: React.ElementType;
  /** 数值 */
  value: number;
  /** 标签 */
  label: string;
  /** 渐变背景 */
  gradient?: string;
  /** 图标颜色 */
  iconColor?: string;
  /** 延迟动画 */
  delay?: number;
}

/**
 * 统计项卡片组件
 * 与 StatOverviewCard 保持一致的视觉风格
 */
const TrendCard: React.FC<TrendCardProps> = ({
  icon: Icon,
  value,
  label,
  gradient = 'bg-gray-100 dark:bg-gray-700/50',
  iconColor = 'text-gray-500',
  delay = 0,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: delay * 0.1 }}
      whileHover={{ y: -3 }}
      className={cn(
        'relative overflow-hidden rounded-xl p-4',
        'bg-white dark:bg-gray-800',
        'border border-gray-200/50 dark:border-gray-700/50',
        'shadow-md',
        'transition-all duration-300'
      )}
    >
      {/* 背景装饰 */}
      <div className={cn('absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-20', gradient)} />

      <div className="relative flex items-center space-x-3">
        {/* 图标 */}
        <div className={cn('p-3 rounded-xl', gradient)}>
          <Icon className={cn('w-5 h-5', iconColor)} />
        </div>

        {/* 数据 */}
        <div className="flex-1">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            <AnimatedNumber value={value} />
          </span>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * 快速入口项属性接口
 */
interface QuickLinkProps {
  /** 图标组件 */
  icon: React.ElementType;
  /** 标签 */
  label: string;
  /** 链接地址 */
  href: string;
  /** 是否外部链接 */
  external?: boolean;
}

/**
 * 快速入口组件
 */
const QuickLink: React.FC<QuickLinkProps> = ({ icon: Icon, label, href, external = false }) => {
  const content = (
    <motion.div
      whileHover={{ x: 4 }}
      className={cn(
        'flex items-center space-x-3 p-3 rounded-xl',
        'bg-white dark:bg-gray-800',
        'border border-gray-200/50 dark:border-gray-700/50',
        'hover:border-[#66ccff]/50 hover:shadow-md',
        'transition-all duration-300 cursor-pointer group'
      )}
    >
      <div className="p-2 rounded-lg bg-[#66ccff]/10 group-hover:bg-[#66ccff]/20 transition-colors">
        <Icon className="w-4 h-4 text-[#66ccff]" />
      </div>
      <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#66ccff] transition-colors">
        {label}
      </span>
      {external ? (
        <ExternalLink className="w-4 h-4 text-gray-400" />
      ) : (
        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#66ccff] transition-colors" />
      )}
    </motion.div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={href}>{content}</Link>;
};

// ==================== 以下是100%复制的日志统计图组件 ====================

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
const chartContainerVariants = {
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
 * 类型统计环形图组件
 * 使用环形图展示不同类型更新的占比
 */
const TypeStatsChart: React.FC<{ changelogs: Changelog[] }> = ({ changelogs }) => {
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
      variants={chartContainerVariants}
      initial="hidden"
      animate="visible"
    >
      <BackgroundDecoration />

      {/* 卡片头部 */}
      <div className="flex justify-between items-center mb-4 pb-3 border-b border-border/30">
        <h3 className="text-base font-bold flex items-center gap-2 text-[#66ccff]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-5 h-5 text-[#66ccff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          </motion.div>
          日志类型分布
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
      <div className="w-full relative" style={{ height: '280px' }}>
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
};

/**
 * 统计模式类型
 */
type StatMode = 'month' | 'quarter' | 'year';

/**
 * 时间统计图表组件
 * 使用折线图展示不同时间段的更新数量
 */
const TimeStatsChart: React.FC<{ changelogs: Changelog[] }> = ({ changelogs }) => {
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
      variants={chartContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 卡片头部 */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 pb-3 border-b border-border/30">
        <h3 className="text-base font-bold flex items-center gap-2 text-[#66ccff] mb-2 sm:mb-0 whitespace-nowrap">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <svg className="w-5 h-5 text-[#66ccff] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </motion.div>
          日志时间趋势
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
                <ReTooltip
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
                <ReTooltip
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
};

// ==================== 仪表盘主组件 ====================

/**
 * 仪表盘客户端组件
 * 采用左右自适应布局：左侧65%-70%核心操作区，右侧30%-35%辅助信息区
 */
const DashboardClient: React.FC<DashboardClientProps> = ({ stats }) => {
  // 筛选状态
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 转换 changelogs 数据格式，并映射旧类型到新类型
  const changelogsData: Changelog[] = useMemo(() => {
    // 旧类型映射表
    const typeMapping: Record<string, ChangelogType> = {
      perf: 'optimize',    // 性能优化 -> 优化
      chore: 'docs',       // 其他/杂项 -> 文档
    };

    return stats.changelogs.map((log, index) => {
      // 映射旧类型到新类型
      const rawType = log.type || 'feature';
      const mappedType = typeMapping[rawType] || rawType;

      return {
        id: `changelog-${index}`,
        date: log.date,
        title: log.title,
        type: (mappedType as ChangelogType),
        commits: [],
        content: '',
        filePath: '',
      };
    });
  }, [stats.changelogs]);

  return (
    <motion.div 
      className="min-h-screen"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 顶部标题栏 - 简约悬浮式设计 */}
      <motion.div 
        variants={itemVariants}
        className={cn(
          'sticky top-0 z-10 mb-6 -mx-4 px-4 py-4',
          'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl',
          'border-b border-gray-200/50 dark:border-gray-700/50'
        )}
      >
        <div className="flex items-center justify-between max-w-[1920px] mx-auto">
          <div className="flex items-center space-x-4">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#66ccff]/20 to-[#66ccff]/5">
              <LayoutDashboard className="w-6 h-6 text-[#66ccff]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                欢迎回来
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                这是您的博客管理概览
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
            {new Date().toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'long',
            })}
          </div>
        </div>
      </motion.div>

      {/* 主内容区域：左右自适应布局 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 max-w-[1920px] mx-auto">
        {/* 左侧主栏：核心操作与数据概览（占8份，约66%） */}
        <div className="xl:col-span-8 space-y-6">
          {/* 第一模块：快捷操作 - 3x2网格卡片 */}
          <motion.div variants={itemVariants}>
            <AdminCard title="快捷操作" noPadding>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <QuickActionCard
                    icon={Plus}
                    label="新建文章"
                    description="撰写博客文章"
                    href="/admin/blogs/edit"
                    gradient="from-blue-500/20 to-blue-600/10"
                    iconColor="text-blue-500"
                    delay={0}
                  />
                  <QuickActionCard
                    icon={MessageSquare}
                    label="发布动态"
                    description="分享即时想法"
                    href="/admin/moments/edit"
                    gradient="from-green-500/20 to-green-600/10"
                    iconColor="text-green-500"
                    delay={1}
                  />
                  <QuickActionCard
                    icon={ScrollText}
                    label="撰写日志"
                    description="记录更新日志"
                    href="/admin/changelogs/edit"
                    gradient="from-pink-500/20 to-pink-600/10"
                    iconColor="text-pink-500"
                    delay={2}
                  />
                  <QuickActionCard
                    icon={ClipboardList}
                    label="添加待办"
                    description="创建新的待办"
                    href="/admin/todo"
                    gradient="from-orange-500/20 to-orange-600/10"
                    iconColor="text-orange-500"
                    delay={3}
                  />
                  <QuickActionCard
                    icon={Upload}
                    label="上传图片"
                    description="管理图片资源"
                    href="/admin/gallery/local"
                    gradient="from-purple-500/20 to-purple-600/10"
                    iconColor="text-purple-500"
                    delay={4}
                  />
                  <QuickActionCard
                    icon={Database}
                    label="本地备份"
                    description="备份博客数据"
                    href="/admin/backup"
                    gradient="from-gray-500/20 to-gray-600/10"
                    iconColor="text-gray-500 dark:text-gray-400"
                    delay={5}
                  />
                </div>
              </div>
            </AdminCard>
          </motion.div>

          {/* 第二模块：分类分布和类型分布 - 左右水平排列 */}
          <motion.div variants={itemVariants}>
            <div className="grid grid-cols-2 gap-6">
              {/* 文章分类分布 - 始终显示 */}
              <CategoryPieChart
                categories={stats.categoryStats}
                selectedCategory={selectedCategory}
                onSelect={setSelectedCategory}
              />
              {/* 更新日志类型分布 - 有数据时显示 */}
              {changelogsData.length > 0 && (
                <TypeStatsChart changelogs={changelogsData} />
              )}
            </div>
          </motion.div>

          {/* 第三模块：待办进度 - 悬浮卡片 */}
          {stats.todoCount > 0 && (
            <motion.div variants={itemVariants}>
              <AdminCard title="待办进度">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <CircularProgress
                      value={stats.todoCompletedCount}
                      max={stats.todoCount}
                      color="#66ccff"
                    />
                    <div>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        {stats.todoCompletedCount}/{stats.todoCount}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        待办事项完成进度
                      </p>
                      <Link 
                        href="/admin/todo"
                        className="inline-flex items-center mt-2 text-sm text-[#66ccff] hover:underline"
                      >
                        查看待办列表
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </div>
                  </div>
                </div>
              </AdminCard>
            </motion.div>
          )}

          {/* 第四模块：更新日志时间趋势 - 100%复制的面积图 */}
          {changelogsData.length > 0 && (
            <motion.div variants={itemVariants}>
              <TimeStatsChart changelogs={changelogsData} />
            </motion.div>
          )}
        </div>

        {/* 右侧副栏：辅助信息与快捷功能（占4份，约33%） */}
        <div className="xl:col-span-4 space-y-6">
          {/* 第一模块：热门标签 - 标签云/瀑布流 */}
          <motion.div variants={itemVariants}>
            <AdminCard 
              title="热门标签"
              actions={selectedTag && (
                <button
                  onClick={() => setSelectedTag(null)}
                  className="text-sm text-[#66ccff] hover:underline"
                >
                  清除
                </button>
              )}
            >
              <TagCloud
                tags={stats.tagStats}
                selectedTag={selectedTag}
                onSelect={setSelectedTag}
              />
            </AdminCard>
          </motion.div>

          {/* 第二模块：统计 - 数据概览卡片 */}
          <motion.div variants={itemVariants}>
            <AdminCard title="统计">
              <div className="grid grid-cols-2 gap-3">
                {/* 第一行：文章总数 + 文章字数 */}
                <StatOverviewCard
                  icon={FileText}
                  value={stats.blogCount}
                  label="文章总数"
                  gradient="bg-blue-100 dark:bg-blue-900/30"
                  iconColor="text-blue-500"
                  delay={0}
                />
                <TrendCard
                  icon={Type}
                  value={stats.blogWordCount}
                  label="文章字数"
                  gradient="bg-cyan-100 dark:bg-cyan-900/30"
                  iconColor="text-cyan-500"
                  delay={1}
                />
                {/* 第二行：动态总数 + 动态字数 */}
                <StatOverviewCard
                  icon={MessageSquare}
                  value={stats.momentCount}
                  label="动态总数"
                  gradient="bg-green-100 dark:bg-green-900/30"
                  iconColor="text-green-500"
                  delay={2}
                />
                <TrendCard
                  icon={MessageSquare}
                  value={stats.momentWordCount}
                  label="动态字数"
                  gradient="bg-lime-100 dark:bg-lime-900/30"
                  iconColor="text-lime-500"
                  delay={3}
                />
                {/* 第三行：更新日志 + 日志字数 */}
                <TrendCard
                  icon={History}
                  value={stats.changelogCount}
                  label="更新日志"
                  gradient="bg-pink-100 dark:bg-pink-900/30"
                  iconColor="text-pink-500"
                  delay={4}
                />
                <TrendCard
                  icon={History}
                  value={stats.changelogWordCount}
                  label="日志字数"
                  gradient="bg-rose-100 dark:bg-rose-900/30"
                  iconColor="text-rose-500"
                  delay={5}
                />
                {/* 第四行：文章分类 + 标签总数 */}
                <TrendCard
                  icon={Folder}
                  value={stats.categoryStats.length}
                  label="文章分类"
                  gradient="bg-indigo-100 dark:bg-indigo-900/30"
                  iconColor="text-indigo-500"
                  delay={6}
                />
                <TrendCard
                  icon={Tag}
                  value={stats.tagStats.length}
                  label="标签总数"
                  gradient="bg-teal-100 dark:bg-teal-900/30"
                  iconColor="text-teal-500"
                  delay={7}
                />
                {/* 第五行：图片总数 + 已完成待办 */}
                <StatOverviewCard
                  icon={Image}
                  value={stats.imageCount}
                  label="图片总数"
                  gradient="bg-purple-100 dark:bg-purple-900/30"
                  iconColor="text-purple-500"
                  delay={8}
                />
                <StatOverviewCard
                  icon={CheckCircle2}
                  value={stats.todoCompletedCount}
                  label="已完成待办"
                  gradient="bg-orange-100 dark:bg-orange-900/30"
                  iconColor="text-orange-500"
                  delay={9}
                />
              </div>
            </AdminCard>
          </motion.div>

          {/* 第三模块：快速入口/常用工具 */}
          <motion.div variants={itemVariants}>
            <AdminCard title="快速入口">
              <div className="space-y-2">
                <QuickLink
                  icon={ExternalLink}
                  label="博客前台"
                  href="/"
                  external
                />
                <QuickLink
                  icon={Settings}
                  label="系统设置"
                  href="/admin/settings"
                />
                <QuickLink
                  icon={HelpCircle}
                  label="帮助中心"
                  href="/admin/help"
                />
              </div>
            </AdminCard>
          </motion.div>

          {/* 底部：版权信息 */}
          <motion.p 
            variants={itemVariants}
            className="text-center text-xs text-gray-400 dark:text-gray-500 pt-4"
          >
            © 2026 洛天依主题博客 · 管理后台
          </motion.p>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardClient;
