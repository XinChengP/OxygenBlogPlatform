'use client';

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * 管理后台卡片组件属性接口
 */
interface AdminCardProps {
  /** 卡片标题 */
  title?: string;
  /** 卡片内容 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 操作按钮区域 */
  actions?: React.ReactNode;
  /** 是否移除内边距 */
  noPadding?: boolean;
  /** 内联样式 */
  style?: React.CSSProperties;
}

/**
 * AdminCard - 管理后台卡片组件
 * 
 * 功能特点：
 * - 支持可选标题和操作按钮
 * - 毛玻璃效果背景
 * - 深色/浅色模式适配
 * - 可选内边距
 * 
 * @param props - 组件属性
 * @returns 卡片组件
 */
const AdminCard: React.FC<AdminCardProps> = ({
  title,
  children,
  className,
  actions,
  noPadding = false,
  style,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-200/50 dark:border-gray-700/50',
        'bg-white/70 dark:bg-gray-800/70',
        'backdrop-blur-md',
        'shadow-sm hover:shadow-md',
        'transition-all duration-300',
        className
      )}
      style={style}
    >
      {/* 卡片头部：标题和操作按钮 */}
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
          {/* 标题区域 */}
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
          )}
          {/* 操作按钮区域 */}
          {actions && (
            <div className="flex items-center space-x-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* 卡片内容区域 */}
      <div className={cn(!noPadding && 'p-6')}>
        {children}
      </div>
    </div>
  );
};

export default AdminCard;
