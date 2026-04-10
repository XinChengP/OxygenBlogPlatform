'use client';

import React, { useState } from 'react';
import { Changelog, getMonthStats, getQuarterStats, getYearStats } from '@/types/changelogTypes';

type StatMode = 'month' | 'quarter' | 'year';

interface TimeStatsWidgetProps {
  changelogs: Changelog[];
}

export default function TimeStatsWidget({ changelogs }: TimeStatsWidgetProps) {
  const [statMode, setStatMode] = useState<StatMode>('month');

  const getStats = () => {
    switch (statMode) {
      case 'month':
        return getMonthStats(changelogs);
      case 'quarter':
        return getQuarterStats(changelogs);
      case 'year':
        return getYearStats(changelogs);
      default:
        return getMonthStats(changelogs);
    }
  };

  const stats = getStats();

  return (
    <div className="p-6 rounded-xl border transition-all duration-300 backdrop-blur-md bg-card/90 border-border/60 shadow-lg hover:shadow-xl supports-[backdrop-filter]:bg-card/75">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-primary rounded-full"></span>
        时间统计
      </h3>

      <div className="flex gap-2 mb-4">
        {[
          { mode: 'month', label: '月' },
          { mode: 'quarter', label: '季度' },
          { mode: 'year', label: '年' },
        ].map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => setStatMode(mode as StatMode)}
            className={`
              px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200
              ${statMode === mode 
                ? 'bg-primary text-primary-foreground shadow-md' 
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'}
            `}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {stats.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">暂无数据</p>
          </div>
        ) : (
          stats.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
            >
              <span className="text-sm text-foreground">{item.label}</span>
              <span className="text-sm font-semibold text-primary">{item.count} 条</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
