/**
 * 说说（动态）模块的类型定义
 * 基于洛天依主题个人博客的社交功能
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

// 心情标签配置
export interface MoodConfig {
  type: MoodType;
  label: string;
  emoji: string;
  color: string; // Tailwind CSS颜色类
}

// 说说动态数据结构
export interface Moment {
  id: string;
  content: string; // 1-200字的内容
  images?: string[]; // 图片URL数组
  mood?: MoodType; // 心情状态
  author: string; // 作者标识
  createdAt: string; // ISO时间戳
  updatedAt?: string; // 更新时间
  likes: number; // 点赞数
  comments: Comment[]; // 评论列表
  isLiked?: boolean; // 当前用户是否点赞
  isOwner?: boolean; // 当前用户是否为作者
}

// 评论数据结构
export interface Comment {
  id: string;
  momentId: string; // 关联的说说ID
  content: string; // 评论内容
  author: string; // 评论者
  createdAt: string; // ISO时间戳
  likes: number; // 点赞数
  isLiked?: boolean; // 当前用户是否点赞
}

// 创建说说请求数据
export interface CreateMomentRequest {
  content: string;
  images?: File[]; // 上传的图片文件
  mood?: MoodType;
}

// 更新说说请求数据
export interface UpdateMomentRequest {
  content?: string;
  images?: string[]; // 已上传的图片URL
  mood?: MoodType;
}

// 创建评论请求数据
export interface CreateCommentRequest {
  momentId: string;
  content: string;
}

// 点赞请求数据
export interface LikeRequest {
  targetId: string; // 说说ID或评论ID
  targetType: 'moment' | 'comment';
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

// 图片上传响应
export interface ImageUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

// 说说统计信息
export interface MomentsStats {
  totalMoments: number;
  totalLikes: number;
  totalComments: number;
  recentMoments: number; // 最近7天的说说数
}

// 用户权限验证
export interface UserAuth {
  userId: string;
  username: string;
  isAdmin?: boolean;
}

// 错误响应
export interface ErrorResponse {
  error: string;
  code: string;
  details?: any;
}

// 成功响应
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
}

// 客户端存储的说说数据（用于本地缓存）
export interface CachedMoment extends Moment {
  _cachedAt: number; // 缓存时间戳
  _isDirty?: boolean; // 是否需要同步
}