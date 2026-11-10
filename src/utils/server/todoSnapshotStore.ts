/**
 * 待办只读快照存储（仅服务端使用）
 *
 * 快照的职责：当构建机无法访问同步 API（未配置令牌、网络波动）时，
 * 让线上待办区域仍能展示最近一次成功拉取的结果，避免页面空白。
 *
 * 快照只读，不作为编辑数据源：
 * - 唯一数据源是线上同步 API；
 * - 只有本地后台（开发环境）在成功同步后写快照，并提交到仓库供 CI 兜底；
 * - 普通编辑操作不会再写任何本地待办数据文件。
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { TodoConfig, TodoItem } from '@/types/todo';

/** 快照文件路径（会纳入版本管理，作为构建兜底数据） */
export const TODO_SNAPSHOT_PATH = path.join(process.cwd(), 'src', 'data', 'todoSnapshot.json');

/** 快照数据结构：业务配置 + 拉取时间 */
export interface TodoSnapshot extends TodoConfig {
  /** 上次从远端成功拉取的时间（ISO 字符串），从未成功拉取时为 null */
  fetchedAt: string | null;
}

/** 默认快照（无任何远端数据时使用） */
const DEFAULT_SNAPSHOT: TodoSnapshot = {
  title: '待办事项',
  showStats: true,
  items: [],
  fetchedAt: null,
};

/** 模块级写队列，保证同一进程内的快照写入串行执行 */
let writeChain: Promise<unknown> = Promise.resolve();

/**
 * 在写锁内执行任务
 * 前一个任务失败不阻断后续任务，因此对链尾做 catch 兜底
 */
export function withTodoWriteLock<T>(task: () => Promise<T>): Promise<T> {
  const run = writeChain.then(task, task);
  writeChain = run.catch(() => undefined);
  return run;
}

/** 校验并归一化单条待办项，避免脏数据进入渲染层 */
function normalizeItem(raw: unknown): TodoItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<TodoItem>;
  if (typeof item.id !== 'string' || !item.id) return null;
  if (typeof item.content !== 'string') return null;

  return {
    id: item.id,
    content: item.content,
    notes: typeof item.notes === 'string' && item.notes.trim() ? item.notes : undefined,
    completed: item.completed === true,
    priority:
      item.priority === 'high' || item.priority === 'medium' || item.priority === 'low'
        ? item.priority
        : undefined,
    dueDate: typeof item.dueDate === 'string' && item.dueDate ? item.dueDate : undefined,
    remindAt: typeof item.remindAt === 'number' ? item.remindAt : undefined,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : undefined,
  };
}

/**
 * 读取快照
 * 文件不存在或内容损坏时返回默认快照，保证页面永远有可渲染的数据
 */
export async function readTodoSnapshot(): Promise<TodoSnapshot> {
  try {
    const content = await fs.readFile(TODO_SNAPSHOT_PATH, 'utf-8');
    const parsed = JSON.parse(content) as Partial<TodoSnapshot>;
    const items = Array.isArray(parsed.items)
      ? parsed.items.map(normalizeItem).filter((item): item is TodoItem => item !== null)
      : [];

    return {
      title: typeof parsed.title === 'string' && parsed.title ? parsed.title : DEFAULT_SNAPSHOT.title,
      showStats: parsed.showStats !== false,
      items,
      fetchedAt: typeof parsed.fetchedAt === 'string' ? parsed.fetchedAt : null,
    };
  } catch (error) {
    // 读取失败不应阻断页面渲染，但要在服务端日志留下线索
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.warn('[todo] 读取待办快照失败，回退默认配置:', error);
    }
    return { ...DEFAULT_SNAPSHOT, items: [] };
  }
}

/** 原子写入快照（先写临时文件再重命名，避免中断产生半截 JSON） */
export async function writeTodoSnapshot(snapshot: TodoSnapshot): Promise<void> {
  const dir = path.dirname(TODO_SNAPSHOT_PATH);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }

  const tempPath = `${TODO_SNAPSHOT_PATH}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(snapshot, null, 2), 'utf-8');
  try {
    await fs.rename(tempPath, TODO_SNAPSHOT_PATH);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}
