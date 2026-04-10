'use client';

import React from 'react';
import { Changelog, getChangelogTypeColor, getChangelogTypeLabel, getTypeStats } from '@/types/changelogTypes';

interface TypeStatsWidgetProps {
  changelogs: Changelog[];
}

export default function TypeStatsWidget({ changelogs }: TypeStatsWidgetProps) {
  const stats = getTypeStats(changelogs);

  return (
    <div className="p-6 rounded-xl border transition-all duration-300 backdrop-blur-md bg-card/90 border-border/60 shadow-lg hover:shadow-xl supports-[backdrop-filter]:bg-card/75">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-2 h-6 bg-primary rounded-full"></span>
        类型统计
      </h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {stats.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p className="text-sm">暂无数据</p>
          </div>
        ) : (
          stats.map((item) => (
            <div
              key={item.type}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-200"
            >
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${getChangelogTypeColor(item.type)} text-white font-medium`}>
                  {getChangelogTypeLabel(item.type)}
                </span>
              </div>
              <span className="text-sm font-semibold text-primary">{item.count} 条</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
