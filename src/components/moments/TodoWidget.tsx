'use client';

import React from 'react';
import { Circle, CheckCircle, AlertCircle } from 'lucide-react';
import type { TodoItem, TodoConfig } from '@/types/todo';

/**
 * 待办事件展示组件 Props
 */
interface TodoWidgetProps {
  config: TodoConfig;
}

/**
 * 优先级配置
 */
const PRIORITY_CONFIG = {
  high: {
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-l-red-500',
    label: '高',
  },
  medium: {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-l-yellow-500',
    label: '中',
  },
  low: {
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-l-green-500',
    label: '低',
  },
};

/**
 * 待办事件展示组件
 * 用于在动态页面侧边栏静态展示待办事项
 */
export default function TodoWidget({ config }: TodoWidgetProps) {
  const { title, items, showStats } = config;

  // 按完成状态和优先级排序
  const sortedItems = [...items].sort((a, b) => {
    // 未完成的排在前面
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    // 按优先级排序：high > medium > low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const aPriority = a.priority ? priorityOrder[a.priority] : 3;
    const bPriority = b.priority ? priorityOrder[b.priority] : 3;
    return aPriority - bPriority;
  });

  // 计算统计数据
  const totalCount = items.length;
  const completedCount = items.filter(item => item.completed).length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // 渲染单个待办项
  const renderTodoItem = (item: TodoItem) => {
    const priorityConfig = item.priority ? PRIORITY_CONFIG[item.priority] : null;

    return (
      <div
        key={item.id}
        className={`
          group flex items-start gap-3 p-3 rounded-lg transition-all duration-200
          border-l-2 ${priorityConfig ? priorityConfig.borderColor : 'border-l-transparent'}
          ${item.completed ? 'bg-muted/30' : 'hover:bg-muted/50'}
        `}
      >
        {/* 完成状态图标 */}
        <div className="flex-shrink-0 mt-0.5">
          {item.completed ? (
            <CheckCircle className="w-5 h-5 text-primary" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        {/* 待办内容 */}
        <div className="flex-1 min-w-0">
          <p
            className={`
              text-sm transition-all duration-200
              ${item.completed 
                ? 'text-muted-foreground line-through' 
                : 'text-foreground'
              }
            `}
          >
            {item.content}
          </p>

          {/* 优先级和截止日期 */}
          <div className="flex items-center gap-2 mt-1">
            {priorityConfig && !item.completed && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded
                ${priorityConfig.bgColor} ${priorityConfig.color}
              `}>
                {priorityConfig.label}优先
              </span>
            )}
            {item.dueDate && !item.completed && (
              <span className="text-xs text-muted-foreground">
                截止: {new Date(item.dueDate).toLocaleDateString('zh-CN')}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 rounded-lg border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75">
      {/* 标题 */}
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
        <span className="w-2 h-6 bg-primary rounded-full"></span>
        {title}
      </h3>

      {/* 统计信息 */}
      {showStats && totalCount > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">完成进度</span>
            <span className="text-sm font-medium text-primary">{completionRate}%</span>
          </div>
          {/* 进度条 */}
          <div className="h-2 w-full bg-muted/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>已完成 {completedCount} 项</span>
            <span>共 {totalCount} 项</span>
          </div>
        </div>
      )}

      {/* 待办列表 */}
      <div className="space-y-1 max-h-80 overflow-y-auto">
        {sortedItems.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">暂无待办事项</p>
          </div>
        ) : (
          sortedItems.map(renderTodoItem)
        )}
      </div>

      {/* 底部提示 */}
      {totalCount > 0 && (
        <div className="mt-4 pt-3 border-t border-border/30">
          <p className="text-xs text-muted-foreground text-center">
            {completedCount === totalCount 
              ? '🎉 所有待办已完成！' 
              : `还有 ${totalCount - completedCount} 项待办等待完成`
            }
          </p>
        </div>
      )}
    </div>
  );
}
