'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * 时光轴/进度条小组件
 * 展示年、月、周、日的进度情况
 */
export default function TimeProgressWidget() {
  // 存储各项进度的状态
  const [yearProgress, setYearProgress] = useState(0);
  const [monthProgress, setMonthProgress] = useState(0);
  const [weekProgress, setWeekProgress] = useState(0);
  const [dayProgress, setDayProgress] = useState(0);
  // 标记是否已经完成第一次加载动画
  const [isInitialLoaded, setIsInitialLoaded] = useState(false);

  // 计算各项进度的函数
  const calculateProgress = () => {
    const now = new Date();

    // ---------------- 年进度计算 ----------------
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
    const totalYearMilliseconds = endOfYear.getTime() - startOfYear.getTime();
    const elapsedYearMilliseconds = now.getTime() - startOfYear.getTime();
    const yearPct = Math.min(100, Math.max(0, (elapsedYearMilliseconds / totalYearMilliseconds) * 100));

    // ---------------- 月进度计算 ----------------
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const totalMonthMilliseconds = endOfMonth.getTime() - startOfMonth.getTime();
    const elapsedMonthMilliseconds = now.getTime() - startOfMonth.getTime();
    const monthPct = Math.min(100, Math.max(0, (elapsedMonthMilliseconds / totalMonthMilliseconds) * 100));

    // ---------------- 周进度计算 ----------------
    // 本周一作为起点（ISO周标准，周一为一周第一天）
    const dayOfWeek = now.getDay(); // 0 = 周日, 1 = 周一, ..., 6 = 周六
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - daysSinceMonday);
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    
    const totalWeekMilliseconds = endOfWeek.getTime() - startOfWeek.getTime();
    const elapsedWeekMilliseconds = now.getTime() - startOfWeek.getTime();
    const weekPct = Math.min(100, Math.max(0, (elapsedWeekMilliseconds / totalWeekMilliseconds) * 100));

    // ---------------- 日进度计算 ----------------
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const totalDayMilliseconds = endOfDay.getTime() - startOfDay.getTime();
    const elapsedDayMilliseconds = now.getTime() - startOfDay.getTime();
    const dayPct = Math.min(100, Math.max(0, (elapsedDayMilliseconds / totalDayMilliseconds) * 100));

    // ---------------- 更新状态 ----------------
    setYearProgress(yearPct);
    setMonthProgress(monthPct);
    setWeekProgress(weekPct);
    setDayProgress(dayPct);
  };

  // 组件挂载时计算进度，并每秒更新一次
  useEffect(() => {
    calculateProgress();
    // 第一次加载后，等待动画完成，标记为已加载
    const timer = setTimeout(() => {
      setIsInitialLoaded(true);
    }, 1000);
    const interval = setInterval(calculateProgress, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  // 单个进度条组件
  const ProgressBar = ({ 
    label, 
    progress, 
    icon, 
    color 
  }: { 
    label: string; 
    progress: number; 
    icon: string; 
    color: string; 
  }) => (
    <div className="mb-6 group">
      {/* 标签和百分比显示 */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-foreground group-hover:bg-primary/20 transition-all duration-300">
            <span className="text-lg">{icon}</span>
          </div>
          <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors duration-300">{label}</span>
        </div>
        <span className="text-sm font-semibold text-primary group-hover:scale-105 transition-transform duration-300">{progress.toFixed(2)}%</span>
      </div>
      
      {/* 进度条背景 */}
      <div className="h-3 w-full bg-muted/60 rounded-full overflow-hidden shadow-inner">
        {/* 进度条填充 */}
        <motion.div
          className="h-full rounded-full shadow-sm"
          style={{ 
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}33`
          }}
          initial={isInitialLoaded ? false : { width: 0, opacity: 0 }}
          animate={{ width: `${progress}%`, opacity: 1 }}
          transition={isInitialLoaded ? 
            { duration: 0.3, ease: 'linear' } : // 后续更新时使用平滑过渡
            { duration: 1, ease: 'easeOut' }  // 第一次加载时的入场动画
          }
        />
      </div>
    </div>
  );

  return (
    <div className="p-6 rounded-xl border transition-all duration-300 backdrop-blur-md bg-card/90 border-border/60 shadow-lg hover:shadow-xl supports-[backdrop-filter]:bg-card/75">
      {/* 进度条列表 */}
      <div className="space-y-1">
        <ProgressBar
          label="年进度"
          progress={yearProgress}
          icon="📅"
          color="#66ccff"
        />
        <ProgressBar
          label="月进度"
          progress={monthProgress}
          icon="🌙"
          color="#06b6d4"
        />
        <ProgressBar
          label="周进度"
          progress={weekProgress}
          icon="📆"
          color="#3b82f6"
        />
        <ProgressBar
          label="日进度"
          progress={dayProgress}
          icon="☀️"
          color="#f59e0b"
        />
      </div>

      {/* 底部提示 */}
      <div className="mt-6 pt-4 border-t border-border/30">
        <p className="text-xs text-muted-foreground text-center leading-relaxed tracking-wide">
          生活一圈圈日子一年年，也想听你为我唱起一遍遍
        </p>
      </div>
    </div>
  );
}
