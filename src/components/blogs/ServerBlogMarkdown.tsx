import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import remarkEmoji from 'remark-emoji';
import rehypeSanitize from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import ThemeAwareCodeBlock from '@/components/blogs/ThemeAwareCodeBlock';
import BlogArticleImage from '@/components/blogs/BlogArticleImage';
import BlogArticleIframe from '@/components/blogs/BlogArticleIframe';
import {
  baseComponents,
  PlainCodeLines,
  getLanguageDisplayName,
  normalizeLanguage,
} from '@/components/blogs/BlogMarkdownBase';
import { blogSanitizeSchema } from '@/components/blogs/sanitizeSchema';

/**
 * 博客正文服务端渲染器
 *
 * 为什么存在这个组件：
 * 此前正文经由「客户端组件 + dynamic(ssr:false) + useEffect 异步加载插件」渲染，
 * 静态导出的 HTML 里只有骨架屏，正文要等 JS 下载执行后才出现，
 * 抵消了 generateMetadata 的大部分 SEO 工作。
 *
 * 现在由本服务端组件在构建期一次性完成 Markdown → React 的转换，
 * 渲染结果作为 ReactNode 传给详情页的客户端骨架，正文直接进入静态 HTML。
 * 表格、数学公式、原始 HTML、emoji 等在构建期即渲染完毕，访客无需等待。
 *
 * 交互性元素（代码块复制/折叠、图片灯箱、B 站播放器）映射到对应的
 * 客户端组件，水合后自动接管；纯展示映射复用 baseComponents，两端行为一致。
 */
/**
 * 从 React 子节点中提取纯文本
 *
 * react-markdown v10 不再向 code 组件传 inline 属性，行内代码与围栏代码
 * 只能靠父节点（p vs pre）区分。这里在 pre 层接管围栏代码块，
 * code 层只负责行内样式，避免把行内代码渲染成整块灰条。
 */
const nodeToText = (node: React.ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (React.isValidElement(node)) {
    return nodeToText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
};

export default function ServerBlogMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkBreaks, remarkEmoji]}
      /*
        顺序要点：rehypeRaw 展开原始 HTML 后立即由 rehypeSanitize 清洗
        （白名单见 sanitizeSchema.ts），KaTeX 的 MathML 在此之后生成、
        属于库的可信输出，不会被清洗。
      */
      rehypePlugins={[rehypeRaw, [rehypeSanitize, blogSanitizeSchema], rehypeKatex, rehypeSlug]}
      components={{
        ...baseComponents,
        // 围栏代码块由 pre 层接管：pre 的子节点是 code 元素，
        // 可直接读取 language-* 与原始文本。
        pre({ children }) {
          const child = React.Children.toArray(children)[0];
          if (!React.isValidElement(child)) {
            return <>{children}</>;
          }

          const { className, children: codeChildren } = child.props as {
            className?: string;
            children?: React.ReactNode;
          };
          const match = /language-(\w+)/.exec(className || '');
          const code = nodeToText(codeChildren).replace(/\n$/, '');

          if (match) {
            const language = normalizeLanguage(match[1]);
            return (
              <ThemeAwareCodeBlock
                code={code}
                language={language}
                displayName={getLanguageDisplayName(language)}
              />
            );
          }

          return <PlainCodeLines childrenString={code} />;
        },
        // 行内代码：保留正文流，不再输出块级灰条
        code({ children }) {
          return (
            <code className="rounded-md bg-muted/80 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground break-words">
              {children}
            </code>
          );
        },
        img: (props) => <BlogArticleImage {...props} />,
        iframe: (props) => <BlogArticleIframe {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
