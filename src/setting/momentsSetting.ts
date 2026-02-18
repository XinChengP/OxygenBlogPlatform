/**
 * 说说（动态）模块的心情标签配置
 * 基于洛天依主题设计的心情状态
 */

import { MoodType, MoodConfig } from '@/types/moments';

export const MOOD_CONFIGS: Record<MoodType, MoodConfig> = {
  [MoodType.HAPPY]: {
    type: MoodType.HAPPY,
    label: '开心',
    emoji: '😊',
    color: 'text-yellow-500 bg-yellow-50 border-yellow-200'
  },
  [MoodType.SAD]: {
    type: MoodType.SAD,
    label: '难过',
    emoji: '😢',
    color: 'text-blue-500 bg-blue-50 border-blue-200'
  },
  [MoodType.EXCITED]: {
    type: MoodType.EXCITED,
    label: '兴奋',
    emoji: '🤩',
    color: 'text-orange-500 bg-orange-50 border-orange-200'
  },
  [MoodType.CALM]: {
    type: MoodType.CALM,
    label: '平静',
    emoji: '😌',
    color: 'text-green-500 bg-green-50 border-green-200'
  },
  [MoodType.ANGRY]: {
    type: MoodType.ANGRY,
    label: '生气',
    emoji: '😠',
    color: 'text-red-500 bg-red-50 border-red-200'
  },
  [MoodType.LOVE]: {
    type: MoodType.LOVE,
    label: '喜欢',
    emoji: '🥰',
    color: 'text-pink-500 bg-pink-50 border-pink-200'
  },
  [MoodType.THINKING]: {
    type: MoodType.THINKING,
    label: '思考',
    emoji: '🤔',
    color: 'text-purple-500 bg-purple-50 border-purple-200'
  },
  [MoodType.TIRED]: {
    type: MoodType.TIRED,
    label: '疲惫',
    emoji: '😴',
    color: 'text-gray-500 bg-gray-50 border-gray-200'
  },
  [MoodType.GRATEFUL]: {
    type: MoodType.GRATEFUL,
    label: '感恩',
    emoji: '🙏',
    color: 'text-emerald-500 bg-emerald-50 border-emerald-200'
  },
  [MoodType.MOTIVATED]: {
    type: MoodType.MOTIVATED,
    label: '励志',
    emoji: '💪',
    color: 'text-indigo-500 bg-indigo-50 border-indigo-200'
  },
  [MoodType.CREATIVE]: {
    type: MoodType.CREATIVE,
    label: '创意',
    emoji: '✨',
    color: 'text-cyan-500 bg-cyan-50 border-cyan-200'
  },
  [MoodType.RELAXED]: {
    type: MoodType.RELAXED,
    label: '放松',
    emoji: '😎',
    color: 'text-teal-500 bg-teal-50 border-teal-200'
  }
};

// 获取所有心情配置
export const getAllMoodConfigs = (): MoodConfig[] => {
  return Object.values(MOOD_CONFIGS);
};

// 根据心情类型获取配置
export const getMoodConfig = (type: MoodType): MoodConfig => {
  return MOOD_CONFIGS[type];
};

// 根据心情类型获取标签信息
export const getMoodLabel = (type: MoodType): string => {
  return MOOD_CONFIGS[type].label;
};

// 根据心情类型获取emoji
export const getMoodEmoji = (type: MoodType): string => {
  return MOOD_CONFIGS[type].emoji;
};

// 根据心情类型获取颜色样式
export const getMoodColor = (type: MoodType): string => {
  return MOOD_CONFIGS[type].color;
};

// 默认心情（用于初始化）
export const DEFAULT_MOOD = MoodType.CALM;

// 心情选择器的配置
export const MOOD_SELECTOR_CONFIG = {
  // 每行显示的心情数量
  columns: 4,
  // 心情选择器的标题
  title: '选择心情',
  // 是否显示标签
  showLabels: true,
  // 是否显示emoji
  showEmojis: true,
  // 是否可选
  selectable: true
};

// 说说内容的验证规则
export const MOMENT_VALIDATION = {
  // 内容最小长度
  minContentLength: 1,
  // 内容最大长度
  maxContentLength: 200,
  // 图片最大数量
  maxImages: 9,
  // 单张图片最大大小 (MB)
  maxImageSize: 5,
  // 支持的图片格式
  supportedImageFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  // 支持的图片扩展名
  supportedImageExtensions: ['.jpg', '.jpeg', '.png', '.webp']
};

// 说说列表的分页配置
export const MOMENTS_PAGINATION = {
  // 每页显示的说说数量
  pageSize: 10,
  // 预加载的页数
  preloadPages: 2,
  // 懒加载的阈值（距离底部多少像素时开始加载）
  lazyLoadThreshold: 200
};

// 评论的验证规则
export const COMMENT_VALIDATION = {
  // 评论最小长度
  minContentLength: 1,
  // 评论最大长度
  maxContentLength: 200,
  // 每页显示的评论数量
  pageSize: 20
};

// 本地存储的键名
export const STORAGE_KEYS = {
  // 说说缓存
  MOMENTS_CACHE: 'moments-cache',
  // 用户点赞状态
  LIKED_MOMENTS: 'liked-moments',
  // 用户点赞的评论
  LIKED_COMMENTS: 'liked-comments',
  // 草稿
  MOMENT_DRAFT: 'moment-draft',
  // 用户身份
  USER_IDENTITY: 'user-identity'
};

// API 端点配置
export const API_ENDPOINTS = {
  // 说说相关
  MOMENTS: '/api/moments',
  MOMENT_DETAIL: (id: string) => `/api/moments/${id}`,
  
  // 评论相关
  COMMENTS: '/api/comments',
  COMMENT_DETAIL: (id: string) => `/api/comments/${id}`,
  
  // 点赞相关
  LIKES: '/api/likes',
  
  // 图片上传
  IMAGE_UPLOAD: '/api/upload/image',
  
  // 统计信息
  STATS: '/api/moments/stats'
};

// 说说模块的默认配置
export const MOMENTS_DEFAULTS = {
  // 默认作者名（用于演示）
  defaultAuthor: '洛天依',
  // 默认用户ID（用于演示）
  defaultUserId: 'luotianyi-001',
  // 默认头像
  defaultAvatar: '/LTY_Picture/1.jpeg',
  // 说说页面的标题
  pageTitle: '碎碎念',
  // 说说页面的描述
  pageDescription: '记录生活中的点点滴滴，分享每一份心情'
};