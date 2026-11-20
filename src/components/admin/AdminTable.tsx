'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Inbox } from 'lucide-react';
import { cn } from '@/utils/cn';
import { TableSkeleton } from './AdminLoading';

/**
 * 表格列配置接口
 */
interface Column<T> {
  /** 列键名，可以是数据对象的属性名或自定义字符串 */
  key: keyof T | string;
  /** 列标题 */
  title: string;
  /** 自定义渲染函数 */
   
  render?: (value: any, record: T, index: number) => React.ReactNode;
  /** 是否可排序 */
  sortable?: boolean;
  /** 列宽度 */
  width?: string;
  /** 对齐方式 */
  align?: 'left' | 'center' | 'right';
}

/**
 * 分页配置接口
 */
interface Pagination {
  /** 当前页码 */
  current: number;
  /** 每页条数 */
  pageSize: number;
  /** 总条数 */
  total: number;
  /** 页码变化回调 */
  onChange: (page: number, pageSize: number) => void;
}

/**
 * 行选择配置接口
 */
interface RowSelection<T> {
  /** 已选中的行键数组 */
  selectedKeys: string[];
  /** 选中变化回调 */
  onChange: (keys: string[]) => void;
}

/**
 * 管理后台表格组件属性接口
 */
interface AdminTableProps<T> {
  /** 列配置 */
  columns: Column<T>[];
  /** 数据源 */
  data: T[];
  /** 行的唯一标识字段或函数 */
  rowKey: keyof T | ((record: T) => string);
  /** 是否加载中 */
  loading?: boolean;
  /** 分页配置 */
  pagination?: Pagination;
  /** 行选择配置 */
  rowSelection?: RowSelection<T>;
  /** 行点击回调 */
  onRowClick?: (record: T) => void;
  /** 自定义类名 */
  className?: string;
  /** 空数据提示文本或自定义内容 */
  emptyText?: React.ReactNode;
}

/**
 * 排序方向类型
 */
type SortDirection = 'asc' | 'desc' | null;

/**
 * AdminTable - 管理后台表格组件
 * 
 * 功能特点：
 * - 支持排序
 * - 支持分页
 * - 支持行选择
 * - 加载状态骨架屏
 * - 空数据提示
 * - 响应式设计
 * 
 * @param props - 组件属性
 * @returns 表格组件
 */
