'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';
import LazyMarkdown from '@/components/LazyMarkdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ClipboardIcon } from '@heroicons/react/24/outline';
import CopyrightNotice from '@/components/CopyrightNotice';

import OptimizedImage from '@/components/OptimizedImage';
import TableOfContents from '@/components/TableOfContents';
import ScrollToTop from '@/components/ScrollToTop';
import GiscusComments from '@/components/GiscusComments';
import 'katex/dist/katex.min.css';
import { EndWord } from '@/setting/blogSetting';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { useTheme } from 'next-themes';

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

interface LinkProps {
  href?: string;
  children?: React.ReactNode;
}
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
 * 
 * @param blog - 博客文章数据
 * @returns JSX 元素
 */
export default function ClientBlogDetail({ blog }: ClientBlogDetailProps) {
  const { theme } = useTheme();
  const { containerStyle } = useBackgroundStyle('blog-detail');
  const [copiedCode, setCopiedCode] = useState<string>('');

  // 复制代码功能
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    });
  };

  // 语法高亮主题
  const syntaxTheme = theme === 'dark' ? oneDark : oneLight;

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* 文章头部信息 */}
          <motion.header 
            className="mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* 封面图片 */}
            {blog.coverImage && (
              <motion.div 
                className="mb-6 rounded-lg overflow-hidden shadow-lg"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <OptimizedImage
                  src={blog.coverImage}
                  alt={blog.title}
                  className="w-full h-64 md:h-80 object-cover"
                  width={800}
                  height={320}
                />
              </motion.div>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              {blog.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                <span>{blog.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <span>{blog.category}</span>
              </div>
              <div className="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span>{blog.readTime} 分钟阅读</span>
              </div>
              {blog.author && (
                <div className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                  <span>{blog.author}</span>
                </div>
              )}
              {blog.language && (
                <div className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 01-1.44 1.389c-.188-.196-.373-.396-.554-.6a19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.675.753-1.402 1.008-2.174H4a1 1 0 110-2h3V3a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  <span>{blog.language}</span>
                </div>
              )}
            </div>
            {blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {blog.tags.map((tag, index) => (
                  <span 
                    key={index} 
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            {blog.excerpt && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
                <p className="text-muted-foreground italic">{blog.excerpt}</p>
              </div>
            )}
            {blog.series && (
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                </svg>
                <span>系列: {blog.series}</span>
                {blog.seriesOrder && (
                  <span className="px-2 py-1 bg-primary/20 text-primary rounded-full text-xs">
                    第 {blog.seriesOrder} 篇
                  </span>
                )}
              </div>
            )}
          </motion.header>

          {/* 目录导航 */}
          <motion.div 
            className="mb-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <TableOfContents content={blog.content} />
          </motion.div>

          {/* 文章内容 */}
          <motion.article 
            className="prose prose-lg dark:prose-invert max-w-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="bg-card rounded-lg shadow-sm p-6 md:p-8">
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
                          <div className="relative">
                            <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 rounded-t-lg">
                              <span>{getLanguageDisplayName(language)}</span>
                              <button
                                onClick={() => copyToClipboard(childrenString)}
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                                title="复制代码"
                              >
                                <ClipboardIcon className="h-4 w-4" />
                                <span>{copiedCode === childrenString ? '已复制!' : '复制'}</span>
                              </button>
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
                        <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded text-sm font-mono" {...props}>
                          {children}
                        </code>
                      );
                    },
                    // 引用块
                    blockquote({ children }: ComponentProps) {
                       return (
                         <blockquote className="border-l-4 border-primary bg-primary/5 p-4 my-4 rounded-r-lg">
                           <div className="flex items-start">
                             <div className="text-primary mr-2 text-lg">💡</div>
                             <div className="flex-1">{children}</div>
                           </div>
                         </blockquote>
                       );
                     },
                     // 表格
                     table({ children }: ComponentProps) {
                       return (
                         <div className="overflow-x-auto my-6">
                           <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-600 rounded-lg">
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
                         <tr className="hover:bg-gray-100 dark:hover:bg-gray-800">
                           {children}
                         </tr>
                       );
                     },
                     th({ children }: ComponentProps) {
                       return (
                         <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
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
                         React.Children.toArray(children).join('').toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                       return (
                         <h1 id={id} className="text-3xl font-bold mt-8 mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 text-foreground no-underline">
                           {children}
                         </h1>
                       );
                     },
                     h2({ children }: ComponentProps) {
                       const id = typeof children === 'string' ? 
                         children.toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') :
                         React.Children.toArray(children).join('').toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                       return (
                         <h2 id={id} className="text-2xl font-semibold mt-6 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 text-foreground no-underline">
                           {children}
                         </h2>
                       );
                     },
                     h3({ children }: { children: React.ReactNode }) {
                       const id = typeof children === 'string' ? 
                         children.toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') :
                         React.Children.toArray(children as React.ReactNode[]).join('').toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                       return (
                         <h3 id={id} className="text-xl font-semibold mt-5 mb-2 text-foreground no-underline">
                           {children}
                         </h3>
                       );
                     },
                     h4({ children }: { children: React.ReactNode }) {
                       const id = typeof children === 'string' ? 
                         children.toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') :
                         React.Children.toArray(children as React.ReactNode[]).join('').toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                       return (
                         <h4 id={id} className="text-lg font-semibold mt-4 mb-2 text-foreground no-underline">
                           {children}
                         </h4>
                       );
                     },
                     h5({ children }: { children: React.ReactNode }) {
                       const id = typeof children === 'string' ? 
                         children.toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') :
                         React.Children.toArray(children as React.ReactNode[]).join('').toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                       return (
                         <h5 id={id} className="text-base font-semibold mt-3 mb-2 text-foreground no-underline">
                           {children}
                         </h5>
                       );
                     },
                     h6({ children }: { children: React.ReactNode }) {
                       const id = typeof children === 'string' ? 
                         children.toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') :
                         React.Children.toArray(children as React.ReactNode[]).join('').toLowerCase().replace(/[^\w\u4e00-\u9fff\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
                       return (
                         <h6 id={id} className="text-sm font-semibold mt-3 mb-2 text-foreground no-underline">
                           {children}
                         </h6>
                       );
                     },
                     // 列表
                     ol({ children }: any) {
                       return (
                         <ol className="list-decimal list-outside ml-6 my-4 space-y-2 text-gray-700 dark:text-gray-300 break-words">
                           {children}
                         </ol>
                       );
                     },
                     ul({ children }: any) {
                       return (
                         <ul className="list-disc list-outside ml-6 my-4 space-y-2 text-gray-700 dark:text-gray-300 break-words">
                           {children}
                         </ul>
                       );
                     },
                     li({ children }: any) {
                       return (
                         <li className="text-gray-700 dark:text-gray-300 leading-relaxed break-words">
                           {children}
                         </li>
                       );
                     },
                     // 链接
                     a({ href, children }: LinkProps) {
                       return (
                         <a 
                           href={href as string}
                           className="text-primary hover:text-primary/80 underline decoration-2 underline-offset-2 transition-colors"
                           target={href?.startsWith('http') ? '_blank' : '_self'}
                           rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                         >
                           {children}
                         </a>
                       );
                     },
                     // 图片
                     img({ src, alt, title }: { src?: string; alt?: string; title?: string }) {
                       if (!src) return null;
                       
                       return (
                         <OptimizedImage
                           src={src}
                           alt={alt || ''}
                           title={title}
                           className="my-2 mx-auto block max-w-full shadow-lg"
                           width={800}
                           height={600}
                         />
                       );
                     }
                    }}
                />
              </div>
            </div>
          </motion.article>
          
          <CopyrightNotice
            title={blog.title}
            publishDate={blog.date}
            slug={blog.slug}
            reference={blog.reference}
          />
          
          {/* 评论区 */}
          <motion.div 
            className="mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <div className="bg-card rounded-lg shadow-sm p-6 md:p-8">
              <h3 className="text-xl font-semibold mb-4 text-foreground">评论区</h3>
              <GiscusComments id={blog.slug} title={blog.title} />
            </div>
          </motion.div>
          
          {/* 文章底部导航 */}
          <motion.div 
            className="mt-12 flex justify-between items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Link 
              href="/blogs" 
              className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors border border-gray-200 dark:border-gray-700"
            >
              ← 返回列表
            </Link>
            <div className="text-sm text-gray-500 dark:text-gray-500">
              {EndWord}
            </div>
          </motion.div>
        </motion.div>
      </div>
      
      {/* 添加页面滚动导航组件 */}
      <ScrollToTop />
    </div>
  );
}