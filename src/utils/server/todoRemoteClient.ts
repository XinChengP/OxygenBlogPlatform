/**
 * 待办同步 API 客户端（仅服务端使用）
 *
 * 对接部署在 Cloudflare 上的任务清单同步服务：
 * - 鉴权：Authorization: Bearer <TODO_SYNC_TOKEN>
 * - 拉取：GET /v1/sync/pull?since=<游标>
 * - 推送：POST /v1/sync/push
 *
 * 国内直连 Cloudflare 的可达性按时段波动，因此实现了「多端点轮换 + 重试」：
 * 主地址失败后依次尝试备用端口，减少同步整体失败的概率。
 */

import type { RemoteTaskRow } from '@/utils/todoMapping';

/** 默认同步服务地址 */
const DEFAULT_ENDPOINT = 'https://todoapi.xinchengp.cn';

/** 443 劣化时常存活的备用端口（与 API 文档保持一致） */
const DEFAULT_FALLBACK_PORTS = ['2053', '2083', '2087', '2096', '8443'];

/** 单次请求超时（毫秒） */
const REQUEST_TIMEOUT_MS = 15000;

/** 单次同步请求的总时间预算（毫秒）：端点轮换与重试共享，避免构建期或后台操作卡太久 */
const TOTAL_REQUEST_BUDGET_MS = 20000;

/** 全部端点的最大尝试轮数 */
const MAX_ROUNDS = 2;

/** 单次推送的最大行数（服务器上限 500，留余量分批） */
const PUSH_CHUNK_SIZE = 200;

/**
 * 静态导出构建期使用 force-cache：
 * 页面在构建时渲染一次，no-store 会让 Next 把路由判定为动态渲染，
 * 与 output: 'export' 冲突；开发/服务端运行时仍用 no-store 保证实时性。
 */
const isStaticExport =
  process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

/** 同步请求失败类型 */
export type TodoRemoteErrorKind = 'config' | 'auth' | 'network' | 'server';

/** 同步请求错误，message 直接用于后台提示 */
export class TodoRemoteError extends Error {
  constructor(
    public readonly kind: TodoRemoteErrorKind,
    message: string
  ) {
    super(message);
    this.name = 'TodoRemoteError';
  }
}

/** 同步服务连接配置 */
export interface TodoRemoteConfig {
  endpoints: string[];
  token: string;
}

/**
 * 从环境变量读取同步配置
 * @returns 配置成功返回 ok:true；缺令牌时返回可读的中文原因
 */
