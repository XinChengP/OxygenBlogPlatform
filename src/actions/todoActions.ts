/**
 * 待办管理相关的 Server Actions（仅本地开发环境可用）
 *
 * 数据源：部署在 Cloudflare 上的任务清单同步 API（tasks 表）。
 * - 读取：直接调用拉取接口，失败时回退到本地只读快照；
 * - 写入：直接推送接口，不再维护本地 todo.json；
 * - 快照：只有「同步」动作会在本地写一份只读快照，供线上构建兜底。
 *
 * 静态导出模式下全部返回不支持，避免构建期引入 Node 文件系统操作。
 */

'use server';

import type { TodoConfig, TodoFormData, TodoItem, TodoActionResult, TodoSyncResult } from '@/types/todo';
import { revalidatePath } from 'next/cache';
import {
  remoteRowToTodoItem,
  todoItemToCompleteRow,
  todoItemToCreateRow,
  todoItemToDeleteRow,
  todoItemToUpdateRow,
  type RemoteTaskRow,
} from '@/utils/todoMapping';
import { getTodoRemoteConfig, pushTodoRows } from '@/utils/server/todoRemoteClient';
import { loadTodoConfig, invalidateTodoDataCache } from '@/utils/server/todoData';
import { readTodoSnapshot, writeTodoSnapshot, withTodoWriteLock } from '@/utils/server/todoSnapshotStore';

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

/** 静态导出模式统一返回 */
const STATIC_EXPORT_MESSAGE = '静态导出模式不支持此功能';

/**
 * 生成待办 ID
 * 远端仅要求 1-64 位 [A-Za-z0-9_-]，毫秒时间戳 + 随机串即可保证本机唯一
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * 进程内单调递增的写入时间戳
 * 同一毫秒内连续写同一个字段时，服务器按「平局服务器赢」会丢弃后一次；
 * 这里保证本进程产生的 at 严格递增，减少快速连点导致的丢写。
 */
let lastWriteTimestamp = 0;
function nextWriteTimestamp(): number {
  const now = Date.now();
  lastWriteTimestamp = now > lastWriteTimestamp ? now : lastWriteTimestamp + 1;
  return lastWriteTimestamp;
}

/** 推送结果：成功时携带服务器裁决后的最终行 */
type PushChangesResult =
  | { ok: true; rows: RemoteTaskRow[] }
  | { ok: false; message: string };

/**
 * 推送变更到远端
 * @returns 服务器裁决后的最终行；失败时返回可读的中文错误信息
 */
