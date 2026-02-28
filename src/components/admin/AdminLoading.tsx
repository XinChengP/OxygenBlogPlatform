'use client';

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * 加载类型定义
 */
type LoadingType = 'spinner' | 'dots' | 'skeleton';

/**
 * 管理后台加载状态组件属性接口
 */
interface AdminLoadingProps {
  /** 加载类型 */
  type?: LoadingType;
  /** 加载提示文本 */
  text?: string;
  /** 是否全屏显示 */
  fullScreen?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * Spinner 加载动画组件
 * @returns Spinner 动画 JSX
 */
const SpinnerLoader: React.FC = () => (
  <div className="flex flex-col items-center space-y-3">
    {/* 旋转加载动画 */}
    <div className="relative w-12 h-12">
      <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
      <div className="absolute inset-0 rounded-full border-4 border-[#66ccff] border-t-transparent animate-spin"></div>
    </div>
  </div>
);

/**
 * Dots 加载动画组件
 * @returns Dots 动画 JSX
 */
const DotsLoader: React.FC = () => (
  <div className="flex items-center space-x-2">
    {/* 三个跳动圆点 */}
    <div className="w-3 h-3 rounded-full bg-[#66ccff] animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="w-3 h-3 rounded-full bg-[#66ccff] animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="w-3 h-3 rounded-full bg-[#66ccff] animate-bounce" style={{ animationDelay: '300ms' }}></div>
  </div>
);

/**
 * Skeleton 骨架屏组件
 * @returns 骨架屏 JSX
 */
const SkeletonLoader: React.FC = () => (
  <div className="w-full space-y-4">
    {/* 标题骨架 */}
    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/3 animate-pulse"></div>
    {/* 内容骨架 */}
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6 animate-pulse"></div>
    </div>
    {/* 卡片骨架 */}
    <div className="flex space-x-4 pt-2">
      <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2 animate-pulse"></div>
      <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2 animate-pulse"></div>
    </div>
  </div>
);

/**
 * AdminLoading - 管理后台加载状态组件
 * 
 * 功能特点：
 * - 多种加载样式（spinner、dots、skeleton）
 * - 全屏加载模式
 * - 骨架屏模式
 * - 支持加载提示文本
 * 
 * @param props - 组件属性
 * @returns 加载状态组件
 */
const AdminLoading: React.FC<AdminLoadingProps> = ({
  type = 'spinner',
  text,
  fullScreen = false,
  className,
}) => {
  /**
   * 根据类型渲染对应的加载动画
   */
  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return <DotsLoader />;
      case 'skeleton':
        return <SkeletonLoader />;
      case 'spinner':
      default:
        return <SpinnerLoader />;
    }
  };

  // 加载内容
  const loadingContent = (
    <div className={cn(
      'flex flex-col items-center justify-center',
      type !== 'skeleton' && 'py-8',
      className
    )}>
      {/* 加载动画 */}
      {renderLoader()}
      {/* 加载提示文本 */}
      {text && type !== 'skeleton' && (
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          {text}
        </p>
      )}
    </div>
  );

  // 全屏模式
  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        {loadingContent}
      </div>
    );
  }

  return loadingContent;
};

/**
 * 表格骨架屏组件
 * 用于表格加载时的占位显示
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="w-full">
    {/* 表头骨架 */}
    <div className="flex space-x-4 p-4 border-b border-gray-200 dark:border-gray-700">
      {Array.from({ length: columns }).map((_, i) => (
        <div key={i} className="flex-1">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse"></div>
        </div>
      ))}
    </div>
    {/* 表格行骨架 */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4 p-4 border-b border-gray-100 dark:border-gray-800">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <div key={colIndex} className="flex-1">
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full animate-pulse"></div>
          </div>
        ))}
      </div>
    ))}
  </div>
);

/**
 * 卡片骨架屏组件
 * 用于卡片加载时的占位显示
 */
export const CardSkeleton: React.FC = () => (
  <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-800/70 p-6">
    <div className="space-y-4">
      {/* 标题骨架 */}
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse"></div>
      {/* 内容骨架 */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 animate-pulse"></div>
      </div>
      {/* 操作按钮骨架 */}
      <div className="flex space-x-2 pt-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse"></div>
      </div>
    </div>
  </div>
);

export default AdminLoading;