export function getTodoRemoteConfig(): { ok: true; config: TodoRemoteConfig } | { ok: false; reason: string } {
  const token = (process.env.TODO_SYNC_TOKEN ?? '').trim();
  if (!token) {
    return {
      ok: false,
      reason: '未配置 TODO_SYNC_TOKEN，请在 .env.local 或 GitHub Secrets 中填写同步令牌',
    };
  }

  const primary = (process.env.TODO_SYNC_ENDPOINT ?? DEFAULT_ENDPOINT)
    .trim()
    .replace(/\/+$/, '');
  const customFallbacks = (process.env.TODO_SYNC_FALLBACKS ?? '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  // 未显式配置备用地址时，按主地址的域名生成备用端口
  const endpoints = [primary, ...(customFallbacks.length ? customFallbacks : buildPortFallbacks(primary))];
  return { ok: true, config: { endpoints: [...new Set(endpoints)], token } };
}

/** 根据主地址生成备用端口地址列表 */
function buildPortFallbacks(primary: string): string[] {
  try {
    const url = new URL(primary);
    return DEFAULT_FALLBACK_PORTS.map((port) => `https://${url.hostname}:${port}`);
  } catch {
    return [];
  }
}

/** 简单延时，用于重试退避 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 向同步服务发起 JSON 请求（端点轮换 + 重试）
 * @param config 连接配置
 * @param path 接口路径（含查询参数）
 * @param init fetch 初始化参数
 * @returns 成功时的 JSON 响应体
 */
async function requestJson(
  config: TodoRemoteConfig,
  path: string,
  init: RequestInit
): Promise<Record<string, unknown>> {
  let lastError: TodoRemoteError | null = null;
  const deadline = Date.now() + TOTAL_REQUEST_BUDGET_MS;

  outer: for (let round = 0; round < MAX_ROUNDS; round += 1) {
    for (const endpoint of config.endpoints) {
      // 总预算耗尽后不再尝试下一个端点，直接把最后的错误抛给调用方
      const remaining = deadline - Date.now();
      if (remaining <= 0) break outer;

      try {
        const response = await fetch(`${endpoint}${path}`, {
          ...init,
          headers: {
            Authorization: `Bearer ${config.token}`,
            ...(init.body ? { 'Content-Type': 'application/json' } : {}),
            ...(init.headers ?? {}),
          },
          signal: AbortSignal.timeout(Math.min(REQUEST_TIMEOUT_MS, remaining)),
          cache: isStaticExport ? 'force-cache' : 'no-store',
        });

        const text = await response.text();
        let payload: Record<string, unknown> | null = null;
        try {
          payload = text ? (JSON.parse(text) as Record<string, unknown>) : null;
        } catch {
          payload = null;
        }

        // 401 是确定性错误，换端点也不会好，直接提示配置问题
        if (response.status === 401) {
          throw new TodoRemoteError('auth', '同步令牌无效，请检查 TODO_SYNC_TOKEN');
        }

        if (!response.ok) {
          const serverMessage =
            typeof payload?.error === 'string' ? payload.error : `HTTP ${response.status}`;
          // 5xx 视为端点临时不可用，换下一个端点继续尝试
          if (response.status >= 500) {
            lastError = new TodoRemoteError('server', `同步服务异常：${serverMessage}`);
            continue;
          }
          throw new TodoRemoteError('server', `同步请求失败：${serverMessage}`);
        }

        if (!payload || payload.ok !== true) {
          throw new TodoRemoteError('server', '同步服务响应格式异常');
        }
        return payload;
      } catch (error) {
        if (error instanceof TodoRemoteError) {
          // 鉴权与业务错误属于确定性失败，换端点也无意义
          if (error.kind === 'auth' || error.kind === 'server') throw error;
          lastError = error;
        } else {
          // 网络层错误（超时、连接重置、TLS 抖动）记录后换端点重试
          const reason = error instanceof Error ? error.message : String(error);
          lastError = new TodoRemoteError('network', `网络请求失败：${reason}`);
        }
      }
    }

    if (round < MAX_ROUNDS - 1) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await delay(Math.min(600, remaining));
    }
  }

  if (!lastError && Date.now() >= deadline) {
    lastError = new TodoRemoteError('network', '同步请求超出时间预算，请稍后重试');
  }
  throw lastError ?? new TodoRemoteError('network', '所有同步端点均不可用');
}

/**
 * 全量拉取远端任务行（含墓碑）
 * 游标回退 2 秒冗余会导致重复行，这里按 id 去重并保留最新一条
 */
export async function pullAllTodoRows(config: TodoRemoteConfig): Promise<RemoteTaskRow[]> {
  let cursor = 0;
  let hasMore = true;
  let guard = 0;
  const collected = new Map<string, RemoteTaskRow>();

  while (hasMore && guard < 50) {
    const payload = await requestJson(config, `/v1/sync/pull?since=${cursor}`, { method: 'GET' });
    const tasks = Array.isArray(payload.tasks) ? (payload.tasks as RemoteTaskRow[]) : [];
    for (const row of tasks) {
      if (!row || typeof row.id !== 'string') continue;
      const existing = collected.get(row.id);
      // 同一行重复出现时保留 updated_at 更大的版本
      if (!existing || (row.updated_at ?? 0) >= (existing.updated_at ?? 0)) {
        collected.set(row.id, row);
      }
    }
    cursor = typeof payload.cursor === 'number' ? payload.cursor : cursor;
    hasMore = payload.has_more === true;
    guard += 1;
  }

  return [...collected.values()];
}

/**
 * 推送本地变更到远端
 * @returns 服务器裁决后的最终行（协议要求客户端用它覆盖本地，包括输掉的写入）
 */
export async function pushTodoRows(
  config: TodoRemoteConfig,
  rows: RemoteTaskRow[]
): Promise<RemoteTaskRow[]> {
  if (rows.length === 0) return [];
  const accepted: RemoteTaskRow[] = [];

  for (let start = 0; start < rows.length; start += PUSH_CHUNK_SIZE) {
    const chunk = rows.slice(start, start + PUSH_CHUNK_SIZE);
    const payload = await requestJson(config, '/v1/sync/push', {
      method: 'POST',
      body: JSON.stringify({ tasks: chunk, lists: [] }),
    });
    if (Array.isArray(payload.tasks)) {
      accepted.push(...(payload.tasks as RemoteTaskRow[]));
    }
  }

  return accepted;
}
