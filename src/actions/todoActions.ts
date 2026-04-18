'use server';

/**
 * 待办管理相关的 Server Actions
 * 提供待办事项的增删改查功能
 * 待办数据使用 JSON 格式存储
 */

import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';
import type { TodoItem, TodoConfig, TodoFormData, TodoActionResult } from '@/types/todo';

// 待办数据存储路径
const TODO_FILE = path.join(process.cwd(), 'src', 'content', 'todo.json');

/**
 * 默认待办配置
 */
const DEFAULT_CONFIG: TodoConfig = {
  title: '待办事项',
  items: [],
  showStats: true,
};

/**
 * 确保待办文件存在
 */
async function ensureTodoFile(): Promise<void> {
  try {
    await fs.access(TODO_FILE);
  } catch {
    // 文件不存在，创建默认配置
    await fs.writeFile(TODO_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
  }
}

/**
 * 读取待办配置
 */
async function readTodoConfig(): Promise<TodoConfig> {
  try {
    await ensureTodoFile();
    const content = await fs.readFile(TODO_FILE, 'utf-8');
    return JSON.parse(content) as TodoConfig;
  } catch (error) {
    console.error('读取待办配置失败:', error);
    return DEFAULT_CONFIG;
  }
}

/**
 * 保存待办配置
 */
async function saveTodoConfig(config: TodoConfig): Promise<void> {
  await ensureTodoFile();
  await fs.writeFile(TODO_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * 生成新的待办 ID
 */
function generateTodoId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

/**
 * 获取待办配置
 */
export async function getTodoConfig(): Promise<TodoActionResult<TodoConfig>> {
  try {
    const config = await readTodoConfig();
    return { success: true, message: '获取成功', data: config };
  } catch (error) {
    console.error('获取待办配置失败:', error);
    return { success: false, message: '获取失败', data: DEFAULT_CONFIG };
  }
}

/**
 * 获取待办列表
 */
export async function getTodoList(): Promise<TodoActionResult<TodoItem[]>> {
  try {
    const config = await readTodoConfig();
    return { success: true, message: '获取成功', data: config.items };
  } catch (error) {
    console.error('获取待办列表失败:', error);
    return { success: false, message: '获取失败', data: [] };
  }
}

/**
 * 获取单个待办
 */
export async function getTodoItem(id: string): Promise<TodoActionResult<TodoItem>> {
  try {
    const config = await readTodoConfig();
    const item = config.items.find(item => item.id === id);
    
    if (!item) {
      return { success: false, message: '待办不存在' };
    }
    
    return { success: true, message: '获取成功', data: item };
  } catch (error) {
    console.error('获取待办详情失败:', error);
    return { success: false, message: '获取失败' };
  }
}

/**
 * 创建待办
 */
export async function createTodoItem(data: TodoFormData): Promise<TodoActionResult<TodoItem>> {
  try {
    const config = await readTodoConfig();
    
    const now = new Date().toISOString();
    const newItem: TodoItem = {
      id: generateTodoId(),
      content: data.content,
      completed: false,
      priority: data.priority,
      dueDate: data.dueDate,
      createdAt: now,
    };
    
    config.items.unshift(newItem);
    await saveTodoConfig(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { success: true, message: '创建成功', data: newItem };
  } catch (error) {
    console.error('创建待办失败:', error);
    return { success: false, message: '创建失败' };
  }
}

/**
 * 更新待办
 */
export async function updateTodoItem(id: string, data: Partial<TodoFormData>): Promise<TodoActionResult<TodoItem>> {
  try {
    const config = await readTodoConfig();
    const index = config.items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return { success: false, message: '待办不存在' };
    }
    
    const now = new Date().toISOString();
    config.items[index] = {
      ...config.items[index],
      ...data,
      updatedAt: now,
    };
    
    await saveTodoConfig(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { success: true, message: '更新成功', data: config.items[index] };
  } catch (error) {
    console.error('更新待办失败:', error);
    return { success: false, message: '更新失败' };
  }
}

/**
 * 删除待办
 */
export async function deleteTodoItem(id: string): Promise<TodoActionResult> {
  try {
    const config = await readTodoConfig();
    const index = config.items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return { success: false, message: '待办不存在' };
    }
    
    config.items.splice(index, 1);
    await saveTodoConfig(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { success: true, message: '删除成功' };
  } catch (error) {
    console.error('删除待办失败:', error);
    return { success: false, message: '删除失败' };
  }
}

/**
 * 切换待办完成状态
 */
export async function toggleTodoComplete(id: string): Promise<TodoActionResult<TodoItem>> {
  try {
    const config = await readTodoConfig();
    const index = config.items.findIndex(item => item.id === id);
    
    if (index === -1) {
      return { success: false, message: '待办不存在' };
    }
    
    const now = new Date().toISOString();
    const newCompleted = !config.items[index].completed;
    
    config.items[index] = {
      ...config.items[index],
      completed: newCompleted,
      updatedAt: now,
    };
    
    await saveTodoConfig(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { 
      success: true, 
      message: newCompleted ? '已标记为完成' : '已标记为未完成', 
      data: config.items[index] 
    };
  } catch (error) {
    console.error('切换待办状态失败:', error);
    return { success: false, message: '操作失败' };
  }
}

/**
 * 批量删除待办
 */
export async function batchDeleteTodoItems(ids: string[]): Promise<TodoActionResult> {
  try {
    const config = await readTodoConfig();
    config.items = config.items.filter(item => !ids.includes(item.id));
    await saveTodoConfig(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { success: true, message: `成功删除 ${ids.length} 条待办` };
  } catch (error) {
    console.error('批量删除待办失败:', error);
    return { success: false, message: '批量删除失败' };
  }
}

/**
 * 更新待办配置（标题、统计显示等）
 */
export async function updateTodoConfigSettings(settings: Partial<Pick<TodoConfig, 'title' | 'showStats'>>): Promise<TodoActionResult<TodoConfig>> {
  try {
    const config = await readTodoConfig();
    
    if (settings.title !== undefined) {
      config.title = settings.title;
    }
    if (settings.showStats !== undefined) {
      config.showStats = settings.showStats;
    }
    
    await saveTodoConfig(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { success: true, message: '配置更新成功', data: config };
  } catch (error) {
    console.error('更新待办配置失败:', error);
    return { success: false, message: '配置更新失败' };
  }
}
