import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { marked } from 'marked';
// 复用公共的博客扫描与站点地址工具（与 sitemap.ts 共用，避免重复实现）
import { SITE_URL, siteUrl, scanMarkdownFiles } from '@/utils/blogScanner';

export const dynamic = 'force-static';

/**
 * 转义 XML 特殊字符
 * 仅用于 CDATA 之外的文本节点（标题、分类、标签等）
 */
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

/**
 * 将文本安全地包裹进 CDATA 块
 * 关键点：CDATA 内部不解析 XML 实体，内容必须保持原文；
 * 此前实现先 escapeXml 再包 CDATA，导致阅读器把 &quot; 等实体当字面文字显示（已修复）。
 * 若原文恰好包含 "]]>"，需拆分转写以避免提前闭合 CDATA 块
 */
function wrapCdata(text: string): string {
  return `<![CDATA[${text.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;
}

/**
 * 将日期格式化为 RSS 规范要求的 RFC 822 格式，并固定为东八区（UTC+8）
 * 无论构建机器处于什么时区，输出结果保持一致
 */
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

/**
 * 构建 RSS 封面图 enclosure 节点
 * 仅当文章 frontmatter 配置了 coverImage 时输出；
 * 构建期读取 public 下对应文件的真实字节数（读取失败时以 0 兜底）
 *
 * @param coverImage - 封面图路径（如 /Blogabout/xxx/cover.png）
 * @returns enclosure 节点字符串；未配置封面图时返回空字符串
 */
function buildEnclosure(coverImage?: string): string {
  if (!coverImage) return '';

  // 可公开访问的绝对地址（siteUrl 内部已处理 basePath，兼容 GitHub Pages 子路径部署）
  const url = siteUrl(coverImage);

  // 构建期读取文件真实大小作为 length 属性值
  const localPath = path.join(process.cwd(), 'public', coverImage.replace(/^\//, ''));
  let length = 0;
  try {
    length = fs.statSync(localPath).size;
  } catch {
    // 文件缺失时长度记为 0，仍输出 enclosure
  }

  // 根据扩展名推断图片 MIME 类型
  const ext = path.extname(coverImage).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
  };

  return `<enclosure url="${url}" type="${mimeMap[ext] || 'image/png'}" length="${length}" />`;
}

/**
 * 生成全文 HTML 并做三类适配，让它在订阅器里安全显示：
 *
 * 1. 剥离 <style>/<script> 块与内联事件属性：
 *    RSS 阅读器会把全文 HTML 直接插入自己的页面，文章里的全局 CSS
 *    （正文支持 <style> 自定义样式）会污染订阅器的布局；脚本则毫无用处。
 * 2. 协议相对地址（B站播放器 //player.bilibili.com/...）补全为 https://，
 *    纯文本类/邮件类阅读器没有「当前页协议」可继承。
 * 3. 站内相对路径（/Blogabout/...）补全为带域名的绝对地址；
 *    内部属性会读取 basePath（siteUrl），兼容 GitHub Pages 子路径部署。
 *
 * 订阅器通常还会自行过滤 <iframe>（B站播放器等富媒体因此不显示），
 * 这是对方的正常安全策略，无需在此处理。
 */
function renderFullContentHtml(markdown: string): string {
  let html = marked.parse(markdown) as string;

  html = html
    .replace(/<(style|script)\b[^>]*>[\s\S]*?<\/\1>/gi, '')
    .replace(/\son\w+=(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  const absoluteBase = siteUrl('/');
  html = html
    .replace(/(src|href)="(\/\/[^"]*)"/g, '$1="https:$2"')
    .replace(/(src|href)="\//g, `$1="${absoluteBase}`);

  return html;
}

function generateRssXml(): string {
  const contentDir = path.join(process.cwd(), 'src/content/blogs');

  // 统一使用公共扫描模块获取文章列表，过滤隐藏文章并解析发布日期
  const entries = scanMarkdownFiles(contentDir, contentDir)
    .filter(({ frontMatter }) => frontMatter.hidden !== true)
    .map(scanned => {
      // 优先使用 updatedAt，没有则回退到 date；都缺失时以当前时间兜底
      const dateStr = scanned.frontMatter.updatedAt || scanned.frontMatter.date;
      return { ...scanned, date: dateStr ? new Date(dateStr) : new Date() };
    });

  // 按日期倒序排列，最新文章展示在前
  entries.sort((a, b) => b.date.getTime() - a.date.getTime());

  const lastBuildDate = entries.length > 0
    ? formatRfc822Date(entries[0].date)
    : formatRfc822Date(new Date());

  const items = entries.map(({ slug, frontMatter, content, date }) => {
    const title = escapeXml(frontMatter.title || '无标题');
    // 文章链接：siteUrl 内部统一拼接域名与 basePath
    const link = siteUrl(`/blogs/${slug}/`);
    const pubDate = formatRfc822Date(date);

    // 摘要：优先使用 frontmatter 的 excerpt，否则取正文渲染后去除 HTML 标签的前 150 字
    // 注意：description 位于 CDATA 内部，不能再做 escapeXml 转义
    let description = '';
    if (frontMatter.excerpt) {
      description = frontMatter.excerpt;
    } else {
      const textContent = marked.parse(content) as string;
      const plainText = textContent.replace(/<[^>]*>/g, '').trim();
      description = plainText.substring(0, 150) + (plainText.length > 150 ? '...' : '');
    }

    // 全文正文（content:encoded）：阅读器优先读它，保留摘要作为兼容回退。
    // 图片/链接在 renderFullContentHtml 中已补全为绝对地址。
    const fullContentHtml = renderFullContentHtml(content);

    // 标签与分类位于 CDATA 之外，必须做 XML 转义
    const categories = (frontMatter.tags || []).map(tag =>
      `<category>${escapeXml(tag)}</category>`
    ).join('\n      ');

    const mainCategory = frontMatter.category ?
      `<category>${escapeXml(frontMatter.category)}</category>` : '';

    // 封面图 enclosure（未配置时为空字符串，不输出该行）
    const enclosure = buildEnclosure(frontMatter.coverImage);

    // 按行组装条目，保证可选节点缺失时缩进依然整洁
    const lines = [
      '    <item>',
      `      <title>${title}</title>`,
      `      <link>${link}</link>`,
      `      <pubDate>${pubDate}</pubDate>`,
      `      <guid isPermaLink="true">${link}</guid>`,
      `      <description>${wrapCdata(description)}</description>`,
      `      <content:encoded>${wrapCdata(fullContentHtml)}</content:encoded>`,
    ];

    if (mainCategory) {
      lines.push(`      ${mainCategory}`);
    }
    if (categories) {
      lines.push(`      ${categories}`);
    }
    if (enclosure) {
      lines.push(`      ${enclosure}`);
    }

    lines.push('    </item>');
    return lines.join('\n');
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>歆橙 的 blog</title>
    <link>${SITE_URL}</link>
    <description>一个普普通通的锦依卫，记录个人的发癫日常</description>
    <language>zh-CN</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <ttl>60</ttl>
    <copyright>Copyright ${new Date().getFullYear()} 歆橙</copyright>
    <atom:link href="${siteUrl('/rss.xml')}" rel="self" type="application/rss+xml" />
    <image>
      <url>${siteUrl('/favicon.png')}</url>
      <title>歆橙 的 blog</title>
      <link>${SITE_URL}</link>
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
