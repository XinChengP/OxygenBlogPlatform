'use client';

import React, { useState } from 'react';
import { cn } from '@/utils/cn';

/**
 * 输入框类型定义
 */
type InputType = 'text' | 'password' | 'email' | 'number';

/**
 * 管理后台输入框组件属性接口
 */
interface AdminInputProps {
  /** 输入框值 */
  value: string;
  /** 值变化回调函数 */
  onChange: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 输入框类型 */
  type?: InputType;
  /** 是否禁用 */
  disabled?: boolean;
  /** 错误信息 */
  error?: string;
  /** 图标前缀 */
  icon?: React.ReactNode;
  /** 自定义类名 */
  className?: string;
  /** 标签文本 */
  label?: string;
  /** 是否必填 */
  required?: boolean;
  /** 最大长度 */
  maxLength?: number;
  /** 自动聚焦 */
  autoFocus?: boolean;
  /** 名称属性 */
  name?: string;
  /** 自动完成属性 */
  autoComplete?: string;
}

/**
 * AdminInput - 管理后台输入框组件
 * 
 * 功能特点：
 * - 图标前缀支持
 * - 错误状态样式
 * - 禁用状态
 * - 密码显示/隐藏切换
 * - 标签和必填标记
 * 
 * @param props - 组件属性
 * @returns 输入框组件
 */
const AdminInput: React.FC<AdminInputProps> = ({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  error,
  icon,
  className,
  label,
  required = false,
  maxLength,
  autoFocus = false,
  name,
  autoComplete,
}) => {
  // 密码可见性状态
  const [showPassword, setShowPassword] = useState(false);

  // 判断是否为密码类型
  const isPasswordType = type === 'password';
  // 实际显示的输入类型
  const actualType = isPasswordType && showPassword ? 'text' : type;

  /**
   * 处理输入变化事件
   * @param e - 输入事件对象
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  /**
   * 切换密码可见性
   */
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <div className={cn('w-full', className)}>
      {/* 标签区域 */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
          {/* 必填标记 */}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* 输入框容器 */}
      <div className="relative">
        {/* 图标前缀 */}
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
            {icon}
          </div>
        )}

        {/* 输入框 */}
        <input
          type={actualType}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          autoFocus={autoFocus}
          name={name}
          autoComplete={autoComplete}
          className={cn(
            // 基础样式
            'w-full rounded-lg text-sm',
            'bg-white dark:bg-gray-800',
            'text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            // 边框样式
            'border border-gray-200 dark:border-gray-700',
            // 焦点样式
            'focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50',
            'focus:border-[#66ccff]',
            // 过渡动画
            'transition-all duration-200',
            // 内边距
            icon ? 'pl-10 pr-4' : 'px-4',
            isPasswordType ? 'pr-10' : '',
            'py-2.5',
            // 禁用状态
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'disabled:bg-gray-50 dark:disabled:bg-gray-900',
            // 错误状态
            error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500'
          )}
        />

        {/* 密码显示/隐藏按钮 */}
        {isPasswordType && (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              // 睁眼图标
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              // 闭眼图标
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
        )}
      </div>

      {/* 错误信息 */}
      {error && (
        <p className="mt-1.5 text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
};

export default AdminInput;
