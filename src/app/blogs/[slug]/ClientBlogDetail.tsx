'use client';

import { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import LazyMarkdown from '../../../components/LazyMarkdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { 
  ClipboardIcon,
  CalendarIcon,
  TagIcon,
  UserIcon,
  GlobeAltIcon,
  BookOpenIcon
} from '@heroicons/react/24/outline';


import 'katex/dist/katex.min.css';
import { EndWord } from '../../../setting/blogSetting';
import { useBackgroundStyle } from '../../../hooks/useBackgroundStyle';
import { useTheme } from 'next-themes';

// 动态导入大型组件，优化初始加载性能
const LazyTableOfContents = lazy(() => import('../../../components/TableOfContents'));
const LazyScrollToTop = lazy(() => import('../../../components/ScrollToTop'));
const LazyGiscusComments = lazy(() => import('../../../components/GiscusComments'));
const LazyCopyrightNotice = lazy(() => import('../../../components/CopyrightNotice'));

/**
 * 标准化编程语言名称，解决大小写敏感问题
 * 
 * @param language - 原始语言名称
 * @returns 标准化后的语言名称
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
    
    // 标记语言
    'markdown': 'markdown',
    'md': 'markdown',
    'latex': 'latex',
    'tex': 'latex',
    
    // 配置文件
    'dockerfile': 'dockerfile',
    'docker': 'dockerfile',
    'makefile': 'makefile',
    'make': 'makefile',
    
    // 其他
    'text': 'text',
    'txt': 'text',
    'plain': 'text',
    'plaintext': 'text'
  };
  
  const normalizedInput = language.toLowerCase().trim();
   return languageMap[normalizedInput] || normalizedInput;
 };

/**
 * 获取语言的友好显示名称
 * 
 * @param language - 标准化后的语言名称
 * @returns 用于显示的友好名称
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

interface ComponentProps {
  children?: React.ReactNode;
  [key: string]: any;
}

interface BlogPost {
  title: string;
  date: string;
  category: string;
  tags: string[];
  readTime: number;
  excerpt: string;
  content: string;
  slug: string;
  author?: string;
  series?: string;
  seriesOrder?: number;
  coverImage?: string;
  language?: string;
  canonicalUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  reference?: Array<{description: string; link: string}>;
}

interface ClientBlogDetailProps {
  blog: BlogPost;
}

// 互动功能Hook - 已移除点赞、收藏、分享、浏览统计功能

/**
 * 博客详情客户端组件
 * 
 * 功能特点：
 * - 使用 framer-motion 提供动画效果
 * - 使用 ReactMarkdown 渲染 Markdown 格式的文章内容
 * - 支持语法高亮显示代码块
 * - 支持数学公式渲染
 * - 支持图片优化显示
 * - 支持目录导航
 * - 支持评论系统
 * - 支持主题切换
 * - 支持复制代码功能
 * - 支持响应式布局
 * - 新增互动功能（点赞、收藏、分享）
 * - 增强视觉设计和用户体验
 * 
 * @param blog - 博客文章数据
 * @returns JSX 元素
 */
