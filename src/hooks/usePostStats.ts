'use client';

/**
 * 批量文章统计 Hook（博客列表页）
 *
 * 一次请求拿全列表的浏览量/表情计数，供卡片角标与热门榜复用；
 * 接口不可用时返回空对象，UI 自动隐藏相关元素。
 */

import { useEffect, useState } from 'react';

import { type ArticleStats, fetchArticleStats } from '@/utils/interactionsApi';

export type PostStatsMap = Record<string, ArticleStats>;

export function usePostStats(slugs: string[]): PostStatsMap {
  const [stats, setStats] = useState<PostStatsMap>({});

  // slugs 数组每次渲染都是新引用，用拼接串做依赖避免重复请求
  const statsKey = slugs.join(',');

  useEffect(() => {
    if (!statsKey) return;
    let cancelled = false;
    fetchArticleStats(statsKey.split(',')).then((data) => {
      if (data && !cancelled) setStats(data);
    });
    return () => {
      cancelled = true;
    };
  }, [statsKey]);

  return stats;
}
