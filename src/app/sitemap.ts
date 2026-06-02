import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

/**
 * 静态导出配置
 * 用于支持 output: export 模式
 */
export const dynamic = 'force-static';

/**
 * 站点基础URL配置
 * 根据部署环境自动选择正确的域名
 */
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blog.xinchengp.cn';

/**
 * 博客文章前置元数据接口
 */
interface BlogFrontMatter {
  title?: string;
  date?: string;
  updatedAt?: string;
  hidden?: boolean;
}

/**
 * 递归扫描目录中的所有 .md 文件
 *
 * @param dir - 要扫描的目录路径
 * @param baseDir - 基础目录路径，用于计算相对路径
 * @returns 包含所有 .md 文件信息的数组
 */
function scanMarkdownFiles(dir: string, baseDir: string): Array<{ filePath: string; relativePath: string; slug: string }> {
  const results: Array<{ filePath: string; relativePath: string; slug: string }> = [];

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // 递归扫描子目录
        const subResults = scanMarkdownFiles(itemPath, baseDir);
        results.push(...subResults);
      } else if (item.endsWith('.md')) {
        // 找到 .md 文件
        const relativePath = path.relative(baseDir, itemPath);
        // 生成 slug：使用相对路径，去除 .md 扩展名，将路径分隔符替换为连字符
        const slug = relativePath.replace(/\.md$/, '').replace(/[\/\\]/g, '-');

        results.push({
          filePath: itemPath,
          relativePath,
          slug,
        });
      }
    }
  } catch (error) {
    console.error(`扫描目录 ${dir} 时出错:`, error);
  }

  return results;
}

/**
 * 获取所有博客文章的站点地图条目
 *
 * @returns 博客文章的站点地图条目数组
 */
function getBlogSitemapEntries(): MetadataRoute.Sitemap {
  try {
    const contentDir = path.join(process.cwd(), 'src/content/blogs');

    if (!fs.existsSync(contentDir)) {
      return [];
    }

    // 递归扫描所有 .md 文件
    const markdownFiles = scanMarkdownFiles(contentDir, contentDir);
    const entries: MetadataRoute.Sitemap = [];

    for (const { filePath, slug } of markdownFiles) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContent);
        const frontMatter = data as BlogFrontMatter;

        // 跳过隐藏的博客文章
        if (frontMatter.hidden === true) {
          continue;
        }

        // 解析日期
        const dateStr = frontMatter.updatedAt || frontMatter.date;
        const lastModified = dateStr ? new Date(dateStr) : new Date();

        entries.push({
          url: `${BASE_URL}/blogs/${slug}/`,
          lastModified,
          changeFrequency: 'weekly',
          priority: 0.8,
        });
      } catch (error) {
        console.error(`读取博客文件 ${filePath} 时出错:`, error);
      }
    }

    return entries;
  } catch (error) {
    console.error('获取博客站点地图条目时出错:', error);
    return [];
  }
}

/**
 * 获取所有个人动态的站点地图条目
 *
 * @returns 个人动态的站点地图条目数组
 */
function getMomentsSitemapEntries(): MetadataRoute.Sitemap {
  try {
    const momentsDir = path.join(process.cwd(), 'src/content/moments');

    if (!fs.existsSync(momentsDir)) {
      return [];
    }

    const entries: MetadataRoute.Sitemap = [];
    const files = fs.readdirSync(momentsDir).filter(file => file.endsWith('.md'));

    for (const file of files) {
      try {
        const filePath = path.join(momentsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContent);

        // 解析日期
        const dateStr = data.time || data.date;
        const lastModified = dateStr ? new Date(dateStr) : new Date();

        entries.push({
          url: `${BASE_URL}/moments/`,
          lastModified,
          changeFrequency: 'daily',
          priority: 0.6,
        });

        // 只添加一次动态页面URL即可，因为所有动态都在同一个页面展示
        break;
      } catch (error) {
        console.error(`读取动态文件 ${file} 时出错:`, error);
      }
    }

    return entries;
  } catch (error) {
    console.error('获取动态站点地图条目时出错:', error);
    return [];
  }
}

/**
 * 获取更新日志的站点地图条目
 *
 * @returns 更新日志的站点地图条目数组
 */
function getChangelogsSitemapEntries(): MetadataRoute.Sitemap {
  try {
    const changelogsDir = path.join(process.cwd(), 'src/content/changelogs');

    if (!fs.existsSync(changelogsDir)) {
      return [];
    }

    const entries: MetadataRoute.Sitemap = [];
    const files = fs.readdirSync(changelogsDir).filter(file => file.endsWith('.md'));

    // 获取最新的更新日志日期
    let latestDate = new Date(0);

    for (const file of files) {
      try {
        const filePath = path.join(changelogsDir, file);
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data } = matter(fileContent);

        const dateStr = data.date;
        if (dateStr) {
          const date = new Date(dateStr);
          if (date > latestDate) {
            latestDate = date;
          }
        }
      } catch (error) {
        console.error(`读取更新日志文件 ${file} 时出错:`, error);
      }
    }

    // 添加更新日志页面
    entries.push({
      url: `${BASE_URL}/changelogs/`,
      lastModified: latestDate > new Date(0) ? latestDate : new Date(),
      changeFrequency: 'daily',
      priority: 0.5,
    });

    return entries;
  } catch (error) {
    console.error('获取更新日志站点地图条目时出错:', error);
    return [];
  }
}

/**
 * 生成站点地图
 *
 * 功能说明：
 * 1. 自动生成所有页面的站点地图
 * 2. 包含博客文章、个人动态、更新日志等动态内容
 * 3. 支持静态导出模式，适用于 GitHub Pages 部署
 * 4. 自动提取文章更新日期作为 lastModified
 *
 * @returns 站点地图数组
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // 基础页面
  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/blogs/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/archive/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/gallery/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/moments/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/changelogs/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/about/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/friends/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/guestbook/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/links/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/tools/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/tools/pinyin-converter/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/tools/markdown-editor/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/tools/roco-team/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${BASE_URL}/settings/`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // 合并所有条目
  return [
    ...baseEntries,
    ...getBlogSitemapEntries(),
    ...getMomentsSitemapEntries(),
    ...getChangelogsSitemapEntries(),
  ];
}
