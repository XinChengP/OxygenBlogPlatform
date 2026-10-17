'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * 让 Framer Motion 尊重系统的「减少动态效果」设置。
 * CSS 的 prefers-reduced-motion 规则管不到 JS 动画，这里统一兜底。
 */
export default function MotionPreferenceProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
