import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { formatBlogDate } from '@/utils';
import ClientArchivePage from '@/components/archive/ClientArchivePage';
import type { Metadata } from 'next';

/**
 * 归档页面 SEO 元数据配置
 *
 * 功能说明：
 * 1. 设置独立的页面标题和描述，利于搜索引擎收录
 * 2. 配置 Open Graph 和 Twitter Card 用于社交媒体分享
 * 3. 设置规范URL避免重复内容问题
 */
export const metadata: Metadata = {
  /**
   * 页面标题
   * 使用模板格式：文章归档 | 心想事成的个人博客
   */
  title: '文章归档',

  /**
   * 页面描述
   * 用于搜索引擎结果页展示
   */
  description: '浏览心想事成的所有博客文章，按年份和月份归档整理。包含技术分享、生活随笔、洛天依相关内容等多种分类。',

  /**
   * 关键词
   * 帮助搜索引擎理解页面内容
   */
  keywords: ['文章归档', '博客归档', '历史文章', '心想事成', '技术博客'],

  /**
   * Open Graph 配置
   * 用于社交媒体分享
   */
  openGraph: {
    title: '文章归档 | 心想事成的个人博客',
    description: '浏览心想事成的所有博客文章，按年份和月份归档整理。',
    type: 'website',
  },

  /**
   * Twitter Card 配置
   */
  twitter: {
    card: 'summary',
    title: '文章归档 | 心想事成的个人博客',
    description: '浏览心想事成的所有博客文章，按年份和月份归档整理。',
  },
};

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
  year: number; // 添加年份字段用于归档
  month: number; // 添加月份字段用于归档
  day: number; // 添加日期字段用于归档
  pinned?: boolean;
  pinnedAt?: string;
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
  pinned?: boolean;
  pinnedAt?: string;
  hidden?: boolean;
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
 * 获取所有博客文章并按年份->月份->日期归档
 * 
 * @returns 按年份->月份->日期层级归档的博客文章
 */
function getArchivedBlogs(): { [year: number]: { [month: number]: { [day: number]: BlogPost[] } } } {
  try {
    const contentDir = path.join(process.cwd(), 'src/content/blogs');
    
    if (!fs.existsSync(contentDir)) {
      return {};
    }
    
    // 递归扫描所有 .md 文件
    const markdownFiles = scanMarkdownFiles(contentDir, contentDir);
    const blogPosts: BlogPost[] = [];
    
    markdownFiles.forEach(({ filePath, relativePath, slug }) => {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContent);
        const frontMatter = data as BlogFrontMatter;

        // 跳过隐藏的博客文章
        if (frontMatter.hidden === true) {
          return;
        }

        // 标题处理：优先使用元数据中的 title，否则使用文件名
        const fileName = path.basename(filePath, '.md');
        const title = frontMatter.title || fileName;
        
        // 解析日期，获取年份、月份、日期
        const dateStr = frontMatter.date || '';
        const date = dateStr ? new Date(dateStr) : new Date();
        const year = date.getFullYear();
        const month = date.getMonth() + 1; // 月份从0开始，转为1-12
        const day = date.getDate();
        
        blogPosts.push({
          id: slug,
          title: title,
          excerpt: frontMatter.excerpt || '',
          date: formatBlogDate(frontMatter.date),
          category: frontMatter.category || '其他',
          tags: frontMatter.tags || [],
          slug: slug,
          readTime: frontMatter.readTime || 5,
          year: year,
          month: month,
          day: day,
          pinned: frontMatter.pinned || false,
          pinnedAt: frontMatter.pinnedAt ? formatBlogDate(frontMatter.pinnedAt) : undefined
        });
      } catch (error) {
        console.error(`Error reading blog file ${relativePath}:`, error);
      }
    });
    
    // 按日期排序（最新的在前）
    const sortedPosts = blogPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // 按年份->月份->日期归档
    const archivedPosts: { [year: number]: { [month: number]: { [day: number]: BlogPost[] } } } = {};
    
    sortedPosts.forEach(post => {
      // 初始化年份层级
      if (!archivedPosts[post.year]) {
        archivedPosts[post.year] = {};
      }
      
      // 初始化月份层级
      if (!archivedPosts[post.year][post.month]) {
        archivedPosts[post.year][post.month] = {};
      }
      
      // 初始化日期层级
      if (!archivedPosts[post.year][post.month][post.day]) {
        archivedPosts[post.year][post.month][post.day] = [];
      }
      
      // 添加文章到对应的日期层级
      archivedPosts[post.year][post.month][post.day].push(post);
    });
    
    return archivedPosts;
  } catch (error) {
    console.error('Error getting archived blogs:', error);
    return {};
  }
}

/**
 * 归档页面组件
 * 获取按年份归档的博客文章数据
 */
export default async function ArchivePage() {
  // 获取归档博客数据
  const archivedPosts = getArchivedBlogs();
  
  return <ClientArchivePage archivedPosts={archivedPosts} />;
}