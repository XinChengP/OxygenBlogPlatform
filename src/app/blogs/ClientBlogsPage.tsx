'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { categories } from '@/setting/blogSetting';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import Pagination from '@/components/Pagination';
import { getAssetPath } from '@/utils/assetUtils';
import { Calendar, ArrowRight, BookOpen, Pin, Tag } from 'lucide-react';
import live2dMessageManager from '@/utils/live2dMessageManager';
import PageHeader from '@/components/ui/PageHeader';

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  tags: string[];
  slug: string;
  readTime: number;
  coverImage?: string;
  pinned?: boolean;
  pinnedAt?: string;
  author?: { name: string; avatar?: string };
}

interface ClientBlogsPageProps {
  initialPosts: BlogPost[];
  blogTotalWordCount: number;
  tagCount: number;
}

export default function ClientBlogsPage({ initialPosts, blogTotalWordCount, tagCount }: ClientBlogsPageProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('blogs');

  const POSTS_PER_PAGE = 6;

  const getGlassStyle = (baseStyle: string) => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };

  const handlePostHover = (post: BlogPost) => {
    if (post.slug === 'benou-score') {
      live2dMessageManager.clearMessageQueue();
      setTimeout(() => {
        live2dMessageManager.showMessage('如果双腿跑不动，那就试着抓住风～天依相信每一只笨鸥都能飞到自己的天空！', 4000, 10);
      }, 200);
      return;
    }
    if (post.slug === 'markdown-editor' || post.slug === 'color-egg') {
      live2dMessageManager.clearMessageQueue();
      setTimeout(() => {
        live2dMessageManager.showMessage('发现了彩蛋文章！天依为你准备了特别的惊喜～', 4000, 10);
      }, 200);
      return;
    }
    const hoverMessages = [
      `对《${post.title}》感兴趣吗？点击查看详情～`,
      `这是一篇关于${post.category}的文章，阅读时间大约${post.readTime}分钟`,
      `发布于${formatDate(post.date)}，${post.excerpt?.substring(0, 30)}...`,
      `天依觉得这篇文章看起来很有趣呢～`,
      `这篇${post.category}文章有${post.readTime}分钟的阅读时间`,
      `想看看「${post.title}」吗？天依推荐你阅读一下～`
    ];
    const randomMessage = hoverMessages[Math.floor(Math.random() * hoverMessages.length)];
    live2dMessageManager.showMessage(randomMessage, 3000, 1);
  };

  const handlePostLeave = () => {
    live2dMessageManager.hideMessage(1000, 10);
  };

  const filteredAndSortedPosts = useMemo(() => {
    let filtered = selectedCategory === 'all'
      ? initialPosts
      : initialPosts.filter(post => post.category === selectedCategory);

    return filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      if (a.pinned && b.pinned) {
        const aPinnedTime = a.pinnedAt || a.date;
        const bPinnedTime = b.pinnedAt || b.date;
        return new Date(bPinnedTime).getTime() - new Date(aPinnedTime).getTime();
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [initialPosts, selectedCategory]);

  const paginationData = useMemo(() => {
    const totalPosts = filteredAndSortedPosts.length;
    const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    const endIndex = startIndex + POSTS_PER_PAGE;
    const currentPosts = filteredAndSortedPosts.slice(startIndex, endIndex);
    return { currentPosts, totalPages, totalPosts };
  }, [filteredAndSortedPosts, currentPage]);

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const debugInterval = setInterval(() => {
        const status = live2dMessageManager.getStatus();
        console.log('Live2D消息管理器状态:', status);
      }, 5000);
      return () => clearInterval(debugInterval);
    }
  }, []);

  if (initialPosts.length === 0) {
    return (
      <div className={containerStyle.className} style={containerStyle.style}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <PageHeader title="博客文章" description="随便写写awa" size="lg" className="mb-12" />
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-6">📄</div>
              <h2 className="text-2xl font-semibold text-foreground mb-4">暂无博客文章</h2>
              <p className="text-muted-foreground mb-8">还没有发布任何博客文章，请稍后再来查看。</p>
              <Link href="/" className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors nav-link">
                返回首页
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <PageHeader title="博客文章" description="随便写写awa" size="lg" className="mb-12" />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 桌面端左侧边栏 */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className={getGlassStyle("rounded-xl shadow-lg p-6 sticky top-24 border")}>
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                分类筛选
              </h3>
              <div className="space-y-2">
                {categories.map((category) => {
                  const count = initialPosts.filter(post => category === 'all' ? true : post.category === category).length;
                  return (
                    <button
                      key={category}
                      onClick={() => handleCategoryChange(category)}
                      className={`w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between ${selectedCategory === category ? 'bg-primary/10 text-primary border border-primary/20' : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'}`}
                    >
                      <span>{category === 'all' ? '全部' : category}</span>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">{count}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-border space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> 总文章数
                  </span>
                  <span className="font-medium">{initialPosts.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Tag className="w-3 h-3" /> 总标签数
                  </span>
                  <span className="font-medium">{tagCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M9 7V5h6v2"/><path d="M12 18h.01"/><path d="M4 12V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v5"/><path d="M4 12s-2 2-2 5v2h20v-2s-2-3-2-5"/><path d="M4 12h16"/></svg>
                    博客总字数
                  </span>
                  <span className="font-medium">{blogTotalWordCount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* 主内容区 */}
          <main className="col-span-1 lg:col-span-3">
            {/* 文章统计 */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                {selectedCategory === 'all' ? '全部' : selectedCategory} 分类下共有 {paginationData.totalPosts} 篇文章
                {paginationData.totalPages > 1 && (
                  <span className="ml-2">(第 {currentPage} 页，共 {paginationData.totalPages} 页)</span>
                )}
              </p>
            </div>

            {/* 文章列表 */}
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                <AnimatePresence mode="popLayout">
                {paginationData.currentPosts.map((post) => (
                  <motion.article
                    key={post.slug}
                    layout
                    className={`${getGlassStyle("rounded-xl shadow-lg overflow-hidden cursor-pointer group relative")} border border-transparent`}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    whileHover={{ y: -5, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)", borderColor: "rgba(59,130,246,0.3)" }}
                    transition={{ duration: 0.3, layout: { duration: 0.3 } }}
                    onMouseEnter={() => handlePostHover(post)}
                    onMouseLeave={handlePostLeave}
                  >
                    <Link href={`/blogs/${encodeURIComponent(post.slug)}`} className="nav-link">
                      {post.coverImage ? (
                        <div className="relative h-48 sm:h-56 overflow-hidden">
                          <motion.div className="absolute inset-0" whileHover={{ scale: 1.05 }} transition={{ duration: 0.4 }}>
                            <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" width={400} height={225} />
                          </motion.div>
                          <motion.div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0" whileHover={{ opacity: 1 }} transition={{ duration: 0.4 }} />
                          <div className="absolute top-3 left-3 flex items-center gap-2">
                            {post.pinned && (
                              <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm shadow-lg flex items-center gap-1">
                                <Pin className="w-3 h-3" /> 置顶
                              </span>
                            )}
                            <span className="bg-primary/95 text-primary-foreground px-2 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm shadow-lg">{post.category}</span>
                          </div>
                          <div className="absolute top-3 right-3">
                            <span className="bg-black/60 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">{post.readTime}分钟</span>
                          </div>
                          <motion.div className="absolute inset-0 flex items-center justify-center opacity-0" whileHover={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                            <motion.div className="bg-card/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-foreground shadow-lg" whileHover={{ scale: 1.05 }} transition={{ duration: 0.4 }}>
                              阅读文章
                            </motion.div>
                          </motion.div>
                        </div>
                      ) : (
                        <div className="relative h-48 sm:h-56 overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10 dark:to-transparent">
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center space-y-3">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-primary/20 dark:bg-primary/30 rounded-full flex items-center justify-center backdrop-blur-sm">
                                <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-primary/60 dark:text-primary/80" />
                              </div>
                              <div className="text-xs sm:text-sm text-muted-foreground font-medium">{post.category}</div>
                            </div>
                          </div>
                          <div className="absolute top-3 left-3">
                            {post.pinned && (
                              <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm shadow-lg flex items-center gap-1">
                                <Pin className="w-3 h-3" /> 置顶
                              </span>
                            )}
                          </div>
                          <div className="absolute top-3 right-3">
                            <span className="bg-black/60 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">{post.readTime}分钟</span>
                          </div>
                          <motion.div className="absolute inset-0 flex items-center justify-center opacity-0 bg-black/10 backdrop-blur-sm" whileHover={{ opacity: 1 }} transition={{ duration: 0.4 }}>
                            <motion.div className="bg-card/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium text-foreground shadow-lg" whileHover={{ scale: 1.05 }} transition={{ duration: 0.4 }}>
                              阅读文章
                            </motion.div>
                          </motion.div>
                        </div>
                      )}
                      <div className="p-4 sm:p-6">
                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                          <span className="flex items-center gap-1 group/date">
                            <Calendar className="w-3 h-3 group-hover/date:text-primary transition-colors" />
                            {formatDate(post.date)}
                          </span>
                        </div>
                        <motion.h2 className="text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 line-clamp-2" whileHover={{ color: "var(--primary)" }} transition={{ duration: 0.4 }}>
                          {post.title}
                        </motion.h2>
                        {post.excerpt && (
                          <p className="text-muted-foreground mb-3 sm:mb-4 text-sm sm:text-base line-clamp-3 leading-relaxed">{post.excerpt}</p>
                        )}
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {post.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs font-medium border border-border">{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {post.author && (
                              <div className="flex items-center gap-2 group/author">
                                {post.author.avatar && (
                                  <img src={getAssetPath(post.author.avatar)} alt={post.author.name} className="rounded-full object-cover ring-2 ring-background group-hover/author:ring-primary transition-all duration-300" width={28} height={28} />
                                )}
                                <span className="text-xs sm:text-sm text-muted-foreground group-hover/author:text-foreground transition-colors truncate font-medium">{post.author.name}</span>
                              </div>
                            )}
                          </div>
                          <motion.div className="flex items-center gap-2 text-primary text-sm font-medium" whileHover={{ gap: "0.75rem" }} transition={{ duration: 0.4 }}>
                            <span>阅读文章</span>
                            <motion.span whileHover={{ x: 4 }} transition={{ duration: 0.4 }}><ArrowRight className="w-4 h-4" /></motion.span>
                          </motion.div>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
                </AnimatePresence>
              </div>

            {paginationData.currentPosts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📭</div>
                <p className="text-muted-foreground text-lg mb-2">该分类下暂无文章</p>
                <p className="text-muted-foreground text-sm">试试切换其他分类</p>
              </div>
            )}

            {paginationData.totalPages > 1 && (
              <div>
                <Pagination currentPage={currentPage} totalPages={paginationData.totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
