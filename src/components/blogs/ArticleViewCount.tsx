'use client';

/**
 * 文章浏览量角标（文章详情页元信息栏）
 *
 * 数据来自 useArticleViews（页面级共享，避免重复上报）。
 * views 为 null 时（接口未部署/超时/加载中）整个元素不渲染，
 * 保证互动服务缺席时元信息栏与原来完全一致。
 */

import { EyeIcon } from '@heroicons/react/24/outline';

import { formatViewCount } from '@/setting/InteractionSetting';

interface ArticleViewCountProps {
  views: number | null;
}

export default function ArticleViewCount({ views }: ArticleViewCountProps) {
  if (views === null) return null;

  return (
    <div className="flex items-center gap-1.5" title={`累计浏览 ${views} 次`}>
      <EyeIcon className="h-4 w-4 text-primary/70" aria-hidden="true" />
      <span>{formatViewCount(views)} 次浏览</span>
    </div>
  );
}
