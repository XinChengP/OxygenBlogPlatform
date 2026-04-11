'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  FileText,
  MessageSquare,
  Image,
  TrendingUp,
  Plus,
  Upload,
  Settings,
  CheckCircle2,
  Clock,
  Tag,
  Folder,
  History,
  ArrowRight,
} from 'lucide-react';
import { AdminCard } from '@/components/admin';
import { cn } from '@/utils/cn';
import type { DashboardStats } from '@/utils/adminUtils';

/**
 * 仪表盘客户端组件属性接口
 */
interface DashboardClientProps {
  /** 统计数据 */
  stats: DashboardStats;
}

/**
 * 统计卡片属性接口（小型版本，用于侧边栏）
 */
interface MiniStatCardProps {
  /** 图标组件 */
  icon: React.ElementType;
  /** 数值 */
  value: number;
  /** 标签 */
  label: string;
  /** 图标背景颜色 */
  iconBgColor?: string;
  /** 图标颜色 */
  iconColor?: string;
  /** 链接地址 */
  href?: string;
}

/**
 * 小型统计卡片组件
 * 用于侧边栏显示统计数据，更加紧凑
 */
const MiniStatCard: React.FC<MiniStatCardProps> = ({
  icon: Icon,
  value,
  label,
  iconBgColor = 'bg-gradient-to-br from-[#66ccff]/30 to-[#66ccff]/10',
  iconColor = 'text-[#66ccff]',
  href,
}) => {
  const CardContent = (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ 
        x: 4,
        transition: { duration: 0.2 }
      }}
      className="relative flex items-center space-x-3 p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl group cursor-pointer hover:bg-white/80 dark:hover:bg-gray-800/80 transition-colors"
    >
      {/* 图标 */}
      <div className={cn('p-2.5 rounded-xl shadow-md', iconBgColor)}>
        <Icon className={cn('w-4 h-4', iconColor)} />
      </div>

      {/* 数值和标签 */}
      <div className="flex-1 min-w-0">
        <p className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
          {value.toLocaleString()}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {label}
        </p>
      </div>

      {/* 箭头指示 */}
      {href && (
        <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
};

/**
 * 快捷操作按钮属性接口
 */
interface QuickActionProps {
  /** 图标组件 */
  icon: React.ElementType;
  /** 标签 */
  label: string;
  /** 链接地址 */
  href: string;
  /** 描述文字 */
  description?: string;
  /** 图标背景颜色 */
  bgColor?: string;
  /** 图标颜色 */
  iconColor?: string;
}

/**
 * 快捷操作按钮组件
 * 提供快速访问常用功能的入口
 */
const QuickAction: React.FC<QuickActionProps> = ({
  icon: Icon,
  label,
  href,
  description,
  bgColor = 'from-[#66ccff]/20 to-[#66ccff]/5',
  iconColor = 'text-[#66ccff]',
}) => {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ 
          scale: 1.02, 
          y: -3,
          boxShadow: '0 20px 40px -10px rgba(102, 204, 255, 0.2)'
        }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'relative overflow-hidden flex items-center space-x-4 p-5 rounded-2xl',
          'border border-gray-200/50 dark:border-gray-700/50',
          'bg-gradient-to-br from-white/90 to-white/50 dark:from-gray-800/90 dark:to-gray-800/50',
          'backdrop-blur-xl',
          'transition-all duration-300',
          'cursor-pointer group'
        )}
      >
        {/* 背景光效 */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          bgColor
        )} />
        
        {/* 左侧装饰线 */}
        <motion.div 
          className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#66ccff]/50 to-transparent rounded-l-2xl"
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        />

        {/* 图标 */}
        <motion.div 
          className={cn(
            'relative p-4 rounded-2xl shrink-0',
            'bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-700/80 dark:to-gray-700/40',
            'shadow-lg shadow-[#66ccff]/10',
            'border border-white/50 dark:border-gray-600/50'
          )}
          whileHover={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Icon className={cn('w-6 h-6', iconColor)} />
        </motion.div>

        {/* 文字内容 */}
        <div className="relative flex-1 min-w-0">
          <span className="text-base font-semibold text-gray-800 dark:text-gray-100 group-hover:text-[#66ccff] transition-colors duration-300 block">
            {label}
          </span>
          {description && (
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate block mt-0.5">
              {description}
            </span>
          )}
        </div>

        {/* 右侧箭头 */}
        <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#66ccff] group-hover:translate-x-1 transition-all duration-300 shrink-0" />
      </motion.div>
    </Link>
  );
};

/**
 * 进度条组件
 */
interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  color?: string;
  showPercentage?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  value, 
  max, 
  label, 
  color = '#66ccff',
  showPercentage = true 
}) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">{value}/{max}</span>
          {showPercentage && (
            <span className="text-sm font-bold" style={{ color }}>{percentage}%</span>
          )}
        </div>
      </div>
      <div className="h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
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
  label: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  color = '#66ccff',
  label
}) => {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
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
          <span className="text-2xl font-bold" style={{ color }}>{percentage}%</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{value}/{max}</span>
        </div>
      </div>
      <span className="mt-3 text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </div>
  );
};

/**
 * 标签云组件
 */
interface TagCloudProps {
  tags: { name: string; count: number }[];
}

