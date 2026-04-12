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

// 空实现函数 - 在静态导出模式下返回默认值
export async function getBlogDetail(id: string): Promise<ActionResult<BlogPost>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function getBlogList(): Promise<BlogPost[]> {
  return [];
}

export async function createBlog(data: BlogPostData): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function updateBlog(id: string, data: Partial<BlogPostData>): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function deleteBlog(id: string): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function batchDeleteBlogs(ids: string[]): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function batchUpdateBlogCategory(ids: string[], category: string): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function getBlogCategories(): Promise<string[]> {
  return [];
}

export async function saveBlogMarkdown(slug: string, content: string): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function toggleBlogHidden(id: string): Promise<ActionResult<BlogPost>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function batchToggleBlogHidden(ids: string[], hidden: boolean): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}
