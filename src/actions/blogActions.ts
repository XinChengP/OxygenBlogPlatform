'use server';

/**
 * 博客文章管理相关的 Server Actions
 * 提供博客文章的增删改查功能
 * 博客文章使用 Markdown 格式存储（带 frontmatter）
 */

import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';

// 博客文章数据存储路径
const BLOGS_DIR = path.join(process.cwd(), 'src', 'content', 'blogs');

/**
 * 博客文章数据接口
 */
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
}

/**
 * 博客文章创建/更新数据接口
 */
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

/**
 * 操作结果接口
 */
export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  filePath?: string;
}

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
 * 解析 Markdown frontmatter
 * 从 Markdown 内容中提取 YAML 格式的 frontmatter 和正文内容
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);
  
  if (!match) {
    return { frontmatter: {}, body: content };
  }
  
  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter: Record<string, any> = {};
  
  // 简单的 YAML 解析
  const lines = frontmatterStr.split('\n');
  let currentKey = '';
  let currentArray: string[] | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // 检查是否是数组项（以 "- " 开头）
    if (trimmed.startsWith('- ')) {
      if (currentArray !== null) {
        currentArray.push(trimmed.substring(2).replace(/"/g, ''));
      }
      continue;
    }
    
    // 检查是否是键值对
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      // 检查是否是数组开始（值为空表示下一行是数组）
      if (value === '') {
        currentKey = key;
        currentArray = [];
        frontmatter[key] = currentArray;
      } else {
        currentKey = key;
        currentArray = null;
        // 移除引号
        frontmatter[key] = value.replace(/^["']|["']$/g, '');
      }
    }
  }
  
  return { frontmatter, body };
}

/**
 * 生成 frontmatter 字符串
 * 将数据对象转换为 YAML 格式的 frontmatter
 */
function generateFrontmatter(data: Record<string, any>): string {
  let result = '---\n';
  
  for (const [key, value] of Object.entries(data)) {
    if (Array.isArray(value)) {
      if (value.length > 0) {
        result += `${key}:\n`;
        for (const item of value) {
          result += `  - "${item}"\n`;
        }
      }
    } else if (value !== undefined && value !== null && value !== '') {
      result += `${key}: "${value}"\n`;
    }
  }
  
  result += '---\n';
  return result;
}

/**
 * 从文件名生成文章 ID
 * 文件名格式：slug.md 或 date-slug.md
 */
function generateIdFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '');
}

/**
 * 生成文章文件名
 * 格式：slug.md（如果没有 slug 则使用标题的拼音或时间戳）
 */
function generateFilename(slug: string, title: string): string {
  if (slug) {
    // 清理 slug，确保是有效的文件名
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `${cleanSlug}.md`;
  }
  
  // 如果没有 slug，使用时间戳
  const timestamp = Date.now();
  return `${timestamp}.md`;
}

/**
 * 计算阅读时间（按每分钟 300 字计算）
 */
function calculateReadingTime(content: string): number {
  const wordCount = content.replace(/\s/g, '').length;
  return Math.ceil(wordCount / 300);
}

/**
 * 获取所有博客文章列表
 */
export async function getBlogList(): Promise<BlogPost[]> {
  try {
    await ensureBlogsDir();
    const files = await fs.readdir(BLOGS_DIR);
    const mdFiles = files.filter(f => f.endsWith('.md'));
    
    const blogs: BlogPost[] = [];
    
    for (const file of mdFiles) {
      try {
        const filePath = path.join(BLOGS_DIR, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const { frontmatter, body } = parseFrontmatter(content);
        
        blogs.push({
          id: generateIdFromFilename(file),
          title: frontmatter.title || '',
          slug: generateIdFromFilename(file),
          date: frontmatter.date || '',
          category: frontmatter.category || '',
          tags: frontmatter.tags || [],
          excerpt: frontmatter.excerpt || '',
          content: body.trim(),
          coverImage: frontmatter.coverImage || '',
          readingTime: calculateReadingTime(body),
          wordCount: body.replace(/\s/g, '').length,
          updatedAt: frontmatter.updatedAt || '',
        });
      } catch (e) {
        console.error(`读取博客文件失败: ${file}`, e);
      }
    }
    
    // 按日期倒序排列
    blogs.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.date).getTime();
      const dateB = new Date(b.updatedAt || b.date).getTime();
      return dateB - dateA;
    });
    
    return blogs;
  } catch (error) {
    console.error('获取博客列表失败:', error);
    return [];
  }
}

/**
 * 获取单个博客文章详情
 * @param id 文章 ID（文件名，不含 .md 扩展名）
 */
