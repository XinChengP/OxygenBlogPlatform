'use client';

/**
 * 检测当前是否运行在 Electron 桌面端
 *
 * 项目的 preload.js 会通过 contextBridge 在 window 上注入 electronAPI，
 * 因此用 typeof window.electronAPI !== 'undefined' 作为唯一判定依据。
 *
 * 为什么单独抽成工具函数：
 * - 全站多个组件（Live2DDynamicLoader、HomeBackgroundFX、Footer、
 *   ScrollToTop、Navigation 等）都要跳过 prefers-reduced-motion、
 *   pointer: coarse、saveData 等移动端/浏览器端门控，
 *   统一入口避免各文件重复写 typeof window !== 'undefined' &&
 *   typeof (window as any).electronAPI !== 'undefined'
 *
 * 使用示例：
 *   import { isElectron } from '@/utils/isElectron';
 *   if (!isElectron() && matchMedia('(prefers-reduced-motion: reduce)').matches) {
 *     return; // 非 Electron 才走这个门控
 *   }
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return typeof (window as any).electronAPI !== 'undefined';
}
