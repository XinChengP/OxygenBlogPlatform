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
import { getAssetPath } from '../../../utils/assetUtils';
import { Live2DMessageHelper } from '../../../utils/live2dMessageManager';
import { trackArticleView } from '../../../components/Analytics';

// 动态导入大型组件，优化初始加载性能
const LazyTableOfContents = lazy(() => import('../../../components/TableOfContents'));
const LazyGiscusComments = lazy(() => import('../../../components/GiscusComments'));
const LazyCopyrightNotice = lazy(() => import('../../../components/CopyrightNotice'));
const BilibiliIframe = lazy(() => import('../../../components/BilibiliIframe'));

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
  updatedAt?: string;
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
  hidden?: boolean;
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
  const { theme, resolvedTheme } = useTheme();
  const { containerStyle } = useBackgroundStyle('blog-detail');
  const [copiedCode, setCopiedCode] = useState<string>('');
  const [mounted, setMounted] = useState(false);
  const iframeRefs = useRef<Array<HTMLIFrameElement | null>>([]);

  // 确保组件已挂载，避免 SSR 期间 theme 为 null
  useEffect(() => {
    setMounted(true);
  }, []);

  // 在挂载前使用默认主题
  const currentTheme = mounted ? resolvedTheme : 'light';
  
  // 计算文章时效性
  const calculateArticleAge = () => {
    const now = new Date();
    const articleDateStr = blog.updatedAt || blog.date;
    const articleDate = new Date(articleDateStr);
    
    // 计算年份差值
    const nowYear = now.getFullYear();
    const articleYear = articleDate.getFullYear();
    const nowMonth = now.getMonth();
    const articleMonth = articleDate.getMonth();
    const nowDay = now.getDate();
    const articleDay = articleDate.getDate();
    
    // 计算完整年份差值
    let diffYears = nowYear - articleYear;
    
    // 如果当前月份小于文章月份，或者月份相同但当前日期小于文章日期，减去1年
    if (nowMonth < articleMonth || (nowMonth === articleMonth && nowDay < articleDay)) {
      diffYears--;
    }
    
    // 确定日期类型文本
    const dateTypeText = blog.updatedAt ? '更新' : '发布';
    
    if (diffYears >= 3) {
      return {
        message: `本文于 ${articleYear} 年${dateTypeText}，距今已超过 ${diffYears} 年，文中内容可能已过时`,
        type: 'warning' as const
      };
    } else if (diffYears >= 1) {
      return {
        message: `本文于 ${articleYear} 年${dateTypeText}，距今已超过 ${diffYears} 年，部分内容可能已更新`,
        type: 'info' as const
      };
    }
    return null;
  };
  
  const articleAgeInfo = calculateArticleAge();



  // 复制代码功能
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    });
  };

  // 复制密码功能
  useEffect(() => {
    // 设置CSS变量以支持深色模式
    const setPasswordStyles = () => {
      const root = document.documentElement;
      if (currentTheme === 'dark') {
        root.style.setProperty('--password-bg', 'rgba(55, 65, 81, 0.3)'); // gray-700 30% 透明
        root.style.setProperty('--password-text', '#f3f4f6'); // gray-100
        root.style.setProperty('--password-border', 'rgba(75, 85, 99, 0.5)'); // gray-600 50% 透明
        root.style.setProperty('--password-hover-bg', 'rgba(75, 85, 99, 0.5)'); // gray-600 50% 透明
      } else {
        root.style.setProperty('--password-bg', 'rgba(240, 240, 240, 0.3)'); // 30% 透明
        root.style.setProperty('--password-text', 'inherit');
        root.style.setProperty('--password-border', 'rgba(221, 221, 221, 0.5)'); // 50% 透明
        root.style.setProperty('--password-hover-bg', 'rgba(229, 229, 229, 0.5)'); // 50% 透明
      }
    };

    setPasswordStyles();

    const handlePasswordClick = (e: Event) => {
      const target = e.target as HTMLElement;
      const passwordSpan = target.closest('[data-password]');
      
      if (passwordSpan) {
        e.preventDefault();
        const password = passwordSpan.getAttribute('data-password');
        if (password) {
          // 检查 clipboard API 是否可用
          if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            navigator.clipboard.writeText(password).then(() => {
              const originalText = passwordSpan.textContent;
              const originalBackgroundColor = (passwordSpan as HTMLElement).style.backgroundColor;
              const originalColor = (passwordSpan as HTMLElement).style.color;
              
              (passwordSpan as HTMLElement).textContent = '已复制!';
                (passwordSpan as HTMLElement).style.backgroundColor = '#4CAF50';
                (passwordSpan as HTMLElement).style.color = 'white';
                
                setTimeout(() => {
                  (passwordSpan as HTMLElement).textContent = originalText || '';
                  (passwordSpan as HTMLElement).style.backgroundColor = originalBackgroundColor;
                  (passwordSpan as HTMLElement).style.color = originalColor;
              }, 1500);
            }).catch(() => {
              // 降级方案
              const textArea = document.createElement('textarea');
              textArea.value = password;
              textArea.style.position = 'fixed';
              textArea.style.left = '-999999px';
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              try {
                document.execCommand('copy');
                const originalText = (passwordSpan as HTMLElement).textContent;
                const originalBackgroundColor = (passwordSpan as HTMLElement).style.backgroundColor;
                const originalColor = (passwordSpan as HTMLElement).style.color;
                
                (passwordSpan as HTMLElement).textContent = '已复制!';
                (passwordSpan as HTMLElement).style.backgroundColor = '#4CAF50';
                (passwordSpan as HTMLElement).style.color = 'white';
                
                setTimeout(() => {
                  (passwordSpan as HTMLElement).textContent = originalText || '';
                  (passwordSpan as HTMLElement).style.backgroundColor = originalBackgroundColor;
                  (passwordSpan as HTMLElement).style.color = originalColor;
                }, 1500);
              } catch {
                alert('复制失败，请手动复制：' + password);
              }
              document.body.removeChild(textArea);
            });
          } else {
            // 直接使用降级方案
            const textArea = document.createElement('textarea');
            textArea.value = password;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
              document.execCommand('copy');
              const originalText = passwordSpan.textContent;
              const originalBackgroundColor = (passwordSpan as HTMLElement).style.backgroundColor;
              const originalColor = (passwordSpan as HTMLElement).style.color;
              
              (passwordSpan as HTMLElement).textContent = '已复制!';
              (passwordSpan as HTMLElement).style.backgroundColor = '#4CAF50';
              (passwordSpan as HTMLElement).style.color = 'white';
              
              setTimeout(() => {
                (passwordSpan as HTMLElement).textContent = originalText || '';
                (passwordSpan as HTMLElement).style.backgroundColor = originalBackgroundColor;
                (passwordSpan as HTMLElement).style.color = originalColor;
              }, 1500);
            } catch {
              alert('复制失败，请手动复制：' + password);
            }
            document.body.removeChild(textArea);
          }
        }
      }
    };

    // 为密码元素添加悬停效果
    const handlePasswordHover = (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target || !target.closest) return;
      
      const passwordSpan = target.closest('[data-password]');
      
      if (passwordSpan && !passwordSpan.textContent?.includes('已复制!')) {
        if (e.type === 'mouseenter') {
          (passwordSpan as HTMLElement).style.backgroundColor = currentTheme === 'dark' ? 'rgba(75, 85, 99, 0.5)' : 'rgba(229, 229, 229, 0.5)';
        } else if (e.type === 'mouseleave') {
          (passwordSpan as HTMLElement).style.backgroundColor = '';
        }
      }
    };

    // 添加事件监听器
    document.addEventListener('click', handlePasswordClick);
    document.addEventListener('mouseenter', handlePasswordHover, true);
    document.addEventListener('mouseleave', handlePasswordHover, true);
    
    // 监听主题变化
    const observer = new MutationObserver(() => {
      setPasswordStyles();
    });
    
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });
    
    // 清理函数
    return () => {
      document.removeEventListener('click', handlePasswordClick);
      document.removeEventListener('mouseenter', handlePasswordHover, true);
      document.removeEventListener('mouseleave', handlePasswordHover, true);
      observer.disconnect();
    };
  }, [currentTheme]);

  // 语法高亮主题
  const syntaxTheme = currentTheme === 'dark' ? oneDark : oneLight;

  // 检测隐藏标签博客并触发彩蛋消息
  useEffect(() => {
    // 如果博客带有 hidden 标签，触发 Live2D 彩蛋消息
    if (blog.hidden) {
      // 延迟触发，避免与其他初始化消息冲突
      const timer = setTimeout(() => {
        Live2DMessageHelper.showHiddenTagEasterEgg();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [blog.hidden]);

  // 清理 iframe 资源 - 防止页面切换时的脚本错误
  useEffect(() => {
    return () => {
      // 清理所有 iframe 引用
      iframeRefs.current.forEach(iframe => {
        if (iframe && iframe.src) {
          try {
            // 清空 iframe 的 src，停止加载外部脚本
            iframe.src = 'about:blank';
            // 尝试清理 iframe 内容
            iframe.contentWindow?.location?.replace('about:blank');
          } catch (e) {
            // 忽略跨域错误
            console.debug('清理 iframe 时出错:', e);
          }
        }
      });
      iframeRefs.current = [];
      
      // 清理 B 站相关的全局脚本
      if (typeof window !== 'undefined') {
        // 移除可能存在的 B 站脚本创建的 DOM 元素
        const bilibiliScripts = document.querySelectorAll('script[src*="bilibili"]');
        bilibiliScripts.forEach(script => {
          try {
            script.remove();
          } catch (e) {
            console.debug('清理脚本时出错:', e);
          }
        });
      }
    };
  }, []);

  // 文章浏览统计 - 在组件挂载时上报
  useEffect(() => {
    // 延迟上报，确保 SDK 已加载
    const timer = setTimeout(() => {
      trackArticleView(blog.title, blog.slug, blog.category);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [blog.title, blog.slug, blog.category]);



  return (
    <div className={containerStyle.className} style={containerStyle.style}>


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
                  width={800}
                  height={384}
                  className="w-full h-64 md:h-96 object-cover transform hover:scale-105 transition-transform duration-500"
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
                <span>发布于 {blog.date}</span>
              </div>
              {blog.updatedAt && (
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  <span>更新于 {blog.updatedAt}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <TagIcon className="h-4 w-4" />
                <span>{blog.category}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpenIcon className="h-4 w-4" />
                <span>预计阅读时间{blog.readTime}分钟</span>
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
            
            {/* 文章时效性说明 - 仅技术分类显示 */}
            {articleAgeInfo && blog.category === '技术' && (
              <motion.div 
                className={`mt-4 mb-8 p-4 bg-card/50 backdrop-blur-sm rounded-lg shadow-sm border-l-4 ${articleAgeInfo.type === 'warning' ? 'border-amber-400' : 'border-primary'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <span className={`font-medium ${articleAgeInfo.type === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>
                  {articleAgeInfo.type === 'warning' ? '时效性提示' : '时效性说明'}
                </span>
                <span className="ml-2 text-muted-foreground">{articleAgeInfo.message}</span>
              </motion.div>
            )}

            {/* 目录导航 */}
            <div className="mb-8">
              <Suspense fallback={<div className="h-32 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg"></div>}>
                <LazyTableOfContents content={blog.content} />
              </Suspense>
            </div>
          </header>

          {/* 文章内容 */}
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <style jsx>{`
              /* 只对根级别的p标签添加缩进 */
              .prose > p {
                margin-left: 1.5rem;
              }
              
              /* 确保特殊元素不被缩进 */
              .prose > h1,
              .prose > h2,
              .prose > h3,
              .prose > h4,
              .prose > h5,
              .prose > h6,
              .prose > blockquote,
              .prose > ul,
              .prose > ol,
              .prose > table,
              .prose > pre,
              .prose > div {
                margin-left: 0;
              }
              
              /* 确保特殊元素内的p标签不被缩进 - 覆盖内联样式 */
              .prose blockquote p,
              .prose ul p,
              .prose ol p,
              .prose table p,
              .prose pre p,
              .prose div p {
                margin-left: 0 !important;
                text-indent: 0 !important;
              }
              
              /* 确保特殊元素内的所有内容都不被缩进 */
              .prose blockquote *,
              .prose div *:not(.flex):not(.flex *) {
                margin-left: 0 !important;
                text-indent: 0 !important;
              }
              
              /* 保留 flex 布局容器的样式 */
              .prose .flex {
                display: flex !important;
              }
              
              .prose .flex-wrap {
                flex-wrap: wrap !important;
              }
              
              .prose .justify-center {
                justify-content: center !important;
              }
              
              .prose .gap-2 {
                gap: 0.5rem !important;
              }
              
              .prose .flex > img {
                margin-left: 0 !important;
                margin-right: 0 !important;
              }
            `}</style>
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
                      // 检查表格内容是否主要是图片（用于图片布局）
                      const childrenStr = JSON.stringify(children);
                      const isImageTable = childrenStr.includes('"img"') || childrenStr.includes('src');
                      
                      if (isImageTable) {
                        return (
                          <div className="overflow-x-auto my-8">
                            <table className="w-full border-collapse border-0">
                              {children}
                            </table>
                          </div>
                        );
                      }
                      
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
                      // 检查表头内容（用于判断是否是图片表格）
                      const childrenStr = JSON.stringify(children);
                      const isImageHeader = childrenStr.includes('图') || childrenStr.includes('图片');
                      
                      if (isImageHeader) {
                        return (
                          <th className="px-2 py-2 text-center text-sm font-semibold text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                            {children}
                          </th>
                        );
                      }
                      
                      return (
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700">
                          {children}
                        </th>
                      );
                    },
                    td({ children }: ComponentProps) {
                      // 检查单元格内容是否只包含图片
                      const childrenArray = Array.isArray(children) ? children : [children];
                      const hasOnlyImages = childrenArray.every(child => {
                        if (child && typeof child === 'object') {
                          const type = child.type;
                          if (type === 'img' || (type && type.name === 'img')) {
                            return true;
                          }
                          if (child.props && child.props.src) {
                            return true;
                          }
                        }
                        if (typeof child === 'string' && child.trim() === '') {
                          return true;
                        }
                        return false;
                      });
                      
                      // 如果只包含图片，使用适合图片的样式
                      if (hasOnlyImages && childrenArray.length > 0) {
                        return (
                          <td className="px-2 py-2 text-center border-b border-gray-200 dark:border-gray-700">
                            {children}
                          </td>
                        );
                      }
                      
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
                      // 检查博客是否带有"简谱"标签，如果有则不添加首行缩进
                      const hasSheetMusicTag = blog.tags && blog.tags.some(tag => tag === '简谱');
                      
                      // 检查段落内容是否只包含图片（用于行内布局）
                      const childrenArray = Array.isArray(children) ? children : [children];
                      const hasOnlyImages = childrenArray.every(child => {
                        // 检查是否是图片元素或包含图片的React元素
                        if (child && typeof child === 'object') {
                          const type = child.type;
                          // 检查是否是 img 标签或自定义图片组件
                          if (type === 'img' || (type && type.name === 'img')) {
                            return true;
                          }
                          // 检查 props 中是否有 src 属性（自定义图片组件）
                          if (child.props && child.props.src) {
                            return true;
                          }
                        }
                        // 检查是否是空文本节点
                        if (typeof child === 'string' && child.trim() === '') {
                          return true;
                        }
                        return false;
                      });
                      
                      // 如果段落只包含图片，使用 flex 布局让图片并排显示
                      if (hasOnlyImages && childrenArray.length > 0) {
                        return (
                          <p className="my-4 flex flex-wrap justify-center items-center gap-2">
                            {children}
                          </p>
                        );
                      }
                      
                      return (
                        <p 
                          className="mb-4 leading-relaxed text-base" 
                          style={{ textIndent: hasSheetMusicTag ? '0' : '2em' }}
                        >
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
                    // 图片 - 基础加载，支持通过 alt 属性控制布局
                    // alt 格式: 图片描述 | 布局参数
                    // 布局参数:
                    //   - layout=inline: 行内显示（多张图片并排）
                    //   - layout=center: 居中显示（默认）
                    //   - layout=left: 左对齐
                    //   - layout=right: 右对齐
                    //   - width=xxx: 设置宽度（如 width=200px 或 width=50%）
                    // 示例: "图一 | layout=inline width=32%"
                    img({ src, alt, ...props }: any) {
                      // 处理 GitHub Pages 基础路径
                      const processedSrc = src ? getAssetPath(src) : src;
                      
                      // 解析 alt 属性中的布局和样式参数
                      let imageAlt = alt || '图片';
                      let layout = 'center'; // 默认居中
                      let customWidth = '';
                      let customClass = '';
                      
                      // 检查 alt 是否包含布局参数（使用 | 分隔）
                      if (alt && alt.includes('|')) {
                        const parts = alt.split('|');
                        imageAlt = parts[0].trim();
                        const params = parts[1].trim();
                        
                        // 解析布局参数
                        if (params.includes('layout=inline')) {
                          layout = 'inline';
                        } else if (params.includes('layout=left')) {
                          layout = 'left';
                        } else if (params.includes('layout=right')) {
                          layout = 'right';
                        }
                        
                        // 解析宽度参数
                        const widthMatch = params.match(/width=(\S+)/);
                        if (widthMatch) {
                          customWidth = widthMatch[1];
                        }
                      }
                      
                      // 根据布局设置样式
                      let containerClass = 'my-8';
                      let imageClass = 'rounded-xl shadow-lg max-w-full h-auto';
                      
                      switch (layout) {
                        case 'inline':
                          // 行内布局：图片并排显示，不包裹div，直接返回img
                          imageClass = `rounded-xl shadow-lg h-auto inline-block align-middle mx-1`;
                          // 构建图片样式
                          const inlineStyle: React.CSSProperties = {};
                          if (customWidth) {
                            inlineStyle.width = customWidth;
                          }
                          return (
                            <img
                              src={processedSrc}
                              alt={imageAlt}
                              className={imageClass}
                              style={inlineStyle}
                              loading="lazy"
                              {...props}
                            />
                          );
                        case 'left':
                          containerClass = 'my-8 text-left';
                          imageClass = 'rounded-xl shadow-lg max-w-full h-auto';
                          break;
                        case 'right':
                          containerClass = 'my-8 text-right';
                          imageClass = 'rounded-xl shadow-lg max-w-full h-auto ml-auto';
                          break;
                        case 'center':
                        default:
                          containerClass = 'my-8 text-center';
                          imageClass = 'rounded-xl shadow-lg mx-auto max-w-full h-auto';
                          break;
                      }
                      
                      // 构建图片样式
                      const imageStyle: React.CSSProperties = {};
                      if (customWidth) {
                        imageStyle.width = customWidth;
                      }
                      
                      // 检查是否在表格中（通过检查父元素）
                      const isInTable = props.node?.parent?.tagName === 'td' || props.node?.parent?.tagName === 'th';
                      
                      if (isInTable) {
                        // 在表格中显示时，简化样式
                        return (
                          <img
                            src={processedSrc}
                            alt={imageAlt}
                            className="rounded-xl shadow-lg max-w-full h-auto mx-auto"
                            style={imageStyle}
                            loading="lazy"
                            {...props}
                          />
                        );
                      }
                      
                      return (
                        <div className={containerClass}>
                          <img
                            src={processedSrc}
                            alt={imageAlt}
                            className={imageClass}
                            style={imageStyle}
                            loading="lazy"
                            {...props}
                          />
                          {imageAlt && layout !== 'inline' && (
                            <p className="text-sm text-muted-foreground mt-3 italic">{imageAlt}</p>
                          )}
                        </div>
                      );
                    },
                    // 自定义 div 组件 - 支持图片布局容器
                    div({ className, children, ...props }: any) {
                      // 如果 className 包含 flex，保留 flex 布局
                      if (className && className.includes('flex')) {
                        return (
                          <div className={className} {...props}>
                            {children}
                          </div>
                        );
                      }
                      // 默认情况下，让 div 正常渲染
                      return (
                        <div className={className} {...props}>
                          {children}
                        </div>
                      );
                    },
                    // iframe 处理 - 增强错误处理和清理
                    iframe({ src, allowfullscreen, ...props }: any) {
                      // 将字符串 "true" 转换为布尔值 true，确保传递布尔值给React属性
                      const shouldAllowFullScreen = allowfullscreen === "true" || allowfullscreen === true;
                      
                      // B站视频特殊处理 - 使用专用组件处理
                      const isBilibiliVideo = src?.includes('player.bilibili.com');
                      
                      if (isBilibiliVideo) {
                        return (
                          <Suspense fallback={
                            <div className="my-8 rounded-xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center h-64 md:h-96">
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                                <p className="text-gray-600 dark:text-gray-400">B站视频加载中...</p>
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
                  }}
                />
              </div>
            </div>
          </article>

          {/* 文章结尾 */}
          <div className="mt-12 text-center">
            {/* 标签和系列信息 - 移动到文章后面 */}
            <div className="flex flex-wrap items-start gap-4 mb-8">
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


    </div>
  );
}

