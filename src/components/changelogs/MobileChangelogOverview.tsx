'use client';

import React, { useMemo, useState } from 'react';
import {
  Changelog,
  getChangelogTypeColor,
  getChangelogTypeLabel,
  getContrastTextColor,
  getTypeStats,
} from '@/types/changelogTypes';

/**
 * 移动端日志总览
 *
 * 桌面端统计图固定在右侧栏；移动端它们排在 100+ 篇日志之后，
 * 实际上很难看到。这里在列表顶部给一条可折叠的摘要，完整图表仍留在页面底部。
 */
export default function MobileChangelogOverview({
  changelogs,
  generatedAt,
}: {
  changelogs: Changelog[];
  /**
   * 页面构建/服务端渲染时间（ISO 字符串）。
   *
   * 不能在渲染期直接 new Date()：静态导出的 HTML 是构建时生成的，
   * 用户隔月访问时客户端会算出不同的月份，造成 hydration 警告。
   */
  generatedAt: string;
}) {
  const [open, setOpen] = useState(false);

  const stats = useMemo(() => {
    const reference = new Date(generatedAt);
    const monthKey = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, '0')}`;

    return {
      total: changelogs.length,
      monthCount: changelogs.filter((item) => item.date.startsWith(monthKey)).length,
      latest: changelogs[0]?.date ?? '',
      topTypes: getTypeStats(changelogs).slice(0, 3),
    };
  }, [changelogs, generatedAt]);

  if (stats.total === 0) return null;

  const detailsId = 'mobile-changelog-overview';

  return (
    <div className="mb-4 lg:hidden">
      <div className="rounded-xl border border-border bg-card/90 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls={detailsId}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <span className="min-w-0">
            <span className="block text-sm font-semibold">日志总览</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              共 {stats.total} 篇 · 本月 {stats.monthCount} 篇
            </span>
          </span>
          <svg
            className={`h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div id={detailsId} className="border-t border-border/40 px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-muted/40 p-2.5">
                <div className="text-xs text-muted-foreground">累计日志</div>
                <div className="mt-0.5 text-lg font-bold leading-tight">{stats.total} 篇</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-2.5">
                <div className="text-xs text-muted-foreground">本月新增</div>
                <div className="mt-0.5 text-lg font-bold leading-tight">{stats.monthCount} 篇</div>
              </div>
            </div>

            {stats.latest && (
              <p className="mt-2 text-xs text-muted-foreground">
                最近更新：<span className="font-medium text-foreground">{stats.latest}</span>
              </p>
            )}

            {stats.topTypes.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">类型 Top3：</span>
                {stats.topTypes.map((item) => {
                  const color = getChangelogTypeColor(item.type);
                  return (
                    <span
                      key={item.type}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: color, color: getContrastTextColor(color) }}
                    >
                      {getChangelogTypeLabel(item.type)}
                      <span className="tabular-nums opacity-80">{item.count}</span>
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
