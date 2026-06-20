/**
 * 博客文章管理相关的 Server Actions
 * 提供博客文章的增删改查功能
 * 
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

'use server';

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

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
  hidden?: boolean;
  pinned?: boolean;
  pinnedAt?: string;
  filePath: string;
  author?: string;
  seriesOrder?: number;
  language?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface BlogPostData {
  title: string;
  content: string;
  date?: string;
  updatedAt?: string;
  category: string;
  tags?: string[];
  excerpt?: string;
  coverImage?: string;
  slug?: string;
  hidden?: boolean;
  pinned?: boolean;        // 置顶状态，防止编辑后丢失
  pinnedAt?: string;       // 置顶时间，防止编辑后丢失
  author?: string;
  seriesOrder?: number;
  language?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface ActionResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  filePath?: string;
}

// 只有在非静态导出模式下才导入和使用 Server Actions 相关功能
import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';
import matter from 'gray-matter';

// 博客文章存储目录
const BLOGS_DIR = path.join(process.cwd(), 'src', 'content', 'blogs');

/**
 * 确保博客目录存在
 */
async function ensureBlogsDir(): Promise<void> {
  try {
    await fs.access(BLOGS_DIR);
  } catch {
    await fs.mkdir(BLOGS_DIR, { recursive: true });
  }
}

/**
 * 生成 frontmatter 字符串
 * @param data 博客数据
 * @param existingData 原始 frontmatter 数据（更新模式时传入，用于保留未知字段）
 * @returns frontmatter 字符串
 */
