'use client';

import { useState, lazy, Suspense, useEffect, useRef, useCallback } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import LazyMarkdown from '../../../components/LazyMarkdown';
import ImagePreview from '../../../app/gallery/components/ImagePreview';
import { PreviewImage } from '../../../types/gallery';
import Link from 'next/link';
import { 
  CalendarIcon,
  TagIcon,
  UserIcon,
  GlobeAltIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';


import 'katex/dist/katex.min.css';
import { EndWord } from '../../../setting/blogSetting';
import { useBackgroundStyle } from '../../../hooks/useBackgroundStyle';
import { useTheme } from 'next-themes';
import { Live2DMessageHelper } from '../../../utils/live2dMessageManager';
import { trackArticleView } from '../../../components/Analytics';
import { useBlogMarkdownComponents } from '../../../components/blogs/BlogMarkdownComponents';
import BlogSharePanel from '../../../components/blogs/BlogSharePanel';
import RelatedPosts from '../../../components/blogs/RelatedPosts';

// 动态导入大型组件，优化初始加载性能
const LazyTableOfContents = lazy(() => import('../../../components/TableOfContents'));
const LazyGiscusComments = lazy(() => import('../../../components/GiscusComments'));
const LazyCopyrightNotice = lazy(() => import('../../../components/CopyrightNotice'));

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

interface SeriesArticle {
  title: string;
  slug: string;
  seriesOrder: number;
  date: string;
}

/**
 * 相关文章条目接口
 *
 * 服务端已在构建期完成打分排序，这里只用于渲染卡片，
 * 因此字段与 utils/relatedPostsUtils.ts 中的 RelatedPost 保持一致。
 */
interface RelatedPost {
  title: string;
  slug: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  readTime: number;
  coverImage?: string;
  series?: string;
}

interface ClientBlogDetailProps {
  blog: BlogPost;
  seriesArticles: SeriesArticle[];
  /** 相关文章推荐列表，由服务端预计算后传入；为空数组时该区域不渲染 */
  relatedArticles?: RelatedPost[];
}

// 互动功能Hook - 已移除点赞、收藏、浏览统计功能（分享功能见 BlogSharePanel 组件）

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
 * - 支持文章分享（复制链接、社交平台跳转）
 * - 增强视觉设计和用户体验
 * 
 * @param blog - 博客文章数据
 * @returns JSX 元素
 */
export default function ClientBlogDetail({
  blog,
  seriesArticles,
  relatedArticles = [],
}: ClientBlogDetailProps) {
  const { theme, resolvedTheme } = useTheme();
  const { containerStyle } = useBackgroundStyle('blog-detail');
  const [mounted, setMounted] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<PreviewImage | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [readProgress, setReadProgress] = useState(0);
  const articleImagesRef = useRef<PreviewImage[]>([]);
  const imageSrcSetRef = useRef<Set<string>>(new Set());
  const iframeRefs = useRef<Array<HTMLIFrameElement | null>>([]);

  // 确保组件已挂载，避免 SSR 期间 theme 为 null
  useEffect(() => {
    setMounted(true);
  }, []);

  // 阅读进度条：监听滚动实时计算文章阅读百分比
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setReadProgress(Math.min(100, Math.max(0, progress)));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 组件挂载时清空图片收集列表，防止路由切换或热更新后残留旧数据
  useEffect(() => {
    imageSrcSetRef.current.clear();
    articleImagesRef.current = [];
  }, []);

  // 在挂载前使用默认主题
  const currentTheme = (mounted ? resolvedTheme : 'light') || 'light';
  
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

  // 图片点击处理 - 使用 useCallback 稳定引用，避免不必要的重新渲染
  const handleImageClick = useCallback((image: PreviewImage) => {
    setLightboxImage(image);
    setIsPreviewOpen(true);
  }, []);

  // 博客 Markdown 渲染组件配置（提取为独立 Hook，降低主组件复杂度）
  const markdownComponents = useBlogMarkdownComponents({
    currentTheme,
    imageSrcSetRef,
    articleImagesRef,
    onImageClick: handleImageClick,
    iframeRefs,
  });

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
      {/* 阅读进度条 */}
      {mounted && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted/30">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary"
            style={{ width: `${readProgress}%` }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div>
          {/* 文章头部信息 */}
          <header className="mb-10">
            {/* 封面图片 */}
            {blog.coverImage && (
              <div className="mb-6 rounded-2xl overflow-hidden shadow-2xl">
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
              className="text-3xl md:text-5xl font-bold text-foreground mb-6 leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent dark:from-primary dark:via-primary/90 dark:to-primary/70">
                {blog.title}
              </span>
            </motion.h1>

            {/* 文章摘要 - 移动到标题下方 */}
            {blog.excerpt && (
              <motion.div 
                className="mb-8 relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <div className="bg-gradient-to-br from-muted/60 to-muted/30 backdrop-blur-sm rounded-2xl border border-border/50 p-6 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary via-primary/60 to-primary/30 rounded-r" />
                  <p className="text-muted-foreground italic text-lg leading-relaxed pl-3">{blog.excerpt}</p>
                </div>
              </motion.div>
            )}

            {/* 文章元信息 */}
            <motion.div 
              className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground bg-card/60 backdrop-blur-sm rounded-xl px-4 py-2.5 border border-border/40 shadow-sm mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="h-4 w-4 text-primary/70" />
                <span>发布于 {blog.date}</span>
              </div>
              {blog.updatedAt && (
                <>
                  <span className="text-border">·</span>
                  <div className="flex items-center gap-1.5">
                    <CalendarIcon className="h-4 w-4 text-primary/70" />
                    <span>更新于 {blog.updatedAt}</span>
                  </div>
                </>
              )}
              <span className="text-border">·</span>
              <div className="flex items-center gap-1.5">
                <TagIcon className="h-4 w-4 text-primary/70" />
                <span>{blog.category}</span>
              </div>
              <span className="text-border">·</span>
              <div className="flex items-center gap-1.5">
                <BookOpenIcon className="h-4 w-4 text-primary/70" />
                <span>{blog.readTime} 分钟阅读</span>
              </div>
              {blog.author && (
                <>
                  <span className="text-border">·</span>
                  <div className="flex items-center gap-1.5">
                    <UserIcon className="h-4 w-4 text-primary/70" />
                    <span>{blog.author}</span>
                  </div>
                </>
              )}
              {blog.language && (
                <>
                  <span className="text-border">·</span>
                  <div className="flex items-center gap-1.5">
                    <GlobeAltIcon className="h-4 w-4 text-primary/70" />
                    <span>{blog.language}</span>
                  </div>
                </>
              )}
            </motion.div>
            
            {/* 文章时效性说明 - 仅技术分类显示 */}
            {articleAgeInfo && blog.category === '技术' && (
              <motion.div 
                className={`mt-4 mb-8 p-4 rounded-2xl backdrop-blur-sm border ${
                  articleAgeInfo.type === 'warning' 
                    ? 'bg-amber-50/80 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50' 
                    : 'bg-card/60 border-border/40'
                }`}
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
              <Suspense fallback={
                <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-4 bg-primary/40 rounded-full"></div>
                    <div className="h-3.5 bg-muted/60 rounded w-16"></div>
                  </div>
                  <div className="space-y-2.5 pl-3">
                    <div className="h-3 bg-muted/50 rounded w-1/2"></div>
                    <div className="h-3 bg-muted/40 rounded w-2/3"></div>
                    <div className="h-3 bg-muted/40 rounded w-1/3"></div>
                  </div>
                </div>
              }>
                <LazyTableOfContents content={blog.content} />
              </Suspense>
            </div>
          </header>

          {/* 文章内容 */}
          <article className="prose prose-lg dark:prose-invert max-w-none">
            <style jsx>{`
              /* 只对根级别的span（段落）添加缩进 */
              .prose > span {
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
              .prose > pre {
                margin-left: 0;
              }

              /* 表格样式重置 - 确保单元格没有圆角 */
              .prose table {
                border-radius: 0;
                border-collapse: collapse;
              }

              .prose table th,
              .prose table td {
                border-radius: 0 !important;
                border: none;
                border-bottom: 1px solid rgba(0, 0, 0, 0.1);
              }

              .dark .prose table th,
              .dark .prose table td {
                border-bottom-color: rgba(255, 255, 255, 0.1);
              }

              /* 强制代码块内容区域透明，覆盖 react-syntax-highlighter 主题和 prose 默认背景 */
              /* 使用 :global() 突破 styled-jsx 作用域限制，确保能匹配到动态生成的代码元素 */
              .prose :global(pre),
              .prose :global(code),
              .prose :global(pre code),
              .prose :global(div code) {
                background-color: transparent !important;
                background: transparent !important;
              }
            `}</style>
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 md:p-10">
              <div className="prose prose-lg dark:prose-invert max-w-none">
                <LazyMarkdown
                  content={blog.content}
                  components={markdownComponents}
                />
              </div>
            </div>
          </article>

          {/* 文章结尾 */}
          <div className="mt-12">
            {/*
              系列信息
              原本与标签块同处一个 flex 容器，标签块已并入下方的结尾合并卡，
              因此这里单独成块。用 w-fit 保持「内容宽度」而非撑满整行，
              与原视觉宽度一致。
            */}
            {blog.series && (
              <div className="w-fit mb-8 flex items-center gap-2 text-sm text-muted-foreground bg-card/60 backdrop-blur-sm px-4 py-3 rounded-2xl border border-border/40 shadow-sm">
                <BookOpenIcon className="h-4 w-4 text-primary/70" />
                <span>系列: {blog.series}</span>
                {blog.seriesOrder && (
                  <span className="px-2 py-0.5 bg-primary/20 text-primary rounded-full text-xs">
                    第 {blog.seriesOrder} 篇
                  </span>
                )}
              </div>
            )}

            {/* 系列文章导航 */}
            {blog.series && seriesArticles.length > 0 && (
              <div className="mb-8 bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpenIcon className="h-4 w-4 text-primary/70" />
                  <span className="text-sm font-medium text-foreground">{blog.series} 系列</span>
                  <span className="text-xs text-muted-foreground">（共 {seriesArticles.length + 1} 篇）</span>
                </div>
                
                {/* 当前文章 */}
                <div className="mb-3 px-3 py-2.5 bg-primary/10 rounded-xl border border-primary/20">
                  <span className="text-xs text-primary font-medium">当前阅读</span>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {blog.seriesOrder && <span className="text-primary/70 mr-1">#{blog.seriesOrder}</span>}
                    {blog.title}
                  </p>
                </div>
                
                {/* 系列其他文章 */}
                <div className="space-y-1.5">
                  {seriesArticles.map((article) => (
                    <Link
                      key={article.slug}
                      href={`/blogs/${encodeURIComponent(article.slug)}`}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors group"
                    >
                      <span className="text-xs text-primary/60 font-mono w-5">#{article.seriesOrder}</span>
                      <span className="flex-1 truncate group-hover:text-primary transition-colors">{article.title}</span>
                      <ChevronRightIcon className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/*
              文章收尾融合块
              「结束语 / 标签 / 分享 / 版权」四部分共用这一个渐变底块，
              彼此之间不加任何边框与分隔线，只用统一的 space-y-6 留白隔开。

              为什么这样改：
              1. 早先这四部分是四张各自带边框的卡片，层层堆叠后像一沓纸片；
                改成一张卡片装三块后，卡片内部又出现了「小标题 + 分隔线」的表格感，
                两块轻内容（标签、分享）与一块重内容（版权文字）被强行等分，依旧别扭。
              2. 现在彻底放弃「分区」这个概念：不再有小标题、不再有横线，
                靠内容自身的形态做区隔——胶囊就是标签、图标行就是分享、© 文字就是版权。
                读者的视觉断点从「四次」降到「一次」（只在这一整块的开头）。
              3. 标签胶囊原本被包在卡片里，现在直接铺在渐变底上；
                分享与版权两个子组件继续以 bare 裸模式接入，
                交出各自的卡片外壳与自带标题，避免块内再冒出第二条边框和重复标题。
            */}
            <div className="rounded-2xl p-6 sm:p-8 mb-8 bg-gradient-to-r from-primary/10 to-primary/5 space-y-6">
              {/* 结束语 */}
              <p className="text-lg text-muted-foreground italic leading-relaxed">{EndWord}</p>

              {/* 标签：胶囊形态本身即可自解释，无需再加「标签」二字的小标题 */}
              {blog.tags && blog.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {blog.tags.map((tag, index) => (
                    <span
                      key={index}
                      /*
                        底色刻意不用 bg-primary/10：
                        本块渐变底的左半部分恰好也是 primary/10，两者完全同色，
                        胶囊会在左侧「隐形」，只剩文字悬在渐变上。
                        改用背景色打底 + 描边，让胶囊从渐变底上浮出来，
                        亮色模式呈白胶囊、暗色模式呈深胶囊，两种主题下都有清晰轮廓。
                      */
                      className="px-3.5 py-1.5 bg-background/70 border border-border/40 text-primary rounded-full text-xs font-medium hover:bg-background hover:border-primary/40 transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 分享：一排图标按钮，形态即语义 */}
              <BlogSharePanel
                title={blog.title}
                slug={blog.slug}
                excerpt={blog.excerpt}
                bare
              />

              {/* 版权：文字自然成段 */}
              <Suspense fallback={<div className="h-20 bg-muted/40 animate-pulse rounded-2xl"></div>}>
                <LazyCopyrightNotice
                  title={blog.title}
                  publishDate={blog.date}
                  slug={blog.slug}
                  reference={blog.reference}
                  bare
                />
              </Suspense>
            </div>

            {/*
              相关文章推荐
              位置说明：放在收尾融合块之后、评论区之前。
              读者读完正文与版权说明时正处于「是否继续读」的决策点，此处推荐最有效；
              若放到评论区之后，读者往往已开始浏览评论，注意力被分散。
              组件内部会自动处理「无推荐结果」的情况，此处无需再做条件判断。
            */}
            <RelatedPosts posts={relatedArticles} />
          </div>

          {/*
            评论区
            与相关文章推荐之间用 mt-8 间距分隔即可，不再额外画一条上边框：
            上方「相关文章」本身已是一张独立卡片，再加分隔线会出现「线—卡片—线」的拥挤感，
            与全站「用卡片承载区块」的表达方式也不一致。
            改为把评论区同样包成一张卡片，与上方卡片形成并列关系，视觉上更整齐。
            标题使用 h2，与文章正文的 h1 构成层级关系，屏幕阅读器可据此快速跳转到评论区。
          */}
          <section
            className="mt-8 bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-5"
            aria-label="评论区"
          >
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mb-5">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-foreground">评论</h2>
              {/*
                说明文字与实际规则保持一致：
                本站评论基于 GitHub Discussions，需 GitHub 账号登录后才能发言。
              */}
              <span className="text-sm text-muted-foreground">
                （使用 GitHub 账号登录后即可评论）
              </span>
            </div>

            {/*
              加载占位
              用与留言板同构的骨架替代原来的单个灰块，
              让加载完成前后的高度更接近，减少页面在评论加载时的跳动。
            */}
            <Suspense
              fallback={
                <div className="space-y-4">
                  {/* 输入框占位 */}
                  <div className="h-24 rounded-xl bg-muted/60 animate-pulse" />
                  {/* 评论条目占位 */}
                  {[0, 1].map((index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-9 h-9 rounded-full bg-muted/60 animate-pulse flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="w-24 h-4 rounded bg-muted/60 animate-pulse" />
                        <div className="w-full h-4 rounded bg-muted/40 animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              }
            >
              <LazyGiscusComments id={blog.slug} title={blog.title} />
            </Suspense>
          </section>
        </div>
      </div>

      {/* 图片灯箱组件 - 使用画廊的 ImagePreview 组件，支持左右切换 */}
      <AnimatePresence>
        {isPreviewOpen && lightboxImage && (
          <ImagePreview
            images={articleImagesRef.current}
            initialImage={lightboxImage}
            onClose={() => {
              setIsPreviewOpen(false);
              setLightboxImage(null);
            }}
          />
        )}
      </AnimatePresence>

    </div>
  );
}

