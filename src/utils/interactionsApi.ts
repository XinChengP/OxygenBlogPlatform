/**
 * 互动服务客户端封装（浏览量）
 *
 * 所有请求 5 秒超时、失败返回 null 而不是抛错 ——
 * 浏览数据属于「锦上添花」，接口不可用时页面必须照常渲染，
 * 静默降级的责任收敛在这一层，调用方拿到 null 自己决定是否展示。
 *
 * SSR 期间直接返回 null：组件统一在 useEffect 中调用本模块。
 */

import {
  INTERACTIONS_API_URL,
  blogInteractionPath,
} from '@/setting/InteractionSetting';

/** 单篇文章的统计 */
export interface ArticleStats {
  /** 全站总浏览量 */
  views: number;
}

/** 请求超时时间；互动接口应当快速失败，不能拖慢页面 */
const REQUEST_TIMEOUT_MS = 5000;

/** 批量统计接口的单次路径上限，与 Worker 端约束一致 */
export const MAX_BATCH_PATHS = 50;

async function request<T>(endpoint: string, init?: RequestInit): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  try {
    const response = await fetch(`${INTERACTIONS_API_URL}${endpoint}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    // 网络失败 / 超时 / 后端未部署：静默降级
    return null;
  }
}

/** 把互动路径 key 还原为文章 slug（/blogs/foo/ → foo） */
export function slugFromInteractionPath(path: string): string {
  return path.replace(/^\/blogs\//, '').replace(/\/$/, '');
}

/**
 * 上报一次浏览，返回最新总浏览量。
 * 服务端按「路径 + 天 + 访客哈希」去重，这里不再做客户端去重，
 * 重复上报只会浪费一次请求，不会虚增计数。
 */
export async function recordArticleView(slug: string): Promise<number | null> {
  const data = await request<{ views: number }>('/view', {
    method: 'POST',
    body: JSON.stringify({ path: blogInteractionPath(slug) }),
  });
  return data ? data.views : null;
}

/** 批量获取文章浏览量（列表页用），最多 MAX_BATCH_PATHS 条 */
export async function fetchArticleStats(
  slugs: string[]
): Promise<Record<string, ArticleStats> | null> {
  if (slugs.length === 0) return {};
  const paths = slugs.slice(0, MAX_BATCH_PATHS).map(blogInteractionPath);
  const data = await request<{ items: Record<string, ArticleStats> }>(
    `/stats?paths=${encodeURIComponent(paths.join(','))}`
  );
  return data ? data.items : null;
}
