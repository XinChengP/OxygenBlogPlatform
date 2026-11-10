/**
 * 待办数据映射（远端同步协议 ↔ 本地展示模型）
 *
 * 唯一权威数据是线上同步 API 的 tasks 表，本文件负责：
 * 1. 远端优先级整数（0-3）与本地枚举（high/medium/low）的转换；
 * 2. 毫秒时间戳与 YYYY-MM-DD 日期字符串的转换（固定按北京时间）；
 * 3. 远端行与前台 TodoItem 的双向转换。
 *
 * 日期统一按 UTC+8 零点换算，避免在 UTC 构建机上出现「截止日期少一天」。
 */

import type { TodoItem, TodoPriority } from '@/types/todo';

/** 远端 tasks 表字段名，与 cloudflare 同步服务 model.ts 保持一致 */
export const TASK_FIELDS = [
  'title',
  'notes',
  'list_id',
  'due_at',
  'remind_at',
  'priority',
  'completed_at',
  'deleted_at',
] as const;

/** 远端 tasks 表字段类型 */
export type TaskField = (typeof TASK_FIELDS)[number];

/** 远端协议中的单字段结构：值与写入时间戳（毫秒） */
export interface RemoteFieldValue {
  v: unknown;
  at: number;
}

/** 远端同步接口返回的任务行 */
export interface RemoteTaskRow {
  id: string;
  created_at?: number;
  updated_at?: number;
  fields?: Record<string, RemoteFieldValue | undefined>;
}

/** 北京时间相对 UTC 的偏移（毫秒） */
const CN_TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 数字补零为两位字符串 */
function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** 远端整数优先级 → 本地枚举（0 表示无优先级） */
export function priorityFromInt(value: unknown): TodoPriority | undefined {
  if (value === 3) return 'high';
  if (value === 2) return 'medium';
  if (value === 1) return 'low';
  return undefined;
}

/** 本地枚举优先级 → 远端整数（无优先级为 0） */
export function priorityToInt(priority?: TodoPriority): number {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  if (priority === 'low') return 1;
  return 0;
}

/**
 * 把 YYYY-MM-DD 按北京时间零点换算成毫秒时间戳
 * @param date 形如 2026-12-20 的日期字符串
 * @returns 毫秒时间戳；格式非法时返回 null
 */
export function dateStringToMs(date?: string): number | null {
  if (!date) return null;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!matched) return null;
  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Date.UTC 得到 UTC 零点，减去东八区偏移即为北京时间当日零点
  return Date.UTC(year, month - 1, day) - CN_TZ_OFFSET_MS;
}

/**
 * 把毫秒时间戳按北京时间换算成 YYYY-MM-DD
 * @param ms 毫秒时间戳
 * @returns 日期字符串
 */
export function msToDateString(ms: number): string {
  const shifted = new Date(ms + CN_TZ_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/**
 * 远端任务行 → 前台待办项
 * 墓碑行（deleted_at 为数字）返回 null，由调用方过滤
 */
export function remoteRowToTodoItem(row: RemoteTaskRow): TodoItem | null {
  const fields = row.fields ?? {};
  const read = (field: TaskField): unknown => fields[field]?.v ?? null;

  // 墓碑：远端保留 deleted_at 标记，本地不再展示
  if (typeof read('deleted_at') === 'number') return null;

  const title = read('title');
  const notes = read('notes');
  const dueAt = read('due_at');
  const remindAt = read('remind_at');
  const createdAtMs =
    typeof row.created_at === 'number' && row.created_at > 0
      ? row.created_at
      : maxFieldTs(fields) || Date.now();
  const updatedAtMs =
    typeof row.updated_at === 'number' && row.updated_at > 0 ? row.updated_at : createdAtMs;

  return {
    id: row.id,
    content: typeof title === 'string' ? title : '',
    notes: typeof notes === 'string' && notes.trim() ? notes : undefined,
    completed: typeof read('completed_at') === 'number',
    priority: priorityFromInt(read('priority')),
    dueDate: typeof dueAt === 'number' ? msToDateString(dueAt) : undefined,
    remindAt: typeof remindAt === 'number' ? remindAt : undefined,
    createdAt: new Date(createdAtMs).toISOString(),
    updatedAt: new Date(updatedAtMs).toISOString(),
  };
}

/** 取出一行中最大的字段时间戳，作为缺失 created_at 时的兜底 */
function maxFieldTs(fields: Record<string, RemoteFieldValue | undefined>): number {
  let max = 0;
  for (const value of Object.values(fields)) {
    if (value && Number.isFinite(value.at) && value.at > max) max = value.at;
  }
  return max;
}

/** 批量把远端行转换为待办项（过滤墓碑） */
export function remoteRowsToItems(rows: RemoteTaskRow[]): TodoItem[] {
  return rows
    .map(remoteRowToTodoItem)
    .filter((item): item is TodoItem => item !== null)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/**
 * 新增待办 → 远端推送行（全字段写入）
 * @param item 待办项
 * @param now 本次写入时间戳，作为所有字段的 at
 */
export function todoItemToCreateRow(item: TodoItem, now: number): RemoteTaskRow {
  const createdMs = Date.parse(item.createdAt);
  return {
    id: item.id,
    created_at: Number.isFinite(createdMs) ? createdMs : now,
    fields: {
      title: { v: item.content, at: now },
      notes: { v: item.notes ?? '', at: now },
      due_at: { v: dateStringToMs(item.dueDate), at: now },
      remind_at: { v: item.remindAt ?? null, at: now },
      priority: { v: priorityToInt(item.priority), at: now },
      completed_at: { v: item.completed ? now : null, at: now },
    },
  };
}

/**
 * 编辑待办 → 只推送发生变化的字段
 * 字段级 LWW 下无需带上未修改字段，服务器会保留原值
 * @param changed 变化的表单字段集合
 */
export function todoItemToUpdateRow(
  item: TodoItem,
  changed: Array<'content' | 'notes' | 'priority' | 'dueDate' | 'remindAt'>,
  now: number
): RemoteTaskRow {
  const fields: Record<string, RemoteFieldValue> = {};
  if (changed.includes('content')) fields.title = { v: item.content, at: now };
  if (changed.includes('notes')) fields.notes = { v: item.notes ?? '', at: now };
  if (changed.includes('priority')) fields.priority = { v: priorityToInt(item.priority), at: now };
  if (changed.includes('dueDate')) fields.due_at = { v: dateStringToMs(item.dueDate), at: now };
  if (changed.includes('remindAt')) fields.remind_at = { v: item.remindAt ?? null, at: now };
  return { id: item.id, fields };
}

/** 切换完成状态 → 远端推送行（completed_at 写时间或 null） */
export function todoItemToCompleteRow(id: string, completed: boolean, now: number): RemoteTaskRow {
  return {
    id,
    fields: {
      completed_at: { v: completed ? now : null, at: now },
    },
  };
}

/** 删除待办 → 远端墓碑行 */
export function todoItemToDeleteRow(id: string, now: number): RemoteTaskRow {
  return {
    id,
    fields: {
      deleted_at: { v: now, at: now },
    },
  };
}
