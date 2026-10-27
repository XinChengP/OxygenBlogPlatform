import React from 'react';
import { getAssetPath } from '@/utils/assetUtils';

/**
 * 博客 Markdown 渲染的「纯展示」组件映射
 *
 * 本模块刻意不标注 'use client'：所有导出都是无 hooks、无副作用、
 * props 可序列化的纯函数组件，因此同一份映射可以同时被
 * 服务端渲染器（ServerBlogMarkdown）与客户端代码引用。
 *
 * 需要交互或主题状态的元素（代码块、图片、iframe）不在此处定义，
 * 由 ServerBlogMarkdown 单独映射到对应的客户端组件。
 */

// react-markdown 组件回调的通用额外属性
interface MarkdownExtraProps {
  node?: unknown;
}

export type MarkdownImgProps = React.ComponentPropsWithoutRef<'img'> & MarkdownExtraProps;
export type MarkdownDivProps = React.ComponentPropsWithoutRef<'div'> & MarkdownExtraProps;
export type MarkdownAProps = React.ComponentPropsWithoutRef<'a'> & MarkdownExtraProps;

// 受支持的视频文件扩展名列表
// 当 Markdown 中使用图片语法引用这些格式的文件时，会自动渲染为 video 标签
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.ogg', '.ogv', '.avi', '.flv'];

/**
 * 判断一个地址是否指向视频文件
 */
export function isVideoUrl(url: string): boolean {
  return VIDEO_EXTENSIONS.some((ext) => url.toLowerCase().endsWith(ext));
}

/**
 * 标准化编程语言名称，解决大小写敏感问题
 */
export const normalizeLanguage = (language: string): string => {
  const aliases: Record<string, string> = {
    js: 'javascript', jsx: 'jsx', ts: 'typescript', tsx: 'tsx',
    py: 'python', python3: 'python',
    cxx: 'cpp', 'c++': 'cpp',
    sh: 'bash', shell: 'bash', zsh: 'bash',
    yml: 'yaml',
    mysql: 'sql', postgresql: 'sql', sqlite: 'sql',
    golang: 'go',
  };
  const normalized = language.toLowerCase().trim();
  return aliases[normalized] || normalized;
};

/**
 * 获取编程语言的显示名称
 */
export const getLanguageDisplayName = (language: string): string => {
  const displayNames: Record<string, string> = {
    javascript: 'JavaScript', typescript: 'TypeScript', jsx: 'JSX', tsx: 'TSX',
    python: 'Python', cpp: 'C++', c: 'C', html: 'HTML', css: 'CSS',
    scss: 'SCSS', sass: 'Sass', bash: 'Bash', yaml: 'YAML',
    dockerfile: 'Dockerfile', makefile: 'Makefile', markdown: 'Markdown',
    latex: 'LaTeX', matlab: 'MATLAB', r: 'R', gcode: 'G代码',
  };
  return displayNames[language] || language.charAt(0).toUpperCase() + language.slice(1);
};

/**
 * 由纯文本生成锚点 id
 *
 * 规则：小写化，仅保留中英文、数字、空格与连字符，
 * 空白折叠为连字符，连续连字符合并，并去掉首尾连字符。
 * 目录与正文标题共用该函数，保证两侧生成的 id 完全一致。
 */
export const headingIdFromText = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

/**
 * 解析图片网格的列宽比例类名
 *
 * 约定：类名 `image-grid-2-1-1` 表示一行三张图按 2:1:1 分配宽度。
 * 段数不限于常见的 2~4 段，数字也不限（`image-grid-1-3-2`、`image-grid-1-2-2-1` 同样合法），
 * 因此作者新增任何组合都不需要再往 CSS 里补规则。
 *
 * 返回可直接用于 grid-template-columns 的值（如 "2fr 1fr 1fr"）；
 * 不是比例式网格时返回 null，交给 CSS 里的固定列数类（image-grid-3-cols 等）处理。
 */
