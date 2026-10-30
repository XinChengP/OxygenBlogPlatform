import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkEmoji from 'remark-emoji';
import rehypeHighlight from 'rehype-highlight';

/**
 * 开发日志的构建期 Markdown 渲染器（服务端组件）
 *
 * 日志内容是构建期确定的静态 Markdown，原先在客户端用
 * react-markdown + remark/rehype 解析，整套解析栈约 195KB gzip。
 * 现在改为服务端渲染成 ReactNode，客户端只负责展开/收起。
 */

// 通用 Markdown 组件属性
type MarkdownComponentProps = {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
};

const changelogsMarkdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  // 标题样式 - 添加自动换行
  h1: ({ node, ...props }: MarkdownComponentProps) => <h1 className="text-2xl font-bold mb-4 break-words whitespace-normal" {...props} />,
  h2: ({ node, ...props }: MarkdownComponentProps) => <h2 className="text-xl font-semibold mb-3 break-words whitespace-normal" {...props} />,
  h3: ({ node, ...props }: MarkdownComponentProps) => <h3 className="text-lg font-medium mb-2 break-words whitespace-normal" {...props} />,
  h4: ({ node, ...props }: MarkdownComponentProps) => <h4 className="text-base font-medium mb-2 break-words whitespace-normal" {...props} />,
  h5: ({ node, ...props }: MarkdownComponentProps) => <h5 className="text-sm font-medium mb-1 break-words whitespace-normal" {...props} />,
  h6: ({ node, ...props }: MarkdownComponentProps) => <h6 className="text-xs font-medium mb-1 break-words whitespace-normal" {...props} />,
  // 段落样式 - 强制自动换行
  p: ({ node, ...props }: MarkdownComponentProps) => <p className="mb-2 break-words whitespace-normal overflow-wrap-anywhere" {...props} />,
  // 列表样式
  ul: ({ node, ...props }: MarkdownComponentProps) => <ul className="list-disc pl-6 mb-2 break-words" {...props} />,
  ol: ({ node, ...props }: MarkdownComponentProps) => <ol className="list-decimal pl-6 mb-2 break-words" {...props} />,
  li: ({ node, ...props }: MarkdownComponentProps) => <li className="mb-1 break-words whitespace-normal" {...props} />,
  // 引用样式
  blockquote: ({ node, ...props }: MarkdownComponentProps) => <blockquote className="border-l-4 border-primary pl-4 italic mb-2 break-words whitespace-normal" {...props} />,
  // 强调样式
  strong: ({ node, ...props }: MarkdownComponentProps) => <strong className="font-bold break-words" {...props} />,
  em: ({ node, ...props }: MarkdownComponentProps) => <em className="italic break-words" {...props} />,
  // 链接样式
  a: ({ node, ...props }: MarkdownComponentProps) => <a className="text-primary hover:underline break-words" {...props} />,
  // 代码样式
  /*
    覆盖默认 pre：react-markdown 已为围栏代码块输出 <pre>，
    下面的 code 组件会自行渲染带样式的 <pre>，若不拦截会出现 <pre><pre> 嵌套。
    博客正文的 BlogMarkdownBase 使用同样做法。
  */
  pre: ({ children }: MarkdownComponentProps) => <>{children}</>,
  code: ({ node, className, children, ...props }: MarkdownComponentProps) => {
    // rehype-highlight 会给围栏代码块加 hljs / language-* 类名，行内代码没有
    const isBlock = Boolean(className && /(?:language-|hljs)/.test(className));

    if (!isBlock) {
      return <code className="bg-muted px-1 rounded break-words whitespace-normal" {...props}>{children}</code>;
    }

    return (
      <pre className="bg-muted p-3 rounded overflow-x-auto mb-2">
        <code className={className} {...props}>{children}</code>
      </pre>
    );
  },
  // 表格样式
  table: ({ node, ...props }: MarkdownComponentProps) => <div className="overflow-x-auto mb-2"><table className="w-full border-collapse" {...props} /></div>,
  th: ({ node, ...props }: MarkdownComponentProps) => <th className="border border-border px-2 py-1 text-left break-words" {...props} />,
  td: ({ node, ...props }: MarkdownComponentProps) => <td className="border border-border px-2 py-1 break-words" {...props} />,
};

export default function ChangelogMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkEmoji]}
      rehypePlugins={[rehypeHighlight]}
      components={changelogsMarkdownComponents}
    >
      {content}
    </ReactMarkdown>
  );
}
