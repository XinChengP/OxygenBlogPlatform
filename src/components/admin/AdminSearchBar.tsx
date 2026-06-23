'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';

/**
 * 筛选器配置接口
 */
interface FilterConfig {
  /** 筛选器键名 */
  key: string;
  /** 筛选器标签 */
  label: string;
  /** 筛选器选项 */
  options: { value: string; label: string }[];
}

/**
 * 管理后台搜索栏组件属性接口
 */
interface AdminSearchBarProps {
  /** 搜索值 */
  value: string;
  /** 搜索值变化回调函数 */
  onChange: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 筛选器配置 */
  filters?: FilterConfig[];
  /** 筛选值变化回调函数 */
  onFilterChange?: (filters: Record<string, string>) => void;
  /** 自定义类名 */
  className?: string;
  /** 是否显示搜索按钮 */
  showSearchButton?: boolean;
  /** 搜索按钮点击回调 */
  onSearch?: () => void;
  /** 是否自动搜索（输入时自动触发） */
  autoSearch?: boolean;
  /** 自动搜索延迟（毫秒） */
  debounceDelay?: number;
}

/**
 * AdminSearchBar - 管理后台搜索栏组件
 * 
 * 功能特点：
 * - 搜索输入框
 * - 筛选器下拉选择
 * - 响应式布局
 * - 支持防抖搜索
 * - 支持键盘快捷键
 * 
 * @param props - 组件属性
 * @returns 搜索栏组件
 */
const AdminSearchBar: React.FC<AdminSearchBarProps> = ({
  value,
  onChange,
  placeholder = '搜索...',
  filters,
  onFilterChange,
  className,
  showSearchButton = false,
  onSearch,
  autoSearch = true,
  debounceDelay = 300,
}) => {
  // 筛选值状态
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  // 防抖定时器引用
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 输入框引用
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * 处理搜索输入变化
   * 支持防抖功能
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (autoSearch && debounceDelay > 0) {
      // 清除之前的定时器
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // 设置新的定时器
      debounceTimerRef.current = setTimeout(() => {
        onChange(newValue);
      }, debounceDelay);
    } else {
      onChange(newValue);
    }
  };

  /**
   * 清理防抖定时器
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * 处理筛选器变化
   */
  const handleFilterChange = (filterKey: string, filterValue: string) => {
    const newFilterValues = {
      ...filterValues,
      [filterKey]: filterValue,
    };
    setFilterValues(newFilterValues);
    onFilterChange?.(newFilterValues);
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // 立即执行搜索
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onChange(e.currentTarget.value);
      onSearch?.();
    }
    // Ctrl/Cmd + K 聚焦搜索框
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };

  /**
   * 清空搜索
   */
  const handleClear = () => {
    onChange('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  /**
   * 重置所有筛选
   */
  const handleReset = () => {
    handleClear();
    if (filters && filters.length > 0) {
      const resetValues: Record<string, string> = {};
      filters.forEach(filter => {
        resetValues[filter.key] = '';
      });
      setFilterValues(resetValues);
      onFilterChange?.(resetValues);
    }
  };

  /**
   * 检查是否有激活的筛选条件
   */
  const hasActiveFilters = () => {
    return Object.values(filterValues).some(v => v !== '');
  };

  return (
    <div className={cn('w-full', className)}>
      {/* 搜索栏主体 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 搜索输入框 */}
        <div className="relative flex-1">
          {/* 搜索图标 */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* 输入框 */}
          <input
            ref={inputRef}
            type="text"
            defaultValue={value}
            placeholder={placeholder}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full rounded-lg pl-10 pr-10 py-2.5 text-sm',
              'bg-white dark:bg-gray-800',
              'text-gray-900 dark:text-gray-100',
              'placeholder:text-gray-400 dark:placeholder:text-gray-500',
              'border border-gray-200 dark:border-gray-700',
              'focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50 focus:border-[#66ccff]',
              'transition-all duration-200'
            )}
          />

          {/* 清除按钮 */}
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* 筛选器 */}
        {filters && filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <select
                key={filter.key}
                value={filterValues[filter.key] || ''}
                onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                className={cn(
                  'rounded-lg px-3 py-2.5 text-sm',
                  'bg-white dark:bg-gray-800',
                  'text-gray-900 dark:text-gray-100',
                  'border border-gray-200 dark:border-gray-700',
                  'focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50 focus:border-[#66ccff]',
                  'transition-all duration-200',
                  'min-w-[120px]'
                )}
              >
                <option value="">{filter.label}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ))}
          </div>
        )}

        {/* 搜索按钮 */}
        {showSearchButton && (
          <button
            type="button"
            onClick={() => {
              if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
              }
              onChange(inputRef.current?.value || '');
              onSearch?.();
            }}
            className={cn(
              'px-4 py-2.5 rounded-lg text-sm font-medium',
              'bg-[#66ccff] text-white',
              'hover:bg-[#55bbef] active:bg-[#44aade]',
              'transition-colors duration-200',
              'focus:outline-none focus:ring-2 focus:ring-[#66ccff]/50'
            )}
          >
            搜索
          </button>
        )}
      </div>

      {/* 激活的筛选标签 */}
      {(value || hasActiveFilters()) && (
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">当前筛选：</span>

          {/* 搜索关键词标签 */}
          {value && (
            <span className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-[#66ccff]/10 text-[#66ccff]">
              关键词: {value}
              <button
                type="button"
                onClick={handleClear}
                className="ml-1 hover:text-red-500 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}

          {/* 筛选器标签 */}
          {filters?.map((filter) => {
            const filterValue = filterValues[filter.key];
            if (!filterValue) return null;

            const option = filter.options.find(o => o.value === filterValue);
            return (
              <span
                key={filter.key}
                className="inline-flex items-center px-2 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {filter.label}: {option?.label}
                <button
                  type="button"
                  onClick={() => handleFilterChange(filter.key, '')}
                  className="ml-1 hover:text-red-500 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            );
          })}

          {/* 重置按钮 */}
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 underline transition-colors"
          >
            清除全部
          </button>
        </div>
      )}

    </div>
  );
};

export default AdminSearchBar;