export async function getBlogDetail(id: string): Promise<ActionResult<BlogPost>> {
  try {
    // 尝试直接匹配文件名
    const possibleFiles = [
      path.join(BLOGS_DIR, `${id}.md`),
      path.join(BLOGS_DIR, `${id}`),
    ];
    
    let filePath = '';
    let content = '';
    
    for (const fp of possibleFiles) {
      try {
        content = await fs.readFile(fp, 'utf-8');
        filePath = fp;
        break;
      } catch {
        continue;
      }
    }
    
    // 如果直接匹配失败，尝试遍历所有文件查找
    if (!content) {
      await ensureBlogsDir();
      const files = await fs.readdir(BLOGS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      for (const file of mdFiles) {
        const fp = path.join(BLOGS_DIR, file);
        try {
          const fileContent = await fs.readFile(fp, 'utf-8');
          const { frontmatter, body } = parseFrontmatter(fileContent);
          
          // 匹配 ID（文件名）或 slug
          const fileId = generateIdFromFilename(file);
          if (fileId === id || frontmatter.slug === id) {
            content = fileContent;
            filePath = fp;
            break;
          }
        } catch {
          continue;
        }
      }
    }
    
    if (!content) {
      return { success: false, message: '文章不存在' };
    }
    
    const { frontmatter, body } = parseFrontmatter(content);
    const filename = path.basename(filePath);
    
    const blog: BlogPost = {
      id: generateIdFromFilename(filename),
      title: frontmatter.title || '',
      slug: frontmatter.slug || generateIdFromFilename(filename),
      date: frontmatter.date || '',
      category: frontmatter.category || '',
      tags: frontmatter.tags || [],
      excerpt: frontmatter.excerpt || '',
      content: body.trim(),
      coverImage: frontmatter.coverImage || '',
      readingTime: calculateReadingTime(body),
      wordCount: body.replace(/\s/g, '').length,
      updatedAt: frontmatter.updatedAt || '',
    };
    
    return { success: true, message: '获取成功', data: blog };
  } catch (error) {
    console.error('获取博客详情失败:', error);
    return { success: false, message: '获取文章详情失败' };
  }
}

/**
 * 创建新博客文章
 */
export async function createBlog(data: BlogPostData): Promise<ActionResult<BlogPost>> {
  try {
    await ensureBlogsDir();
    
    // 生成文件名
    const filename = generateFilename(data.slug || '', data.title);
    const filePath = path.join(BLOGS_DIR, filename);
    
    // 检查文件是否已存在
    try {
      await fs.access(filePath);
      return { success: false, message: '文章已存在，请使用不同的别名' };
    } catch {
      // 文件不存在，可以创建
    }
    
    // 生成日期
    const date = data.date || new Date().toISOString().split('T')[0];
    
    // 生成摘要（如果没有提供）
    const excerpt = data.excerpt || data.content.substring(0, 150);
    
    // 生成 Markdown 内容
    const frontmatter = generateFrontmatter({
      title: data.title,
      date: date,
      category: data.category,
      tags: data.tags || [],
      excerpt: excerpt,
      coverImage: data.coverImage || '',
    });
    
    const markdownContent = frontmatter + '\n' + (data.content || '');
    
    await fs.writeFile(filePath, markdownContent, 'utf-8');
    
    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');
    
    const blog: BlogPost = {
      id: generateIdFromFilename(filename),
      title: data.title,
      slug: data.slug || generateIdFromFilename(filename),
      date: date,
      category: data.category,
      tags: data.tags || [],
      excerpt: excerpt,
      content: data.content || '',
      coverImage: data.coverImage,
      readingTime: calculateReadingTime(data.content || ''),
      wordCount: (data.content || '').replace(/\s/g, '').length,
    };
    
    return { success: true, message: '文章创建成功', data: blog, filePath };
  } catch (error) {
    console.error('创建博客失败:', error);
    return { success: false, message: '创建文章失败' };
  }
}

/**
 * 更新博客文章
 * @param id 文章 ID（文件名，不含 .md 扩展名）
 */
export async function updateBlog(id: string, data: Partial<BlogPostData>): Promise<ActionResult<BlogPost>> {
  try {
    // 查找现有文章
    const existingResult = await getBlogDetail(id);
    if (!existingResult.success || !existingResult.data) {
      return { success: false, message: '文章不存在' };
    }
    
    const existingBlog = existingResult.data;
    
    // 确定文件路径
    const oldFilePath = path.join(BLOGS_DIR, `${id}.md`);
    
    // 合并数据
    const updatedData: BlogPostData = {
      title: data.title ?? existingBlog.title,
      content: data.content ?? existingBlog.content,
      date: data.date ?? existingBlog.date,
      category: data.category ?? existingBlog.category,
      tags: data.tags ?? existingBlog.tags,
      excerpt: data.excerpt ?? existingBlog.excerpt,
      coverImage: data.coverImage ?? existingBlog.coverImage,
      slug: data.slug ?? existingBlog.slug,
    };
    
    // 生成更新时间
    const updatedAt = new Date().toISOString().split('T')[0];
    
    // 生成 Markdown 内容
    const frontmatter = generateFrontmatter({
      title: updatedData.title,
      date: updatedData.date,
      updatedAt: updatedAt,
      category: updatedData.category,
      tags: updatedData.tags || [],
      excerpt: updatedData.excerpt || updatedData.content?.substring(0, 150) || '',
      coverImage: updatedData.coverImage || '',
    });
    
    const markdownContent = frontmatter + '\n' + (updatedData.content || '');
    
    // 如果 slug 改变，需要重命名文件
    let newFilePath = oldFilePath;
    if (data.slug && data.slug !== id) {
      const newFilename = generateFilename(data.slug, updatedData.title);
      newFilePath = path.join(BLOGS_DIR, newFilename);
      
      // 检查新文件名是否已存在
      if (newFilePath !== oldFilePath) {
        try {
          await fs.access(newFilePath);
          return { success: false, message: '目标文件名已存在' };
        } catch {
          // 文件不存在，可以重命名
        }
      }
    }
    
    // 写入文件
    await fs.writeFile(newFilePath, markdownContent, 'utf-8');
    
    // 如果文件路径改变，删除旧文件
    if (newFilePath !== oldFilePath) {
      try {
        await fs.unlink(oldFilePath);
      } catch {
        // 忽略删除错误
      }
    }
    
    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');
    
    const blog: BlogPost = {
      id: generateIdFromFilename(path.basename(newFilePath)),
      title: updatedData.title,
      slug: updatedData.slug || generateIdFromFilename(path.basename(newFilePath)),
      date: updatedData.date || '',
      category: updatedData.category,
      tags: updatedData.tags || [],
      excerpt: updatedData.excerpt || '',
      content: updatedData.content || '',
      coverImage: updatedData.coverImage,
      readingTime: calculateReadingTime(updatedData.content || ''),
      wordCount: (updatedData.content || '').replace(/\s/g, '').length,
      updatedAt: updatedAt,
    };
    
    return { success: true, message: '文章更新成功', data: blog };
  } catch (error) {
    console.error('更新博客失败:', error);
    return { success: false, message: '更新文章失败' };
  }
}

/**
 * 删除博客文章
 * @param id 文章 ID（文件名，不含 .md 扩展名）
 */
export async function deleteBlog(id: string): Promise<ActionResult> {
  try {
    const filePath = path.join(BLOGS_DIR, `${id}.md`);
    
    try {
      await fs.unlink(filePath);
    } catch {
      return { success: false, message: '文章不存在' };
    }
    
    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');
    
    return { success: true, message: '文章删除成功' };
  } catch (error) {
    console.error('删除博客失败:', error);
    return { success: false, message: '删除文章失败' };
  }
}

/**
 * 批量删除博客文章
 */
export async function batchDeleteBlogs(ids: string[]): Promise<ActionResult> {
  try {
    let deletedCount = 0;
    let failedCount = 0;
    
    for (const id of ids) {
      const result = await deleteBlog(id);
      if (result.success) {
        deletedCount++;
      } else {
        failedCount++;
      }
    }
    
    if (failedCount > 0) {
      return { success: true, message: `成功删除 ${deletedCount} 篇文章，${failedCount} 篇删除失败` };
    }
    
    return { success: true, message: `成功删除 ${deletedCount} 篇文章` };
  } catch (error) {
    console.error('批量删除博客失败:', error);
    return { success: false, message: '批量删除失败' };
  }
}

/**
 * 批量修改文章分类
 */
export async function batchUpdateBlogCategory(ids: string[], category: string): Promise<ActionResult> {
  try {
    let updatedCount = 0;
    let failedCount = 0;
    
    for (const id of ids) {
      const result = await updateBlog(id, { category });
      if (result.success) {
        updatedCount++;
      } else {
        failedCount++;
      }
    }
    
    if (failedCount > 0) {
      return { success: true, message: `成功修改 ${updatedCount} 篇文章分类，${failedCount} 篇修改失败` };
    }
    
    return { success: true, message: `成功修改 ${updatedCount} 篇文章分类` };
  } catch (error) {
    console.error('批量修改分类失败:', error);
    return { success: false, message: '批量修改分类失败' };
  }
}

/**
 * 获取所有分类
 */
export async function getBlogCategories(): Promise<string[]> {
  try {
    const blogs = await getBlogList();
    const categories = new Set<string>();
    
    for (const blog of blogs) {
      if (blog.category) {
        categories.add(blog.category);
      }
    }
    
    return Array.from(categories).sort();
  } catch (error) {
    console.error('获取分类失败:', error);
    return [];
  }
}

/**
 * 保存博客 Markdown 内容
 * 用于编辑器直接保存 Markdown 文件
 */
export async function saveBlogMarkdown(slug: string, content: string): Promise<ActionResult> {
  try {
    await ensureBlogsDir();
    
    const filename = slug.endsWith('.md') ? slug : `${slug}.md`;
    const filePath = path.join(BLOGS_DIR, filename);
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');
    
    return { success: true, message: '保存成功', filePath };
  } catch (error) {
    console.error('保存 Markdown 失败:', error);
    return { success: false, message: '保存失败' };
  }
}
