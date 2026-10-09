import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
// 复用公共的博客扫描与站点地址工具，替代原先与 RSS 路由重复的实现
import { siteUrl, scanMarkdownFiles } from '@/utils/blogScanner';

/**
 * 静态导出配置
 * 用于支持 output: export 模式
 */
export const dynamic = 'force-static';

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

    const entries: MetadataRoute.Sitemap = [];

    // 递归扫描所有 .md 文件（扫描与 frontmatter 解析已统一收敛到公共模块）
    for (const { slug, frontMatter } of scanMarkdownFiles(contentDir, contentDir)) {
      // 跳过隐藏的博客文章
      if (frontMatter.hidden === true) {
        continue;
      }

      // 解析日期
      const dateStr = frontMatter.updatedAt || frontMatter.date;
      const lastModified = dateStr ? new Date(dateStr) : new Date();

      entries.push({
        url: siteUrl(`/blogs/${slug}/`),
        lastModified,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
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
          url: siteUrl('/moments/'),
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
      url: siteUrl('/changelogs/'),
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
  // 基础页面（通过 siteUrl 统一拼接，兼容 GitHub Pages 子路径部署）
  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: siteUrl('/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: siteUrl('/blogs/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: siteUrl('/archive/'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: siteUrl('/gallery/'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    {
      url: siteUrl('/moments/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: siteUrl('/changelogs/'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.5,
    },
    {
      url: siteUrl('/about/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: siteUrl('/friends/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: siteUrl('/guestbook/'),
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: siteUrl('/links/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: siteUrl('/tools/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: siteUrl('/tools/pinyin-converter/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: siteUrl('/tools/markdown-editor/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: siteUrl('/tools/roco-team/'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: siteUrl('/settings/'),
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