async function pushChanges(rows: RemoteTaskRow[]): Promise<PushChangesResult> {
  const remote = getTodoRemoteConfig();
  if (!remote.ok) return { ok: false, message: remote.reason };

  try {
    const serverRows = await pushTodoRows(remote.config, rows);
    invalidateTodoDataCache();
    return { ok: true, rows: serverRows };
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

/** 从服务器裁决结果中取出指定 ID 的待办，拿不到时返回 null */
function findServerItem(rows: RemoteTaskRow[], id: string): TodoItem | null {
  const row = rows.find((entry) => entry.id === id);
  return row ? remoteRowToTodoItem(row) : null;
}

/** 广播待办相关页面的缓存失效 */
function revalidateTodoPaths(): void {
  revalidatePath('/admin/todo');
  revalidatePath('/moments');
  // 仪表盘的待办完成进度也依赖这份数据
  revalidatePath('/admin');
}

/**
 * 获取待办配置
 * @returns 远端数据；远端不可用时回退快照，message 中说明原因
 */
export async function getTodoConfig(): Promise<TodoActionResult<TodoConfig>> {
  try {
    const result = await loadTodoConfig();
    return {
      success: true,
      message: result.warning ? `已使用本地快照：${result.warning}` : 'Success',
      data: result.config,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/** 获取待办列表 */
export async function getTodoList(): Promise<TodoActionResult<TodoItem[]>> {
  const result = await getTodoConfig();
  if (!result.success || !result.data) {
    return { success: false, message: result.message, data: [] };
  }
  return { success: true, message: result.message, data: result.data.items };
}

/**
 * 获取单个待办事项
 * @param id 待办事项 ID
 */
export async function getTodoItem(id: string): Promise<TodoActionResult<TodoItem>> {
  const result = await getTodoList();
  const item = result.data?.find((entry) => entry.id === id);
  if (!item) {
    return { success: false, message: '待办不存在' };
  }
  return { success: true, message: 'Success', data: item };
}

/**
 * 创建待办事项（全字段推送到远端）
 * @param data 待办表单数据
 */
export async function createTodoItem(data: TodoFormData): Promise<TodoActionResult<TodoItem>> {
  if (isStaticExport) {
    return { success: false, message: STATIC_EXPORT_MESSAGE };
  }

  try {
    const content = data.content?.trim();
    if (!content) {
      return { success: false, message: '待办内容不能为空' };
    }

    const now = nextWriteTimestamp();
    const newItem: TodoItem = {
      id: generateId(),
      content,
      notes: data.notes?.trim() ? data.notes.trim() : undefined,
      completed: false,
      // 表单里的「无优先级」会传 null，这里不能回退成 medium，否则清空优先级不生效
      priority: data.priority || undefined,
      dueDate: data.dueDate || undefined,
      remindAt: typeof data.remindAt === 'number' ? data.remindAt : undefined,
      createdAt: new Date(now).toISOString(),
      updatedAt: new Date(now).toISOString(),
    };

    const pushResult = await pushChanges([todoItemToCreateRow(newItem, now)]);
    if (!pushResult.ok) return { success: false, message: pushResult.message };

    revalidateTodoPaths();
    return {
      success: true,
      message: '已添加待办',
      // 用服务器最终状态回写，避免本地展示与远端字段级 LWW 结果不一致
      data: findServerItem(pushResult.rows, newItem.id) ?? newItem,
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 更新待办事项（只推送发生变化的字段）
 * @param id 待办事项 ID
 * @param data 更新的数据
 */
export async function updateTodoItem(
  id: string,
  data: Partial<TodoFormData>
): Promise<TodoActionResult<TodoItem>> {
  if (isStaticExport) {
    return { success: false, message: STATIC_EXPORT_MESSAGE };
  }

  try {
    const changed: Array<'content' | 'notes' | 'priority' | 'dueDate' | 'remindAt'> = [];

    if (data.content !== undefined) {
      if (!data.content.trim()) return { success: false, message: '待办内容不能为空' };
      changed.push('content');
    }
    if (data.notes !== undefined) changed.push('notes');
    if (data.priority !== undefined) changed.push('priority');
    if (data.dueDate !== undefined) changed.push('dueDate');
    if (data.remindAt !== undefined) changed.push('remindAt');

    if (changed.length === 0) {
      return { success: false, message: '没有需要更新的字段' };
    }

    const now = nextWriteTimestamp();
    // 只需要变更字段的值，未变更字段不会进入推送行
    const partialItem: TodoItem = {
      id,
      content: data.content?.trim() ?? '',
      notes: data.notes,
      completed: false,
      priority: data.priority || undefined,
      dueDate: data.dueDate,
      remindAt: typeof data.remindAt === 'number' ? data.remindAt : undefined,
      createdAt: new Date(now).toISOString(),
    };

    const pushResult = await pushChanges([todoItemToUpdateRow(partialItem, changed, now)]);
    if (!pushResult.ok) return { success: false, message: pushResult.message };

    revalidateTodoPaths();
    return {
      success: true,
      message: '已保存',
      // 服务器可能拒绝本次写入（字段 at 较旧），必须用响应覆盖本地
      data: findServerItem(pushResult.rows, id) ?? { ...partialItem, updatedAt: new Date(now).toISOString() },
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 删除待办事项（写入远端墓碑，不做物理删除）
 * @param id 待办事项 ID
 */
export async function deleteTodoItem(id: string): Promise<TodoActionResult> {
  if (isStaticExport) {
    return { success: false, message: STATIC_EXPORT_MESSAGE };
  }

  try {
    const pushResult = await pushChanges([todoItemToDeleteRow(id, nextWriteTimestamp())]);
    if (!pushResult.ok) return { success: false, message: pushResult.message };

    revalidateTodoPaths();
    return { success: true, message: '已删除' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 设置待办完成状态
 * 注意：改为传入目标状态，避免多端并发时「取反」产生歧义
 */
export async function setTodoComplete(
  id: string,
  completed: boolean
): Promise<TodoActionResult<{ id: string; completed: boolean }>> {
  if (isStaticExport) {
    return { success: false, message: STATIC_EXPORT_MESSAGE };
  }

  try {
    const now = nextWriteTimestamp();
    const pushResult = await pushChanges([todoItemToCompleteRow(id, completed, now)]);
    if (!pushResult.ok) return { success: false, message: pushResult.message };

    revalidateTodoPaths();
    const serverItem = findServerItem(pushResult.rows, id);
    const finalCompleted = serverItem?.completed ?? completed;
    return {
      success: true,
      message: finalCompleted ? '已标记为完成' : '已取消完成',
      data: { id, completed: finalCompleted },
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 批量删除（一次推送多行墓碑）
 * @param ids 待办事项 ID 数组
 */
export async function batchDeleteTodoItems(ids: string[]): Promise<TodoActionResult> {
  if (isStaticExport) {
    return { success: false, message: STATIC_EXPORT_MESSAGE };
  }

  try {
    if (!ids || ids.length === 0) {
      return { success: false, message: '请先选择待办' };
    }

    const now = nextWriteTimestamp();
    const pushResult = await pushChanges(ids.map((id) => todoItemToDeleteRow(id, now)));
    if (!pushResult.ok) return { success: false, message: pushResult.message };

    revalidateTodoPaths();
    return { success: true, message: `已删除 ${ids.length} 条待办` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 更新本地展示配置（标题、是否显示统计）
 * 这两个字段远端没有对应概念，只写入本地只读快照
 */
export async function updateTodoConfigSettings(
  settings: Partial<Pick<TodoConfig, 'title' | 'showStats'>>
): Promise<TodoActionResult<TodoConfig>> {
  if (isStaticExport) {
    return { success: false, message: STATIC_EXPORT_MESSAGE };
  }

  // 标题是侧栏卡片的展示文案，空字符串会让卡片标题消失
  if (settings.title !== undefined && !settings.title.trim()) {
    return { success: false, message: '标题不能为空' };
  }

  try {
    return await withTodoWriteLock(async () => {
      const snapshot = await readTodoSnapshot();
      const nextTitle =
        settings.title !== undefined && settings.title.trim() ? settings.title.trim() : snapshot.title;
      const nextShowStats = settings.showStats !== undefined ? settings.showStats : snapshot.showStats;

      await writeTodoSnapshot({
        title: nextTitle,
        showStats: nextShowStats,
        items: snapshot.items,
        fetchedAt: snapshot.fetchedAt,
      });
      invalidateTodoDataCache();
      revalidateTodoPaths();

      return {
        success: true,
        message: '设置已保存',
        data: { title: nextTitle, showStats: nextShowStats, items: snapshot.items },
      };
    });
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 从线上 API 全量同步待办，并更新本地只读快照
 * 这是唯一会写本地文件的动作，供线上构建兜底使用
 */
export async function syncTodoFromRemote(): Promise<TodoActionResult<TodoSyncResult>> {
  if (isStaticExport) {
    return { success: false, message: STATIC_EXPORT_MESSAGE };
  }

  try {
    const result = await loadTodoConfig({ bypassCache: true });
    if (result.source === 'snapshot') {
      return { success: false, message: result.warning ?? '同步失败，已使用本地快照' };
    }

    const syncedAt = new Date().toISOString();
    await withTodoWriteLock(async () => {
      const snapshot = await readTodoSnapshot();
      await writeTodoSnapshot({
        title: snapshot.title,
        showStats: snapshot.showStats,
        items: result.config.items,
        fetchedAt: syncedAt,
      });
    });
    invalidateTodoDataCache();
    revalidateTodoPaths();

    return {
      success: true,
      message: `同步完成，共 ${result.config.items.length} 条待办`,
      data: {
        pulled: result.config.items.length,
        pushed: 0,
        total: result.config.items.length,
        config: result.config,
        syncedAt,
      },
    };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