function AdminTable<T extends Record<string, any>>({
  columns,
  data,
  rowKey,
  loading = false,
  pagination,
  rowSelection,
  onRowClick,
  className,
  emptyText = '暂无数据',
}: AdminTableProps<T>) {
  // 排序状态：[列键, 排序方向]
  const [sortConfig, setSortConfig] = useState<[string, SortDirection] | null>(null);

  /**
   * 获取行的唯一标识
   * @param record - 行数据
   * @param index - 行索引
   * @returns 唯一标识字符串
   */
  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    const key = record[rowKey];
    return key !== undefined ? String(key) : String(index);
  };

  /**
   * 获取单元格的值
   * @param record - 行数据
   * @param key - 列键
   * @returns 单元格值
   */
  const getCellValue = (record: T, key: keyof T | string): unknown => {
    // 支持嵌套路径，如 'user.name'
    if (typeof key === 'string' && key.includes('.')) {
      const keys = key.split('.');
      let value: unknown = record;
      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }
      return value;
    }
    return record[key as keyof T];
  };

  /**
   * 处理排序点击
   * @param key - 列键
   */
  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (!prev || prev[0] !== key) {
        return [key, 'asc'];
      }
      if (prev[1] === 'asc') {
        return [key, 'desc'];
      }
      return null;
    });
  };

  /**
   * 排序后的数据
   */
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;

    const [key, direction] = sortConfig;
    return [...data].sort((a, b) => {
      const aValue = getCellValue(a, key);
      const bValue = getCellValue(b, key);

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return direction === 'asc' ? comparison : -comparison;
    });
  }, [data, sortConfig]);

  /**
   * 处理全选/取消全选
   */
  const handleSelectAll = () => {
    if (!rowSelection) return;

    const allKeys = sortedData.map((record, index) => getRowKey(record, index));
    const isAllSelected = allKeys.every(key => rowSelection.selectedKeys.includes(key));

    if (isAllSelected) {
      rowSelection.onChange([]);
    } else {
      rowSelection.onChange(allKeys);
    }
  };

  /**
   * 处理单行选择
   * @param key - 行键
   */
  const handleSelectRow = (key: string) => {
    if (!rowSelection) return;

    const newKeys = rowSelection.selectedKeys.includes(key)
      ? rowSelection.selectedKeys.filter(k => k !== key)
      : [...rowSelection.selectedKeys, key];

    rowSelection.onChange(newKeys);
  };

  /**
   * 计算总页数
   */
  const totalPages = pagination ? Math.ceil(pagination.total / pagination.pageSize) : 0;

  /**
   * 生成分页按钮数组
   */
  const getPageNumbers = () => {
    if (!pagination) return [];
    const pages: (number | string)[] = [];
    const { current } = pagination;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (current >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', current - 1, current, current + 1, '...', totalPages);
      }
    }

    return pages;
  };

  // 加载状态显示骨架屏
  if (loading) {
    return (
      <div className={cn('rounded-xl border border-border bg-card/85 backdrop-blur-md overflow-hidden', className)}>
        <TableSkeleton rows={pagination?.pageSize || 5} columns={columns.length + (rowSelection ? 1 : 0)} />
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card/85 backdrop-blur-md overflow-hidden', className)}>
      {/* 表格容器 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* 表头 */}
          <thead className="bg-muted/40 border-b border-border">
            <tr>
              {/* 选择列 */}
              {rowSelection && (
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={sortedData.length > 0 && sortedData.every((record, index) => 
                      rowSelection.selectedKeys.includes(getRowKey(record, index))
                    )}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#66ccff] focus:ring-[#66ccff]/50"
                  />
                </th>
              )}
              {/* 数据列 */}
              {columns.map(column => (
                <th
                  key={String(column.key)}
                  /*
                    列宽必须走内联 style：
                    Tailwind 在构建期静态扫描源码，`w-[${column.width}]` 这种运行时拼接
                    的类名不会被生成，导致各页面配置的 width 全部失效。
                  */
                  style={column.width ? { width: column.width } : undefined}
                  className={cn(
                    'px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right',
                    !column.align && 'text-left',
                    column.sortable && 'cursor-pointer select-none hover:bg-muted transition-colors'
                  )}
                  aria-sort={
                    column.sortable
                      ? sortConfig?.[0] === column.key
                        ? sortConfig[1] === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : 'none'
                      : undefined
                  }
                  tabIndex={column.sortable ? 0 : undefined}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                  onKeyDown={(event) => {
                    // 可排序表头需要支持键盘触发，不能只依赖 onClick
                    if (!column.sortable) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleSort(String(column.key));
                    }
                  }}
                >
                  <div className={cn(
                    'flex items-center space-x-1',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
                    <span className="whitespace-nowrap">{column.title}</span>
                    {/* 排序图标：统一使用 lucide，保证线宽与全站图标一致 */}
                    {column.sortable && (
                      <span className="flex flex-col -space-y-1">
                        <ChevronUp
                          className={cn(
                            'w-3 h-3 transition-colors',
                            sortConfig?.[0] === column.key && sortConfig[1] === 'asc'
                              ? 'text-[#66ccff]'
                              : 'text-gray-400'
                          )}
                          strokeWidth={2.5}
                        />
                        <ChevronDown
                          className={cn(
                            'w-3 h-3 transition-colors',
                            sortConfig?.[0] === column.key && sortConfig[1] === 'desc'
                              ? 'text-[#66ccff]'
                              : 'text-gray-400'
                          )}
                          strokeWidth={2.5}
                        />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* 表体 */}
          <tbody className="divide-y divide-border/70">
            {sortedData.length === 0 ? (
              // 空数据提示
              <tr>
                <td
                  colSpan={columns.length + (rowSelection ? 1 : 0)}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {typeof emptyText === 'string' ? (
                    <div className="flex flex-col items-center">
                      <Inbox className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" strokeWidth={1.5} />
                      <span>{emptyText}</span>
                    </div>
                  ) : (
                    emptyText
                  )}
                </td>
              </tr>
            ) : (
              // 数据行
              sortedData.map((record, index) => {
                const key = getRowKey(record, index);
                const isSelected = rowSelection?.selectedKeys.includes(key);

                return (
                  <tr
                    key={key}
                    className={cn(
                      'transition-colors',
                      onRowClick && 'cursor-pointer hover:bg-muted/40',
                      isSelected && 'bg-[#66ccff]/5 dark:bg-[#66ccff]/10'
                    )}
                    onClick={() => onRowClick?.(record)}
                  >
                    {/* 选择列 */}
                    {rowSelection && (
                      <td className="w-12 px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(key)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#66ccff] focus:ring-[#66ccff]/50"
                        />
                      </td>
                    )}
                    {/* 数据列 */}
                    {columns.map(column => (
                      <td
                        key={String(column.key)}
                        className={cn(
                          'px-4 py-3 text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          !column.align && 'text-left'
                        )}
                      >
                        {column.render
                          ? column.render(getCellValue(record, column.key), record, index)
                          : <span className="inline-block max-w-xs truncate">{String(getCellValue(record, column.key) ?? '')}</span>}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {pagination && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          {/* 左侧：显示信息 */}
          <div className="text-sm text-muted-foreground">
            显示第 {(pagination.current - 1) * pagination.pageSize + 1} - {Math.min(pagination.current * pagination.pageSize, pagination.total)} 条，共 {pagination.total} 条
          </div>

          {/* 右侧：分页按钮 */}
          <div className="flex items-center space-x-1">
            {/* 首页 */}
            <button
              onClick={() => pagination.onChange(1, pagination.pageSize)}
              disabled={pagination.current === 1}
              className="px-2 py-1 text-sm rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              首页
            </button>

            {/* 上一页 */}
            <button
              onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
              disabled={pagination.current === 1}
              className="px-2 py-1 text-sm rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>

            {/* 页码 */}
            {getPageNumbers().map((page, index) => (
              <React.Fragment key={index}>
                {typeof page === 'number' ? (
                  <button
                    onClick={() => pagination.onChange(page, pagination.pageSize)}
                    className={cn(
                      'w-8 h-8 text-sm rounded transition-colors',
                      pagination.current === page
                        ? 'bg-[#66ccff] text-white'
                        : 'hover:bg-muted text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {page}
                  </button>
                ) : (
                  <span className="px-1 text-gray-400">...</span>
                )}
              </React.Fragment>
            ))}

            {/* 下一页 */}
            <button
              onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
              disabled={pagination.current === totalPages}
              className="px-2 py-1 text-sm rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>

            {/* 末页 */}
            <button
              onClick={() => pagination.onChange(totalPages, pagination.pageSize)}
              disabled={pagination.current === totalPages}
              className="px-2 py-1 text-sm rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              末页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTable;
