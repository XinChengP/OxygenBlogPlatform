'use client';

import React, { Suspense, lazy, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { getAssetPath } from '@/utils/assetUtils';
import type { PreviewImage } from '@/types/gallery';
import type { ReactMarkdownProps } from '@/components/LazyMarkdown';
import CodeCopyButton from '@/components/CodeCopyButton';

// 懒加载 BilibiliIframe 组件
const BilibiliIframe = lazy(() => import('@/components/BilibiliIframe'));

// react-markdown 组件回调的通用额外属性
interface MarkdownExtraProps {
  node?: unknown;
}

// Markdown 各标签组件属性类型
type MarkdownCodeProps = React.ComponentPropsWithoutRef<'code'> & MarkdownExtraProps & { inline?: boolean };
type MarkdownImgProps = React.ComponentPropsWithoutRef<'img'> & MarkdownExtraProps;
type MarkdownDivProps = React.ComponentPropsWithoutRef<'div'> & MarkdownExtraProps;
type MarkdownIframeProps = React.ComponentPropsWithoutRef<'iframe'> & MarkdownExtraProps & { allowfullscreen?: boolean | string };

// 通用 Markdown 组件属性（用于不需要额外解构的组件）
interface ComponentProps {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
}

/**
 * 标准化编程语言名称，解决大小写敏感问题
 */
const normalizeLanguage = (language: string): string => {
  const languageMap: Record<string, string> = {
    // JavaScript 相关
    'javascript': 'javascript',
    'js': 'javascript',
    'jsx': 'jsx',
    'typescript': 'typescript',
    'ts': 'typescript',
    'tsx': 'tsx',
    // Python 相关
    'python': 'python',
    'py': 'python',
    'python3': 'python',
    // Java 相关
    'java': 'java',
    // C/C++ 相关
    'c': 'c',
    'cpp': 'cpp',
    'c++': 'cpp',
    'cxx': 'cpp',
    // Web 相关
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'sass': 'sass',
    'less': 'less',
    // Shell 相关
    'bash': 'bash',
    'sh': 'bash',
    'shell': 'bash',
    'zsh': 'bash',
    // 数据格式
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    'toml': 'toml',
    // 数据库
    'sql': 'sql',
    'mysql': 'sql',
    'postgresql': 'sql',
    'sqlite': 'sql',
    // 其他常用语言
    'go': 'go',
    'golang': 'go',
    'rust': 'rust',
    'php': 'php',
    'ruby': 'ruby',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'dart': 'dart',
    'r': 'r',
    'matlab': 'matlab',
    'perl': 'perl',
    'lua': 'lua',
    'scala': 'scala',
    'clojure': 'clojure',
    'haskell': 'haskell',
    'elixir': 'elixir',
    'erlang': 'erlang',
    'markdown': 'markdown',
    'latex': 'latex',
    'dockerfile': 'dockerfile',
    'makefile': 'makefile',
    'text': 'text'
  };

  const normalized = language.toLowerCase().trim();
  return languageMap[normalized] || normalized;
};

/**
 * 获取编程语言的显示名称
 */
const getLanguageDisplayName = (language: string): string => {
  const displayNameMap: Record<string, string> = {
    'javascript': 'JavaScript',
    'typescript': 'TypeScript',
    'jsx': 'JSX',
    'tsx': 'TSX',
    'python': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'Sass',
    'less': 'Less',
    'bash': 'Bash',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'toml': 'TOML',
    'sql': 'SQL',
    'go': 'Go',
    'rust': 'Rust',
    'php': 'PHP',
    'ruby': 'Ruby',
    'swift': 'Swift',
    'kotlin': 'Kotlin',
    'dart': 'Dart',
    'r': 'R',
    'matlab': 'MATLAB',
    'perl': 'Perl',
    'lua': 'Lua',
    'scala': 'Scala',
    'clojure': 'Clojure',
    'haskell': 'Haskell',
    'elixir': 'Elixir',
    'erlang': 'Erlang',
    'markdown': 'Markdown',
    'latex': 'LaTeX',
    'dockerfile': 'Dockerfile',
    'makefile': 'Makefile',
    'text': 'Text'
  };

  return displayNameMap[language] || language.charAt(0).toUpperCase() + language.slice(1);
};

/**
 * 生成博客 Markdown 渲染组件配置
 *
 * 将 ClientBlogDetail 中内嵌的庞大 components 对象提取为独立模块，
 * 降低主组件复杂度，便于维护和复用。
 */
export function useBlogMarkdownComponents(options: {
  currentTheme: string;
  imageSrcSetRef: React.MutableRefObject<Set<string>>;
  articleImagesRef: React.MutableRefObject<PreviewImage[]>;
  onImageClick: (image: PreviewImage) => void;
  iframeRefs: React.MutableRefObject<Array<HTMLIFrameElement | null>>;
}): NonNullable<ReactMarkdownProps['components']> {
  const {
    currentTheme,
    imageSrcSetRef,
    articleImagesRef,
    onImageClick,
    iframeRefs,
  } = options;

  const syntaxTheme = currentTheme === 'dark' ? oneDark : oneLight;

  // 使用 useMemo 缓存 components 对象，避免每次渲染都创建新的组件引用
  // 防止 react-markdown 因 components 引用变化而重新构建整棵组件树
  return useMemo(() => ({
    // 代码块渲染 - 优化为玻璃态风格
    code({ inline, className, children, ...props }: MarkdownCodeProps) {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? normalizeLanguage(match[1]) : '';
      const childrenString = String(children || '').replace(/\n$/, '');

      // 多行代码块（有语言指定）
      if (!inline && language) {
        return (
          <div className="relative my-6 rounded-2xl overflow-hidden shadow-lg border border-border/30">
            {/* 代码块头部 - 玻璃态风格 */}
            <div className="flex justify-between items-center bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-md px-4 py-3 text-sm border-b border-border/30">
              <div className="flex items-center gap-3">
                {/* 窗口控制点装饰 */}
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-400/80 shadow-sm"></span>
                  <span className="w-3 h-3 rounded-full bg-yellow-400/80 shadow-sm"></span>
                  <span className="w-3 h-3 rounded-full bg-green-400/80 shadow-sm"></span>
                </div>
                <span className="font-medium text-foreground/80 ml-2">{getLanguageDisplayName(language)}</span>
              </div>
              {/* 使用自管理的 CodeCopyButton，避免复制状态影响文章级别渲染 */}
              <CodeCopyButton
                code={childrenString}
                size="sm"
                showText={true}
                className="text-foreground/70 hover:text-primary hover:bg-primary/10"
              />
            </div>
            {/* 代码内容区域 */}
            <div className="overflow-hidden !bg-transparent">
              <SyntaxHighlighter
                style={syntaxTheme as any}
                language={language}
                PreTag="div"
                className="!bg-transparent"
                customStyle={{
                  margin: 0,
                  borderRadius: 0,
                  background: 'transparent',
                }}
                codeTagProps={{
                  style: {
                    background: 'transparent',
                  }
                }}
                {...props}
              >
                {childrenString}
              </SyntaxHighlighter>
            </div>
          </div>
        );
      }

      // 多行代码块（无语言指定，如快捷键列表）
      if (!inline && !language) {
        const lines = childrenString.split('\n');
        return (
          <div className="my-6 space-y-2">
            {lines.map((line, index) => (
              <div
                key={index}
                className="px-4 py-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-mono text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {line || '\u00A0'}
              </div>
            ))}
          </div>
        );
      }

      // 行内代码 - 优化为更精致的样式
      return (
        <code className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-md text-sm font-mono border border-primary/20" {...props}>
          {children}
        </code>
      );
    },
    // 覆盖默认 pre 标签，防止 react-markdown 给代码块包裹额外的 <pre> 元素
    pre({ children }: ComponentProps) {
      return <>{children}</>;
    },
    // 引用块 - 优化为玻璃态风格
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
    // 表格 - 优化为玻璃态风格
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
    // 标题
    h1({ children }: ComponentProps) {
      const id = typeof children === 'string' ?
        children.toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') :
        (Array.isArray(children) ? children : [children]).map(child =>
          typeof child === 'string' ? child : child?.toString() || ''
        ).join('').toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      return (
        <h1
          id={id}
          className="text-3xl font-bold mt-10 mb-6 pb-3 border-b-2 border-primary/20 text-foreground no-underline"
        >
          {children}
        </h1>
      );
    },
    h2({ children }: ComponentProps) {
      const id = typeof children === 'string' ?
        children.toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') :
        (Array.isArray(children) ? children : [children]).map(child =>
          typeof child === 'string' ? child : child?.toString() || ''
        ).join('').toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      return (
        <h2
          id={id}
          className="text-2xl font-semibold mt-8 mb-4 pb-2 border-b border-primary/15 text-foreground no-underline"
        >
          {children}
        </h2>
      );
    },
    h3({ children }: { children?: React.ReactNode }) {
      const id = typeof children === 'string' ?
        children.toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') :
        (Array.isArray(children) ? children : [children]).map(child =>
          typeof child === 'string' ? child : child?.toString() || ''
        ).join('').toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      return (
        <h3
          id={id}
          className="text-xl font-semibold mt-6 mb-3 text-foreground no-underline"
        >
          {children}
        </h3>
      );
    },
    h4({ children }: { children?: React.ReactNode }) {
      const id = typeof children === 'string' ?
        children.toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') :
        (Array.isArray(children) ? children : [children]).map(child =>
          typeof child === 'string' ? child : child?.toString() || ''
        ).join('').toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      return (
        <h4
          id={id}
          className="text-lg font-medium mt-4 mb-2 text-foreground no-underline"
        >
          {children}
        </h4>
      );
    },
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
    // 链接
    a({ href, children }: { href?: string; children?: React.ReactNode }) {
      return (
        <a
          href={href}
          className="text-primary hover:text-primary/80 underline decoration-primary/30 underline-offset-4 hover:decoration-primary/60 transition-all duration-200"
          target={href?.startsWith('http') ? '_blank' : undefined}
          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
        >
          {children}
        </a>
      );
    },
    // 图片 - 基础加载，支持点击放大和智能尺寸检测
    img({ src, alt, ...props }: MarkdownImgProps) {
      // 处理 GitHub Pages 基础路径
      const processedSrc = typeof src === 'string' && src ? getAssetPath(src) : src;
      const [isLandscape, setIsLandscape] = useState(false);

      // 收集文章中的图片到预览列表（按出现顺序）
      if (typeof processedSrc === 'string' && processedSrc && !imageSrcSetRef.current.has(processedSrc)) {
        imageSrcSetRef.current.add(processedSrc);
        articleImagesRef.current.push({
          id: `blog-img-${articleImagesRef.current.length}`,
          src: processedSrc,
          alt: alt || '图片',
        });
      }

      return (
        // 使用 React.Fragment 避免添加额外元素，防止在 p 标签内嵌套块级元素
        <>
          <img
            src={processedSrc}
            alt={alt || '图片'}
            className={`rounded-xl shadow-lg mx-auto h-auto my-4 cursor-pointer hover:opacity-90 transition-opacity ${
              isLandscape ? 'max-w-full' : 'max-w-[400px]'
            }`}
            loading="lazy"
            // 使用 img 标签自身的 onLoad 事件获取自然尺寸，避免 new Image() 产生额外预加载请求
            onLoad={(e) => {
              const target = e.currentTarget;
              setIsLandscape(target.naturalWidth > target.naturalHeight);
            }}
            onClick={() => {
              // 从已收集的文章图片列表中找到当前点击的图片
              const existingImage = articleImagesRef.current.find(
                (img) => img.src === processedSrc
              );
              if (existingImage) {
                onImageClick(existingImage);
              }
            }}
            {...props}
          />
          {alt && (
            // 使用 em 标签显示图片描述，避免嵌套块级元素
            <em className="block text-sm text-muted-foreground mt-2 mb-4 italic text-center">{alt}</em>
          )}
        </>
      );
    },
    // div - 支持自定义图片网格
    div({ className, children, ...props }: MarkdownDivProps) {
      const isImageGrid = className?.includes('image-grid');

      if (isImageGrid) {
        return (
          <div className={className} {...props}>
            {children}
          </div>
        );
      }

      return <div className={className} {...props}>{children}</div>;
    },
    // iframe 处理 - 增强错误处理和清理
    iframe({ src, allowfullscreen, ...props }: MarkdownIframeProps) {
      // 将字符串 "true" 转换为布尔值 true，确保传递布尔值给React属性
      const shouldAllowFullScreen = allowfullscreen === "true" || allowfullscreen === true;

      // B站视频特殊处理 - 使用专用组件处理
      const isBilibiliVideo = src?.includes('player.bilibili.com');

      if (isBilibiliVideo && src) {
        return (
          <Suspense fallback={
            <div className="my-8 rounded-xl overflow-hidden shadow-lg bg-muted flex items-center justify-center h-64 md:h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-muted-foreground">B站视频加载中...</p>
              </div>
            </div>
          }>
            <BilibiliIframe
              src={src}
              allowFullScreen={shouldAllowFullScreen}
            />
          </Suspense>
        );
      }

      // 普通iframe处理
      return (
        <div className="my-8 rounded-xl overflow-hidden shadow-lg">
          <iframe
            src={src}
            {...(shouldAllowFullScreen ? { allowFullScreen: true } : {})}
            {...props}
            className="w-full h-64 md:h-96 border-0"
            // 添加ref来跟踪iframe元素
            ref={(el) => {
              if (el) {
                iframeRefs.current.push(el);
              }
            }}
          />
        </div>
      );
    }
  }), [currentTheme, syntaxTheme, imageSrcSetRef, articleImagesRef, onImageClick, iframeRefs]);
}
