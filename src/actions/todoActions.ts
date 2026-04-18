// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

import type { TodoItem, TodoConfig, TodoFormData, TodoActionResult } from '@/types/todo';

// 空实现函数（不使用 async，不返回 Promise）
export function getTodoConfig(): TodoActionResult<TodoConfig> {
  return {
    success: true,
    message: '获取成功',
    data: {
      title: '待办事项',
      items: [],
      showStats: true,
    },
  };
}

export function getTodoList(): TodoActionResult<TodoItem[]> {
  return { success: true, message: '获取成功', data: [] };
}

export function getTodoItem(id: string): TodoActionResult<TodoItem> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function createTodoItem(data: TodoFormData): TodoActionResult<TodoItem> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function updateTodoItem(
  id: string,
  data: Partial<TodoFormData>
): TodoActionResult<TodoItem> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function deleteTodoItem(id: string): TodoActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function toggleTodoComplete(id: string): TodoActionResult<TodoItem> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function batchDeleteTodoItems(ids: string[]): TodoActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function updateTodoConfigSettings(
  settings: Partial<Pick<TodoConfig, 'title' | 'showStats'>>
): TodoActionResult<TodoConfig> {
  return { success: false, message: '静态导出模式不支持此功能' };
}
