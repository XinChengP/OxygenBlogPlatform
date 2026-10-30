'use client';

import React from 'react';
import {
  CHANGELOG_TYPES,
  ChangelogPeriodFilter,
  ChangelogType,
  getChangelogTypeColor,
  getChangelogTypeLabel,
  getContrastTextColor,
} from '@/types/changelogTypes';

/**
 * 日志筛选栏
 *
 * 类型与年份/周期互不阻塞：类型计数会随当前年份/周期刷新，
 * 年份计数也会随当前类型刷新，用户能直接看到「切换后还剩多少篇」。
 */
export interface ChangelogFilterBarProps {
  totalCount: number;
  filteredCount: number;
  typeFilter: ChangelogType | 'all';
  /** 年份筛选，'all' 表示不限 */
  yearFilter: string;
  /** 图表点击产生的月/季筛选，与年份筛选互斥 */
  periodFilter: ChangelogPeriodFilter | null;
  /** 键为类型或 'all' */
  typeCounts: Record<string, number>;
  /** 键为年份或 'all' */
  yearCounts: Record<string, number>;
  years: string[];
  onTypeChange: (type: ChangelogType | 'all') => void;
  onYearChange: (year: string) => void;
  onClearPeriod: () => void;
  onReset: () => void;
}

/** 通用筛选 chip 的布局类名 */
const CHIP_CLASS =
  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

export default function ChangelogFilterBar({
  totalCount,
  filteredCount,
  typeFilter,
  yearFilter,
  periodFilter,
  typeCounts,
  yearCounts,
  years,
  onTypeChange,
  onYearChange,
  onClearPeriod,
  onReset,
}: ChangelogFilterBarProps) {
  const hasFilters = typeFilter !== 'all' || yearFilter !== 'all' || Boolean(periodFilter);

  return (
    <div className="mb-6 rounded-xl border border-border bg-card/90 p-3 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
      {/* 类型筛选 */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="按日志类型筛选">
        <span className="mr-1 text-xs font-semibold text-muted-foreground">类型</span>

        <button
          type="button"
          onClick={() => onTypeChange('all')}
          aria-pressed={typeFilter === 'all'}
          className={`${CHIP_CLASS} ${
            typeFilter === 'all'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
          }`}
        >
          全部
          <span className="tabular-nums opacity-80">{typeCounts.all ?? totalCount}</span>
        </button>

        {CHANGELOG_TYPES.map((type) => {
          const color = getChangelogTypeColor(type);
          const active = typeFilter === type;
          const textColor = getContrastTextColor(color);

          return (
            <button
              key={type}
              type="button"
              onClick={() => onTypeChange(type)}
              aria-pressed={active}
              className={`${CHIP_CLASS} ${
                active
                  ? 'border-transparent'
                  : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
              style={active ? { backgroundColor: color, color: textColor } : undefined}
            >
              <span
                className="h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: active ? textColor : color }}
                aria-hidden="true"
              />
              {getChangelogTypeLabel(type)}
              <span className="tabular-nums opacity-80">{typeCounts[type] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* 年份 / 周期筛选 */}
      <div
        className="mt-2 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="按年份或周期筛选"
      >
        <span className="mr-1 text-xs font-semibold text-muted-foreground">时间</span>

        <button
          type="button"
          onClick={() => onYearChange('all')}
          aria-pressed={yearFilter === 'all' && !periodFilter}
          className={`${CHIP_CLASS} ${
            yearFilter === 'all' && !periodFilter
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
          }`}
        >
          全部年份
          <span className="tabular-nums opacity-80">{yearCounts.all ?? totalCount}</span>
        </button>

        {years.map((year) => {
          const active = yearFilter === year;
          return (
            <button
              key={year}
              type="button"
              onClick={() => onYearChange(year)}
              aria-pressed={active}
              className={`${CHIP_CLASS} ${
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {year}年
              <span className="tabular-nums opacity-80">{yearCounts[year] ?? 0}</span>
            </button>
          );
        })}

        {/* 图表点击产生的月/季筛选：可单独清除 */}
        {periodFilter && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {periodFilter.label}
            <button
              type="button"
              onClick={onClearPeriod}
              aria-label={`清除${periodFilter.label}筛选`}
              className="rounded-full p-0.5 transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        )}
      </div>

      {/* 当前筛选结果 */}
      {hasFilters && (
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/30 pt-2">
          <span className="text-xs text-muted-foreground">
            筛选结果：<span className="font-semibold text-foreground">{filteredCount}</span>
            <span className="mx-1">/</span>
            {totalCount} 篇
          </span>
          <button
            type="button"
            onClick={onReset}
            className="rounded text-xs text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            清除筛选
          </button>
        </div>
      )}
    </div>
  );
}
