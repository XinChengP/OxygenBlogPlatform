import { clsx, type ClassValue } from 'clsx';

/**
 * 工具函数：合并 Tailwind CSS 类名
 * 基于 clsx 库，支持条件类名、对象类名等
 * 
 * @param inputs - 类名输入
 * @returns 合并后的类名字符串
 * 
 * @example
 * cn('text-red-500', 'bg-blue-100') // 'text-red-500 bg-blue-100'
 * cn('text-red-500', { 'bg-blue-100': true }) // 'text-red-500 bg-blue-100'
 * cn('text-red-500', { 'bg-blue-100': false }) // 'text-red-500'
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}