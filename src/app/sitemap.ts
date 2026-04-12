/**
 * 站点地图生成模块
 * 
 * 功能说明：
 * - 自动生成博客所有页面的站点地图
 * - 包含博客文章、动态、更新日志等所有公开页面
 * - 帮助搜索引擎快速发现和索引网站内容
 * - 支持静态导出模式（GitHub Pages部署）
 * 
 * 站点地图格式遵循 Google/Baidu 标准：
 * https://www.sitemaps.org/protocol.html
 */

import { MetadataRoute } from 'next';
import { promises as fs } from 'fs';
import path from 'path';
import { parseFrontMatter } from '@/utils/frontMatterUtils';

/**
 * 站点基础配置
 * 根据部署环境自动调整基础URL
 */
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blog.xinchengp.cn';

/**
 * 博客文章元数据接口
 * 定义从 front matter 解析出的文章信息
 */
interface BlogPost {
  slug: string;           // 文章URL标识
  title: string;          // 文章标题
  date: string;           // 发布日期
  updatedAt?: string;     // 更新日期（可选）
  category?: string;      // 文章分类
  tags?: string[];        // 文章标签
  excerpt?: string;       // 文章摘要
}

/**
 * 动态元数据接口
 * 用于动态、更新日志等内容
 */
interface ContentItem {
  slug: string;           // 内容URL标识
  date: string;           // 发布日期
}

/**
 * 获取所有博客文章列表
 * 
 * 读取 src/content/blogs 目录下的所有 markdown 文件
 * 解析 front matter 获取文章元数据
 * 
 * @returns 博客文章列表，按日期倒序排列
 */
async function getBlogPosts(): Promise<BlogPost[]> {
  const blogsDir = path.join(process.cwd(), 'src', 'content', 'blogs');
  
  try {
    // 读取博客目录下的所有文件
    const files = await fs.readdir(blogsDir);
    
    // 过滤出 markdown 文件并解析
    const posts = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          const filePath = path.join(blogsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const { metadata } = parseFrontMatter(content);
          
          // 从文件名获取 slug（去掉 .md 后缀）
          const slug = file.replace('.md', '');
          
          return {
            slug,
            title: (metadata.title as string) || slug,
            date: (metadata.date as string) || new Date().toISOString(),
            updatedAt: metadata.updatedAt as string | undefined,
            category: metadata.category as string | undefined,
            tags: metadata.tags as string[] | undefined,
            excerpt: metadata.excerpt as string | undefined,
          };
        })
    );
    
    // 按发布日期倒序排列（最新的在前）
    return posts.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    // 如果目录不存在或读取失败，返回空数组
    console.error('读取博客文章失败:', error);
    return [];
  }
}

/**
 * 获取所有动态（Moments）列表
 * 
 * 读取 src/content/moments 目录下的所有 markdown 文件
 * 
 * @returns 动态列表
 */
async function getMoments(): Promise<ContentItem[]> {
  const momentsDir = path.join(process.cwd(), 'src', 'content', 'moments');
  
  try {
    const files = await fs.readdir(momentsDir);
    
    const moments = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          const filePath = path.join(momentsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const { metadata } = parseFrontMatter(content);
          
          const slug = file.replace('.md', '');
          
          return {
            slug,
            date: (metadata.date as string) || new Date().toISOString(),
          };
        })
    );
    
    return moments.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error('读取动态失败:', error);
    return [];
  }
}

/**
 * 获取所有更新日志列表
 * 
 * 读取 src/content/changelogs 目录下的所有 markdown 文件
 * 
 * @returns 更新日志列表
 */
async function getChangelogs(): Promise<ContentItem[]> {
  const changelogsDir = path.join(process.cwd(), 'src', 'content', 'changelogs');
  
  try {
    const files = await fs.readdir(changelogsDir);
    
    const changelogs = await Promise.all(
      files
        .filter(file => file.endsWith('.md'))
        .map(async (file) => {
          const filePath = path.join(changelogsDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          const { metadata } = parseFrontMatter(content);
          
          const slug = file.replace('.md', '');
          
          return {
            slug,
            date: (metadata.date as string) || new Date().toISOString(),
          };
        })
    );
    
    return changelogs.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error('读取更新日志失败:', error);
    return [];
  }
}

/**
 * 生成站点地图
 * 
 * Next.js App Router 会自动处理这个函数
 * 在构建时生成 /sitemap.xml 文件
 * 
 * @returns 符合标准的站点地图数据
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // 获取所有内容
  const [blogPosts, moments, changelogs] = await Promise.all([
    getBlogPosts(),
    getMoments(),
    getChangelogs(),
  ]);
  
  // 当前日期，用于静态页面
  const currentDate = new Date().toISOString();
  
  /**
   * 静态页面配置
   * 
   * priority: 页面优先级（0.0 - 1.0）
   * - 首页: 1.0（最高优先级）
   * - 博客列表: 0.9
   * - 关于页面: 0.8
   * - 其他页面: 0.7
   * 
   * changeFrequency: 更新频率
   * - always: 实时更新
   * - daily: 每日更新
   * - weekly: 每周更新
   * - monthly: 每月更新
   */
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/blog/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/moments/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/changelog/`,
      lastModified: currentDate,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/about/`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/gallery/`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/music/`,
      lastModified: currentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
  ];
  
  // 生成博客文章页面
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}/`,
    lastModified: post.updatedAt || post.date,
    changeFrequency: 'monthly',
    priority: 0.8,
  }));
  
  // 生成动态页面
  const momentPages: MetadataRoute.Sitemap = moments.map((moment) => ({
    url: `${BASE_URL}/moments/${moment.slug}/`,
    lastModified: moment.date,
    changeFrequency: 'monthly',
    priority: 0.6,
  }));
  
  // 生成更新日志页面
  const changelogPages: MetadataRoute.Sitemap = changelogs.map((changelog) => ({
    url: `${BASE_URL}/changelog/${changelog.slug}/`,
    lastModified: changelog.date,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));
  
  // 合并所有页面
  return [
    ...staticPages,
    ...blogPages,
    ...momentPages,
    ...changelogPages,
  ];
}
