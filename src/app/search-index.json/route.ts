import { NextResponse } from 'next/server';
import path from 'path';
// 复用公共博客扫描模块（与 rss.xml / sitemap 共用，避免重复实现扫描逻辑）
import { scanMarkdownFiles } from '@/utils/blogScanner';

// 静态导出标记：构建期生成 /search-index.json 静态文件（与 rss.xml 先例一致）
export const dynamic = 'force-static';

/** 每篇文章纯文本内容的最大保留字符数，用于控制索引 JSON 体积 */
const CONTENT_MAX_LENGTH = 8000;

/**
 * 搜索索引条目结构
 * 前端 SearchDialog 组件通过 fetch 加载本文件并交给 fuse.js 检索
 */
interface SearchIndexEntry {
  /** 文章标识，用于跳转 /blogs/[slug] */
  slug: string;
  /** 文章标题 */
  title: string;
  /** 分类 */
  category: string;
  /** 标签列表 */
  tags: string[];
  /** 摘要（frontmatter excerpt，可为空） */
  excerpt: string;
  /** 发布日期（优先 updatedAt，回退 date） */
  date: string;
  /** 正文纯文本（去除 Markdown 语法，截断至 CONTENT_MAX_LENGTH） */
  plainContent: string;
}

/**
 * 去除 Markdown 语法，提取可供全文检索的纯文本
 *
 * 处理策略：保留代码块内部的代码文字（它们也是可检索内容），
 * 仅剥离围栏标记与语言标识；其余常见语法（标题、强调、链接、图片、
 * 行内代码、引用、列表标记、分隔线、HTML 标签）一律清理为可读文本。
 *
 * @param markdown - frontmatter 之后的 Markdown 原文
 * @returns 清理后的纯文本（未截断）
 */
function stripMarkdownSyntax(markdown: string): string {
  return markdown
    // 去除代码块围栏行（``` 或 ~~~ 开头的行，连同语言标识），保留围栏内的代码文字
    .replace(/^\s*(`{3,}|~{3,}).*$/gm, '')
    // 图片 ![alt](url) → alt
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 链接 [text](url) → text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    // 行内代码标记
    .replace(/`([^`]*)`/g, '$1')
    // 加粗/斜体标记（**text**、__text__、*text*、_text_）
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    // 删除线标记
    .replace(/~~(.*?)~~/g, '$1')
    // 标题行首的 # 标记
    .replace(/^#{1,6}\s+/gm, '')
    // 引用行首的 > 标记
    .replace(/^\s*>\s?/gm, '')
    // 无序列表标记（-、+、* 行首）与有序列表标记（1. 行首）
    .replace(/^\s*[-+*]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    // 表格分隔行（|---|---|）与表格单元格分隔符
    .replace(/^\s*\|?[-:|]+\|[-:|\s]*$/gm, '')
    .replace(/\|/g, ' ')
    // 水平分隔线
    .replace(/^\s*([-*_]\s*){3,}$/gm, '')
    // HTML 标签（B站嵌入、视频等增强语法残留）
    .replace(/<[^>]+>/g, ' ')
    // 合并多余空白，避免索引中大量无意义空白
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

/**
 * 生成全文搜索索引 JSON
 *
 * 数据口径与 RSS / 站点地图保持一致：
 * 复用 scanMarkdownFiles 扫描，过滤 hidden 隐藏文章，按日期倒序排列
 */
function generateSearchIndex(): SearchIndexEntry[] {
  const contentDir = path.join(process.cwd(), 'src/content/blogs');

  const entries = scanMarkdownFiles(contentDir, contentDir)
    .filter(({ frontMatter }) => frontMatter.hidden !== true)
    .map(({ slug, frontMatter, content }): SearchIndexEntry => {
      // 正文纯文本：去除 Markdown 语法后截断，控制索引体积
      const plainContent = stripMarkdownSyntax(content).slice(0, CONTENT_MAX_LENGTH);

      return {
        slug,
        title: frontMatter.title || '无标题',
        category: frontMatter.category || '未分类',
        tags: frontMatter.tags || [],
        excerpt: frontMatter.excerpt || '',
        // 使用发布日期（date），搜索场景按发布时间口径展示与排序
        date: frontMatter.date || '',
        plainContent,
      };
    });

  // 按日期倒序，保证空搜索态展示的「热门文章」是最新内容
  entries.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return entries;
}

export async function GET(): Promise<NextResponse> {
  const index = generateSearchIndex();
  const buffer = Buffer.from(JSON.stringify(index), 'utf-8');

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // 静态资源性质，允许浏览器缓存一小时
      'Cache-Control': 'public, max-age=3600',
      'Content-Length': buffer.length.toString(),
    },
  });
}
