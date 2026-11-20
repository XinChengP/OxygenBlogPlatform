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

/**
 * 筛选 chip 的通用布局类名
 *
 * 圆角收小到 lg（而非胶囊）：卡片内的荣誉/成就已经全是胶囊标签，
 * 筛选控件用方一些的圆角可以让「操作」与「标记」在视觉上分层。
 */
const CHIP_CLASS =
  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50';

/** 未选中时的 chip 样式：透明边框 + 低饱和底色，悬停才浮出来 */
const CHIP_IDLE_CLASS =
  'border-transparent bg-muted/55 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground';

/**
 * 使用主题主色的选中态
 *
 * 天依蓝 (#66ccff) 的亮度较高，原实现用 primary-foreground（近白）压在上面
 * 对比度只有约 1.7:1。这里固定使用深色文字，保证小字号也能看清。
 */
const CHIP_ACTIVE_PRIMARY_CLASS =
  'border-transparent bg-primary text-[#0f172a] shadow-[0_2px_12px_-3px_rgba(102,204,255,0.65)]';

/** 计数数字：等宽 + 略降透明度，避免和标签文字抢注意力 */
const COUNT_CLASS = 'font-mono text-[10px] tabular-nums opacity-70';

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
    <div className="relative mb-5 overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-card backdrop-blur-md supports-[backdrop-filter]:bg-card/60">
      {/* 顶部渐隐高光线：给面板一条「通电」的边界，避免纯色描边显得死板 */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
        aria-hidden="true"
      />
      {/* 右上角主题色光晕：极淡的径向渐变，增加空气感 */}
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-primary/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative p-3.5 sm:p-4">
        {/* 类型筛选 */}
        <div className="flex items-start gap-3" role="group" aria-label="按日志类型筛选">
          {/* 竖排小标题：统一宽度，让两行 chip 左边缘对齐 */}
          <span className="mt-[7px] w-7 flex-shrink-0 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/80">
            类型
          </span>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onTypeChange('all')}
              aria-pressed={typeFilter === 'all'}
              className={`${CHIP_CLASS} ${
                typeFilter === 'all' ? CHIP_ACTIVE_PRIMARY_CLASS : CHIP_IDLE_CLASS
              }`}
            >
              全部
              <span className={COUNT_CLASS}>{typeCounts.all ?? totalCount}</span>
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
                    active ? 'border-transparent' : CHIP_IDLE_CLASS
                  }`}
                  /*
                    选中态直接用类型色实心填充：
                    淡色系（如 #ccff66）做半透明底时文字对比度不够，
                    实心 + 自动黑/白字是唯一在各类型上都稳定的方案。
                  */
                  style={
                    active
                      ? {
                          backgroundColor: color,
                          color: textColor,
                          boxShadow: `0 2px 12px -3px ${color}99`,
                        }
                      : undefined
                  }
                >
                  <span
                    className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: active ? textColor : color }}
                    aria-hidden="true"
                  />
                  {getChangelogTypeLabel(type)}
                  <span className={COUNT_CLASS}>{typeCounts[type] ?? 0}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 年份 / 周期筛选 */}
        <div
          className="mt-2 flex items-start gap-3"
          role="group"
          aria-label="按年份或周期筛选"
        >
          <span className="mt-[7px] w-7 flex-shrink-0 text-[10px] font-semibold tracking-[0.18em] text-muted-foreground/80">
            时间
          </span>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onYearChange('all')}
              aria-pressed={yearFilter === 'all' && !periodFilter}
              className={`${CHIP_CLASS} ${
                yearFilter === 'all' && !periodFilter
                  ? CHIP_ACTIVE_PRIMARY_CLASS
                  : CHIP_IDLE_CLASS
              }`}
            >
              全部年份
              <span className={COUNT_CLASS}>{yearCounts.all ?? totalCount}</span>
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
                    active ? CHIP_ACTIVE_PRIMARY_CLASS : CHIP_IDLE_CLASS
                  }`}
                >
                  {year}年
                  <span className={COUNT_CLASS}>{yearCounts[year] ?? 0}</span>
                </button>
              );
            })}

            {/* 图表点击产生的月/季筛选：可单独清除 */}
            {periodFilter && (
              <span className="inline-flex items-center gap-1 rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
                {periodFilter.label}
                <button
                  type="button"
                  onClick={onClearPeriod}
                  aria-label={`清除${periodFilter.label}筛选`}
                  className="rounded p-0.5 transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            )}
          </div>
        </div>

        {/* 当前筛选结果：只有真正筛选时才占用空间 */}
        {hasFilters && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/40 pt-2.5">
            <span className="text-[11px] text-muted-foreground">
              筛选结果
              <span className="ml-1.5 font-mono text-xs font-semibold tabular-nums text-foreground">
                {filteredCount}
              </span>
              <span className="mx-1 text-muted-foreground/50">/</span>
              <span className="font-mono text-xs tabular-nums">{totalCount}</span>
              <span className="ml-1">篇</span>
            </span>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              清除筛选
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
