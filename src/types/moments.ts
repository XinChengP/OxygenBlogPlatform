/**
 * 说说（动态）模块的类型定义 - 极简重构版本
 * 仅保留内容展示功能所需的类型定义
 */

// 心情状态枚举
export enum MoodType {
  HAPPY = 'happy',
  SAD = 'sad',
  EXCITED = 'excited',
  CALM = 'calm',
  ANGRY = 'angry',
  LOVE = 'love',
  THINKING = 'thinking',
  TIRED = 'tired',
  GRATEFUL = 'grateful',
  MOTIVATED = 'motivated',
  CREATIVE = 'creative',
  RELAXED = 'relaxed'
}

// 心情标签配置 - 仅保留基础展示功能
export interface MoodConfig {
  type: MoodType;
  label: string;
  emoji: string;
  color: string; // Tailwind CSS颜色类
  bgColor: string; // 背景颜色类
}

// 说说动态数据结构 - 简化版本
export interface Moment {
  id: string;
  content: string; // 文本内容
  images?: string[]; // 图片URL数组
  mood?: MoodType; // 心情状态
  author: string; // 作者标识
  createdAt: string; // ISO时间戳
  likes: number; // 点赞数（仅显示）
  comments: number; // 评论数（仅显示）
}

// 评论数据结构 - 简化版本
export interface Comment {
  id: string;
  content: string; // 评论内容
  author: string; // 评论者
  createdAt: string; // ISO时间戳
}

// 分页响应数据
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
}

// 说说列表响应
export type MomentsResponse = PaginatedResponse<Moment>;

// 本地缓存的说说数据
export interface CachedMoment {
  data: Moment;
  expiresAt: number; // 过期时间戳
}