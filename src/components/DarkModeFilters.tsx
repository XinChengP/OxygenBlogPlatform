'use client';

/**
 * @deprecated 全站已不再使用 JS 内联滤镜做暗色压暗（当前无任何调用方）。
 * 暗色下图片/内容的压暗统一由 globals.css 的 CSS 规则承载：
 *   .dark .dark-mode-image-filter img / .dark img.dark-mode-filter（brightness 0.85）
 *   .dark .dark-mode-content-filter（brightness 0.95）
 * 新代码请直接使用上述类名，避免出现第二套会漂移的滤镜参数。
 */

import React from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';

/**
 * 图片暗黑模式滤镜组件Props
 */
interface DarkModeImageFilterProps {
  children: React.ReactNode;
  intensity?: number;
  className?: string;
}

/**
 * 图片暗黑模式滤镜包装组件
 * 自动为子元素应用暗黑模式下的亮度调整
 * 
 * @param props - 组件属性
 * @returns 包装后的组件
 */
export function DarkModeImageFilter({ 
  children, 
  intensity = 0.85,
  className = '' 
}: DarkModeImageFilterProps) {
  const { isDark } = useDarkMode();

  return (
    <div
      className={`transition-all duration-500 ${className}`}
      style={{
        filter: isDark ? `brightness(${intensity}) contrast(1.05)` : 'none',
      }}
    >
      {children}
    </div>
  );
}

/**
 * 内容暗黑模式滤镜组件
 * 用于包裹文章正文等内容区域
 * 
 * @param props - 组件属性
 * @returns 包装后的组件
 */
export function DarkModeContentFilter({ 
  children, 
  intensity = 0.95,
  className = '' 
}: DarkModeImageFilterProps) {
  const { isDark } = useDarkMode();

  return (
    <div
      className={`transition-all duration-500 ${className}`}
      style={{
        filter: isDark ? `brightness(${intensity})` : 'none',
      }}
    >
      {children}
    </div>
  );
}

export default { DarkModeImageFilter, DarkModeContentFilter };
