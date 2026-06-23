import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

export const dynamic = 'force-static';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://blog.xinchengp.cn';

interface BlogFrontMatter {
  title?: string;
  date?: string;
  updatedAt?: string;
  category?: string;
  author?: string;
  tags?: string[];
  excerpt?: string;
  hidden?: boolean;
}

function scanMarkdownFiles(
  dir: string,
  baseDir: string
): Array<{ filePath: string; slug: string }> {
  const results: Array<{ filePath: string; slug: string }> = [];

  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        const subResults = scanMarkdownFiles(itemPath, baseDir);
        results.push(...subResults);
      } else if (item.endsWith('.md')) {
        const relativePath = path.relative(baseDir, itemPath);
        const slug = relativePath.replace(/\.md$/, '').replace(/[\/\\]/g, '-');
        results.push({ filePath: itemPath, slug });
      }
    }
  } catch (error) {
    console.error(`扫描目录 ${dir} 时出错:`, error);
  }

  return results;
}

function escapeXml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&apos;',
  };
  return text.replace(/[&<>"']/g, match => escapeMap[match] || match);
}

function formatRfc822Date(date: Date): string {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const offset = 8 * 60;
  const utc = date.getTime() + (date.getTimezoneOffset() * 60 * 1000);
  const localDate = new Date(utc + offset * 60 * 1000);
  
  const dayName = dayNames[localDate.getUTCDay()];
  const dateNum = localDate.getUTCDate();
  const monthName = monthNames[localDate.getUTCMonth()];
  const year = localDate.getUTCFullYear();
  const hours = localDate.getUTCHours().toString().padStart(2, '0');
  const minutes = localDate.getUTCMinutes().toString().padStart(2, '0');
  const seconds = localDate.getUTCSeconds().toString().padStart(2, '0');
  
  return `${dayName}, ${dateNum} ${monthName} ${year} ${hours}:${minutes}:${seconds} +0800`;
}

function generateRssXml(): string {
  const contentDir = path.join(process.cwd(), 'src/content/blogs');
  const entries: Array<{
    slug: string;
    frontMatter: BlogFrontMatter;
    content: string;
    date: Date;
  }> = [];

  if (fs.existsSync(contentDir)) {
    const markdownFiles = scanMarkdownFiles(contentDir, contentDir);

    for (const { filePath, slug } of markdownFiles) {
      try {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const { data, content } = matter(fileContent);
        const frontMatter = data as BlogFrontMatter;

        if (frontMatter.hidden === true) continue;

        const dateStr = frontMatter.updatedAt || frontMatter.date;
        const date = dateStr ? new Date(dateStr) : new Date();

        entries.push({ slug, frontMatter, content, date });
      } catch (error) {
        console.error(`读取博客文件 ${filePath} 时出错:`, error);
      }
    }
  }

  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  const lastBuildDate = entries.length > 0 
    ? formatRfc822Date(entries[0].date) 
    : formatRfc822Date(new Date());

  const items = entries.map(({ slug, frontMatter, content, date }) => {
    const title = escapeXml(frontMatter.title || '无标题');
    const link = `${BASE_URL}/blogs/${slug}/`;
    const pubDate = formatRfc822Date(date);
    const author = frontMatter.author || '歆橙';
    
    let description = '';
    if (frontMatter.excerpt) {
      description = escapeXml(frontMatter.excerpt);
    } else {
      const textContent = marked.parse(content) as string;
      const plainText = textContent.replace(/<[^>]*>/g, '').trim();
      description = escapeXml(plainText.substring(0, 150) + (plainText.length > 150 ? '...' : ''));
    }

    const categories = (frontMatter.tags || []).map(tag => 
      `<category>${escapeXml(tag)}</category>`
    ).join('\n        ');

    const mainCategory = frontMatter.category ? 
      `<category>${escapeXml(frontMatter.category)}</category>` : '';

    return `    <item>
      <title>${title}</title>
      <link>${link}</link>
      <pubDate>${pubDate}</pubDate>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${description}]]></description>
      ${mainCategory}
      ${categories}
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>歆橙 的 blog</title>
    <link>${BASE_URL}</link>
    <description>一个普普通通的锦依卫，记录个人的发癫日常</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>60</ttl>
    <copyright>Copyright ${new Date().getFullYear()} 歆橙</copyright>
    <atom:link href="${BASE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <image>
      <url>${BASE_URL}/favicon.png</url>
      <title>歆橙 的 blog</title>
      <link>${BASE_URL}</link>
    </image>
${items}
  </channel>
</rss>`;
}

export async function GET(): Promise<NextResponse> {
  const xml = generateRssXml();
  const buffer = Buffer.from(xml, 'utf-8');
  
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': buffer.length.toString(),
    },
  });
}
