// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

import type { TodoItem, TodoConfig, TodoFormData, TodoActionResult } from '@/types/todo';

// 空实现函数
export async function getTodoConfig(): Promise<TodoActionResult<TodoConfig>> {
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

export async function getTodoList(): Promise<TodoActionResult<TodoItem[]>> {
  return { success: true, message: '获取成功', data: [] };
}

export async function getTodoItem(id: string): Promise<TodoActionResult<TodoItem>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function createTodoItem(data: TodoFormData): Promise<TodoActionResult<TodoItem>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function updateTodoItem(
  id: string,
  data: Partial<TodoFormData>
): Promise<TodoActionResult<TodoItem>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function deleteTodoItem(id: string): Promise<TodoActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function toggleTodoComplete(id: string): Promise<TodoActionResult<TodoItem>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function batchDeleteTodoItems(ids: string[]): Promise<TodoActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function updateTodoConfigSettings(
  settings: Partial<Pick<TodoConfig, 'title' | 'showStats'>>
): Promise<TodoActionResult<TodoConfig>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}
