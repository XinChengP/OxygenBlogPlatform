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
  CheckCircle,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { AdminCard } from '@/components/admin';
import { cn } from '@/utils/cn';
import type { DashboardStats, ActivityRecord, SystemStatus } from '@/utils/adminUtils';

/**
 * 仪表盘客户端组件属性接口
 */
interface DashboardClientProps {
  /** 统计数据 */
  stats: DashboardStats;
  /** 最近活动记录 */
  activities: ActivityRecord[];
  /** 系统状态 */
  systemStatus: SystemStatus;
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
  iconBgColor = 'bg-[#66ccff]/20',
  iconColor = 'text-[#66ccff]',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md p-6 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between">
        {/* 左侧：图标 */}
        <div className={cn('p-3 rounded-xl', iconBgColor)}>
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>

        {/* 右侧：趋势指示 */}
        {trend !== undefined && (
          <div className={cn(
            'flex items-center space-x-1 text-sm',
            trend >= 0 ? 'text-green-500' : 'text-red-500'
          )}>
            <TrendingUp className={cn('w-4 h-4', trend < 0 && 'rotate-180')} />
            <span>{Math.abs(trend)}</span>
          </div>
        )}
      </div>

      {/* 数值 */}
      <div className="mt-4">
        <span className="text-3xl font-bold text-gray-900 dark:text-white">
          {value.toLocaleString()}
        </span>
      </div>

      {/* 标签 */}
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {label}
      </p>

      {/* 趋势标签 */}
      {trendLabel && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
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
  bgColor = 'bg-[#66ccff]/10 hover:bg-[#66ccff]/20',
  iconColor = 'text-[#66ccff]',
}) => {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'flex flex-col items-center justify-center p-6 rounded-xl',
          'border border-gray-200/50 dark:border-gray-700/50',
          'bg-white/50 dark:bg-gray-800/50',
          'hover:shadow-md transition-all duration-300',
          'cursor-pointer group',
          bgColor
        )}
      >
        {/* 图标 */}
        <div className={cn('p-3 rounded-xl mb-3', bgColor)}>
          <Icon className={cn('w-6 h-6', iconColor)} />
        </div>

        {/* 标签 */}
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-[#66ccff] transition-colors">
          {label}
        </span>
      </motion.div>
    </Link>
  );
};

/**
 * 活动记录项属性接口
 */
interface ActivityItemProps {
  /** 活动记录 */
  activity: ActivityRecord;
}

/**
 * 活动记录项组件
 * 显示单条操作记录
 */
