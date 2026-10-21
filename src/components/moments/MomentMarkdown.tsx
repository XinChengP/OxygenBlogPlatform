import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkEmoji from 'remark-emoji';
import remarkBreaks from 'remark-breaks';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { blogSanitizeSchema } from '@/components/blogs/sanitizeSchema';
import { getAssetPath } from '@/utils/assetUtils';
import { getResponsiveImageEntry } from '@/utils/blogResponsiveImage';
import { buildResponsiveSrcSet } from '@/utils/responsiveImage';

/**
 * 个人动态的构建期 Markdown 渲染器（服务端组件）
 *
 * 这些内容是构建期确定的静态 Markdown，没必要把 react-markdown +
 * remark/rehype 整套解析栈（约 195KB gzip）发给浏览器。
 * 这里在服务端渲染成 ReactNode，由 ClientMomentsPage 直接展示。
 */

// react-markdown 组件回调的额外属性
type MarkdownExtraProps = { node?: unknown };
type MarkdownCodeProps = React.ComponentPropsWithoutRef<'code'> & MarkdownExtraProps & { inline?: boolean };

// 通用 Markdown 组件属性
type MarkdownComponentProps = {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
};

const momentsMarkdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  h1: ({ node, ...props }: MarkdownComponentProps) => <h1 className="text-2xl font-bold mb-4 text-foreground" {...props} />,
  h2: ({ node, ...props }: MarkdownComponentProps) => <h2 className="text-xl font-semibold mb-3 text-foreground" {...props} />,
  h3: ({ node, ...props }: MarkdownComponentProps) => <h3 className="text-lg font-medium mb-2 text-foreground" {...props} />,
  h4: ({ node, ...props }: MarkdownComponentProps) => <h4 className="text-base font-medium mb-2 text-foreground" {...props} />,
  p: ({ node, ...props }: MarkdownComponentProps) => <p className="mb-3 leading-relaxed" {...props} />,
  ul: ({ node, ...props }: MarkdownComponentProps) => <ul className="list-disc pl-6 mb-3 space-y-1" {...props} />,
  ol: ({ node, ...props }: MarkdownComponentProps) => <ol className="list-decimal pl-6 mb-3 space-y-1" {...props} />,
  li: ({ node, ...props }: MarkdownComponentProps) => <li className="mb-1" {...props} />,
  blockquote: ({ node, ...props }: MarkdownComponentProps) => (
    <blockquote className="border-l-4 border-primary/50 bg-primary/5 pl-4 py-2 italic mb-3 rounded-r-lg" {...props} />
  ),
  strong: ({ node, ...props }: MarkdownComponentProps) => <strong className="font-bold text-foreground" {...props} />,
  em: ({ node, ...props }: MarkdownComponentProps) => <em className="italic" {...props} />,
  del: ({ node, ...props }: MarkdownComponentProps) => <del className="line-through text-muted-foreground" {...props} />,
  hr: ({ node, ...props }: MarkdownComponentProps) => <hr className="my-4 border-border" {...props} />,
  a: ({ href, children, ...props }: { href?: string; children?: React.ReactNode; [key: string]: any }) => (
    <a
      href={href}
      className="text-primary hover:text-primary/80 underline decoration-wavy hover:decoration-solid transition-all duration-200"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      {...props}
    >
      {children}
    </a>
  ),
  img: ({ src, alt, ...props }: React.ComponentPropsWithoutRef<'img'> & MarkdownExtraProps) => {
    const processedSrc = typeof src === 'string' ? (src ? getAssetPath(src) : src) : src;
    // 正文图片复用构建期响应式清单（GIF 输出动图 WebP 变体），
    // 清单缺失时（外链/SVG）退化为普通图片
    const responsiveEntry = getResponsiveImageEntry(typeof src === 'string' ? src : null);
    const responsiveSrcSet = buildResponsiveSrcSet(responsiveEntry);
    return (
      <img
        src={processedSrc}
        srcSet={responsiveSrcSet}
        sizes={responsiveSrcSet ? '(max-width: 640px) 100vw, 640px' : undefined}
        width={responsiveEntry?.width}
        height={responsiveEntry?.height}
        alt={alt || ''}
        className="max-w-full h-auto rounded-lg my-2"
        loading="lazy"
        {...props}
      />
    );
  },
  code: ({ node, className, children, ...props }: MarkdownCodeProps) => {
    const match = /language-(\w+)/.exec(className || '');
    const inline = !match;
    if (inline) {
      return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>{children}</code>;
    }
    return (
      <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-3 text-sm">
        <code className={className} {...props}>{children}</code>
      </pre>
    );
  },
  pre: ({ node, children, ...props }: MarkdownComponentProps) => (
    <pre className="bg-muted p-3 rounded-lg overflow-x-auto mb-3 text-sm" {...props}>{children}</pre>
  ),
  table: ({ node, ...props }: MarkdownComponentProps) => (
    <div className="overflow-x-auto my-3">
      <table className="min-w-full border-collapse border border-border rounded-lg" {...props} />
    </div>
  ),
  thead: ({ node, ...props }: MarkdownComponentProps) => <thead className="bg-muted/50" {...props} />,
  tbody: ({ node, ...props }: MarkdownComponentProps) => <tbody className="divide-y divide-border" {...props} />,
  tr: ({ node, ...props }: MarkdownComponentProps) => <tr className="hover:bg-muted/30 transition-colors" {...props} />,
  th: ({ node, ...props }: MarkdownComponentProps) => <th className="px-3 py-2 text-left text-sm font-medium border-b border-border" {...props} />,
  td: ({ node, ...props }: MarkdownComponentProps) => <td className="px-3 py-2 text-sm border-b border-border" {...props} />,
};

export default function MomentMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkEmoji, remarkBreaks]}
      /* rehypeRaw 展开原始 HTML 后立即清洗，再交给高亮（顺序见 sanitizeSchema.ts） */
      rehypePlugins={[rehypeRaw, [rehypeSanitize, blogSanitizeSchema], rehypeHighlight]}
      components={momentsMarkdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}
