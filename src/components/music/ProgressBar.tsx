'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { formatTime } from '@/utils/musicTime';

interface ProgressBarProps {
  /** 当前播放时间（秒） */
  currentTime: number;
  /** 总时长（秒） */
  duration: number;
  /** 提交跳转（秒） */
  onSeek: (time: number) => void;
}

/**
 * 播放进度条
 *
 * 交互与性能设计：
 * 1. 拖动期间只更新预览位置，pointerup 时才真正 seek
 *    ——旧实现每个 mousemove 都调用 howl.seek()，快速拖动会触发大量
 *    音频 Range 请求与解码抖动；
 * 2. 悬停/拖动预览用 requestAnimationFrame 节流，避免指针事件频率
 *    直接触发 React 重渲染；
 * 3. 统一使用 Pointer Events，鼠标与触摸共用一套逻辑，并设置
 *    touch-action: none，避免移动端拖动进度条时页面跟着滚动；
 * 4. 支持键盘：左右方向键 ±5 秒、PageUp/PageDown ±30 秒、Home/End。
 */
const ProgressBar = React.memo(function ProgressBar({
  currentTime,
  duration,
  onSeek,
}: ProgressBarProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPreviewRef = useRef<{ percent: number; time: number } | null>(null);
  const isDraggingRef = useRef(false);
  const trackRectRef = useRef<DOMRect | null>(null);

  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState(0);
  const [dragTime, setDragTime] = useState(0);
  const [hoverPercent, setHoverPercent] = useState(0);
  const [hoverTime, setHoverTime] = useState(0);

  const progressPercent = duration > 0
    ? Math.max(0, Math.min(100, (currentTime / duration) * 100))
    : 0;

  const displayPercent = isDragging ? dragPercent : progressPercent;
  const displayTime = isDragging ? dragTime : currentTime;
  const isActive = isHovering || isDragging;

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  /**
   * 根据指针 X 坐标计算 0-100 百分比
   */
  const percentFromClientX = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    // 复用 pointerdown/pointerenter 缓存的 rect，避免每次移动强制布局
    const rect = trackRectRef.current ?? track.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const percent = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  }, []);

  const handlePointerEnter = useCallback(() => {
    trackRectRef.current = trackRef.current?.getBoundingClientRect() ?? null;
  }, []);

  /**
   * 用 rAF 合并高频预览更新
   */
  const schedulePreview = useCallback((percent: number) => {
    pendingPreviewRef.current = {
      percent,
      time: (percent / 100) * (duration || 0),
    };

    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const preview = pendingPreviewRef.current;
      if (!preview) return;

      if (isDraggingRef.current) {
        setDragPercent(preview.percent);
        setDragTime(preview.time);
      } else {
        setHoverPercent(preview.percent);
        setHoverTime(preview.time);
      }
    });
  }, [duration]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);
    trackRectRef.current = trackRef.current?.getBoundingClientRect() ?? null;

    const percent = percentFromClientX(event.clientX);
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsHovering(true);
    setDragPercent(percent);
    setDragTime((percent / 100) * duration);
  }, [duration, percentFromClientX]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (duration <= 0) return;

    setIsHovering(true);
    const percent = percentFromClientX(event.clientX);
    // 拖动和悬停都用 rAF 合并高频指针事件
    schedulePreview(percent);
  }, [duration, percentFromClientX, schedulePreview]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || duration <= 0) return;

    const percent = percentFromClientX(event.clientX);
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragPercent(percent);
    setDragTime((percent / 100) * duration);
    onSeek((percent / 100) * duration);
    trackRectRef.current = null;
  }, [duration, isDragging, onSeek, percentFromClientX]);

  const handlePointerCancel = useCallback(() => {
    isDraggingRef.current = false;
    setIsDragging(false);
    trackRectRef.current = null;
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (!isDragging) {
      setIsHovering(false);
      trackRectRef.current = null;
    }
  }, [isDragging]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (duration <= 0) return;

    let nextTime: number | null = null;

    switch (event.key) {
      case 'ArrowLeft':
        nextTime = currentTime - 5;
        break;
      case 'ArrowRight':
        nextTime = currentTime + 5;
        break;
      case 'PageDown':
        nextTime = currentTime - 30;
        break;
      case 'PageUp':
        nextTime = currentTime + 30;
        break;
      case 'Home':
        nextTime = 0;
        break;
      case 'End':
        nextTime = duration;
        break;
      default:
        return;
    }

    event.preventDefault();
    onSeek(Math.max(0, Math.min(duration, nextTime)));
  }, [currentTime, duration, onSeek]);

  const bubblePercent = isHovering || isDragging ? hoverPercent : progressPercent;
  const bubbleTime = isHovering || isDragging ? hoverTime : currentTime;

  return (
    <div className="h-5 flex items-center gap-1.5 px-3">
      {/* 当前播放时间：tabular-nums 让数字等宽，避免秒数跳动时文字宽度抖动 */}
      <span className="w-8 flex-shrink-0 text-right text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
        {formatTime(displayTime)}
      </span>

      {/* 进度条本体 + 悬停气泡：交互事件绑定在这一层，因为该层的宽度就是进度条的真实宽度，
          拖拽百分比与气泡定位都以它为基准，不会受两侧时间文字宽度的影响 */}
      <div
        className="relative flex-1 h-full flex items-center cursor-pointer touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70 rounded-full"
        role="slider"
        tabIndex={duration > 0 ? 0 : -1}
        aria-label="播放进度"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, Math.round(duration))}
        aria-valuenow={Math.max(0, Math.round(isDragging ? dragTime : currentTime))}
        aria-valuetext={`${formatTime(isDragging ? dragTime : currentTime)} / ${formatTime(duration)}`}
        onPointerDown={handlePointerDown}
        onPointerEnter={handlePointerEnter}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
      >
        <div
          ref={trackRef}
          className={`w-full ${isActive ? 'h-2' : 'h-1.5'} bg-slate-200/80 dark:bg-slate-700/80 rounded-full relative overflow-hidden transition-all duration-200 motion-reduce:transition-none`}
        >
          {/* 已播放进度 - 天依蓝渐变 + 微光 */}
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#66ccff] via-[#4db8ff] to-[#0099cc] rounded-full shadow-[0_0_10px_rgba(102,204,255,0.45)] transition-[width] duration-100 motion-reduce:transition-none"
            style={{ width: `${displayPercent}%` }}
          />

          {/* 拖拽圆点 */}
          <div
            className={`absolute top-1/2 w-3.5 h-3.5 bg-white border-[2.5px] border-[#66ccff] rounded-full shadow-md transition-opacity duration-200 motion-reduce:transition-none pointer-events-none ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ left: `${displayPercent}%`, transform: 'translate(-50%, -50%) scale(1)' }}
          />
        </div>

        {/* 悬停时间气泡：只显示指针位置对应的时间点（跳转预览），
            放在 overflow-hidden 外层避免被裁剪；两端动态对齐防止气泡溢出卡片 */}
        <div
          className={`absolute bottom-full mb-2 px-1.5 py-0.5 bg-slate-800/90 dark:bg-slate-700/90 text-white text-[10px] rounded-lg transition-opacity duration-200 motion-reduce:transition-none pointer-events-none whitespace-nowrap z-30 ${
            isActive ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            left: `${bubblePercent}%`,
            // 靠左时左对齐，靠右时右对齐，中间保持居中，避免气泡溢出卡片或屏幕
            transform: `translateX(${
              bubblePercent < 10 ? '0%' : bubblePercent > 90 ? '-100%' : '-50%'
            })`,
          }}
        >
          {formatTime(bubbleTime)}
        </div>
      </div>

      {/* 当前歌曲总时长 */}
      <span className="w-8 flex-shrink-0 text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
        {formatTime(duration)}
      </span>
    </div>
  );
});

ProgressBar.displayName = 'ProgressBar';

export default ProgressBar;
