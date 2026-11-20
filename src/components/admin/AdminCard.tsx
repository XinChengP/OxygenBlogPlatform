'use client';

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * 管理后台卡片组件属性接口
 */
interface AdminCardProps {
  /** 卡片标题（允许传入图标等富文本） */
  title?: React.ReactNode;
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
  /**
   * 是否启用可交互的悬停反馈
   * 仅真正可点击的卡片（快捷入口、列表项）才应开启；
   * 纯展示卡片开启后会被误认为可点击。
   */
  interactive?: boolean;
}

/**
 * AdminCard - 管理后台卡片组件
 *
 * 功能特点：
 * - 支持可选标题和操作按钮
 * - 毛玻璃效果背景
 * - 深色/浅色模式适配（统一走 shadcn 语义变量，避免与图表卡出现两套底色）
 * - 可选内边距
 * - 可选悬停反馈
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
  interactive = false,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-border',
        // 使用语义变量而非 white/gray-800，保证与仪表盘图表卡、表格表面完全一致
        'bg-card/90 supports-[backdrop-filter]:bg-card/75',
        'backdrop-blur-md',
        'shadow-sm',
        // 默认保持静态；只有明确可点击的卡片才允许抬升
        interactive && 'transition-all duration-300 hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      style={style}
    >
      {/* 卡片头部：标题和操作按钮 */}
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          {/* 标题区域 */}
          {title && (
            <h3 className="text-lg font-semibold text-card-foreground">
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
