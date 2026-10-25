'use client';

/**
 * 文章浏览量 Hook
 *
 * 仅在文章详情页（ClientBlogDetail）使用：
 * 页面挂载时上报一次浏览，元信息栏的浏览量角标共享这一份状态。
 *
 * 真实的去重与计数在服务端（cloudflare/interactions Worker + D1，
 * 按「路径 + 天 + 访客哈希」去重）；sessionStorage 去重只是省请求的软手段。
 * 接口未部署/超时时 views 保持 null，UI 不渲染，页面其余部分不受影响。
 */

import { useEffect, useState } from 'react';

import { fetchArticleStats, recordArticleView } from '@/utils/interactionsApi';
import { blogInteractionPath } from '@/setting/InteractionSetting';

export interface UseArticleViewsReturn {
  /** 总浏览量；null 表示接口不可用或尚未返回，UI 据此决定是否展示 */
  views: number | null;
}

/** 本会话已上报过的文章，防止 React StrictMode / 组件重挂载重复请求 */
const VIEWED_SESSION_KEY = 'obp-viewed';

export function useArticleViews(slug: string): UseArticleViewsReturn {
  const [views, setViews] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const alreadyViewed = (() => {
      try {
        const viewed = JSON.parse(sessionStorage.getItem(VIEWED_SESSION_KEY) || '[]');
        return viewed.includes(slug);
      } catch {
        return false;
      }
    })();

    const markViewed = () => {
      try {
        const viewed = JSON.parse(sessionStorage.getItem(VIEWED_SESSION_KEY) || '[]');
        if (!viewed.includes(slug)) {
          viewed.push(slug);
          sessionStorage.setItem(VIEWED_SESSION_KEY, JSON.stringify(viewed));
        }
      } catch {
        // sessionStorage 不可用时忽略，服务端仍会去重
      }
    };

    (async () => {
      // 本会话首次：上报浏览拿最新总数；否则只读统计，避免浪费一次写请求
      const count = alreadyViewed
        ? (await fetchArticleStats([slug]))?.[blogInteractionPath(slug)]?.views ?? null
        : await recordArticleView(slug);

      if (!cancelled && count !== null) setViews(count);
      markViewed();
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { views };
}