export default function ClientBlogDetail({ blog }: ClientBlogDetailProps) {
  const { theme } = useTheme();
  const { containerStyle } = useBackgroundStyle('blog-detail');
  const [copiedCode, setCopiedCode] = useState<string>('');
  const [readingProgress, setReadingProgress] = useState(0);
  const [, setMarkdownComponents] = useState<any>(null);
  const isLoadedRef = useRef(false);



  // 复制代码功能
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    });
  };

  // 语法高亮主题
  const syntaxTheme = theme === 'dark' ? oneDark : oneLight;

  // 延迟加载 Markdown 组件和插件，提升初始加载性能
  // 使用 useRef 防止路由切换时重复加载
  useEffect(() => {
    if (isLoadedRef.current) return; // 防止重复加载
    
    const loadPlugins = async () => {
      try {
        // 动态导入 Markdown 渲染组件
        const ReactMarkdown = (await import('react-markdown')).default;
        const remarkGfm = (await import('remark-gfm')).default;
        const remarkMath = (await import('remark-math')).default;
        const rehypeKatex = (await import('rehype-katex')).default;
        const rehypeHighlight = (await import('rehype-highlight')).default;
        
        setMarkdownComponents({
          ReactMarkdown,
          remarkPlugins: [remarkGfm, remarkMath],
          rehypePlugins: [rehypeKatex, rehypeHighlight]
        });
        isLoadedRef.current = true;
      } catch (error) {
        console.error('Failed to load markdown components:', error);
      }
    };

    loadPlugins();
  }, [blog.content]);

  // 监听滚动进度
  useEffect(() => {
    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      const scrollableHeight = documentHeight - windowHeight;
      const progress = scrollableHeight > 0 ? (scrollTop / scrollableHeight) * 100 : 0;
      
      setReadingProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始计算

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      {/* 阅读进度条 */}
      <motion.div 
        className="fixed top-0 left-0 w-full h-1 bg-background/80 backdrop-blur-sm z-40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div 
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${readingProgress}%` }}
        />
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div>
          {/* 文章头部信息 */}
          <header className="mb-10">
            {/* 封面图片 */}
            {blog.coverImage && (
              <div className="mb-6 rounded-xl overflow-hidden shadow-2xl">
                <img
                  src={blog.coverImage}
                  alt={blog.title}
                  className="w-full h-64 md:h-96 object-cover transform hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
              </div>
            )}
            
            {/* 文章标题 */}
            <motion.h1 
              className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {blog.title}
            </motion.h1>

            {/* 文章摘要 - 移动到标题下方 */}
            {blog.excerpt && (
              <motion.div 
                className="mb-8 p-6 bg-card/50 backdrop-blur-sm rounded-xl border-l-4 border-primary shadow-sm"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <p className="text-muted-foreground italic text-lg leading-relaxed">{blog.excerpt}</p>
              </motion.div>
            )}

            {/* 文章元信息 */}
            <motion.div 
              className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm rounded-lg p-4 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center gap-1">
                <CalendarIcon className="h-4 w-4" />
                <span>{blog.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <TagIcon className="h-4 w-4" />
                <span>{blog.category}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpenIcon className="h-4 w-4" />
                <span>{blog.readTime} 分钟阅读</span>
              </div>
              {blog.author && (
                <div className="flex items-center gap-1">
                  <UserIcon className="h-4 w-4" />
                  <span>{blog.author}</span>
                </div>
              )}
              {blog.language && (
                <div className="flex items-center gap-1">
                  <GlobeAltIcon className="h-4 w-4" />
                  <span>{blog.language}</span>
                </div>
              )}
            </motion.div>

            {/* 目录导航 */}
            <div className="mb-8">
              <Suspense fallback={<div className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>}>
                <LazyTableOfContents content={blog.content} />
              </Suspense>
            </div>
          </header>

          {/* 文章内容 */}
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <div className="bg-card/50 backdrop-blur-sm rounded-xl shadow-lg p-6 md:p-8">
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <LazyMarkdown
                  content={blog.content}
                  components={{
                    // 代码块渲染
                    code({ inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const language = match ? normalizeLanguage(match[1]) : '';
                      const childrenString = String(children || '').replace(/\n$/, '');
                      
                      if (!inline && language) {
                        return (
                          <div className="relative my-6">
                            <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 px-4 py-3 text-sm text-gray-600 dark:text-gray-400 rounded-t-lg border-b border-gray-200 dark:border-gray-700">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{getLanguageDisplayName(language)}</span>
                              </div>
                              <motion.button
                                onClick={() => copyToClipboard(childrenString)}
                                className="flex items-center gap-2 hover:text-primary transition-colors px-3 py-1 rounded-md hover:bg-white/20 dark:hover:bg-black/20"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                title="复制代码"
                              >
                                <ClipboardIcon className="h-4 w-4" />
                                <span className="text-xs">{copiedCode === childrenString ? '已复制!' : '复制'}</span>
                              </motion.button>
                            </div>
                            <div className="rounded-b-lg overflow-hidden">
                              <SyntaxHighlighter
                                style={syntaxTheme}
                                language={language}
                                PreTag="div"
                                {...props}
                              >
                                {childrenString}
                              </SyntaxHighlighter>
                            </div>
                          </div>
                        );
                      }
                      
                      // 行内代码
                      return (
                        <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md text-sm font-mono border border-gray-200 dark:border-gray-700" {...props}>
                          {children}
                        </code>
                      );
                    },
                    // 引用块
                    blockquote({ children }: ComponentProps) {
                      return (
                        <blockquote className="border-l-4 border-primary bg-primary/5 p-6 my-6 rounded-r-xl shadow-sm">
                          <div className="flex items-start gap-3">
                            <div className="text-primary text-xl">💡</div>
                            <div className="flex-1 text-base leading-relaxed">{children}</div>
                          </div>
                        </blockquote>
                      );
                    },
                    // 表格
                    table({ children }: ComponentProps) {
                      return (
                        <div className="overflow-x-auto my-8">
                          <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden shadow-sm">
                            {children}
                          </table>
                        </div>
                      );
                    },
                    thead({ children }: ComponentProps) {
                      return (
                        <thead className="bg-gray-100 dark:bg-gray-800">
                          {children}
                        </thead>
                      );
                    },
                    tbody({ children }: ComponentProps) {
                      return (
                        <tbody className="bg-background divide-y divide-gray-200 dark:divide-gray-700">
                          {children}
                        </tbody>
                      );
                    },
                    tr({ children }: ComponentProps) {
                      return (
                        <tr className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                          {children}
                        </tr>
                      );
                    },
                    th({ children }: ComponentProps) {
                      return (
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                          {children}
                        </th>
                      );
                    },
                    td({ children }: ComponentProps) {
                      return (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
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
                          className="text-2xl font-semibold mt-8 mb-4 pb-2 border-b border-primary/20 text-foreground no-underline"
                        >
                          {children}
                        </h2>
                      );
                    },
                    h3({ children }: { children: React.ReactNode }) {
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
                    h4({ children }: { children: React.ReactNode }) {
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
                      return (
                        <p className="mb-4 leading-relaxed text-base">
                          {children}
                        </p>
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
                    a({ href, children }: { href?: string; children: React.ReactNode }) {
                      return (
                        <a 
                          href={href} 
                          className="text-primary hover:text-primary/80 underline decoration-wavy hover:decoration-solid transition-all duration-200"
                          target={href?.startsWith('http') ? '_blank' : undefined}
                          rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                        >
                          {children}
                        </a>
                      );
                    },
                    // 图片 - 基础加载
                    img({ src, alt }: any) {
                      return (
                        <div className="my-8 text-center">
                          <img
                            src={src}
                            alt={alt || '图片'}
                            className="rounded-xl shadow-lg mx-auto max-w-full h-auto"
                            loading="lazy"
                          />
                          {alt && (
                            <p className="text-sm text-muted-foreground mt-3 italic">{alt}</p>
                          )}
                        </div>
                      );
                    }
                  }}
                />
              </div>
            </div>
          </article>

          {/* 文章结尾 */}
          <div className="mt-12 text-center">
            {/* 标签和系列信息 - 移动到文章后面 */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
              {blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 bg-card/50 backdrop-blur-sm rounded-xl p-4 border-l-4 border-primary shadow-sm">
                  {blog.tags.map((tag, index) => (
                    <span 
                      key={index} 
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              
              {blog.series && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card/50 backdrop-blur-sm px-4 py-3 rounded-xl border-l-4 border-primary shadow-sm">
                  <BookOpenIcon className="h-4 w-4" />
                  <span>系列: {blog.series}</span>
                  {blog.seriesOrder && (
                    <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs">
                      第 {blog.seriesOrder} 篇
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-6 mb-8">
              <p className="text-lg text-muted-foreground italic">{EndWord}</p>
            </div>

            {/* 版权声明 */}
            <Suspense fallback={<div className="h-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>}>
              <LazyCopyrightNotice title={blog.title} publishDate={blog.date} slug={blog.slug} reference={blog.reference} />
            </Suspense>
          </div>

          {/* 评论区 */}
          <div className="mt-12">
            <Suspense fallback={<div className="h-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>}>
              <LazyGiscusComments id={blog.slug} title={blog.title} />
            </Suspense>
          </div>
        </div>
      </div>

      {/* 浮动互动按钮 - 已移除 */}

      {/* 返回顶部按钮 */}
      <Suspense fallback={null}>
        <LazyScrollToTop />
      </Suspense>
    </div>
  );
}

