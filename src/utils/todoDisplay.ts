/**
 * 待办展示工具（客户端/服务端通用）
 *
 * 这里的函数不依赖 Node API，供动态页侧栏与后台列表共用：
 * - 截止日期直接按 YYYY-MM-DD 格式化，避免 new Date('YYYY-MM-DD') 按 UTC 解析导致负时区少一天；
 * - 逾期判断按北京时间取「今天」，与远端 due_at 的换算口径保持一致；
 * - 排序规则统一：未完成在前 → 优先级 → 截止日期 → 创建时间。
 */

import type { TodoItem, TodoPriority } from '@/types/todo';

/** 北京时间相对 UTC 的偏移（毫秒） */
const CN_TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 优先级排序权重：high → medium → low → 无优先级 */
const PRIORITY_RANK: Record<TodoPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

/** 数字补零为两位字符串 */
function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

/** 严格解析 YYYY-MM-DD，格式非法时返回 null */
function parseDateOnly(date?: string): { year: number; month: number; day: number } | null {
  if (!date) return null;
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!matched) return null;

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { year, month, day };
}

/**
 * 按北京时间取今天的日期字符串
 * 远端 due_at 以 UTC+8 零点存储，这里保持同一口径，避免跨时区误判逾期
 */
export function getTodayInChina(now: number = Date.now()): string {
  const shifted = new Date(now + CN_TZ_OFFSET_MS);
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/**
 * 是否已逾期
 * 截止日期早于今天才算逾期，当天仍视为正常；已完成或没有截止日期的不算
 */
export function isTodoOverdue(item: TodoItem, now: number = Date.now()): boolean {
  if (item.completed || !item.dueDate) return false;
  if (!parseDateOnly(item.dueDate)) return false;
  return item.dueDate.trim() < getTodayInChina(now);
}

/** 格式化截止日期：直接按字符串输出，避免时区偏移 */
export function formatTodoDueDate(date?: string): string {
  const parsed = parseDateOnly(date);
  if (!parsed) return date?.trim() ?? '';
  return `${parsed.year}/${pad2(parsed.month)}/${pad2(parsed.day)}`;
}

/** 格式化提醒时间（毫秒时间戳），展示到分钟即可 */
export function formatTodoRemindAt(ms?: number | null): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '';
  return new Date(ms).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** 毫秒时间戳 → datetime-local 输入框需要的本地时间字符串 */
export function msToDatetimeLocal(ms?: number | null): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return '';
  const date = new Date(ms);
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * datetime-local 输入值 → 毫秒时间戳
 * @returns 空值或非法值返回 null
 */
export function datetimeLocalToMs(value: string): number | null {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

/**
 * 统一排序
 * 未完成优先；未完成项按优先级、截止日期（无截止日期靠后）、创建时间排序；
 * 已完成项按最近更新时间倒序，刚勾选的排在最前。
 */
export function sortTodoItems(items: TodoItem[]): TodoItem[] {
  return [...items].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;

    if (a.completed) {
      const aTime = Date.parse(a.updatedAt ?? a.createdAt) || 0;
      const bTime = Date.parse(b.updatedAt ?? b.createdAt) || 0;
      return bTime - aTime;
    }

    const aRank = a.priority ? PRIORITY_RANK[a.priority] : 3;
    const bRank = b.priority ? PRIORITY_RANK[b.priority] : 3;
    if (aRank !== bRank) return aRank - bRank;

    const aDue = a.dueDate?.trim() ?? '';
    const bDue = b.dueDate?.trim() ?? '';
    if (aDue !== bDue) {
      if (!aDue) return 1;
      if (!bDue) return -1;
      return aDue.localeCompare(bDue);
    }

    const aCreated = Date.parse(a.createdAt) || 0;
    const bCreated = Date.parse(b.createdAt) || 0;
    return aCreated - bCreated;
  });
}

/** 待办统计结果 */
export interface TodoStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  completionRate: number;
}

/** 计算待办统计（完成率按百分比取整） */
export function getTodoStats(items: TodoItem[], now: number = Date.now()): TodoStats {
  const total = items.length;
  const completed = items.filter((item) => item.completed).length;
  const overdue = items.filter((item) => isTodoOverdue(item, now)).length;

  return {
    total,
    completed,
    pending: total - completed,
    overdue,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}
