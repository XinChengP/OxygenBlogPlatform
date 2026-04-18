import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 工具函数：合并 Tailwind CSS 类名
 * 基于 clsx 和 tailwind-merge，支持条件类名、对象类名，并自动解决类名冲突
 * 
 * 功能特点：
 * 1. 支持条件类名 - 使用对象形式控制类名是否添加
 * 2. 自动合并冲突类名 - 使用 tailwind-merge 解决 Tailwind 类名冲突
 * 3. 类型安全 - 完整的 TypeScript 类型支持
 * 
 * @param inputs - 类名输入，可以是字符串、对象、数组等
 * @returns 合并后的类名字符串，冲突类名已自动解决
 * 
 * @example
 * // 基础用法
 * cn('text-red-500', 'bg-blue-100') // 'text-red-500 bg-blue-100'
 * 
 * // 条件类名
 * cn('text-red-500', { 'bg-blue-100': true }) // 'text-red-500 bg-blue-100'
 * cn('text-red-500', { 'bg-blue-100': false }) // 'text-red-500'
 * 
 * // 自动解决冲突
 * cn('px-2 py-1', 'px-4') // 'py-1 px-4'（px-4 覆盖 px-2）
 * cn('text-sm text-red-500', 'text-lg') // 'text-red-500 text-lg'（text-lg 覆盖 text-sm）
 */
export function cn(...inputs: ClassValue[]) {
  // 先使用 clsx 处理条件类名，再使用 twMerge 解决类名冲突
  return twMerge(clsx(inputs));
}