const TagCloud: React.FC<TagCloudProps> = ({ tags }) => {
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
      {tags.slice(0, 15).map((tag, index) => {
        const size = maxCount > 0 ? 0.75 + (tag.count / maxCount) * 0.4 : 1;
        return (
          <motion.span
            key={tag.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className="inline-flex items-center px-2.5 py-1 rounded-full text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-[#66ccff]/10 hover:text-[#66ccff] transition-colors cursor-pointer"
            style={{ fontSize: `${size}rem` }}
          >
            {tag.name}
            <span className="ml-1 text-xs text-gray-400">{tag.count}</span>
          </motion.span>
        );
      })}
    </div>
  );
};

/**
 * 仪表盘客户端组件
 * 采用左右布局：左侧70%功能区域，右侧30%统计信息
 */
const DashboardClient: React.FC<DashboardClientProps> = ({
  stats,
}) => {
  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            仪表盘
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            欢迎回来，这是您的博客管理概览
          </p>
        </div>
        <div className="text-sm text-gray-400 dark:text-gray-500">
          {new Date().toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long',
          })}
        </div>
      </div>

      {/* 主内容区域：左右布局（左7右3） */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 左侧区域：功能UI（占7份） */}
        <div className="lg:col-span-8 space-y-6">
          {/* 快捷操作区域 */}
          <AdminCard title="快捷操作">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <QuickAction
                icon={Plus}
                label="新建文章"
                description="撰写并发布新博客文章"
                href="/admin/blogs/edit"
                bgColor="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                iconColor="text-blue-500"
              />
              <QuickAction
                icon={MessageSquare}
                label="发布动态"
                description="分享您的即时想法和动态"
                href="/admin/moments/edit"
                bgColor="bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
                iconColor="text-green-500"
              />
              <QuickAction
                icon={Upload}
                label="上传图片"
                description="管理您的图片资源库"
                href="/admin/gallery/local"
                bgColor="bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30"
                iconColor="text-purple-500"
              />
              <QuickAction
                icon={Settings}
                label="系统设置"
                description="配置博客各项参数"
                href="/admin/settings"
                bgColor="bg-gray-50 dark:bg-gray-700/20 hover:bg-gray-100 dark:hover:bg-gray-700/30"
                iconColor="text-gray-500 dark:text-gray-400"
              />
            </div>
          </AdminCard>

          {/* 文章分类分布 */}
          <AdminCard title="文章分类分布">
            {stats.categoryStats.length > 0 ? (
              <div className="space-y-3">
                {stats.categoryStats.map((category, index) => (
                  <ProgressBar
                    key={category.name}
                    label={category.name}
                    value={category.count}
                    max={Math.max(...stats.categoryStats.map(c => c.count))}
                    color={['#66ccff', '#9966ff', '#ff66cc', '#ff9966', '#ccff66'][index % 5]}
                    showPercentage={false}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 dark:text-gray-500 py-8">
                <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无分类数据</p>
              </div>
            )}
          </AdminCard>

          {/* 热门标签 */}
          <AdminCard title="热门标签">
            <TagCloud tags={stats.tagStats} />
          </AdminCard>
        </div>

        {/* 右侧区域：统计信息（占4份，约33%） */}
        <div className="lg:col-span-4 space-y-6">
          {/* 待办事项进度 - 使用环形进度条 */}
          {stats.todoCount > 0 && (
            <AdminCard title="待办进度">
              <div className="flex justify-center py-4">
                <CircularProgress
                  value={stats.todoCompletedCount}
                  max={stats.todoCount}
                  label="完成率"
                  color="#66ccff"
                />
              </div>
            </AdminCard>
          )}

          {/* 核心统计数据 */}
          <AdminCard title="数据概览">
            <div className="space-y-3">
              <MiniStatCard
                icon={FileText}
                value={stats.blogCount}
                label="文章总数"
                iconBgColor="bg-blue-100 dark:bg-blue-900/30"
                iconColor="text-blue-500"
                href="/admin/blogs"
              />
              <MiniStatCard
                icon={MessageSquare}
                value={stats.momentCount}
                label="动态总数"
                iconBgColor="bg-green-100 dark:bg-green-900/30"
                iconColor="text-green-500"
                href="/admin/moments"
              />
              <MiniStatCard
                icon={Image}
                value={stats.imageCount}
                label="图片总数"
                iconBgColor="bg-purple-100 dark:bg-purple-900/30"
                iconColor="text-purple-500"
                href="/admin/gallery/local"
              />
              <MiniStatCard
                icon={CheckCircle2}
                value={stats.todoCompletedCount}
                label="已完成待办"
                iconBgColor="bg-orange-100 dark:bg-orange-900/30"
                iconColor="text-orange-500"
                href="/admin/todo"
              />
            </div>
          </AdminCard>

          {/* 次要统计数据 */}
          <AdminCard title="其他统计">
            <div className="space-y-3">
              <MiniStatCard
                icon={History}
                value={stats.changelogCount}
                label="更新日志"
                iconBgColor="bg-pink-100 dark:bg-pink-900/30"
                iconColor="text-pink-500"
                href="/admin/changelogs"
              />
              <MiniStatCard
                icon={Folder}
                value={stats.categoryStats.length}
                label="文章分类"
                iconBgColor="bg-cyan-100 dark:bg-cyan-900/30"
                iconColor="text-cyan-500"
                href="/admin/blogs"
              />
              <MiniStatCard
                icon={Tag}
                value={stats.tagStats.length}
                label="标签总数"
                iconBgColor="bg-indigo-100 dark:bg-indigo-900/30"
                iconColor="text-indigo-500"
                href="/admin/blogs"
              />
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
};

export default DashboardClient;
