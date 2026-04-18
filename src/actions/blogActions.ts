/**
 * 博客文章管理相关的 Server Actions
 * 提供博客文章的增删改查功能
 * 博客文章使用 Markdown 格式存储（带 frontmatter）
 * 
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

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
  hidden?: boolean;
}

export interface ActionResult<T = any> {
  success: boolean;
  message: string;
  data?: T;
  filePath?: string;
}

// ============================================
// 静态导出模式：空实现
// ============================================

async function getBlogListStatic(): Promise<BlogPost[]> {
  return [];
}

async function getBlogDetailStatic(id: string): Promise<ActionResult<BlogPost>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

async function createBlogStatic(data: BlogPostData): Promise<ActionResult<BlogPost>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

async function updateBlogStatic(id: string, data: Partial<BlogPostData>): Promise<ActionResult<BlogPost>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

async function deleteBlogStatic(id: string): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

async function batchDeleteBlogsStatic(ids: string[]): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

async function batchUpdateBlogCategoryStatic(ids: string[], category: string): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

async function getBlogCategoriesStatic(): Promise<string[]> {
  return [];
}

async function saveBlogMarkdownStatic(slug: string, content: string): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

async function toggleBlogHiddenStatic(id: string): Promise<ActionResult<BlogPost>> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

async function batchToggleBlogHiddenStatic(ids: string[], hidden: boolean): Promise<ActionResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

// ============================================
// 本地开发模式：真实实现
// ============================================

// 只有在非静态导出模式下才导入 Node.js 模块
let fs: typeof import('fs/promises') | null = null;
let path: typeof import('path') | null = null;
let revalidatePath: ((path: string) => void) | null = null;

if (!isStaticExport) {
  try {
    // 使用 eval 避免 Turbopack 在构建时解析
    // eslint-disable-next-line no-eval
    fs = eval("require('fs/promises')");
    // eslint-disable-next-line no-eval
    path = eval("require('path')");
    // eslint-disable-next-line no-eval
    const nextCache = eval("require('next/cache')");
    revalidatePath = nextCache.revalidatePath;
  } catch {
    // 如果导入失败，保持为 null
  }
}

// 博客文章数据存储路径
const BLOGS_DIR = !isStaticExport && path ? path.join(process.cwd(), 'src', 'content', 'blogs') : '';

/**
 * 确保博客目录存在
 */
async function ensureBlogsDir(): Promise<void> {
  if (!fs || !path) return;
  try {
    await fs.access(BLOGS_DIR);
  } catch {
    await fs.mkdir(BLOGS_DIR, { recursive: true });
  }
}

/**
 * 解析 YAML 格式的键值
 */
function parseYamlValue(value: string): string | string[] | boolean {
  const trimmed = value.trim();
  
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const arrayContent = trimmed.slice(1, -1).trim();
    if (!arrayContent) return [];
    
    const items = arrayContent.split(',').map(item => {
      const cleaned = item.trim().replace(/^["']|["']$/g, '');
      return cleaned;
    }).filter(item => item.length > 0);
    
    return items;
  }
  
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  
  return trimmed.replace(/^["']|["']$/g, '');
}

/**
 * 解析 Markdown frontmatter
 */
function parseFrontmatter(content: string): { frontmatter: Record<string, any>; body: string } {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const frontmatterStr = match[1];
  const body = match[2];
  const frontmatter: Record<string, any> = {};

  const lines = frontmatterStr.split(/\r?\n/);
  let currentKey = '';
  let currentArray: string[] | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('- ')) {
      if (currentArray !== null) {
        currentArray.push(trimmed.substring(2).replace(/"/g, ''));
      }
      continue;
    }
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.substring(0, colonIndex).trim();
      const value = trimmed.substring(colonIndex + 1).trim();
      
      if (value === '') {
        currentKey = key;
        currentArray = [];
        frontmatter[key] = currentArray;
      } else {
        currentKey = key;
        currentArray = null;
        frontmatter[key] = parseYamlValue(value);
      }
    }
  }
  
  return { frontmatter, body };
}

/**
 * 生成 frontmatter 字符串
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
    } else if (key === 'hidden') {
      if (value === true) {
        result += `${key}: true\n`;
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
 */
function generateIdFromFilename(filename: string): string {
  return filename.replace(/\.md$/, '');
}

/**
 * 生成文章文件名
 */
function generateFilename(slug: string, title: string): string {
  if (slug) {
    const cleanSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return `${cleanSlug}.md`;
  }
  
  const timestamp = Date.now();
  return `${timestamp}.md`;
}

/**
 * 计算阅读时间
 */
function calculateReadingTime(content: string): number {
  const wordCount = content.replace(/\s/g, '').length;
  return Math.ceil(wordCount / 300);
}

async function getBlogListReal(): Promise<BlogPost[]> {
  if (!fs || !path) return [];
  
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
          hidden: frontmatter.hidden || false,
          pinned: frontmatter.pinned || false,
          pinnedAt: frontmatter.pinnedAt || '',
          filePath: filePath,
        });
      } catch (e) {
        console.error(`读取博客文件失败: ${file}`, e);
      }
    }
    
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

