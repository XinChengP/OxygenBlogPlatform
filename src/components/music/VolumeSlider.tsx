'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface VolumeSliderProps {
  /** 当前音量（0-1） */
  volume: number;
  /** 是否静音 */
  isMuted: boolean;
  /** 音量变化（0-1） */
  onVolumeChange: (volume: number) => void;
  /** 切换静音 */
  onToggleMute: () => void;
}

/**
 * 音量控制（静音按钮 + 短音量条）
 *
 * - 鼠标/触摸统一使用 Pointer Events；
 * - 音量条设置为 touch-action: none，移动端拖拽不会带着页面滚动；
 * - 拖动时用 rAF 合并高频更新；
 * - 支持键盘：左右方向键 ±5%，Home/End 到 0%/100%。
 */
const VolumeSlider = React.memo(function VolumeSlider({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: VolumeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const pendingPercentRef = useRef<number | null>(null);
  const isDraggingRef = useRef(false);
  const lastCommitRef = useRef(0);
  const trackRectRef = useRef<DOMRect | null>(null);

  const [isHovering, setIsHovering] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState(0);

  const volumePercent = Math.max(0, Math.min(100, volume * 100));
  const displayPercent = isDragging ? dragPercent : volumePercent;
  const isActive = isHovering || isDragging;

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const percentFromClientX = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 0;
    // 拖动期间复用 pointerdown 时缓存的 rect，避免每次 pointermove 强制布局
    const rect = trackRectRef.current ?? track.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const percent = ((clientX - rect.left) / rect.width) * 100;
    return Math.max(0, Math.min(100, percent));
  }, []);

  const commitPercent = useCallback((percent: number) => {
    onVolumeChange(percent / 100);
  }, [onVolumeChange]);

  const scheduleVolume = useCallback((percent: number) => {
    pendingPercentRef.current = percent;

    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const pending = pendingPercentRef.current;
      if (pending === null) return;
      // 本地视觉反馈每帧更新；音量提交节流到约 10fps，避免父播放器每帧重渲染
      setDragPercent(pending);
      const now = performance.now();
      if (now - lastCommitRef.current >= 100) {
        lastCommitRef.current = now;
        commitPercent(pending);
      }
    });
  }, [commitPercent]);

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.currentTarget.focus();
    event.currentTarget.setPointerCapture(event.pointerId);

    trackRectRef.current = trackRef.current?.getBoundingClientRect() ?? null;
    const percent = percentFromClientX(event.clientX);
    isDraggingRef.current = true;
    setIsDragging(true);
    setIsHovering(true);
    setDragPercent(percent);
    lastCommitRef.current = performance.now();
    commitPercent(percent);
  }, [commitPercent, percentFromClientX]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    setIsHovering(true);
    if (!isDraggingRef.current) return;
    scheduleVolume(percentFromClientX(event.clientX));
  }, [percentFromClientX, scheduleVolume]);

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    // 取消尚未执行的 rAF，避免它用旧值覆盖最终音量
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPercentRef.current = null;

    const percent = percentFromClientX(event.clientX);
    isDraggingRef.current = false;
    setIsDragging(false);
    setDragPercent(percent);
    lastCommitRef.current = performance.now();
    commitPercent(percent);
    trackRectRef.current = null;
  }, [commitPercent, percentFromClientX]);

  const handlePointerCancel = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pendingPercentRef.current = null;
    trackRectRef.current = null;
    isDraggingRef.current = false;
    setIsDragging(false);
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (!isDraggingRef.current) {
      setIsHovering(false);
    }
  }, []);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    let nextVolume: number | null = null;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        nextVolume = volume - 0.05;
        break;
      case 'ArrowRight':
      case 'ArrowUp':
        nextVolume = volume + 0.05;
        break;
      case 'Home':
        nextVolume = 0;
        break;
      case 'End':
        nextVolume = 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    onVolumeChange(Math.max(0, Math.min(1, nextVolume)));
  }, [onVolumeChange, volume]);

  return (
    <div className="flex items-center gap-1.5 flex-1 justify-center mx-2">
      <button
        type="button"
        onClick={onToggleMute}
        className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-[#66ccff]/10 dark:hover:bg-[#66ccff]/20 hover:text-[#66ccff] dark:hover:text-[#66ccff] transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70"
        aria-label={isMuted ? '取消静音' : '静音'}
        aria-pressed={isMuted}
        title={isMuted ? '取消静音' : '静音'}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          {isMuted || volume === 0 ? (
            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
          ) : volume < 0.5 ? (
            <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
          ) : (
            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
          )}
        </svg>
      </button>

      {/* 外层固定高度，内部音量条 hover 变粗不影响布局 */}
      <div
        className="h-4 flex items-center cursor-pointer touch-none select-none flex-1 max-w-[80px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70 rounded-full"
        role="slider"
        tabIndex={0}
        aria-label="音量"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(volume * 100)}
        aria-valuetext={`${Math.round(volume * 100)}%`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
        onKeyDown={handleKeyDown}
      >
        <div
          ref={trackRef}
          className={`w-full ${isActive ? 'h-1.5' : 'h-1'} bg-slate-200/80 dark:bg-slate-700/80 rounded-full relative overflow-hidden transition-all duration-200 motion-reduce:transition-none`}
        >
          {/* 当前音量 - 天依蓝渐变 */}
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-[#66ccff] to-[#0099cc] rounded-full transition-[width] duration-100 motion-reduce:transition-none"
            style={{ width: `${displayPercent}%` }}
          />
          {/* 音量拖拽圆点 */}
          <div
            className={`absolute top-1/2 w-2.5 h-2.5 bg-white border-2 border-[#66ccff] rounded-full shadow-sm transition-opacity duration-200 motion-reduce:transition-none pointer-events-none ${
              isActive ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ left: `${displayPercent}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>
      </div>
    </div>
  );
});

VolumeSlider.displayName = 'VolumeSlider';

export default VolumeSlider;
