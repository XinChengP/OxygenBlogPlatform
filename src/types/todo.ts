/**
 * 待办事项相关类型定义
 */

/**
 * 待办优先级类型
 */
export type TodoPriority = 'high' | 'medium' | 'low';

/**
 * 待办事项数据结构
 */
export interface TodoItem {
  id: string;
  content: string;
  completed: boolean;
  priority?: TodoPriority;
  dueDate?: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * 待办配置结构
 */
export interface TodoConfig {
  title: string;
  items: TodoItem[];
  showStats: boolean;
}

/**
 * 操作结果接口
 */
export interface TodoActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

/**
 * 待办表单数据（用于创建和编辑）
 */
export interface TodoFormData {
  content: string;
  priority?: TodoPriority;
  dueDate?: string;
}
