import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkBreaks from 'remark-breaks';
import remarkEmoji from 'remark-emoji';
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
export default function ServerBlogMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath, remarkBreaks, remarkEmoji]}
      rehypePlugins={[rehypeKatex, rehypeRaw, rehypeSlug]}
      components={{
        ...baseComponents,
        code({ className, children }) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? normalizeLanguage(match[1]) : '';
          const childrenString = String(children || '').replace(/\n$/, '');

          // 带语言标注的代码块交给可折叠代码块组件，超长代码自动折叠
          if (language) {
            return (
              <ThemeAwareCodeBlock
                code={childrenString}
                language={language}
                displayName={getLanguageDisplayName(language)}
              />
            );
          }

          // 无语言标注（行内代码与无语言块）：逐行灰条样式
          return <PlainCodeLines childrenString={childrenString} />;
        },
        img: (props) => <BlogArticleImage {...props} />,
        iframe: (props) => <BlogArticleIframe {...props} />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
