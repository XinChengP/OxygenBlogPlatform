/**
 * 站点地图生成脚本
 * 在构建前生成静态 sitemap.xml 文件到 public 目录
 * 确保 GitHub Pages 部署时 sitemap.xml 可用
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_URL = 'https://blog.xinchengp.cn';

interface BlogPost {
  slug: string;
  date: string;
  updatedAt?: string;
}

interface ContentItem {
  slug: string;
  date: string;
}

/**
 * 解析 front matter
 */
function parseFrontMatter(content: string): { metadata: Record<string, any>; content: string } {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);

  if (!match) {
    return { metadata: {}, content };
  }

  const frontMatter = match[1];
  const bodyContent = match[2];

  const metadata: Record<string, any> = {};
  frontMatter.split('\n').forEach((line) => {
    const colonIndex = line.indexOf(':');
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value = line.slice(colonIndex + 1).trim();
      // 移除引号
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      // 解析数组
      if (value.startsWith('[') && value.endsWith(']')) {
        try {
          metadata[key] = JSON.parse(value.replace(/'/g, '"'));
        } catch {
          metadata[key] = value;
        }
      } else {
        metadata[key] = value;
      }
    }
  });

  return { metadata, content: bodyContent };
}

/**
 * 获取所有博客文章
 */
function getBlogPosts(): BlogPost[] {
  const blogsDir = path.join(process.cwd(), 'src', 'content', 'blogs');

  try {
    const files = fs.readdirSync(blogsDir);

    const posts = files
      .filter(file => file.endsWith('.md'))
      .map((file) => {
        const filePath = path.join(blogsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { metadata } = parseFrontMatter(content);

        const slug = file.replace('.md', '');

        return {
          slug,
          date: (metadata.date as string) || new Date().toISOString(),
          updatedAt: metadata.updatedAt as string | undefined,
        };
      });

    return posts.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error('读取博客文章失败:', error);
    return [];
  }
}

/**
 * 获取所有动态
 */
function getMoments(): ContentItem[] {
  const momentsDir = path.join(process.cwd(), 'src', 'content', 'moments');

  try {
    const files = fs.readdirSync(momentsDir);

    const moments = files
      .filter(file => file.endsWith('.md'))
      .map((file) => {
        const filePath = path.join(momentsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { metadata } = parseFrontMatter(content);

        const slug = file.replace('.md', '');

        return {
          slug,
          date: (metadata.time as string) || (metadata.date as string) || new Date().toISOString(),
        };
      });

    return moments.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error('读取动态失败:', error);
    return [];
  }
}

/**
 * 获取所有更新日志
 */
function getChangelogs(): ContentItem[] {
  const changelogsDir = path.join(process.cwd(), 'src', 'content', 'changelogs');

  try {
    const files = fs.readdirSync(changelogsDir);

    const changelogs = files
      .filter(file => file.endsWith('.md'))
      .map((file) => {
        const filePath = path.join(changelogsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const { metadata } = parseFrontMatter(content);

        const slug = file.replace('.md', '');

        return {
          slug,
          date: (metadata.date as string) || new Date().toISOString(),
        };
      });

    return changelogs.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error('读取更新日志失败:', error);
    return [];
  }
}

/**
 * 生成站点地图 XML
 */
function generateSitemap(): string {
  const [blogPosts, moments, changelogs] = [
    getBlogPosts(),
    getMoments(),
    getChangelogs(),
  ];

  const currentDate = new Date().toISOString();

  // 静态页面
  const staticPages = [
    { url: `${BASE_URL}/`, lastmod: currentDate, changefreq: 'daily', priority: '1.0' },
    { url: `${BASE_URL}/blogs/`, lastmod: currentDate, changefreq: 'daily', priority: '0.9' },
    { url: `${BASE_URL}/moments/`, lastmod: currentDate, changefreq: 'daily', priority: '0.8' },
    { url: `${BASE_URL}/changelogs/`, lastmod: currentDate, changefreq: 'daily', priority: '0.7' },
    { url: `${BASE_URL}/about/`, lastmod: currentDate, changefreq: 'monthly', priority: '0.8' },
    { url: `${BASE_URL}/gallery/`, lastmod: currentDate, changefreq: 'weekly', priority: '0.7' },
    { url: `${BASE_URL}/archive/`, lastmod: currentDate, changefreq: 'weekly', priority: '0.7' },
    { url: `${BASE_URL}/friends/`, lastmod: currentDate, changefreq: 'monthly', priority: '0.6' },
    { url: `${BASE_URL}/guestbook/`, lastmod: currentDate, changefreq: 'weekly', priority: '0.6' },
    { url: `${BASE_URL}/links/`, lastmod: currentDate, changefreq: 'monthly', priority: '0.5' },
    { url: `${BASE_URL}/settings/`, lastmod: currentDate, changefreq: 'monthly', priority: '0.4' },
    { url: `${BASE_URL}/tools/`, lastmod: currentDate, changefreq: 'monthly', priority: '0.6' },
  ];

  // 博客文章页面
  const blogPages = blogPosts.map((post) => ({
    url: `${BASE_URL}/blogs/${post.slug}/`,
    lastmod: post.updatedAt || post.date,
    changefreq: 'monthly',
    priority: '0.8',
  }));

  // 动态页面
  const momentPages = moments.map((moment) => ({
    url: `${BASE_URL}/moments/${moment.slug}/`,
    lastmod: moment.date,
    changefreq: 'monthly',
    priority: '0.6',
  }));

  // 更新日志页面
  const changelogPages = changelogs.map((changelog) => ({
    url: `${BASE_URL}/changelogs/${changelog.slug}/`,
    lastmod: changelog.date,
    changefreq: 'monthly',
    priority: '0.5',
  }));

  const allPages = [...staticPages, ...blogPages, ...momentPages, ...changelogPages];

  // 生成 XML
  const urlEntries = allPages.map(page => `  <url>
    <loc>${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

/**
 * 主函数
 */
function main() {
  console.log('生成站点地图...');

  const sitemap = generateSitemap();
  const publicDir = path.join(process.cwd(), 'public');
  const sitemapPath = path.join(publicDir, 'sitemap.xml');

  // 确保 public 目录存在
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // 写入文件
  fs.writeFileSync(sitemapPath, sitemap, 'utf-8');

  console.log(`站点地图已生成: ${sitemapPath}`);
  console.log(`共 ${sitemap.match(/<url>/g)?.length || 0} 个页面`);
}

main();
