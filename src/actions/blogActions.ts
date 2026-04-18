// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

// 类型定义
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  content: string;
  coverImage?: string;
  readingTime?: number;
  wordCount?: number;
  updatedAt?: string;
  filePath: string;
  hidden?: boolean;
  pinned?: boolean;
  pinnedAt?: string;
}

export interface BlogPostData {
  title: string;
  content: string;
  date?: string;
  category: string;
  tags?: string[];
  excerpt?: string;
  coverImage?: string;
  slug?: string;
}

export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  filePath?: string;
}

// 空实现函数 - 在静态导出模式下返回默认值（不使用 async，不返回 Promise）
export function getBlogDetail(id: string): ActionResult<BlogPost> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function getBlogList(): BlogPost[] {
  return [];
}

export function createBlog(data: BlogPostData): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function updateBlog(id: string, data: Partial<BlogPostData>): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function deleteBlog(id: string): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function batchDeleteBlogs(ids: string[]): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function batchUpdateBlogCategory(ids: string[], category: string): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function getBlogCategories(): string[] {
  return [];
}

export function saveBlogMarkdown(slug: string, content: string): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function toggleBlogHidden(id: string): ActionResult<BlogPost> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function batchToggleBlogHidden(ids: string[], hidden: boolean): ActionResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}