function generateFrontMatter(data: BlogPostData & { slug: string; date: string }, existingData?: Record<string, unknown>): string {
  const lines = ['---'];

  lines.push(`title: "${data.title}"`);
  lines.push(`date: "${data.date}"`);

  if (data.updatedAt) {
    lines.push(`updatedAt: "${data.updatedAt}"`);
  }

  lines.push(`category: "${data.category}"`);

  if (data.tags && data.tags.length > 0) {
    lines.push(`tags: [${data.tags.map(tag => `"${tag}"`).join(', ')}]`);
  }

  if (data.excerpt) {
    lines.push(`excerpt: "${data.excerpt}"`);
  }

  if (data.author) {
    lines.push(`author: "${data.author}"`);
  }

  if (data.seriesOrder) {
    lines.push(`seriesOrder: ${data.seriesOrder}`);
  }

  if (data.language) {
    lines.push(`language: "${data.language}"`);
  }

  if (data.seoTitle) {
    lines.push(`seoTitle: "${data.seoTitle}"`);
  }

  if (data.seoDescription) {
    lines.push(`seoDescription: "${data.seoDescription}"`);
  }

  if (data.coverImage) {
    lines.push(`coverImage: "${data.coverImage}"`);
  }

  // 处理 pinned：true 时保留，false 时删除
  if (data.pinned) {
    lines.push('pinned: true');
  }

  // 处理 hidden：true 时保留，false 时删除
  if (data.hidden) {
    lines.push('hidden: true');
  }

  // 保留原始 frontmatter 中的未知字段
  if (existingData) {
    const knownKeys = new Set([
      'title', 'date', 'updatedAt', 'category', 'tags', 'excerpt',
      'author', 'seriesOrder', 'language', 'seoTitle', 'seoDescription',
      'coverImage', 'pinned', 'hidden'
    ]);
    for (const [key, value] of Object.entries(existingData)) {
      if (knownKeys.has(key)) continue;

      if (typeof value === 'string') {
        lines.push(`${key}: "${value}"`);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${key}: ${value}`);
      } else if (Array.isArray(value)) {
        lines.push(`${key}: [${value.map((v) => typeof v === 'string' ? `"${v}"` : v).join(', ')}]`);
      } else {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      }
    }
  }

  lines.push('---');

  return lines.join('\n');
}

/**
 * 计算阅读时间
 * @param content 文章内容
 * @returns 阅读时间（分钟）
 */
function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.trim().split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

/**
 * 生成 slug
 * @param title 标题
 * @returns slug 字符串
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * 获取所有博客文件列表
 * @returns 文件名数组
 */
async function getBlogFiles(): Promise<string[]> {
  if (isStaticExport) {
    return [];
  }
  
  try {
    await ensureBlogsDir();
    const files = await fs.readdir(BLOGS_DIR);
    return files.filter((file) => file.endsWith('.md'));
  } catch {
    return [];
  }
}

/**
 * 读取博客文件内容
 * 使用 gray-matter 正确解析 YAML frontmatter，支持多行数组等复杂格式
 * @param slug 博客 slug
 * @returns 博客数据
 */
async function readBlogFile(slug: string): Promise<BlogPost | null> {
  if (isStaticExport) {
    return null;
  }

  try {
    const filePath = path.join(BLOGS_DIR, `${slug}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(content);
    const body = parsed.content;

    const wordCount = body.trim().split(/\s+/).length;

    return {
      id: slug,
      slug,
      title: (parsed.data.title as string) || '',
      date: (parsed.data.date as string) || '',
      category: (parsed.data.category as string) || '',
      tags: (parsed.data.tags as string[]) || [],
      excerpt: (parsed.data.excerpt as string) || '',
      content: body.trim(),
      coverImage: (parsed.data.coverImage as string),
      readingTime: calculateReadingTime(body),
      wordCount,
      updatedAt: (parsed.data.updatedAt as string),
      hidden: parsed.data.hidden === true || parsed.data.hidden === 'true',
      pinned: parsed.data.pinned === true || parsed.data.pinned === 'true',
      pinnedAt: (parsed.data.pinnedAt as string),
      filePath: `src/content/blogs/${slug}.md`,
      author: (parsed.data.author as string),
      seriesOrder: (parsed.data.seriesOrder as number),
      language: (parsed.data.language as string),
      seoTitle: (parsed.data.seoTitle as string),
      seoDescription: (parsed.data.seoDescription as string),
    };
  } catch {
    return null;
  }
}

/**
 * 写入博客文件
 * @param slug 博客 slug
 * @param data 博客数据
 * @param existingContent 原始文件内容（更新模式时传入，用于保留未知字段）
 */
async function writeBlogFile(slug: string, data: BlogPostData & { date: string }, existingContent?: string): Promise<void> {
  if (isStaticExport) {
    return;
  }

  await ensureBlogsDir();
  const filePath = path.join(BLOGS_DIR, `${slug}.md`);

  let existingData: Record<string, unknown> | undefined;
  if (existingContent) {
    // 更新模式：使用 gray-matter 解析原始 frontmatter，提取未知字段
    const parsed = matter(existingContent);
    existingData = parsed.data as Record<string, unknown>;
  }

  const frontmatter = generateFrontMatter({ ...data, slug }, existingData);
  const content = `${frontmatter}\n\n${data.content}`;
  await fs.writeFile(filePath, content, 'utf-8');
}

/**
 * 删除博客文件
 * @param slug 博客 slug
 */
async function deleteBlogFile(slug: string): Promise<void> {
  if (isStaticExport) {
    return;
  }
  
  const filePath = path.join(BLOGS_DIR, `${slug}.md`);
  await fs.unlink(filePath);
}

/**
 * 获取博客列表
 * @returns 博客列表
 */
export async function getBlogList(): Promise<BlogPost[]> {
  if (isStaticExport) {
    return [];
  }
  
  try {
    const files = await getBlogFiles();
    const blogs: BlogPost[] = [];

    for (const file of files) {
      const slug = file.replace('.md', '');
      const blog = await readBlogFile(slug);
      if (blog) {
        blogs.push(blog);
      }
    }

    // 按日期倒序排列，置顶文章优先
    blogs.sort((a, b) => {
      if (a.pinned !== b.pinned) {
        return a.pinned ? -1 : 1;
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return blogs;
  } catch (error) {
    console.error('获取博客列表失败:', error);
    return [];
  }
}

/**
 * 获取博客详情
 * @param slug 博客 slug
 * @returns 博客详情
 */
export async function getBlogDetail(slug: string): Promise<ActionResult<BlogPost>> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    const blog = await readBlogFile(slug);

    if (!blog) {
      return { success: false, message: 'Blog not found' };
    }

    return { success: true, message: 'Success', data: blog };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 创建博客
 * @param data 博客数据
 * @returns 创建的博客
 */
export async function createBlog(data: BlogPostData): Promise<ActionResult<BlogPost>> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    if (!data.title || data.title.trim() === '') {
      return { success: false, message: 'Title cannot be empty' };
    }

    if (!data.content || data.content.trim() === '') {
      return { success: false, message: 'Content cannot be empty' };
    }

    const slug = data.slug || generateSlug(data.title);
    const date = data.date || new Date().toISOString().split('T')[0];

    // 检查文件是否已存在
    const existingBlog = await readBlogFile(slug);
    if (existingBlog) {
      return { success: false, message: 'Blog with this slug already exists' };
    }

    await writeBlogFile(slug, { ...data, date });

    const newBlog = await readBlogFile(slug);
    if (!newBlog) {
      return { success: false, message: 'Failed to create blog' };
    }

    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');

    return { success: true, message: 'Created successfully', data: newBlog, filePath: `src/content/blogs/${slug}.md` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 更新博客
 * @param slug 博客 slug
 * @param data 更新的数据
 * @returns 更新后的博客
 */
export async function updateBlog(
  slug: string,
  data: Partial<BlogPostData>
): Promise<ActionResult<BlogPost>> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }

  try {
    const existingBlog = await readBlogFile(slug);

    if (!existingBlog) {
      return { success: false, message: 'Blog not found' };
    }

    // 读取原始文件内容，用于保留 frontmatter 中的未知字段和格式
    const filePath = path.join(BLOGS_DIR, `${slug}.md`);
    const existingContent = await fs.readFile(filePath, 'utf-8');

    const updatedData: BlogPostData & { date: string; updatedAt?: string } = {
      title: data.title ?? existingBlog.title,
      content: data.content ?? existingBlog.content,
      date: data.date ?? existingBlog.date,
      category: data.category ?? existingBlog.category,
      tags: data.tags ?? existingBlog.tags,
      excerpt: data.excerpt ?? existingBlog.excerpt,
      coverImage: data.coverImage ?? existingBlog.coverImage,
      hidden: data.hidden ?? existingBlog.hidden,
      pinned: data.pinned ?? existingBlog.pinned,           // 保留置顶状态
      pinnedAt: data.pinnedAt ?? existingBlog.pinnedAt,     // 保留置顶时间
      author: data.author ?? existingBlog.author,
      seriesOrder: data.seriesOrder ?? existingBlog.seriesOrder,
      language: data.language ?? existingBlog.language,
      seoTitle: data.seoTitle ?? existingBlog.seoTitle,
      seoDescription: data.seoDescription ?? existingBlog.seoDescription,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    await writeBlogFile(slug, updatedData, existingContent);

    const updatedBlog = await readBlogFile(slug);
    if (!updatedBlog) {
      return { success: false, message: 'Failed to update blog' };
    }

    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');
    revalidatePath(`/blogs/${slug}`);

    return { success: true, message: 'Updated successfully', data: updatedBlog, filePath: `src/content/blogs/${slug}.md` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 删除博客
 * @param slug 博客 slug
 * @returns 操作结果
 */
export async function deleteBlog(slug: string): Promise<ActionResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    const existingBlog = await readBlogFile(slug);

    if (!existingBlog) {
      return { success: false, message: 'Blog not found' };
    }

    await deleteBlogFile(slug);

    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');

    return { success: true, message: 'Deleted successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 批量删除博客
 * @param slugs 博客 slug 数组
 * @returns 操作结果
 */
export async function batchDeleteBlogs(slugs: string[]): Promise<ActionResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    if (!slugs || slugs.length === 0) {
      return { success: false, message: 'No blogs selected' };
    }

    let deletedCount = 0;
    for (const slug of slugs) {
      const existingBlog = await readBlogFile(slug);
      if (existingBlog) {
        await deleteBlogFile(slug);
        deletedCount++;
      }
    }

    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');

    return { success: true, message: `Successfully deleted ${deletedCount} blogs` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 批量更新博客分类
 * @param slugs 博客 slug 数组
 * @param category 新分类
 * @returns 操作结果
 */
export async function batchUpdateBlogCategory(slugs: string[], category: string): Promise<ActionResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }

  try {
    if (!slugs || slugs.length === 0) {
      return { success: false, message: 'No blogs selected' };
    }

    let updatedCount = 0;
    for (const slug of slugs) {
      const filePath = path.join(BLOGS_DIR, `${slug}.md`);
      const existingContent = await fs.readFile(filePath, 'utf-8').catch(() => null);
      const existingBlog = existingContent ? await readBlogFile(slug) : null;
      if (existingBlog && existingContent) {
        await writeBlogFile(slug, {
          title: existingBlog.title,
          content: existingBlog.content,
          date: existingBlog.date,
          category,
          tags: existingBlog.tags,
          excerpt: existingBlog.excerpt,
          coverImage: existingBlog.coverImage,
          hidden: existingBlog.hidden,
          pinned: existingBlog.pinned,
          pinnedAt: existingBlog.pinnedAt,
          author: existingBlog.author,
          seriesOrder: existingBlog.seriesOrder,
          language: existingBlog.language,
          seoTitle: existingBlog.seoTitle,
          seoDescription: existingBlog.seoDescription,
        }, existingContent);
        updatedCount++;
      }
    }

    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');

    return { success: true, message: `Successfully updated ${updatedCount} blogs` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 获取所有分类
 * @returns 分类列表
 */
export async function getBlogCategories(): Promise<string[]> {
  if (isStaticExport) {
    return [];
  }
  
  try {
    const blogs = await getBlogList();
    const categorySet = new Set<string>();
    
    for (const blog of blogs) {
      if (blog.category) {
        categorySet.add(blog.category);
      }
    }

    return Array.from(categorySet).sort();
  } catch {
    return [];
  }
}

/**
 * 保存博客 Markdown 文件
 * @param slug 博客 slug
 * @param content Markdown 内容
 * @returns 操作结果
 */
export async function saveBlogMarkdown(slug: string, content: string): Promise<ActionResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }

  try {
    const existingBlog = await readBlogFile(slug);

    if (!existingBlog) {
      return { success: false, message: 'Blog not found' };
    }

    // 读取原始文件内容，用于保留 frontmatter 中的未知字段
    const filePath = path.join(BLOGS_DIR, `${slug}.md`);
    const existingContent = await fs.readFile(filePath, 'utf-8');

    await writeBlogFile(slug, {
      title: existingBlog.title,
      content,
      date: existingBlog.date,
      category: existingBlog.category,
      tags: existingBlog.tags,
      excerpt: existingBlog.excerpt,
      coverImage: existingBlog.coverImage,
      hidden: existingBlog.hidden,
      pinned: existingBlog.pinned,
      pinnedAt: existingBlog.pinnedAt,
      author: existingBlog.author,
      seriesOrder: existingBlog.seriesOrder,
      language: existingBlog.language,
      seoTitle: existingBlog.seoTitle,
      seoDescription: existingBlog.seoDescription,
    }, existingContent);

    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');
    revalidatePath(`/blogs/${slug}`);

    return { success: true, message: 'Saved successfully' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 切换博客隐藏状态
 * @param slug 博客 slug
 * @returns 更新后的博客
 */
export async function toggleBlogHidden(slug: string): Promise<ActionResult<BlogPost>> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }
  
  try {
    const existingBlog = await readBlogFile(slug);

    if (!existingBlog) {
      return { success: false, message: 'Blog not found' };
    }

    const updatedBlog = await updateBlog(slug, {
      hidden: !existingBlog.hidden,
    });

    return updatedBlog;
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * 批量切换博客隐藏状态
 * @param slugs 博客 slug 数组
 * @param hidden 隐藏状态
 * @returns 操作结果
 */
export async function batchToggleBlogHidden(slugs: string[], hidden: boolean): Promise<ActionResult> {
  if (isStaticExport) {
    return { success: false, message: 'Static export mode does not support this feature' };
  }

  try {
    if (!slugs || slugs.length === 0) {
      return { success: false, message: 'No blogs selected' };
    }

    let updatedCount = 0;
    for (const slug of slugs) {
      const filePath = path.join(BLOGS_DIR, `${slug}.md`);
      const existingContent = await fs.readFile(filePath, 'utf-8').catch(() => null);
      const existingBlog = existingContent ? await readBlogFile(slug) : null;
      if (existingBlog && existingContent) {
        await writeBlogFile(slug, {
          title: existingBlog.title,
          content: existingBlog.content,
          date: existingBlog.date,
          category: existingBlog.category,
          tags: existingBlog.tags,
          excerpt: existingBlog.excerpt,
          coverImage: existingBlog.coverImage,
          hidden,
          pinned: existingBlog.pinned,
          pinnedAt: existingBlog.pinnedAt,
          author: existingBlog.author,
          seriesOrder: existingBlog.seriesOrder,
          language: existingBlog.language,
          seoTitle: existingBlog.seoTitle,
          seoDescription: existingBlog.seoDescription,
        }, existingContent);
        updatedCount++;
      }
    }

    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');

    return { success: true, message: `Successfully ${hidden ? 'hidden' : 'shown'} ${updatedCount} blogs` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}
