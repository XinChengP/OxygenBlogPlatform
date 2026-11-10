/**
 * 待办事项相关类型定义
 *
 * 说明：本项目的待办数据以线上同步 API（tasks 表）为权威来源，
 * 本地 todo.json 只是该接口的镜像快照，字段命名与远端保持一致语义：
 * content ↔ title、notes ↔ notes、dueDate ↔ due_at、
 * remindAt ↔ remind_at、completed ↔ completed_at、priority ↔ priority(0-3)
 */

/**
 * 待办优先级类型（对应远端整数：high=3 / medium=2 / low=1 / 空=0）
 */
export type TodoPriority = 'high' | 'medium' | 'low';

/**
 * 待办事项数据结构
 */
export interface TodoItem {
  /** 远端任务 ID（1-64 位字母数字/下划线/连字符，与远端 ID_RE 一致） */
  id: string;
  /** 待办标题，对应远端 title 字段 */
  content: string;
  /** 备注详情，对应远端 notes 字段 */
  notes?: string;
  /** 完成状态，对应远端 completed_at 是否为 null */
  completed: boolean;
  /** 优先级，对应远端 priority 整数字段 */
  priority?: TodoPriority;
  /** 截止日期（YYYY-MM-DD），对应远端 due_at 毫秒时间戳 */
  dueDate?: string;
  /** 提醒时间（毫秒时间戳），对应远端 remind_at 字段 */
  remindAt?: number;
  /** 创建时间（ISO 字符串，便于前端格式化） */
  createdAt: string;
  /** 更新时间（ISO 字符串，便于前端格式化） */
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
  /** 备注详情，对应远端 notes */
  notes?: string;
  /** 优先级；传 null 表示清空为「无优先级」 */
  priority?: TodoPriority | null;
  dueDate?: string;
  /** 提醒时间（毫秒时间戳），传 null 表示清空 */
  remindAt?: number | null;
}

/**
 * 同步结果统计（供后台同步按钮展示）
 */
export interface TodoSyncResult {
  /** 拉取到的远端行数（含重复拉取） */
  pulled: number;
  /** 推送本地变更的行数 */
  pushed: number;
  /** 同步后本地可见的待办数量（不含墓碑） */
  total: number;
  /** 同步完成后的最新配置，后台可直接用它刷新界面 */
  config: TodoConfig;
  /** 同步完成时间（ISO 字符串） */
  syncedAt: string;
}
