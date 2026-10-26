'use client';

import React, { useMemo } from 'react';

/**
 * 学习打卡热力图（GitHub contributions 风格）
 *
 * 以最近一条打卡记录所在周为终点，向前展示 weeks 周的格子。
 * 终点锚定在数据而非当前时间，构建产物稳定，避免 SSR 水合不一致。
 */

interface HeatmapCalendarProps {
  /** 每天的学习分钟数（date -> minutes） */
  dayMinutes: Record<string, number>;
  /** 展示的周数，默认 26 周（约半年） */
  weeks?: number;
}

/** 空格子与四级强度格子 */
const LEVEL_CLASSES = [
  'bg-border/40',
  'bg-primary/25',
  'bg-primary/45',
  'bg-primary/70',
  'bg-primary',
];

/** 格子强度：按当天学习分钟数分档 */
function getLevel(minutes: number): number {
  if (minutes <= 0) return 0;
  if (minutes < 30) return 1;
  if (minutes < 60) return 2;
  if (minutes < 120) return 3;
  return 4;
}

/** YYYY-MM-DD 的 UTC 秒数（避免时区偏移） */
function dayMs(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** UTC 秒数转 YYYY-MM-DD */
function msToDate(ms: number): string {
  const date = new Date(ms);
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${date.getUTCFullYear()}-${m}-${d}`;
}

/** 周一为一周的开始：(getUTCDay() + 6) % 7 把周日(0)映射到第 7 天 */
function mondayIndex(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

const WEEKDAY_LABELS = ['', '一', '', '', '三', '', '五'];
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

export default function HeatmapCalendar({ dayMinutes, weeks = 26 }: HeatmapCalendarProps) {
  const grid = useMemo(() => {
    const dates = Object.keys(dayMinutes);
    if (dates.length === 0) return null;

    // 终点：最近一条打卡记录，对齐到所在周的周日
    const latestMs = Math.max(...dates.map(dayMs));
    const latest = new Date(latestMs);
    const endMs = latestMs + (6 - mondayIndex(latest)) * 86400000;
    const startMs = endMs - (weeks * 7 - 1) * 86400000;

    // 按周分列，每列 7 天（周一到周日）
    const columns: Array<Array<{ date: string; minutes: number; isFuture: boolean }>> = [];
    const monthLabels: Array<{ index: number; label: string }> = [];
    let prevMonth = -1;

    for (let week = 0; week < weeks; week += 1) {
      const column: Array<{ date: string; minutes: number; isFuture: boolean }> = [];
      for (let day = 0; day < 7; day += 1) {
        const ms = startMs + (week * 7 + day) * 86400000;
        const date = msToDate(ms);
        column.push({ date, minutes: dayMinutes[date] || 0, isFuture: ms > latestMs });
      }

      // 该列周一所在月份与上一列不同时，在列顶部标月份
      const columnMonth = new Date(startMs + week * 7 * 86400000).getUTCMonth();
      if (columnMonth !== prevMonth) {
        monthLabels.push({ index: week, label: MONTH_NAMES[columnMonth] });
        prevMonth = columnMonth;
      }

      columns.push(column);
    }

    return { columns, monthLabels, startMs, endMs };
  }, [dayMinutes, weeks]);

  if (!grid) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        暂无打卡数据，完成第一次打卡后这里会出现热力图
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto pb-1">
        <div className="inline-block min-w-full">
          {/* 月份标签行 */}
          <div className="flex gap-[3px] mb-1 ml-8">
            {grid.columns.map((_, week) => {
              const label = grid.monthLabels.find(item => item.index === week);
              return (
                <div key={week} className="w-[11px] shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">
                  {label ? label.label : ''}
                </div>
              );
            })}
          </div>

          <div className="flex gap-[3px]">
            {/* 星期标签列 */}
            <div className="flex flex-col gap-[3px] w-8 shrink-0">
              {WEEKDAY_LABELS.map((label, index) => (
                <div key={index} className="h-[11px] text-[10px] leading-[11px] text-muted-foreground">
                  {label}
                </div>
              ))}
            </div>

            {/* 格子网格 */}
            {grid.columns.map((column, week) => (
              <div key={week} className="flex flex-col gap-[3px] shrink-0">
                {column.map(({ date, minutes, isFuture }) => (
                  <div
                    key={date}
                    title={isFuture ? '' : `${date}：${minutes > 0 ? `${minutes} 分钟` : '未打卡'}`}
                    className={`
                      w-[11px] h-[11px] rounded-[3px] transition-colors
                      ${isFuture ? 'bg-transparent' : LEVEL_CLASSES[getLevel(minutes)]}
                    `}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>
          {msToDate(grid.startMs)} ~ {msToDate(grid.endMs)}
        </span>
        <span className="flex items-center gap-1">
          少
          {LEVEL_CLASSES.map((cls, level) => (
            <span key={level} className={`w-[11px] h-[11px] rounded-[3px] ${cls}`} />
          ))}
          多
        </span>
      </div>
    </div>
  );
}
