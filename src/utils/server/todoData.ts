/**
 * 待办数据读取入口（仅服务端使用）
 *
 * 读取顺序：线上同步 API → 本地只读快照 → 空列表。
 * 线上 API 是唯一权威数据源，快照只在上游不可用时兜底展示。
 */

import type { TodoConfig } from '@/types/todo';
import { remoteRowsToItems } from '@/utils/todoMapping';
import { getTodoRemoteConfig, pullAllTodoRows } from './todoRemoteClient';
import { readTodoSnapshot } from './todoSnapshotStore';

/** 远端数据的进程内缓存时长（毫秒），避免开发环境每次刷新都请求 API */
const CACHE_TTL_MS = 60_000;

/** 加载结果：配置 + 数据来源 + 兜底原因 */
export interface TodoConfigLoadResult {
  config: TodoConfig;
  /** 数据来源：remote=线上 API，snapshot=本地只读快照兜底 */
  source: 'remote' | 'snapshot';
  /** 回退快照时的原因，供后台提示 */
  warning?: string;
  /** 上次成功拉取远端的时间 */
  fetchedAt: string | null;
}

/** 进程内缓存（只缓存成功拉取的结果） */
let remoteCache: { at: number; result: TodoConfigLoadResult } | null = null;

/** 清空缓存，后台写入后调用，保证下次读取拿到最新数据 */
export function invalidateTodoDataCache(): void {
  remoteCache = null;
}

/**
 * 读取待办配置
 * @param options.bypassCache 跳过缓存，强制向远端拉取（后台手动同步时使用）
 */
export async function loadTodoConfig(options?: { bypassCache?: boolean }): Promise<TodoConfigLoadResult> {
  const bypassCache = options?.bypassCache === true;

  if (!bypassCache && remoteCache && Date.now() - remoteCache.at < CACHE_TTL_MS) {
    return remoteCache.result;
  }

  // 快照同时承载本地展示配置（标题、是否显示统计），远端没有这两个字段
  const snapshot = await readTodoSnapshot();
  const baseConfig: TodoConfig = {
    title: snapshot.title,
    showStats: snapshot.showStats,
    items: snapshot.items,
  };

  const remote = getTodoRemoteConfig();
  if (!remote.ok) {
    return { config: baseConfig, source: 'snapshot', warning: remote.reason, fetchedAt: snapshot.fetchedAt };
  }

  try {
    const rows = await pullAllTodoRows(remote.config);
    const result: TodoConfigLoadResult = {
      config: { ...baseConfig, items: remoteRowsToItems(rows) },
      source: 'remote',
      fetchedAt: new Date().toISOString(),
    };
    remoteCache = { at: Date.now(), result };
    return result;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.warn('[todo] 线上待办拉取失败，回退本地快照:', reason);
    return { config: baseConfig, source: 'snapshot', warning: reason, fetchedAt: snapshot.fetchedAt };
  }
}
