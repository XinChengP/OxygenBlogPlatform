import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
// 复用公共的博客扫描与站点地址工具，替代原先与 RSS 路由重复的实现
import { siteUrl, scanMarkdownFiles } from '@/utils/blogScanner';
import { isHiddenFrontMatter } from '@/utils/frontMatterUtils';

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
      // 跳过隐藏的博客文章（兼容 hidden: true 与 hidden: "true"）
      if (isHiddenFrontMatter(frontMatter.hidden)) {
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
 * 计算站点内容的最后更新时间
 *
 * 为什么需要：
 * 此前所有基础页面（首页、博客列表、归档、工具页等）的 lastModified
 * 都写成 new Date()，每次构建都会变成构建当天，但页面内容并没有变化。
 * Bing 站长准则明确要求 sitemap 提供准确的 lastmod，
 * 长期发送"假的新鲜度信号"会降低爬虫对该站点地图的信任，
 * 进而影响重新抓取的优先级。
 *
 * 处理方式：取博客、动态、更新日志三类内容中最新的日期，
 * 作为基础页面的最后更新时间。静态配置页没有独立内容文件，
 * 随站点内容一起更新即可。
 *
 * @returns 最新内容日期；站点没有任何内容时返回 null
 */
function getLatestContentDate(): Date | null {
  let latest: Date | null = null;

  // 记录较新的日期，忽略无法解析的值
  const consider = (value?: string | Date) => {
    if (!value) return;
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isNaN(date.getTime()) && (!latest || date > latest)) {
      latest = date;
    }
  };

  try {
    // 博客：优先取 updatedAt，没有则取发布日期，隐藏文章不计入
    const contentDir = path.join(process.cwd(), 'src/content/blogs');
    if (fs.existsSync(contentDir)) {
      for (const { frontMatter } of scanMarkdownFiles(contentDir, contentDir)) {
        if (isHiddenFrontMatter(frontMatter.hidden)) continue;
        consider(frontMatter.updatedAt || frontMatter.date);
      }
    }
  } catch (error) {
    console.error('统计博客最新日期时出错:', error);
  }

  try {
    // 个人动态：time 或 date
    const momentsDir = path.join(process.cwd(), 'src/content/moments');
    if (fs.existsSync(momentsDir)) {
      for (const file of fs.readdirSync(momentsDir).filter((item) => item.endsWith('.md'))) {
        try {
          const { data } = matter(fs.readFileSync(path.join(momentsDir, file), 'utf8'));
          consider(data.time || data.date);
        } catch {
          // 单个文件解析失败不影响整体统计
        }
      }
    }
  } catch (error) {
    console.error('统计动态最新日期时出错:', error);
  }

  try {
    // 更新日志：date
    const changelogsDir = path.join(process.cwd(), 'src/content/changelogs');
    if (fs.existsSync(changelogsDir)) {
      for (const file of fs.readdirSync(changelogsDir).filter((item) => item.endsWith('.md'))) {
        try {
          const { data } = matter(fs.readFileSync(path.join(changelogsDir, file), 'utf8'));
          consider(data.date);
        } catch {
          // 同上
        }
      }
    }
  } catch (error) {
    console.error('统计更新日志最新日期时出错:', error);
  }

  return latest;
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
  /*
    基础页面的 lastModified 统一使用内容最新日期：
    没有内容时（首次部署的空站）才回退到当前时间。
  */
  const latestContentDate = getLatestContentDate() ?? new Date();

  // 基础页面（通过 siteUrl 统一拼接，兼容 GitHub Pages 子路径部署）
  const baseEntries: MetadataRoute.Sitemap = [
    {
      url: siteUrl('/'),
      lastModified: latestContentDate,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: siteUrl('/blogs/'),
      lastModified: latestContentDate,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: siteUrl('/archive/'),
      lastModified: latestContentDate,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: siteUrl('/gallery/'),
      lastModified: latestContentDate,
      changeFrequency: 'weekly',
      priority: 0.6,
    },
    /*
      /moments/ 与 /changelogs/ 不在此处登记：
      下方 getMomentsSitemapEntries() / getChangelogsSitemapEntries()
      会根据最新内容日期生成条目，之前在 baseEntries 里再写一份会产生重复 URL。
    */
    {
      url: siteUrl('/study/'),
      lastModified: latestContentDate,
      changeFrequency: 'daily',
      priority: 0.6,
    },
    {
      url: siteUrl('/about/'),
      lastModified: latestContentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: siteUrl('/friends/'),
      lastModified: latestContentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: siteUrl('/guestbook/'),
      lastModified: latestContentDate,
      changeFrequency: 'weekly',
      priority: 0.5,
    },
    {
      url: siteUrl('/subscribe/'),
      lastModified: latestContentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: siteUrl('/links/'),
      lastModified: latestContentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: siteUrl('/tools/'),
      lastModified: latestContentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: siteUrl('/tools/pinyin-converter/'),
      lastModified: latestContentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: siteUrl('/tools/markdown-editor/'),
      lastModified: latestContentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: siteUrl('/tools/roco-team/'),
      lastModified: latestContentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: siteUrl('/tools/guess-song/'),
      lastModified: latestContentDate,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    /*
      /settings/ 是纯客户端偏好设置页（主题、播放器开关），没有可索引内容，
      且静态 HTML 为空壳，刻意不再放入 sitemap。
    */
  ];

  // 合并所有条目
  return [
    ...baseEntries,
    ...getBlogSitemapEntries(),
    ...getMomentsSitemapEntries(),
    ...getChangelogsSitemapEntries(),
  ];
}
