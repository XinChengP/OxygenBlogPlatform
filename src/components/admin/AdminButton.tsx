'use client';

import React from 'react';
import { cn } from '@/utils/cn';

/**
 * 按钮类型定义
 */
type ButtonType = 'primary' | 'secondary' | 'danger' | 'ghost';

/**
 * 按钮尺寸定义
 */
type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * 管理后台按钮组件属性接口
 */
interface AdminButtonProps {
  /** 按钮内容 */
  children: React.ReactNode;
  /** 按钮类型 */
  type?: ButtonType;
  /** 按钮尺寸 */
  size?: ButtonSize;
  /** 是否显示加载状态 */
  loading?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 点击事件处理函数 */
  onClick?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 按钮类型属性 */
  htmlType?: 'button' | 'submit' | 'reset';
  /** 图标组件 */
  icon?: React.ReactNode;
}

/**
 * 获取按钮类型对应的样式类名
 * @param type - 按钮类型
 * @returns 样式类名字符串
 */
const getButtonTypeStyles = (type: ButtonType): string => {
  const styles: Record<ButtonType, string> = {
    // 主按钮：天依蓝主色调
    primary: cn(
      'bg-[#66ccff] text-white',
      'hover:bg-[#55bbef] active:bg-[#44aade]',
      'shadow-md hover:shadow-lg',
      'dark:bg-[#66ccff] dark:hover:bg-[#77ddff]'
    ),
    // 次要按钮：灰色背景
    secondary: cn(
      'bg-gray-100 text-gray-700',
      'hover:bg-gray-200 active:bg-gray-300',
      'dark:bg-gray-700 dark:text-gray-200',
      'dark:hover:bg-gray-600 dark:active:bg-gray-500'
    ),
    // 危险按钮：红色警告
    danger: cn(
      'bg-red-500 text-white',
      'hover:bg-red-600 active:bg-red-700',
      'shadow-md hover:shadow-lg',
      'dark:bg-red-600 dark:hover:bg-red-700'
    ),
    // 幽灵按钮：透明背景
    ghost: cn(
      'bg-transparent text-gray-700',
      'hover:bg-gray-100 active:bg-gray-200',
      'dark:text-gray-300 dark:hover:bg-gray-800 dark:active:bg-gray-700'
    ),
  };
  return styles[type];
};

/**
 * 获取按钮尺寸对应的样式类名
 * @param size - 按钮尺寸
 * @returns 样式类名字符串
 */
const getButtonSizeStyles = (size: ButtonSize): string => {
  const styles: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  return styles[size];
};

/**
 * AdminButton - 管理后台按钮组件
 * 
 * 功能特点：
 * - 天依蓝主色调
 * - 支持加载状态
 * - 支持禁用状态
 * - 多种按钮类型和尺寸
 * 
 * @param props - 组件属性
 * @returns 按钮组件
 */
const AdminButton: React.FC<AdminButtonProps> = ({
  children,
  type = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  onClick,
  className,
  htmlType = 'button',
  icon,
}) => {
  // 计算是否禁用（加载状态时也禁用）
  const isDisabled = disabled || loading;

  /**
   * 处理点击事件
   * 如果按钮处于加载或禁用状态，则不触发点击事件
   */
  const handleClick = () => {
    if (!isDisabled && onClick) {
      onClick();
    }
  };

  return (
    <button
      type={htmlType}
      onClick={handleClick}
      disabled={isDisabled}
      className={cn(
        // 基础样式
        'inline-flex items-center justify-center',
        'rounded-lg font-medium',
        'transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50 focus:ring-offset-2',
        'dark:focus:ring-offset-gray-900',
        // 禁用状态样式
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none',
        // 类型样式
        getButtonTypeStyles(type),
        // 尺寸样式
        getButtonSizeStyles(size),
        className
      )}
    >
      {/* 加载状态指示器 */}
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {/* 图标 */}
      {icon && <span className="mr-2">{icon}</span>}
      {/* 按钮内容 */}
      {children}
    </button>
  );
};

export default AdminButton;
