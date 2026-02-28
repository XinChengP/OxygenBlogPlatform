/**
 * 管理后台类型定义
 * 包含管理后台所需的所有类型接口
 */

import { ImageSource } from './gallery';

/**
 * 管理员用户类型
 */
export interface AdminUser {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'editor' | 'viewer';
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * 管理后台配置类型
 */
export interface AdminConfig {
  siteName: string;
  siteDescription: string;
  logo?: string;
  favicon?: string;
  theme: 'light' | 'dark' | 'system';
  language: 'zh-CN' | 'en-US';
  timezone: string;
  dateFormat: string;
  postsPerPage: number;
  enableComments: boolean;
  enableAnalytics: boolean;
  maintenanceMode: boolean;
}

/**
 * 博客文章表单数据类型
 */
export interface BlogFormData {
  title: string;
  slug?: string;
  content: string;
  excerpt: string;
  category: string;
  tags: string[];
  coverImage?: string;
  published: boolean;
  featured: boolean;
  author?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 个人动态表单数据类型
 */
export interface MomentFormData {
  id?: string;
  content: string;
  time: string;
  pinned: boolean;
  tags: string[];
  images: string[];
  location?: string;
  mood?: string;
}

/**
 * 管理后台导航项类型
 */
export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: AdminNavItem[];
  badge?: string | number;
  disabled?: boolean;
}

/**
 * 管理后台统计卡片数据类型
 */
export interface AdminStatCard {
  id: string;
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

/**
 * 管理后台表格列配置类型
 */
export interface AdminTableColumn<T = unknown> {
  key: keyof T | string;
  title: string;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
}

/**
 * 管理后台操作结果类型
 */
export interface AdminActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

/**
 * 图床管理图片类型（扩展画廊图片类型）
 */
export interface AdminGalleryImage {
  id: string;
  src: string;
  thumbnail?: string;
  alt: string;
  source: ImageSource;
  category: string;
  size?: number;
  width?: number;
  height?: number;
  format?: string;
  createdAt: string;
  updatedAt?: string;
  uploadedBy?: string;
  tags?: string[];
  description?: string;
}

/**
 * 图床设置类型
 */
export interface GallerySettings {
  defaultSource: ImageSource;
  localPath: string;
  remoteConfig: {
    provider: 'github' | 'smms' | 'imgur' | 'custom';
    token?: string;
    repository?: string;
    branch?: string;
    path?: string;
    customUrl?: string;
  };
  compression: {
    enabled: boolean;
    quality: number;
    maxWidth: number;
    maxHeight: number;
  };
  watermark: {
    enabled: boolean;
    text?: string;
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
    opacity?: number;
  };
}

/**
 * 系统设置类型
 */
export interface SystemSettings {
  general: {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    author: string;
    email: string;
  };
  seo: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    ogImage?: string;
  };
  social: {
    github?: string;
    twitter?: string;
    weibo?: string;
    bilibili?: string;
    email?: string;
  };
  advanced: {
    enablePwa: boolean;
    enableAnalytics: boolean;
    enableComments: boolean;
    maintenanceMode: boolean;
  };
}

/**
 * 管理后台分页参数类型
 */
export interface AdminPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/**
 * 管理后台列表查询参数类型
 */
export interface AdminQueryParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, string | string[]>;
}

/**
 * 管理后台通知类型
 */
export interface AdminNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/**
 * 管理后台操作日志类型
 */
export interface AdminActivityLog {
  id: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  userId: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