async function getBlogDetailReal(id: string): Promise<ActionResult<BlogPost>> {
  if (!fs || !path) return { success: false, message: '文件系统不可用' };
  
  try {
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
    
    if (!content) {
      await ensureBlogsDir();
      const files = await fs.readdir(BLOGS_DIR);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      
      for (const file of mdFiles) {
        const fp = path.join(BLOGS_DIR, file);
        try {
          const fileContent = await fs.readFile(fp, 'utf-8');
          const { frontmatter, body } = parseFrontmatter(fileContent);
          
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
      hidden: frontmatter.hidden || false,
      filePath: filePath,
    };
    
    return { success: true, message: '获取成功', data: blog };
  } catch (error) {
    console.error('获取博客详情失败:', error);
    return { success: false, message: '获取文章详情失败' };
  }
}

async function createBlogReal(data: BlogPostData): Promise<ActionResult<BlogPost>> {
  if (!fs || !path || !revalidatePath) return { success: false, message: '文件系统不可用' };
  
  try {
    await ensureBlogsDir();
    
    const filename = generateFilename(data.slug || '', data.title);
    const filePath = path.join(BLOGS_DIR, filename);
    
    try {
      await fs.access(filePath);
      return { success: false, message: '文章已存在，请使用不同的别名' };
    } catch {
      // 文件不存在，可以创建
    }
    
    const date = data.date || new Date().toISOString().split('T')[0];
    const excerpt = data.excerpt || data.content.substring(0, 150);
    
    const frontmatter = generateFrontmatter({
      title: data.title,
      date: date,
      category: data.category,
      tags: data.tags || [],
      excerpt: excerpt,
      coverImage: data.coverImage || '',
      hidden: data.hidden || false,
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
      hidden: data.hidden || false,
      filePath: filePath,
    };
    
    return { success: true, message: '文章创建成功', data: blog, filePath };
  } catch (error) {
    console.error('创建博客失败:', error);
    return { success: false, message: '创建文章失败' };
  }
}

async function updateBlogReal(id: string, data: Partial<BlogPostData>): Promise<ActionResult<BlogPost>> {
  if (!fs || !path || !revalidatePath) return { success: false, message: '文件系统不可用' };
  
  try {
    const existingResult = await getBlogDetailReal(id);
    if (!existingResult.success || !existingResult.data) {
      return { success: false, message: '文章不存在' };
    }
    
    const existingBlog = existingResult.data;
    
    const oldFilePath = path.join(BLOGS_DIR, `${id}.md`);
    
    const updatedData: BlogPostData = {
      title: data.title ?? existingBlog.title,
      content: data.content ?? existingBlog.content,
      date: data.date ?? existingBlog.date,
      category: data.category ?? existingBlog.category,
      tags: data.tags ?? existingBlog.tags,
      excerpt: data.excerpt ?? existingBlog.excerpt,
      coverImage: data.coverImage ?? existingBlog.coverImage,
      slug: data.slug ?? existingBlog.slug,
      hidden: data.hidden ?? existingBlog.hidden,
    };
    
    const updatedAt = new Date().toISOString().split('T')[0];
    
    const frontmatter = generateFrontmatter({
      title: updatedData.title,
      date: updatedData.date,
      updatedAt: updatedAt,
      category: updatedData.category,
      tags: updatedData.tags || [],
      excerpt: updatedData.excerpt || updatedData.content?.substring(0, 150) || '',
      coverImage: updatedData.coverImage || '',
      hidden: updatedData.hidden || false,
    });
    
    const markdownContent = frontmatter + '\n' + (updatedData.content || '');
    
    let newFilePath = oldFilePath;
    if (data.slug && data.slug !== id) {
      const newFilename = generateFilename(data.slug, updatedData.title);
      newFilePath = path.join(BLOGS_DIR, newFilename);
      
      if (newFilePath !== oldFilePath) {
        try {
          await fs.access(newFilePath);
          return { success: false, message: '目标文件名已存在' };
        } catch {
          // 文件不存在，可以重命名
        }
      }
    }
    
    await fs.writeFile(newFilePath, markdownContent, 'utf-8');
    
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
      hidden: updatedData.hidden || false,
      filePath: newFilePath,
    };
    
    return { success: true, message: '文章更新成功', data: blog };
  } catch (error) {
    console.error('更新博客失败:', error);
    return { success: false, message: '更新文章失败' };
  }
}

async function deleteBlogReal(id: string): Promise<ActionResult> {
  if (!fs || !path || !revalidatePath) return { success: false, message: '文件系统不可用' };
  
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

async function batchDeleteBlogsReal(ids: string[]): Promise<ActionResult> {
  let deletedCount = 0;
  let failedCount = 0;
  
  for (const id of ids) {
    const result = await deleteBlogReal(id);
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
}

async function batchUpdateBlogCategoryReal(ids: string[], category: string): Promise<ActionResult> {
  let updatedCount = 0;
  let failedCount = 0;
  
  for (const id of ids) {
    const result = await updateBlogReal(id, { category });
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
}

async function getBlogCategoriesReal(): Promise<string[]> {
  try {
    const blogs = await getBlogListReal();
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

async function saveBlogMarkdownReal(slug: string, content: string): Promise<ActionResult> {
  if (!fs || !path || !revalidatePath) return { success: false, message: '文件系统不可用' };
  
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

async function toggleBlogHiddenReal(id: string): Promise<ActionResult<BlogPost>> {
  try {
    const existingResult = await getBlogDetailReal(id);
    if (!existingResult.success || !existingResult.data) {
      return { success: false, message: '文章不存在' };
    }
    
    const existingBlog = existingResult.data;
    const newHiddenStatus = !existingBlog.hidden;
    
    const updateResult = await updateBlogReal(id, { hidden: newHiddenStatus });
    
    if (!updateResult.success) {
      return { success: false, message: '切换隐藏状态失败' };
    }
    
    return {
      success: true,
      message: newHiddenStatus ? '文章已隐藏' : '文章已显示',
      data: updateResult.data,
    };
  } catch (error) {
    console.error('切换文章隐藏状态失败:', error);
    return { success: false, message: '切换隐藏状态失败' };
  }
}

async function batchToggleBlogHiddenReal(ids: string[], hidden: boolean): Promise<ActionResult> {
  let successCount = 0;
  let failedCount = 0;
  
  for (const id of ids) {
    const result = await updateBlogReal(id, { hidden });
    if (result.success) {
      successCount++;
    } else {
      failedCount++;
    }
  }
  
  if (failedCount > 0) {
    return {
      success: true,
      message: hidden
        ? `成功隐藏 ${successCount} 篇文章，${failedCount} 篇操作失败`
        : `成功显示 ${successCount} 篇文章，${failedCount} 篇操作失败`,
    };
  }
  
  return {
    success: true,
    message: hidden
      ? `成功隐藏 ${successCount} 篇文章`
      : `成功显示 ${successCount} 篇文章`,
  };
}

// ============================================
// 导出函数：根据环境选择实现
// ============================================

export async function getBlogList(): Promise<BlogPost[]> {
  if (isStaticExport) {
    return getBlogListStatic();
  }
  return getBlogListReal();
}

export async function getBlogDetail(id: string): Promise<ActionResult<BlogPost>> {
  if (isStaticExport) {
    return getBlogDetailStatic(id);
  }
  return getBlogDetailReal(id);
}

export async function createBlog(data: BlogPostData): Promise<ActionResult<BlogPost>> {
  if (isStaticExport) {
    return createBlogStatic(data);
  }
  return createBlogReal(data);
}

export async function updateBlog(id: string, data: Partial<BlogPostData>): Promise<ActionResult<BlogPost>> {
  if (isStaticExport) {
    return updateBlogStatic(id, data);
  }
  return updateBlogReal(id, data);
}

export async function deleteBlog(id: string): Promise<ActionResult> {
  if (isStaticExport) {
    return deleteBlogStatic(id);
  }
  return deleteBlogReal(id);
}

export async function batchDeleteBlogs(ids: string[]): Promise<ActionResult> {
  if (isStaticExport) {
    return batchDeleteBlogsStatic(ids);
  }
  return batchDeleteBlogsReal(ids);
}

export async function batchUpdateBlogCategory(ids: string[], category: string): Promise<ActionResult> {
  if (isStaticExport) {
    return batchUpdateBlogCategoryStatic(ids, category);
  }
  return batchUpdateBlogCategoryReal(ids, category);
}

export async function getBlogCategories(): Promise<string[]> {
  if (isStaticExport) {
    return getBlogCategoriesStatic();
  }
  return getBlogCategoriesReal();
}

export async function saveBlogMarkdown(slug: string, content: string): Promise<ActionResult> {
  if (isStaticExport) {
    return saveBlogMarkdownStatic(slug, content);
  }
  return saveBlogMarkdownReal(slug, content);
}

export async function toggleBlogHidden(id: string): Promise<ActionResult<BlogPost>> {
  if (isStaticExport) {
    return toggleBlogHiddenStatic(id);
  }
  return toggleBlogHiddenReal(id);
}

export async function batchToggleBlogHidden(ids: string[], hidden: boolean): Promise<ActionResult> {
  if (isStaticExport) {
    return batchToggleBlogHiddenStatic(ids, hidden);
  }
  return batchToggleBlogHiddenReal(ids, hidden);
}
