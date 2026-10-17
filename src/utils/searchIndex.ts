import { getAssetPath } from '@/utils/assetUtils';

/** 搜索索引条目类型（与 search-index.json 输出结构保持一致） */
export interface SearchIndexEntry {
  slug: string;
  title: string;
  category: string;
  tags: string[];
  excerpt: string;
  date: string;
  plainContent: string;
}

// 模块级缓存：全站共享，只 fetch 一次
let cachedIndex: SearchIndexEntry[] | null = null;
let pendingFetch: Promise<SearchIndexEntry[]> | null = null;

/**
 * 加载搜索索引（按需 fetch，带模块级缓存与请求去重）
 */
export async function loadSearchIndex(): Promise<SearchIndexEntry[]> {
  if (cachedIndex) return cachedIndex;
  if (pendingFetch) return pendingFetch;

  pendingFetch = fetch(getAssetPath('/search-index.json'))
    .then((res) => {
      if (!res.ok) throw new Error(`索引加载失败（${res.status}）`);
      return res.json() as Promise<SearchIndexEntry[]>;
    })
    .then((data) => {
      cachedIndex = data;
      return data;
    })
    .finally(() => {
      pendingFetch = null;
    });

  return pendingFetch;
}

/**
 * 预取搜索索引（导航按钮 hover/focus 或空闲时调用），失败静默
 */
export function prefetchSearchIndex(): void {
  if (cachedIndex || pendingFetch) return;
  void loadSearchIndex().catch(() => undefined);
}
