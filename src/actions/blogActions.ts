'use server';

/**
 * 博客文章 Server Actions
 * 处理博客文章的本地文件操作
 */

import { revalidatePath } from 'next/cache';
import { 
  CONTENT_DIRS, 
  readFile, 
  writeFile, 
  deleteFile, 
  listFiles, 
  fileExists 
} from '@/utils/fileOperations';
import { parseFrontMatter } from '@/utils/momentsUtils';
import { generateBlogFileName, resolveFileNameConflict } from '@/utils/adminUtils';

/**
 * 博客文章接口
 */
export interface BlogPost {
  id: string;
  title: string;
  date: string;
  updatedAt?: string;
  category: string;
  tags: string[];
  excerpt: string;
  coverImage?: string;
  content: string;
  filePath: string;
}

/**
 * 博客文章数据接口（用于创建/更新）
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
export interface ActionResult {
  success: boolean;
  message: string;
  data?: BlogPost | BlogPost[];
  filePath?: string;
}

/**
 * 将博客内容转换为 Markdown 格式（包含 frontmatter）
 */
function convertToMarkdown(post: BlogPostData): string {
  const now = new Date().toISOString().split('T')[0];
  
  const frontmatter: Record<string, string | string[] | boolean | number> = {
    title: post.title,
    date: post.date || now,
    category: post.category,
    tags: post.tags || [],
    excerpt: post.excerpt || '',
  };
  
  if (post.coverImage) {
    frontmatter.coverImage = post.coverImage;
  }
  
  // 构建 frontmatter 字符串
  const frontmatterLines: string[] = ['---'];
  
  for (const [key, value] of Object.entries(frontmatter)) {
    if (value === '' || value === false) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    
    if (Array.isArray(value)) {
      frontmatterLines.push(`${key}:`);
      value.forEach(item => {
        frontmatterLines.push(`  - "${item}"`);
      });
    } else if (typeof value === 'string') {
      frontmatterLines.push(`${key}: "${value}"`);
    } else if (typeof value === 'boolean') {
      frontmatterLines.push(`${key}: ${value}`);
    } else if (typeof value === 'number') {
      frontmatterLines.push(`${key}: ${value}`);
    }
  }
  
  frontmatterLines.push('---');
  frontmatterLines.push('');
  
  return frontmatterLines.join('\n') + post.content;
}

/**
 * 获取博客列表
 * @returns 博客文章列表
 */
