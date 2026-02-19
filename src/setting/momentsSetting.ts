/**
 * 说说（动态）模块配置 - 极简重构版本
 * 仅保留内容展示功能所需的配置
 * 基于洛天依主题设计的心情状态
 */

import { MoodType, MoodConfig } from '@/types/moments';

// 心情配置 - 仅保留基础展示功能
export const MOOD_CONFIGS: Record<MoodType, MoodConfig> = {
  [MoodType.HAPPY]: {
    type: MoodType.HAPPY,
    label: '开心',
    emoji: '😊',
    color: 'text-yellow-500 bg-yellow-50 border-yellow-200',
    bgColor: 'bg-yellow-100'
  },
  [MoodType.SAD]: {
    type: MoodType.SAD,
    label: '难过',
    emoji: '😢',
    color: 'text-blue-500 bg-blue-50 border-blue-200',
    bgColor: 'bg-blue-100'
  },
  [MoodType.EXCITED]: {
    type: MoodType.EXCITED,
    label: '兴奋',
    emoji: '🤩',
    color: 'text-orange-500 bg-orange-50 border-orange-200',
    bgColor: 'bg-orange-100'
  },
  [MoodType.CALM]: {
    type: MoodType.CALM,
    label: '平静',
    emoji: '😌',
    color: 'text-green-500 bg-green-50 border-green-200',
    bgColor: 'bg-green-100'
  },
  [MoodType.ANGRY]: {
    type: MoodType.ANGRY,
    label: '生气',
    emoji: '😠',
    color: 'text-red-500 bg-red-50 border-red-200',
    bgColor: 'bg-red-100'
  },
  [MoodType.LOVE]: {
    type: MoodType.LOVE,
    label: '喜欢',
    emoji: '🥰',
    color: 'text-pink-500 bg-pink-50 border-pink-200',
    bgColor: 'bg-pink-100'
  },
  [MoodType.THINKING]: {
    type: MoodType.THINKING,
    label: '思考',
    emoji: '🤔',
    color: 'text-purple-500 bg-purple-50 border-purple-200',
    bgColor: 'bg-purple-100'
  },
  [MoodType.TIRED]: {
    type: MoodType.TIRED,
    label: '疲惫',
    emoji: '😴',
    color: 'text-gray-500 bg-gray-50 border-gray-200',
    bgColor: 'bg-gray-100'
  },
  [MoodType.GRATEFUL]: {
    type: MoodType.GRATEFUL,
    label: '感恩',
    emoji: '🙏',
    color: 'text-emerald-500 bg-emerald-50 border-emerald-200',
    bgColor: 'bg-emerald-100'
  },
  [MoodType.MOTIVATED]: {
    type: MoodType.MOTIVATED,
    label: '励志',
    emoji: '💪',
    color: 'text-indigo-500 bg-indigo-50 border-indigo-200',
    bgColor: 'bg-indigo-100'
  },
  [MoodType.CREATIVE]: {
    type: MoodType.CREATIVE,
    label: '创意',
    emoji: '✨',
    color: 'text-cyan-500 bg-cyan-50 border-cyan-200',
    bgColor: 'bg-cyan-100'
  },
  [MoodType.RELAXED]: {
    type: MoodType.RELAXED,
    label: '放松',
    emoji: '😎',
    color: 'text-teal-500 bg-teal-50 border-teal-200',
    bgColor: 'bg-teal-100'
  }
};

// 根据心情类型获取配置 - 简化版本
export const getMoodConfig = (type: MoodType): MoodConfig => {
  return MOOD_CONFIGS[type];
};

// 说说列表的分页配置 - 仅保留基础配置
export const MOMENTS_PAGINATION = {
  // 每页显示的说说数量
  pageSize: 10,
  // 懒加载的阈值（距离底部多少像素时开始加载）
  lazyLoadThreshold: 200
};

// 本地存储的键名 - 简化版本
export const STORAGE_KEYS = {
  // 说说缓存
  MOMENTS_CACHE: 'moments-cache'
};

// 说说模块的默认配置 - 简化版本
export const MOMENTS_DEFAULTS = {
  // 默认作者名（用于演示）
  defaultAuthor: '洛天依',
  // 说说页面的标题
  pageTitle: '碎碎念',
  // 说说页面的描述
  pageDescription: '记录生活中的点点滴滴，分享每一份心情'
};