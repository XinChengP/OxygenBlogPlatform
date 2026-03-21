'use client';

import React from 'react';
import OptimizedImage from './core/OptimizedImage';
import { useDarkMode } from '@/hooks/useDarkMode';
import { DarkModeImageFilter } from './DarkModeFilters';

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
  /**
   * 是否使用包装器模式
   * 如果为true，使用DarkModeImageFilter包装
   * 如果为false，直接在img上应用滤镜
   */
  useWrapper?: boolean;
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
  useWrapper = false,
  borderRadius,
  objectFit = 'cover',
}: DarkModeImageProps) {
  const { isDark } = useDarkMode();

  // 使用包装器模式
  if (useWrapper) {
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

  // 直接使用样式模式
  return (
    <div 
      className={`transition-all duration-500 ${className}`}
      style={{
        filter: isDark ? `brightness(${darkModeIntensity}) contrast(1.05)` : 'none',
        borderRadius,
        overflow: 'hidden',
      }}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        blurDataURL={blurDataURL}
        objectFit={objectFit}
        className="w-full h-full"
      />
    </div>
  );
}

/**
 * 暗黑模式内容区域组件
 * 用于包裹文章正文等内容
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