export function parseImageGridColumns(className?: string): string | null {
  if (!className) return null;

  // 必须同时带 image-grid 容器类，避免误伤正文里其他恰好形如 a-1-2 的类名
  const tokens = className.split(/\s+/);
  if (!tokens.includes('image-grid')) return null;

  for (const token of tokens) {
    // 至少两段数字：image-grid-1-2 / image-grid-2-1-1 / image-grid-1-2-2-1
    const match = /^image-grid-(\d+(?:-\d+){1,})$/.exec(token);
    if (!match) continue;

    const ratios = match[1].split('-').map((value) => Number.parseInt(value, 10));
    // 出现 0 或非法数字时会算出 0fr 让整列塌陷，直接跳过该 token
    if (ratios.some((ratio) => !Number.isFinite(ratio) || ratio <= 0)) continue;

    return ratios.map((ratio) => `${ratio}fr`).join(' ');
  }

  return null;
}

/**
 * 递归提取 React 子节点的纯文本
 *
 * 标题里可能包含 <code>/<strong>/<a> 等元素，
 * 直接调用 child.toString() 会得到 [object Object]，导致锚点 id 与目录不一致。
 */
const reactNodeToText = (node: React.ReactNode): string => {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(reactNodeToText).join('');
  if (React.isValidElement(node)) {
    return reactNodeToText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
};

const headingId = (children: React.ReactNode): string =>
  headingIdFromText(reactNodeToText(children));

interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

/** 标题系列映射：规则相同，仅字号与间距不同，用循环生成避免四份拷贝 */
const headings = ([
  ['h1', 'text-3xl font-bold mt-10 mb-6 pb-3 border-b-2 border-primary/20'],
  ['h2', 'text-2xl font-semibold mt-8 mb-4 pb-2 border-b border-primary/15'],
  ['h3', 'text-xl font-semibold mt-6 mb-3'],
  ['h4', 'text-lg font-medium mt-4 mb-2'],
] as const).reduce<Record<string, React.ComponentType<ComponentProps>>>((acc, [tag, className]) => {
  const Tag = tag;
  acc[tag] = ({ children, node }: ComponentProps) => {
    // 优先使用 rehype-slug 生成的 id：它已处理重复标题与特殊字符，
    // 且与静态 HTML 中的锚点一致；缺失时回退到文本推导。
    const rehypeId = (node as { properties?: { id?: unknown } } | undefined)?.properties?.id;
    const id = typeof rehypeId === 'string' && rehypeId ? rehypeId : headingId(children);
    return React.createElement(
      Tag,
      { id, className: `${className} text-foreground no-underline` },
      children
    );
  };
  return acc;
}, {});

/**
 * 与 Markdown 标签同名的纯展示组件映射
 *
 * code/img/iframe 的映射不在其中：见文件头说明。
 */
export const baseComponents = {
  // 覆盖默认 pre 标签，防止 react-markdown 给代码块包裹额外的 <pre> 元素
  pre({ children }: ComponentProps) {
    return <>{children}</>;
  },
  // 引用块 - 玻璃态风格
  blockquote({ children }: ComponentProps) {
    return (
      <blockquote className="relative my-6 rounded-2xl overflow-hidden shadow-lg border border-primary/20 bg-gradient-to-br from-primary/10 via-card/50 to-primary/5 backdrop-blur-md">
        {/* 左侧装饰条 */}
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/60 to-primary"></div>
        <div className="p-6 pl-8">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span className="text-primary text-lg">💡</span>
            </div>
            <div className="flex-1 text-base leading-relaxed text-foreground/90">{children}</div>
          </div>
        </div>
      </blockquote>
    );
  },
  // 表格 - 玻璃态风格
  table({ children }: ComponentProps) {
    return (
      <div className="overflow-x-auto my-8 rounded-2xl shadow-lg border border-border/30">
        <table className="min-w-full border-collapse">
          {children}
        </table>
      </div>
    );
  },
  thead({ children }: ComponentProps) {
    return (
      <thead className="bg-gradient-to-r from-primary/20 to-primary/10 backdrop-blur-md">
        {children}
      </thead>
    );
  },
  tbody({ children }: ComponentProps) {
    return (
      <tbody className="bg-card/40 backdrop-blur-sm divide-y divide-border/50">
        {children}
      </tbody>
    );
  },
  tr({ children }: ComponentProps) {
    return (
      <tr className="hover:bg-primary/5 transition-colors duration-200">
        {children}
      </tr>
    );
  },
  th({ children }: ComponentProps) {
    return (
      <th className="px-6 py-4 text-left text-sm font-semibold text-foreground/90 uppercase tracking-wider border-b border-primary/20 rounded-none">
        {children}
      </th>
    );
  },
  td({ children }: ComponentProps) {
    return (
      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground/80 border-b border-border/30 rounded-none">
        {children}
      </td>
    );
  },
  ...headings,
  // 段落
  p({ children }: ComponentProps) {
    // 使用 span 而非 div 或 p 标签，避免嵌套块级元素导致的 hydration 错误
    return (
      <span
        className="block mb-4 leading-relaxed text-base"
      >
        {children}
      </span>
    );
  },
  // 列表
  ul({ children }: ComponentProps) {
    return (
      <ul className="my-4 space-y-2">
        {children}
      </ul>
    );
  },
  ol({ children }: ComponentProps) {
    return (
      <ol className="my-4 space-y-2">
        {children}
      </ol>
    );
  },
  li({ children }: ComponentProps) {
    return (
      <li className="flex items-start gap-2">
        <span className="text-primary mt-1">•</span>
        <span className="flex-1">{children}</span>
      </li>
    );
  },
  // 链接 - 本地静态资源路径自动补基础路径，支持 download 属性提供文件下载
  a({ href, download, children }: MarkdownAProps) {
    const processedHref = typeof href === 'string' && href.startsWith('/') && !href.startsWith('//')
      ? getAssetPath(href)
      : href;
    return (
      <a
        href={processedHref}
        download={download}
        className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-4 hover:decoration-primary/60 transition-all duration-200"
        target={href?.startsWith('http') ? '_blank' : undefined}
        rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      >
        {children}
      </a>
    );
  },
  // div - 支持自定义图片网格（node 为 react-markdown 注入的 hast 引用，弃置不透传）
  div({ className, children, node, ...props }: MarkdownDivProps) {
    /*
      比例式网格（image-grid-2-1-1 之类）的列宽无法用纯 CSS 从类名推导，
      这里在渲染期把数字换算成 CSS 变量 --image-grid-cols，
      由 image-grid.css 统一消费，新增任意组合都不必再补 CSS 规则。
      变量放在内联 style 上，移动端单列等媒体查询仍可用 !important 覆盖。
    */
    const columns = parseImageGridColumns(className);

    if (!columns) {
      return <div className={className} {...props}>{children}</div>;
    }

    return (
      <div
        {...props}
        className={className}
        // 与作者在 Markdown 里手写的 style 合并，保留其自定义样式
        style={{ ...props.style, '--image-grid-cols': columns } as React.CSSProperties}
        // 标记位供 CSS 用属性选择器提高权重，压过 image-grid-2-cols 等固定列数规则
        data-image-grid-cols="true"
      >
        {children}
      </div>
    );
  },
};

/** 无语言代码（行内代码与无语言块）的逐行灰条样式，两种场景渲染结果一致 */
export function PlainCodeLines({ childrenString }: { childrenString: string }) {
  const lines = childrenString.split('\n');
  return (
    <div className="my-6 space-y-2">
      {lines.map((line, index) => (
        <div
          key={index}
          className="px-4 py-2 bg-muted/80 backdrop-blur-sm rounded-lg border border-border text-sm font-mono text-foreground hover:bg-muted transition-colors"
        >
          {line || '\u00A0'}
        </div>
      ))}
    </div>
  );
}

