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
 * 统计卡片属性接口
 */
interface StatCardProps {
  /** 图标组件 */
  icon: React.ElementType;
  /** 数值 */
  value: number;
  /** 标签 */
  label: string;
  /** 趋势数值 */
  trend?: number;
  /** 趋势标签 */
  trendLabel?: string;
  /** 图标背景颜色 */
  iconBgColor?: string;
  /** 图标颜色 */
  iconColor?: string;
}

/**
 * 统计卡片组件
 * 显示单个统计数据，包含图标、数值、标签和趋势指示
 */
const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  value,
  label,
  trend,
  trendLabel,
  iconBgColor = 'bg-gradient-to-br from-[#66ccff]/30 to-[#66ccff]/10',
  iconColor = 'text-[#66ccff]',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ 
        y: -4, 
        boxShadow: '0 20px 40px -10px rgba(102, 204, 255, 0.2)',
        transition: { duration: 0.2 }
      }}
      className="relative overflow-hidden rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-6 group cursor-pointer"
    >
      {/* 背景光效 */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#66ccff]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* 顶部装饰线 */}
      <motion.div 
        className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#66ccff]/50 to-transparent"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      />

      <div className="relative flex items-start justify-between">
        {/* 左侧：图标 */}
        <motion.div 
          className={cn('p-3.5 rounded-2xl shadow-lg shadow-[#66ccff]/20', iconBgColor)}
          whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
          transition={{ duration: 0.5 }}
        >
          <Icon className={cn('w-6 h-6', iconColor)} />
        </motion.div>

        {/* 右侧：趋势指示 */}
        {trend !== undefined && (
          <motion.div 
            className={cn(
              'flex items-center space-x-1.5 text-sm px-2.5 py-1 rounded-full',
              trend >= 0 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' 
                : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
            )}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TrendingUp className={cn('w-3.5 h-3.5', trend < 0 && 'rotate-180')} />
            <span className="font-medium">{Math.abs(trend)}%</span>
          </motion.div>
        )}
      </div>

      {/* 数值 */}
      <div className="relative mt-5">
        <motion.span 
          className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, type: 'spring' }}
        >
          {value.toLocaleString()}
        </motion.span>
      </div>

      {/* 标签 */}
      <p className="relative mt-2 text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>

      {/* 趋势标签 */}
      {trendLabel && (
        <p className="relative mt-3 text-xs text-gray-400 dark:text-gray-500 flex items-center">
          <span className="w-1.5 h-1.5 rounded-full bg-[#66ccff] mr-2 animate-pulse" />
          {trendLabel}
        </p>
      )}
    </motion.div>
  );
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
  bgColor = 'from-[#66ccff]/20 to-[#66ccff]/5',
  iconColor = 'text-[#66ccff]',
}) => {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ 
          scale: 1.03, 
          y: -2,
          boxShadow: '0 15px 30px -10px rgba(102, 204, 255, 0.25)'
        }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          'relative overflow-hidden flex flex-col items-center justify-center p-6 rounded-2xl',
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
        
        {/* 角落装饰 */}
        <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-[#66ccff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-bl-full" />

        {/* 图标 */}
        <motion.div 
          className={cn(
            'relative p-4 rounded-2xl mb-3',
            'bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-700/80 dark:to-gray-700/40',
            'shadow-lg shadow-[#66ccff]/10',
            'border border-white/50 dark:border-gray-600/50'
          )}
          whileHover={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.5 }}
        >
          <Icon className={cn('w-6 h-6', iconColor)} />
        </motion.div>

        {/* 标签 */}
        <span className="relative text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-[#66ccff] transition-colors duration-300">
          {label}
        </span>
        
        {/* 底部指示线 */}
        <motion.div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-1 bg-gradient-to-r from-transparent via-[#66ccff] to-transparent rounded-full"
          initial={{ width: 0, opacity: 0 }}
          whileHover={{ width: '60%', opacity: 1 }}
          transition={{ duration: 0.3 }}
        />
      </motion.div>
    </Link>
  );
};

/**
 * 仪表盘客户端组件
 * 主仪表盘页面，包含统计卡片和快捷操作
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

      {/* 统计卡片区域 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileText}
          value={stats.blogCount}
          label="文章总数"
          trend={stats.monthlyBlogCount > 0 ? stats.monthlyBlogCount : undefined}
          trendLabel={stats.monthlyBlogCount > 0 ? `本月新增 ${stats.monthlyBlogCount} 篇` : undefined}
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-500"
        />
        <StatCard
          icon={MessageSquare}
          value={stats.momentCount}
          label="动态总数"
          iconBgColor="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-500"
        />
        <StatCard
          icon={Image}
          value={stats.imageCount}
          label="图片总数"
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-500"
        />
        <StatCard
          icon={TrendingUp}
          value={stats.monthlyBlogCount}
          label="本月新增文章"
          iconBgColor="bg-orange-100 dark:bg-orange-900/30"
          iconColor="text-orange-500"
        />
      </div>

      {/* 快捷操作区域 */}
      <AdminCard title="快捷操作">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <QuickAction
            icon={Plus}
            label="新建文章"
            href="/admin/blogs/edit"
            bgColor="bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            iconColor="text-blue-500"
          />
          <QuickAction
            icon={MessageSquare}
            label="发布动态"
            href="/admin/moments/edit"
            bgColor="bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30"
            iconColor="text-green-500"
          />
          <QuickAction
            icon={Upload}
            label="上传图片"
            href="/admin/gallery/local"
            bgColor="bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30"
            iconColor="text-purple-500"
          />
          <QuickAction
            icon={Settings}
            label="系统设置"
            href="/admin/settings"
            bgColor="bg-gray-50 dark:bg-gray-700/20 hover:bg-gray-100 dark:hover:bg-gray-700/30"
            iconColor="text-gray-500 dark:text-gray-400"
          />
        </div>
      </AdminCard>
    </div>
  );
};

export default DashboardClient;
