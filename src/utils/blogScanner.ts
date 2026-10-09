// 博客内容扫描与构建期站点路径工具
// 供 sitemap.ts 与 rss.xml/route.ts 在构建期共用，避免重复实现扫描逻辑
// 注意：本模块仅限 Node 构建环境使用（依赖 fs/path），不可在浏览器端引入

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * 博客文章前置元数据接口
 * 汇总了 sitemap 与 RSS 两个场景所需的全部字段
 */
export interface BlogFrontMatter {
  title?: string;
  date?: string;
  updatedAt?: string;
  category?: string;
  author?: string;
  tags?: string[];
  excerpt?: string;
  coverImage?: string;
  hidden?: boolean;
}

/**
 * 扫描结果条目
 */
export interface ScannedBlog {
  /** 文件在磁盘上的绝对路径（构建期读取附件信息用） */
  filePath: string;
  /** 文章标识：相对路径去除 .md 扩展名后，路径分隔符替换为连字符 */
  slug: string;
  /** 解析后的前置元数据 */
  frontMatter: BlogFrontMatter;
  /** 正文（frontmatter 之后的 Markdown 原文） */
  content: string;
}

/**
 * 站点基础 URL（与部署环境变量保持一致）
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blog.xinchengp.cn';

/**
 * 获取构建期基础路径
 * 判定逻辑与 next.config.ts 的静态导出配置保持一致：
 * 自定义域名模式下 basePath 为空；GitHub Pages 默认域名模式下取 NEXT_PUBLIC_BASE_PATH
 */
function getBuildBasePath(): string {
  const isCustomDomain = String(process.env.CUSTOM_DOMAIN).toLowerCase() === 'true';
  return isCustomDomain ? '' : process.env.NEXT_PUBLIC_BASE_PATH || '';
}

/**
 * 拼接可公开访问的完整绝对地址
 * 自动附加构建期 basePath，兼容 GitHub Pages 子路径部署
 *
 * @param sitePath - 以 / 开头的站点根相对路径（页面路径或 public 资源路径均可）
 * @returns 完整绝对 URL，例如 https://blog.xinchengp.cn/blogs/xxx/
 */
export function siteUrl(sitePath: string): string {
  const basePath = getBuildBasePath();
  const cleanPath = sitePath.startsWith('/') ? sitePath : `/${sitePath}`;
  return `${SITE_URL}${basePath}${cleanPath}`;
}

/**
 * 递归扫描目录中的所有 .md 文件，并解析 frontmatter 与正文
 * 单个文件读取失败仅记录错误并跳过，不中断整体扫描
 *
 * @param dir - 要扫描的目录路径
 * @param baseDir - 基础目录路径，用于计算相对路径生成 slug
 * @returns 包含所有 .md 文件信息的数组
 */
export function scanMarkdownFiles(dir: string, baseDir: string): ScannedBlog[] {
  const results: ScannedBlog[] = [];

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // 递归扫描子目录
        results.push(...scanMarkdownFiles(itemPath, baseDir));
      } else if (item.endsWith('.md')) {
        // 生成 slug：去除 .md 扩展名，将路径分隔符统一替换为连字符
        const relativePath = path.relative(baseDir, itemPath);
        const slug = relativePath.replace(/\.md$/, '').replace(/[\/\\]/g, '-');

        try {
          const fileContent = fs.readFileSync(itemPath, 'utf8');
          const { data, content } = matter(fileContent);
          results.push({
            filePath: itemPath,
            slug,
            frontMatter: data as BlogFrontMatter,
            content,
          });
        } catch (error) {
          console.error(`读取博客文件 ${itemPath} 时出错:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`扫描目录 ${dir} 时出错:`, error);
  }

  return results;
}
