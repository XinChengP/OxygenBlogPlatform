import { headingIdFromText } from '@/components/blogs/BlogMarkdownBase';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

/**
 * 从 Markdown 原文提取目录项
 *
 * 构建期在服务端调用一次，把结果作为纯数据传给客户端目录组件，
 * 避免为了生成目录再把整篇正文随 RSC payload 发到浏览器。
 * id 规则与正文标题共用 headingIdFromText（或 rehype-slug 的结果）。
 */
export const extractHeadings = (content: string): TocItem[] => {
  const headings: TocItem[] = [];
  const usedIds = new Set<string>();

  // 先移除围栏代码块，避免代码里的 # 被误识别为标题
  const codeBlockRegex = /```[\s\S]*?```/g;

  // 保留行内代码的文本内容（去掉反引号），与正文标题的真实文本保持一致
  const cleanContent = content
    .replace(codeBlockRegex, '')
    .replace(/`([^`]*)`/g, '$1');

  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(cleanContent)) !== null) {
    const level = match[1].length;
    const rawText = match[2].trim();

    if (!rawText) continue;

    // 去掉 Markdown 行内标记，得到与渲染后标题一致的纯文本
    const text = rawText
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/(\*\*|__|\*|_|~~)/g, '')
      .replace(/<[^>]+>/g, '')
      .trim();

    if (!text) continue;

    const baseId = headingIdFromText(text);
    if (!baseId) continue;

    // 与 rehype-slug 的重复标题编号保持一致
    let id = baseId;
    let counter = 1;
    while (usedIds.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }
    usedIds.add(id);

    headings.push({ id, text, level });
  }

  return headings;
};
