import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import ClientBlogDetail from '@/app/blogs/[slug]/ClientBlogDetail';
import 'highlight.js/styles/github-dark.css';
import { formatBlogDate, calculateReadingTime } from '@/lib/utils';
import { notFound } from 'next/navigation';

/**
 * 博客详情页面的 Props 接口
 * 
 * @interface BlogDetailPageProps
 * @property params - 包含路由参数的 Promise 对象
 * @property params.slug - 博客文章的唯一标识符
 */
interface BlogDetailPageProps {
  params: Promise<{
    slug: string;
  }>;
}

/**
 * 博客文章数据结构接口
 * 
 * @interface BlogPost
 * @property title - 文章标题
 * @property date - 发布日期
 * @property category - 文章分类
 * @property tags - 文章标签数组
 * @property readTime - 预估阅读时间（分钟）
 * @property excerpt - 文章摘要
 * @property content - 文章正文内容（Markdown 格式）
 * @property slug - 文章的唯一标识符
 */
interface BlogPost {
  title: string;
  date: string;
  category: string;
  tags: string[];
  readTime: number;
  excerpt: string;
  content: string;
  slug: string;
  reference?: Array<{description: string; link: string}>;
}

/**
 * Markdown 文件前置元数据（Front Matter）的类型定义
 * 用于 gray-matter 解析 Markdown 文件头部的 YAML 数据
 * 
 * @interface BlogFrontMatter
 * @property title - 可选的文章标题
 * @property date - 可选的发布日期
 * @property category - 可选的文章分类
 * @property tags - 可选的文章标签数组
 * @property readTime - 可选的预估阅读时间
 * @property excerpt - 可选的文章摘要
 * @property [key: string] - 允许其他未知属性的索引签名
 */
interface BlogFrontMatter {
  title?: string;
  date?: string;
  category?: string;
  tags?: string[];
  readTime?: number;
  excerpt?: string;
  reference?: Array<{description: string; link: string}>;
  [key: string]: any; // 允许其他未知属性
}

/**
 * 递归查找指定 slug 对应的 .md 文件
 * 
 * @param dir - 要搜索的目录
 * @param baseDir - 基础目录，用于计算相对路径
 * @param targetSlug - 目标 slug
 * @returns 找到的文件信息或 null
 */
function findMarkdownFileBySlug(dir: string, baseDir: string, targetSlug: string): {filePath: string, relativePath: string} | null {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // 递归搜索子目录
        const result = findMarkdownFileBySlug(itemPath, baseDir, targetSlug);
        if (result) return result;
      } else if (item.endsWith('.md')) {
        // 检查这个文件是否匹配目标 slug
        const relativePath = path.relative(baseDir, itemPath);
        const fileSlug = relativePath.replace(/\.md$/, '').replace(/[\/\\]/g, '-');
        
        if (fileSlug === targetSlug) {
          return {
            filePath: itemPath,
            relativePath
          };
        }
      }
    }
  } catch (error) {
    console.error(`Error searching directory ${dir}:`, error);
  }
  
  return null;
}

/**
 * 根据 slug 获取博客文章内容
 * 
 * 支持深层嵌套的单文件模式：
 * - 递归搜索 /content/blogs 目录下的所有 .md 文件
 * - 支持任意深度的文件夹嵌套
 * - 基于路径生成的 slug 进行匹配
 * - 支持外部图片引用（相对路径和绝对路径）
 * 
 * 标题处理逻辑：
 * - 如果元数据中有 title，使用元数据中的 title
 * - 如果没有 title，使用文件名（去除 .md 扩展名）作为标题
 * 
 * @param slug - 博客文章的唯一标识符（基于路径生成）
 * @returns Promise<BlogPost | null> - 返回博客文章数据或 null（如果文章不存在）
 */
