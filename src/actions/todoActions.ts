/**
 * 待办管理相关的 Server Actions
 * 提供待办事项的增删改查功能
 * 待办数据使用 JSON 格式存储
 *
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

// 类型定义
import type { TodoItem, TodoConfig, TodoFormData, TodoActionResult } from '@/types/todo';

// ============================================
// 静态导出模式：空实现（不使用 'use server'）
// ============================================

function getTodoConfigStatic(): Promise<TodoActionResult<TodoConfig>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function getTodoListStatic(): Promise<TodoActionResult<TodoItem[]>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能', data: [] });
}

function getTodoItemStatic(): Promise<TodoActionResult<TodoItem>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function createTodoItemStatic(): Promise<TodoActionResult<TodoItem>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function updateTodoItemStatic(): Promise<TodoActionResult<TodoItem>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function deleteTodoItemStatic(): Promise<TodoActionResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function toggleTodoCompleteStatic(): Promise<TodoActionResult<TodoItem>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function batchDeleteTodoItemsStatic(): Promise<TodoActionResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function updateTodoConfigSettingsStatic(): Promise<TodoActionResult<TodoConfig>> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

// ============================================
// 本地开发模式：真实实现（使用 'use server'）
// ============================================

// 只有在非静态导出模式下才导入和使用 Server Actions 相关功能
let todoActionsReal: {
  getTodoConfig: () => Promise<TodoActionResult<TodoConfig>>;
  getTodoList: () => Promise<TodoActionResult<TodoItem[]>>;
  getTodoItem: (id: string) => Promise<TodoActionResult<TodoItem>>;
  createTodoItem: (data: TodoFormData) => Promise<TodoActionResult<TodoItem>>;
  updateTodoItem: (id: string, data: Partial<TodoFormData>) => Promise<TodoActionResult<TodoItem>>;
  deleteTodoItem: (id: string) => Promise<TodoActionResult>;
  toggleTodoComplete: (id: string) => Promise<TodoActionResult<TodoItem>>;
  batchDeleteTodoItems: (ids: string[]) => Promise<TodoActionResult>;
  updateTodoConfigSettings: (settings: Partial<Pick<TodoConfig, 'title' | 'showStats'>>) => Promise<TodoActionResult<TodoConfig>>;
} | null = null;

// 动态导入真实实现（只在非静态导出模式下）
if (!isStaticExport) {
  // 使用 require 动态导入，避免在静态导出时解析
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const realModule = require('./todoActions.real');
    todoActionsReal = realModule;
  } catch {
    // 如果真实实现模块不存在，使用空实现
    todoActionsReal = null;
  }
}

// ============================================
// 导出函数：根据环境选择实现
// ============================================

export async function getTodoConfig(): Promise<TodoActionResult<TodoConfig>> {
  if (isStaticExport || !todoActionsReal) {
    return getTodoConfigStatic();
  }
  return todoActionsReal.getTodoConfig();
}

export async function getTodoList(): Promise<TodoActionResult<TodoItem[]>> {
  if (isStaticExport || !todoActionsReal) {
    return getTodoListStatic();
  }
  return todoActionsReal.getTodoList();
}

export async function getTodoItem(id: string): Promise<TodoActionResult<TodoItem>> {
  if (isStaticExport || !todoActionsReal) {
    return getTodoItemStatic();
  }
  return todoActionsReal.getTodoItem(id);
}

export async function createTodoItem(data: TodoFormData): Promise<TodoActionResult<TodoItem>> {
  if (isStaticExport || !todoActionsReal) {
    return createTodoItemStatic();
  }
  return todoActionsReal.createTodoItem(data);
}

export async function updateTodoItem(id: string, data: Partial<TodoFormData>): Promise<TodoActionResult<TodoItem>> {
  if (isStaticExport || !todoActionsReal) {
    return updateTodoItemStatic();
  }
  return todoActionsReal.updateTodoItem(id, data);
}

export async function deleteTodoItem(id: string): Promise<TodoActionResult> {
  if (isStaticExport || !todoActionsReal) {
    return deleteTodoItemStatic();
  }
  return todoActionsReal.deleteTodoItem(id);
}

export async function toggleTodoComplete(id: string): Promise<TodoActionResult<TodoItem>> {
  if (isStaticExport || !todoActionsReal) {
    return toggleTodoCompleteStatic();
  }
  return todoActionsReal.toggleTodoComplete(id);
}

export async function batchDeleteTodoItems(ids: string[]): Promise<TodoActionResult> {
  if (isStaticExport || !todoActionsReal) {
    return batchDeleteTodoItemsStatic();
  }
  return todoActionsReal.batchDeleteTodoItems(ids);
}

export async function updateTodoConfigSettings(settings: Partial<Pick<TodoConfig, 'title' | 'showStats'>>): Promise<TodoActionResult<TodoConfig>> {
  if (isStaticExport || !todoActionsReal) {
    return updateTodoConfigSettingsStatic();
  }
  return todoActionsReal.updateTodoConfigSettings(settings);
}