const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  /**
   * 获取操作类型对应的图标和颜色
   */
  const getActionConfig = () => {
    switch (activity.action) {
      case 'create':
        return {
          icon: Sparkles,
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          iconColor: 'text-green-500',
          label: '创建',
        };
      case 'update':
        return {
          icon: CheckCircle,
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          iconColor: 'text-blue-500',
          label: '更新',
        };
      case 'delete':
        return {
          icon: XCircle,
          bgColor: 'bg-red-100 dark:bg-red-900/30',
          iconColor: 'text-red-500',
          label: '删除',
        };
      default:
        return {
          icon: Clock,
          bgColor: 'bg-gray-100 dark:bg-gray-700',
          iconColor: 'text-gray-500',
          label: '未知',
        };
    }
  };

  /**
   * 获取资源类型对应的标签
   */
  const getResourceLabel = () => {
    switch (activity.resource) {
      case 'blog':
        return '文章';
      case 'moment':
        return '动态';
      case 'image':
        return '图片';
      default:
        return '未知';
    }
  };

  /**
   * 格式化时间为相对时间
   */
  const formatRelativeTime = (time: string) => {
    const now = new Date();
    const date = new Date(time);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} 分钟前`;
    } else if (diffHours < 24) {
      return `${diffHours} 小时前`;
    } else if (diffDays < 7) {
      return `${diffDays} 天前`;
    } else {
      return date.toLocaleDateString('zh-CN');
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  return (
    <div className="flex items-center space-x-4 py-3 border-b border-gray-100 dark:border-gray-700/50 last:border-0">
      {/* 操作类型图标 */}
      <div className={cn('p-2 rounded-lg', config.bgColor)}>
        <Icon className={cn('w-4 h-4', config.iconColor)} />
      </div>

      {/* 操作详情 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className={cn('text-xs px-2 py-0.5 rounded-full', config.bgColor, config.iconColor)}>
            {config.label}
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {getResourceLabel()}
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 truncate">
          {activity.resourceName}
        </p>
      </div>

      {/* 操作时间 */}
      <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
        {formatRelativeTime(activity.time)}
      </div>
    </div>
  );
};

/**
 * 系统状态卡片组件
 * 显示 GitHub 连接状态、存储空间和同步时间
 */
const SystemStatusCard: React.FC<{ status: SystemStatus }> = ({ status }) => {
  /**
   * 计算存储空间使用百分比
   */
  const storagePercent = status.storageTotal > 0
    ? Math.round((status.storageUsed / status.storageTotal) * 100)
    : 0;

  /**
   * 格式化存储空间大小
   */
  const formatStorage = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  /**
   * 格式化最后同步时间
   */
  const formatSyncTime = (time: string | null) => {
    if (!time) return '从未同步';
    const date = new Date(time);
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* GitHub 连接状态 */}
      <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'p-2 rounded-lg',
            status.githubConnected
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-red-100 dark:bg-red-900/30'
          )}>
            <svg className={cn(
              'w-5 h-5',
              status.githubConnected ? 'text-green-500' : 'text-red-500'
            )} viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              GitHub 连接
            </p>
            <p className={cn(
              'text-xs',
              status.githubConnected ? 'text-green-500' : 'text-red-500'
            )}>
              {status.githubConnected ? '已连接' : '未连接'}
            </p>
          </div>
        </div>
        <div className={cn(
          'w-3 h-3 rounded-full',
          status.githubConnected ? 'bg-green-500' : 'bg-red-500'
        )} />
      </div>

      {/* 存储空间使用情况 */}
      <div className="py-3 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#66ccff]/20">
              <Upload className="w-5 h-5 text-[#66ccff]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                存储空间
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {formatStorage(status.storageUsed)} / {formatStorage(status.storageTotal)}
              </p>
            </div>
          </div>
          <span className={cn(
            'text-sm font-medium',
            storagePercent > 80 ? 'text-red-500' : storagePercent > 60 ? 'text-yellow-500' : 'text-green-500'
          )}>
            {storagePercent}%
          </span>
        </div>
        {/* 进度条 */}
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${storagePercent}%` }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={cn(
              'h-full rounded-full',
              storagePercent > 80 ? 'bg-red-500' : storagePercent > 60 ? 'bg-yellow-500' : 'bg-green-500'
            )}
          />
        </div>
      </div>

      {/* 最后同步时间 */}
      <div className="flex items-center justify-between py-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
            <Clock className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              最后同步
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {formatSyncTime(status.lastSyncTime)}
            </p>
          </div>
        </div>
        <button className="text-xs text-[#66ccff] hover:underline">
          立即同步
        </button>
      </div>
    </div>
  );
};

/**
 * 仪表盘客户端组件
 * 主仪表盘页面，包含统计卡片、快捷操作、最近活动和系统状态
 */
const DashboardClient: React.FC<DashboardClientProps> = ({
  stats,
  activities,
  systemStatus,
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

      {/* 最近活动和系统状态 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最近活动列表 */}
        <div className="lg:col-span-2">
          <AdminCard
            title="最近活动"
            actions={
              <Link
                href="/admin/activities"
                className="flex items-center space-x-1 text-sm text-[#66ccff] hover:underline"
              >
                <span>查看全部</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            }
          >
            {activities.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {activities.map((activity) => (
                  <ActivityItem key={activity.id} activity={activity} />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 dark:text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>暂无活动记录</p>
              </div>
            )}
          </AdminCard>
        </div>

        {/* 系统状态 */}
        <div className="lg:col-span-1">
          <AdminCard title="系统状态">
            <SystemStatusCard status={systemStatus} />
          </AdminCard>
        </div>
      </div>
    </div>
  );
};

export default DashboardClient;
