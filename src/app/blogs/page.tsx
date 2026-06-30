import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { formatBlogDate, calculateReadingTime } from '@/utils';
import { getBlogTotalWordCount } from '@/utils/momentsUtils';
import ClientBlogsPage from './ClientBlogsPage';

/**
 * 博客文章接口
 */
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  tags: string[];
  slug: string;
  readTime: number;
  coverImage?: string;
  pinned?: boolean;
  pinnedAt?: string;
  hidden?: boolean;  // 是否隐藏该文章，用于前台过滤
}

/**
 * 博客前置元数据接口
 */
interface BlogFrontMatter {
  title?: string;
  excerpt?: string;
  date?: string;
  category?: string;
  tags?: string[];
  readTime?: number;
  coverImage?: string;
  pinned?: boolean;
  pinnedAt?: string;
  hidden?: boolean | string;  // 是否隐藏该文章，支持布尔值或字符串，用于前台过滤
}

/**
 * 递归扫描目录中的所有 .md 文件
 * 
 * @param dir - 要扫描的目录路径
 * @param baseDir - 基础目录路径，用于计算相对路径
 * @returns 包含所有 .md 文件信息的数组
 */
function scanMarkdownFiles(dir: string, baseDir: string): Array<{filePath: string, relativePath: string, slug: string}> {
  const results: Array<{filePath: string, relativePath: string, slug: string}> = [];
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // 递归扫描子目录
        results.push(...scanMarkdownFiles(itemPath, baseDir));
      } else if (item.endsWith('.md')) {
        // 找到 .md 文件
        const relativePath = path.relative(baseDir, itemPath);
        // 生成 slug：使用相对路径，去除 .md 扩展名，将路径分隔符替换为连字符
        const slug = relativePath.replace(/\.md$/, '').replace(/[\/\\]/g, '-');
        
        results.push({
          filePath: itemPath,
          relativePath,
          slug
        });
      }
    });
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
  
  return results;
}

/**
 * 获取所有博客文章
 * 
 * 支持深层嵌套的单文件模式：
 * - 递归扫描 /content/blogs 目录下的所有 .md 文件
 * - 支持任意深度的文件夹嵌套
 * - 自动生成基于路径的 slug
 * - 支持外部图片引用
 * 
 * 标题处理逻辑：
 * - 如果元数据中有 title，使用元数据中的 title
 * - 如果没有 title，使用文件名（去除 .md 扩展名）作为标题
 */
function getAllBlogs(): BlogPost[] {
  try {
    const contentDir = path.join(process.cwd(), 'src/content/blogs');
    
    if (!fs.existsSync(contentDir)) {
      return [];
    }
    
    // 递归扫描所有 .md 文件
    const markdownFiles = scanMarkdownFiles(contentDir, contentDir);
    const blogPosts: BlogPost[] = [];
    
    markdownFiles.forEach(({ filePath, relativePath, slug }) => {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContent);
        const frontMatter = data as BlogFrontMatter;
        
        // 标题处理：优先使用元数据中的 title，否则使用文件名
        const fileName = path.basename(filePath, '.md');
        const title = frontMatter.title || fileName;
        
        // 获取文章内容用于计算阅读时长
        const { content } = matter(fileContent);
        
        // 自动计算阅读时长，如果元数据中已有readTime则优先使用
        const readTime = frontMatter.readTime || calculateReadingTime(content);
        
        blogPosts.push({
          id: slug,
          title: title,
          excerpt: frontMatter.excerpt || '',
          date: formatBlogDate(frontMatter.date),
          category: frontMatter.category || '其他',
          tags: frontMatter.tags || [],
          slug: slug,
          readTime: readTime,
          coverImage: frontMatter.coverImage,
          pinned: frontMatter.pinned || false,
          pinnedAt: frontMatter.pinnedAt ? formatBlogDate(frontMatter.pinnedAt) : undefined,
          // 解析 hidden 属性：支持布尔值或字符串 'true'
          hidden: frontMatter.hidden === true || frontMatter.hidden === 'true'
        });
      } catch (error) {
        console.error(`Error reading blog file ${relativePath}:`, error);
      }
    });
    
    // 过滤隐藏的文章：只返回 hidden 为 false 或未设置的文章
    // 这样可以确保 GitHub Pages 静态部署时不会显示隐藏的内容
    const filteredPosts = blogPosts.filter(post => !post.hidden);
    
    // 排序：置顶文章优先，然后按日期排序（最新的在前）
    return filteredPosts.sort((a, b) => {
      // 置顶文章优先
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      
      // 都是置顶文章，按置顶时间倒序
      if (a.pinned && b.pinned) {
        const aPinnedTime = a.pinnedAt || a.date;
        const bPinnedTime = b.pinnedAt || b.date;
        return new Date(bPinnedTime).getTime() - new Date(aPinnedTime).getTime();
      }
      
      // 都是普通文章，按日期排序
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  } catch (error) {
    console.error('Error getting all blogs:', error);
    return [];
  }
}

/**
 * 计算标签统计
 * @param blogPosts 博客文章列表
 * @returns 标签总数
 */
function calculateTagCount(blogPosts: BlogPost[]): number {
  const tags = new Set<string>();
  
  blogPosts.forEach(blog => {
    if (blog.tags && Array.isArray(blog.tags)) {
      blog.tags.forEach(tag => {
        tags.add(tag);
      });
    }
  });
  
  return tags.size;
}

/**
 * 博客列表页面（服务端组件）
 * 获取博客数据并传递给客户端组件
 */
export default async function BlogsPage() {
  // 获取博客数据
  const blogPosts = getAllBlogs();
  // 获取博客总字数
  const blogTotalWordCount = getBlogTotalWordCount();
  // 计算标签总数
  const tagCount = calculateTagCount(blogPosts);
  
  return <ClientBlogsPage 
    initialPosts={blogPosts} 
    blogTotalWordCount={blogTotalWordCount}
    tagCount={tagCount}
  />;
}