export async function getBlogList(): Promise<ActionResult> {
  try {
    const files = listFiles(CONTENT_DIRS.blogs, '.md');
    
    const blogs = files
      .filter(file => !file.isDirectory)
      .map(file => {
        const result = readFile(file.path);
        if (!result.success || !result.data) {
          return null;
        }
        
        const { metadata, content } = parseFrontMatter(result.data);
        
        return {
          id: file.name.replace('.md', ''),
          title: metadata.title || '无标题',
          date: metadata.date || '',
          updatedAt: metadata.updatedAt,
          category: metadata.category || '未分类',
          tags: metadata.tags || [],
          excerpt: metadata.excerpt || '',
          coverImage: metadata.coverImage,
          content,
          filePath: file.name,
        } as BlogPost;
      })
      .filter((blog): blog is BlogPost => blog !== null)
      .sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.date).getTime();
        const dateB = new Date(b.updatedAt || b.date).getTime();
        return dateB - dateA;
      });
    
    return {
      success: true,
      message: `获取成功，共 ${blogs.length} 篇文章`,
      data: blogs,
    };
  } catch (error) {
    return {
      success: false,
      message: `获取博客列表失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 获取单篇博客详情
 * @param id 博客 ID（文件名，不含扩展名）
 * @returns 博客文章详情
 */
export async function getBlogDetail(id: string): Promise<ActionResult> {
  try {
    const filePath = `${CONTENT_DIRS.blogs}/${id}.md`;
    const result = readFile(filePath);
    
    if (!result.success || !result.data) {
      return {
        success: false,
        message: result.message,
      };
    }
    
    const { metadata, content } = parseFrontMatter(result.data);
    
    const blog: BlogPost = {
      id,
      title: metadata.title || '无标题',
      date: metadata.date || '',
      updatedAt: metadata.updatedAt,
      category: metadata.category || '未分类',
      tags: metadata.tags || [],
      excerpt: metadata.excerpt || '',
      coverImage: metadata.coverImage,
      content,
      filePath: `${id}.md`,
    };
    
    return {
      success: true,
      message: '获取成功',
      data: blog,
    };
  } catch (error) {
    return {
      success: false,
      message: `获取博客详情失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 创建博客文章
 * @param data 博客文章数据
 * @returns 操作结果
 */
export async function createBlog(data: BlogPostData): Promise<ActionResult> {
  try {
    // 生成文件名
    let fileName = data.slug || generateBlogFileName(data.title);
    fileName = fileName.endsWith('.md') ? fileName : `${fileName}.md`;
    
    // 检查文件名冲突
    const existingFiles = listFiles(CONTENT_DIRS.blogs, '.md').map(f => f.name);
    fileName = resolveFileNameConflict(fileName, existingFiles);
    
    // 添加创建时间
    const blogData: BlogPostData = {
      ...data,
      date: data.date || new Date().toISOString().split('T')[0],
    };
    
    // 转换为 Markdown 格式
    const markdownContent = convertToMarkdown(blogData);
    
    // 写入文件
    const filePath = `${CONTENT_DIRS.blogs}/${fileName}`;
    const result = writeFile(filePath, markdownContent);
    
    if (!result.success) {
      return {
        success: false,
        message: result.message,
      };
    }
    
    // 刷新页面缓存
    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');
    
    // 返回创建的博客
    const blogId = fileName.replace('.md', '');
    return await getBlogDetail(blogId);
  } catch (error) {
    return {
      success: false,
      message: `创建博客失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 更新博客文章
 * @param id 博客 ID
 * @param data 更新的博客数据
 * @returns 操作结果
 */
export async function updateBlog(id: string, data: Partial<BlogPostData>): Promise<ActionResult> {
  try {
    // 获取现有博客
    const existingResult = await getBlogDetail(id);
    
    if (!existingResult.success || !existingResult.data) {
      return {
        success: false,
        message: existingResult.message,
      };
    }
    
    const existingBlog = existingResult.data as BlogPost;
    
    // 合并数据
    const updatedData: BlogPostData = {
      title: data.title || existingBlog.title,
      content: data.content !== undefined ? data.content : existingBlog.content,
      date: data.date || existingBlog.date,
      category: data.category || existingBlog.category,
      tags: data.tags || existingBlog.tags,
      excerpt: data.excerpt !== undefined ? data.excerpt : existingBlog.excerpt,
      coverImage: data.coverImage !== undefined ? data.coverImage : existingBlog.coverImage,
      slug: data.slug,
    };
    
    // 添加更新时间
    const now = new Date().toISOString().split('T')[0];
    
    // 转换为 Markdown 格式
    const markdownContent = convertToMarkdown(updatedData);
    
    // 添加更新时间到 frontmatter
    const contentWithUpdatedAt = markdownContent.replace(
      /---\n/,
      `---\nupdatedAt: "${now}"\n`
    );
    
    // 写入文件
    const filePath = `${CONTENT_DIRS.blogs}/${id}.md`;
    const result = writeFile(filePath, contentWithUpdatedAt);
    
    if (!result.success) {
      return {
        success: false,
        message: result.message,
      };
    }
    
    // 刷新页面缓存
    revalidatePath('/admin/blogs');
    revalidatePath(`/blogs/${id}`);
    revalidatePath('/blogs');
    revalidatePath('/archive');
    
    return await getBlogDetail(id);
  } catch (error) {
    return {
      success: false,
      message: `更新博客失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 删除博客文章
 * @param id 博客 ID
 * @returns 操作结果
 */
export async function deleteBlog(id: string): Promise<ActionResult> {
  try {
    const filePath = `${CONTENT_DIRS.blogs}/${id}.md`;
    
    if (!fileExists(filePath)) {
      return {
        success: false,
        message: `博客不存在: ${id}`,
      };
    }
    
    const result = deleteFile(filePath);
    
    if (!result.success) {
      return {
        success: false,
        message: result.message,
      };
    }
    
    // 刷新页面缓存
    revalidatePath('/admin/blogs');
    revalidatePath('/blogs');
    revalidatePath('/archive');
    
    return {
      success: true,
      message: '删除成功',
      filePath: id,
    };
  } catch (error) {
    return {
      success: false,
      message: `删除博客失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 批量删除博客文章
 * @param ids 博客 ID 列表
 * @returns 操作结果
 */
export async function batchDeleteBlogs(ids: string[]): Promise<ActionResult> {
  try {
    const results: { id: string; success: boolean; message: string }[] = [];
    
    for (const id of ids) {
      const result = await deleteBlog(id);
      results.push({
        id,
        success: result.success,
        message: result.message,
      });
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;
    
    return {
      success: failCount === 0,
      message: `成功删除 ${successCount} 篇文章${failCount > 0 ? `，失败 ${failCount} 篇` : ''}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `批量删除失败: ${error instanceof Error ? error.message : '未知错误'}`,
    };
  }
}

/**
 * 批量修改博客分类
 * @param ids 博客 ID 列表
 * @param newCategory 新分类
 * @returns 操作结果
 */
export async function batchUpdateBlogCategory(
  ids: string[],
  newCategory: string
): Promise<ActionResult> {
  try {
    const results: { id: string; success: boolean; message: string }[] = [];

    for (const id of ids) {
      const result = await updateBlog(id, { category: newCategory });
      results.push({
        id,
        success: result.success,
        message: result.message,
      });
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    return {
      success: failCount === 0,
      message: `成功修改 ${successCount} 篇文章分类${failCount > 0 ? `，失败 ${failCount} 篇` : ""}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `批量修改分类失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}

/**
 * 获取所有分类
 * @returns 分类列表
 */
export async function getBlogCategories(): Promise<string[]> {
  try {
    const result = await getBlogList();
    if (!result.success || !result.data) {
      return [];
    }

    const blogs = result.data as BlogPost[];
    const categories = new Set(blogs.map((blog) => blog.category));
    return Array.from(categories);
  } catch {
    return [];
  }
}

/**
 * 获取所有标签
 * @returns 标签列表
 */
export async function getBlogTags(): Promise<string[]> {
  try {
    const result = await getBlogList();
    if (!result.success || !result.data) {
      return [];
    }
    
    const blogs = result.data as BlogPost[];
    const tags = new Set(blogs.flatMap(blog => blog.tags));
    return Array.from(tags);
  } catch {
    return [];
  }
}
