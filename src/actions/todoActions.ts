/**
 * 待办管理相关的 Server Actions
 * 提供待办事项的增删改查功能
 * 待办数据使用 JSON 格式存储
 * 
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

'use server';

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

// 类型定义
import type { TodoItem, TodoConfig, TodoFormData, TodoActionResult } from '@/types/todo';
import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

// 待办数据文件路径
const TODO_FILE_PATH = path.join(process.cwd(), 'src', 'content', 'todo.json');

/**
 * 读取待办数据文件
 * @returns 待办配置对象
 */
async function readTodoFile(): Promise<TodoConfig> {
  if (isStaticExport) {
    return { title: 'Todo List', showStats: true, items: [] };
  }
  
  try {
    const content = await fs.readFile(TODO_FILE_PATH, 'utf-8');
    return JSON.parse(content) as TodoConfig;
  } catch (error) {
    /*
      只有「文件确实不存在」才能安全地返回空配置。
      JSON 语法损坏、权限不足等异常必须继续向上抛出：
      否则任意一次写操作都会把空配置覆盖回 todo.json，导致全部待办永久丢失。
    */
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { title: 'Todo List', showStats: true, items: [] };
    }
    throw error;
  }
}

/**
 * 写入待办数据文件
 * @param data 待办配置对象
 */
async function writeTodoFile(data: TodoConfig): Promise<void> {
  if (isStaticExport) return;
  
  const dir = path.dirname(TODO_FILE_PATH);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }

  /*
    先写临时文件再重命名，避免写入过程中断（进程退出、磁盘满）把原文件截断成半截 JSON。
    rename 在同目录内是原子操作，Windows 下 Node 也会覆盖已存在的目标文件。
  */
  const tempPath = `${TODO_FILE_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  try {
    await fs.rename(tempPath, TODO_FILE_PATH);
  } catch (error) {
    // 重命名失败时清理临时文件，避免残留脏数据
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}

/**
 * 生成唯一ID
 * @returns 唯一ID字符串
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 获取待办配置
 * @returns 待办配置
 */
export async function getTodoConfig(): Promise<TodoActionResult<TodoConfig>> {
  try {
    const config = await readTodoFile();
    return { success: true, message: 'Success', data: config };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 获取待办列表
 * @returns 待办事项列表
 */
export async function getTodoList(): Promise<TodoActionResult<TodoItem[]>> {
  try {
    const config = await readTodoFile();
    return { success: true, message: 'Success', data: config.items || [] };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error', data: [] };
  }
}

/**
 * 获取单个待办事项
 * @param id 待办事项ID
 * @returns 待办事项详情
 */
export async function getTodoItem(id: string): Promise<TodoActionResult<TodoItem>> {
  try {
    const config = await readTodoFile();
    const item = config.items?.find((item) => item.id === id);
    
    if (!item) {
      return { success: false, message: 'Todo item not found' };
    }
    
    return { success: true, message: 'Success', data: item };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 创建待办事项
 * @param data 待办事项表单数据
 * @returns 创建的待办事项
 */
export async function createTodoItem(data: TodoFormData): Promise<TodoActionResult<TodoItem>> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    if (!data.content || data.content.trim() === '') {
      return { success: false, message: 'Content cannot be empty' };
    }

    const config = await readTodoFile();
    
    const newItem: TodoItem = {
      id: generateId(),
      content: data.content.trim(),
      completed: false,
      priority: data.priority || 'medium',
      dueDate: data.dueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!config.items) {
      config.items = [];
    }
    
    config.items.push(newItem);
    await writeTodoFile(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { success: true, message: 'Created successfully', data: newItem };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 更新待办事项
 * @param id 待办事项ID
 * @param data 更新的数据
 * @returns 更新后的待办事项
 */
export async function updateTodoItem(
  id: string,
  data: Partial<TodoFormData>
): Promise<TodoActionResult<TodoItem>> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    const config = await readTodoFile();
    const itemIndex = config.items?.findIndex((item) => item.id === id);
    
    if (itemIndex === undefined || itemIndex === -1) {
      return { success: false, message: 'Todo item not found' };
    }

    const item = config.items[itemIndex];
    
    if (data.content !== undefined) {
      // 与创建逻辑保持一致：不允许把待办内容改成空白
      if (!data.content.trim()) {
        return { success: false, message: 'Content cannot be empty' };
      }
      item.content = data.content.trim();
    }
    if (data.priority !== undefined) {
      item.priority = data.priority;
    }
    if (data.dueDate !== undefined) {
      item.dueDate = data.dueDate;
    }
    
    item.updatedAt = new Date().toISOString();
    
    await writeTodoFile(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { success: true, message: 'Updated successfully', data: item };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 删除待办事项
 * @param id 待办事项ID
 * @returns 操作结果
 */
export async function deleteTodoItem(id: string): Promise<TodoActionResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    const config = await readTodoFile();
    const itemIndex = config.items?.findIndex((item) => item.id === id);
    
    if (itemIndex === undefined || itemIndex === -1) {
      return { success: false, message: 'Todo item not found' };
    }

    config.items!.splice(itemIndex, 1);
    await writeTodoFile(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { success: true, message: 'Deleted successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 切换待办事项完成状态
 * @param id 待办事项ID
 * @returns 更新后的待办事项
 */
export async function toggleTodoComplete(id: string): Promise<TodoActionResult<TodoItem>> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    const config = await readTodoFile();
    const item = config.items?.find((item) => item.id === id);
    
    if (!item) {
      return { success: false, message: 'Todo item not found' };
    }

    item.completed = !item.completed;
    item.updatedAt = new Date().toISOString();
    
    await writeTodoFile(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { success: true, message: item.completed ? 'Marked as completed' : 'Marked as incomplete', data: item };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 批量删除待办事项
 * @param ids 待办事项ID数组
 * @returns 操作结果
 */
export async function batchDeleteTodoItems(ids: string[]): Promise<TodoActionResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    if (!ids || ids.length === 0) {
      return { success: false, message: 'No todo items selected' };
    }

    const config = await readTodoFile();
    const originalLength = config.items?.length || 0;
    
    config.items = config.items?.filter((item) => !ids.includes(item.id)) || [];
    
    const deletedCount = originalLength - config.items.length;
    
    await writeTodoFile(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { success: true, message: `Successfully deleted ${deletedCount} todo items` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 更新待办配置设置
 * @param settings 设置项
 * @returns 更新后的配置
 */
export async function updateTodoConfigSettings(
  settings: Partial<Pick<TodoConfig, 'title' | 'showStats'>>
): Promise<TodoActionResult<TodoConfig>> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    const config = await readTodoFile();
    
    if (settings.title !== undefined) {
      config.title = settings.title;
    }
    if (settings.showStats !== undefined) {
      config.showStats = settings.showStats;
    }
    
    await writeTodoFile(config);
    
    revalidatePath('/admin/todo');
    revalidatePath('/moments');
    
    return { success: true, message: 'Config updated successfully', data: config };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
