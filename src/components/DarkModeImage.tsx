'use client';

import React from 'react';
import OptimizedImage from './core/OptimizedImage';
import { DarkModeImageFilter, DarkModeContentFilter } from './DarkModeFilters';

interface DarkModeImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  blurDataURL?: string;
  /**
   * 暗黑模式下的亮度调整强度
   * 默认0.85，范围0-1
   */
  darkModeIntensity?: number;
  borderRadius?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
}

/**
 * 暗黑模式图片组件
 *
 * 功能特性：
 * 1. 自动在暗黑模式下降低图片亮度
 * 2. 支持渐进式加载
 * 3. 平滑的亮度过渡动画
 * 4. 可自定义亮度强度
 *
 * 统一使用 DarkModeImageFilter 实现，消除与 DarkModeFilters.tsx 的重复滤镜逻辑
 * @param props - 组件属性
 * @returns 支持暗黑模式的图片组件
 */
export default function DarkModeImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  blurDataURL,
  darkModeIntensity = 0.85,
  borderRadius,
  objectFit = 'cover',
}: DarkModeImageProps) {
  return (
    <DarkModeImageFilter intensity={darkModeIntensity} className={className}>
      <OptimizedImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        blurDataURL={blurDataURL}
        borderRadius={borderRadius}
        objectFit={objectFit}
        className="w-full h-full"
      />
    </DarkModeImageFilter>
  );
}

/**
 * 暗黑模式内容区域组件
 * 用于包裹文章正文等内容
 *
 * 统一使用 DarkModeContentFilter 实现，消除与 DarkModeFilters.tsx 的重复滤镜逻辑
 */
interface DarkModeContentProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
}

export function DarkModeContent({
  children,
  className = '',
  intensity = 0.95
}: DarkModeContentProps) {
  return (
    <DarkModeContentFilter intensity={intensity} className={className}>
      {children}
    </DarkModeContentFilter>
  );
}
