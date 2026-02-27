/**
 * 后台管理系统类型定义
 */

// 管理员配置接口
export interface AdminConfig {
  // 密码哈希（bcrypt）
  passwordHash: string;
  // GitHub 配置
  github: {
    // 博客仓库配置
    blogRepo: {
      owner: string;
      repo: string;
      branch: string;
      token: string;
    };
    // 图床仓库配置
    imageRepo: {
      owner: string;
      repo: string;
      branch: string;
      token: string;
    };
  };
  // 配置版本
  version: string;
  // 最后更新时间
  lastUpdated: string;
}

// 登录请求接口
export interface LoginRequest {
  password: string;
}

// 登录响应接口
export interface LoginResponse {
  success: boolean;
  message: string;
  sessionId?: string;
}

// 会话信息接口
export interface AdminSession {
  sessionId: string;
  createdAt: number;
  expiresAt: number;
}

// 操作日志接口
export interface AdminLogEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  ip?: string;
}

// 博文管理相关类型
export interface BlogPostForAdmin {
  slug: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  content: string;
  coverImage?: string;
  pinned?: boolean;
  draft?: boolean;
  filePath: string;
}

// 动态管理相关类型
export interface MomentForAdmin {
  id: string;
  time: string;
  content: string;
  tags: string[];
  images: string[];
  pinned?: boolean;
  filePath: string;
}

// 图床图片类型
export interface ImageHostingItem {
  path: string;
  name: string;
  url: string;
  size?: number;
  uploadedAt: string;
  sha?: string;
}

// 分类类型
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
}

// 标签类型
export interface Tag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}
