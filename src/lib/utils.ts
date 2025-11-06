import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 计算博客文章的阅读时长
 * 
 * 基于平均阅读速度计算：
 * - 中文：每分钟300字
 * - 英文：每分钟200单词
 * 
 * @param content - 博客内容
 * @param cnCharsPerMinute - 中文每分钟阅读字数，默认为400
 * @param enWordsPerMinute - 英文每分钟阅读单词数，默认为200
 * @returns 阅读时长（分钟），最小为1分钟
 */
export function calculateReadingTime(
  content: string, 
  cnCharsPerMinute: number = 400, 
  enWordsPerMinute: number = 200
): number {
  if (!content) return 1;
  
  // 移除HTML标签和Markdown标记
  const text = content
    .replace(/<\/?[^>]+(>|$)/g, '') // 移除HTML标签
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // 处理Markdown链接和图片
    .replace(/```[\s\S]*?```/g, '') // 移除代码块
    .replace(/`[^`]*`/g, '') // 移除行内代码
    .replace(/#{1,6}\s/g, '') // 移除标题标记
    .replace(/\*\*|__|~~|\*|_/g, ''); // 移除加粗、斜体等标记
  
  // 分别计算中文字符和英文单词
  const cnCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  
  // 提取所有非中文部分，按空格分割计算英文单词数
  const nonCnText = text.replace(/[\u4e00-\u9fa5]/g, ' ');
  const enWordCount = nonCnText.trim().split(/\s+/).filter(Boolean).length;
  
  // 分别计算中文和英文的阅读时间
  const cnReadingTime = cnCharCount / cnCharsPerMinute;
  const enReadingTime = enWordCount / enWordsPerMinute;
  
  // 计算总阅读时间（分钟）
  const totalReadingTime = Math.ceil(cnReadingTime + enReadingTime);
  
  // 返回至少1分钟的阅读时间
  return Math.max(1, totalReadingTime);
}

/**
 * 格式化博客日期，支持多种日期格式
 * 
 * 支持的格式：
 * - YYYY-MM-DD (如: 2024-01-01)
 * - YYYY-MM-DD HH:mm (如: 2024-01-01 14:30)
 * - YYYY-MM-DD HH:mm:ss (如: 2024-01-01 14:30:45)
 * - ISO 8601 格式 (如: 2024-01-01T14:30:45.123Z)
 * - 其他 JavaScript Date 构造函数支持的格式
 * 
 * @param dateInput - 日期字符串或 undefined
 * @param defaultDate - 默认日期，当输入无效时使用
 * @returns 格式化后的日期字符串 (YYYY-MM-DD)
 */
export function formatBlogDate(dateInput?: string, defaultDate: string = '2024-01-01'): string {
  if (!dateInput) {
    return defaultDate;
  }
  
  try {
    // 尝试解析各种日期格式
    let date: Date;
    
    // 处理常见的日期格式
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      // YYYY-MM-DD 格式
      date = new Date(dateInput + 'T00:00:00.000Z');
    } else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}$/.test(dateInput)) {
      // YYYY-MM-DD HH:mm 格式
      date = new Date(dateInput + ':00.000Z');
    } else if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(dateInput)) {
      // YYYY-MM-DD HH:mm:ss 格式
      date = new Date(dateInput + '.000Z');
    } else {
      // 其他格式，直接使用 Date 构造函数
      date = new Date(dateInput);
    }
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date format: ${dateInput}, using default date: ${defaultDate}`);
      return defaultDate;
    }
    
    // 返回 YYYY-MM-DD 格式
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error(`Error parsing date: ${dateInput}`, error);
    return defaultDate;
  }
}
