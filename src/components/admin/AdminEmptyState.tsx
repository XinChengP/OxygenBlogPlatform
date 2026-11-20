'use client';

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * 管理后台空状态组件属性接口
 */
interface AdminEmptyStateProps {
  /** 图标，尺寸由调用方控制（建议 w-12 h-12） */
  icon?: React.ReactNode;
  /** 主标题 */
  title: string;
  /** 补充说明 */
  description?: string;
  /** 行动区域，如「新建文章」按钮 */
  action?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * AdminEmptyState - 管理后台统一的空状态
 *
 * 背景：
 * 原来表格内置一版空状态、文章页自定义一版、动态页与待办页又各写一版，
 * 图标、间距、文案层级都不一致。统一到这里后，所有「没有数据」的场景
 * 保持同一套视觉与语义结构。
 */
const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12', className)}>
      {icon && (
        <div className="mb-3 text-gray-300 dark:text-gray-600" aria-hidden="true">
          {icon}
        </div>
      )}
      <h3 className="text-base font-medium text-card-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default AdminEmptyState;