async function getBlogContent(slug: string): Promise<BlogPost | null> {
  try {
    const contentDir = path.join(process.cwd(), 'src/content/blogs');
    
    // 查找匹配 slug 的 .md 文件
    const fileInfo = findMarkdownFileBySlug(contentDir, contentDir, slug);
    
    if (!fileInfo) {
      return null;
    }
    
    const { filePath } = fileInfo;
    
    // 读取文件内容，使用 UTF-8 编码处理中文
    const fileContent = fs.readFileSync(filePath, 'utf8');
    let { data, content } = matter(fileContent);
    
    // 类型断言，确保 data 符合 BlogFrontMatter 接口
    const frontMatter = data as BlogFrontMatter;
    
    // 处理图片路径 - 将所有相对路径图片指向 public 目录
    content = content.replace(
      /!\[([^\]]*)\]\((?!https?:\/\/)([^)]+)\)/g,
      (match, alt, src: string) => {
        // 如果是相对路径，转换为 public 目录路径
        if (src.startsWith('./') || src.startsWith('../') || (!src.startsWith('/') && !src.startsWith('http'))) {
          // 处理相对路径，统一指向 public 目录
          let publicPath = src;
          
          // 移除相对路径前缀
          if (src.startsWith('./')) {
            publicPath = src.substring(2);
          } else if (src.startsWith('../')) {
            // 处理 ../assets/example.svg 这样的路径
            publicPath = src.replace(/^\.\.\//, '');
          }
          
          // 确保路径以 / 开头
          if (!publicPath.startsWith('/')) {
            publicPath = '/' + publicPath;
          }
          
          return `![${alt}](${publicPath})`;
        }
        
        // 保持原始路径（绝对路径或外部链接）
        return match;
      }
    );
    
    // 标题处理：优先使用元数据中的 title，否则使用文件名
    const fileName = path.basename(filePath, '.md');
    const title = frontMatter.title || fileName;
    
    // 自动计算阅读时长，如果元数据中已有readTime则优先使用
    const readTime = frontMatter.readTime || calculateReadingTime(content);
    
    return {
      title: title,
      date: formatBlogDate(frontMatter.date),
      category: frontMatter.category || '其他',
      tags: frontMatter.tags || [],
      readTime: readTime,
      excerpt: frontMatter.excerpt || '',
      content: content,
      slug: slug,
      reference: frontMatter.reference
    };
  } catch (error) {
    console.error('Error reading blog content:', error);
    return null;
  }
}

/**
 * 博客详情页面组件（服务端组件）
 * 
 * 功能特点：
 * - 支持动态路由，根据 slug 参数显示对应的博客文章
 * - 在服务端读取 Markdown 文件内容
 * - 将数据传递给客户端组件进行渲染
 * 
 * @param params - 包含 slug 参数的对象
 * @returns 渲染的博客详情页面
 */
export default async function BlogDetailPage({ params }: BlogDetailPageProps) {
  // 在服务端获取博客内容
   const resolvedParams = await params;
   
   // Next.js 已经自动解码了URL参数，但为了安全起见，我们尝试解码
   let decodedSlug: string;
   try {
     // 检查是否需要解码（如果包含%字符，说明可能是编码的）
     if (resolvedParams.slug.includes('%')) {
       decodedSlug = decodeURIComponent(resolvedParams.slug);
     } else {
       decodedSlug = resolvedParams.slug;
     }
   } catch {
     decodedSlug = resolvedParams.slug;
   }
  
  const blogData = await getBlogContent(decodedSlug);
  
  if (!blogData) {
    notFound();
  }
  
  return <ClientBlogDetail blog={blogData} />;
}

// 禁用动态参数，只允许预生成的路由
export const dynamicParams = false;

/**
 * 生成静态参数函数
 * 用于静态导出时预生成所有博客文章的路由参数
 * 
 * @returns 包含所有博客文章 slug 的参数数组
 */
export async function generateStaticParams() {
  try {
    const contentDir = path.join(process.cwd(), 'src/content/blogs');
    
    if (!fs.existsSync(contentDir)) {
      return [];
    }
    
    // 递归扫描所有 .md 文件
    const markdownFiles = scanMarkdownFiles(contentDir, contentDir);
    
    return markdownFiles.map(({ slug }) => ({
      slug: slug  // 不需要在这里编码，Next.js会自动处理
    }));
  } catch (error) {
    console.error('Error generating static params:', error);
    return [];
  }
}

/**
 * 递归扫描目录中的 Markdown 文件
 * 
 * @param dir - 要扫描的目录路径
 * @param baseDir - 基础目录路径，用于计算相对路径
 * @returns 包含文件路径、相对路径和 slug 的对象数组
 */
function scanMarkdownFiles(dir: string, baseDir: string): Array<{
  filePath: string;
  relativePath: string;
  slug: string;
}> {
  const results: Array<{
    filePath: string;
    relativePath: string;
    slug: string;
  }> = [];
  
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