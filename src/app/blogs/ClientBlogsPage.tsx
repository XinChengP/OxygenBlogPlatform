'use client';

import Link from 'next/link';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOTION_DISTANCE, MOTION_DURATION } from '@/utils/motion';
import { categories } from '@/setting/blogSetting';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { getAssetPath } from '@/utils/assetUtils';
import ManifestImage from '@/components/core/ManifestImage';
import { Calendar, ArrowRight, BookOpen, Pin, Tag, Eye, FileText, SearchX } from 'lucide-react';
import live2dMessageManager, { Live2DMessageHelper } from '@/utils/live2dMessageManager';
import PageHeader from '@/components/ui/PageHeader';
import { usePostStats } from '@/hooks/usePostStats';
import { formatViewCount } from '@/setting/InteractionSetting';

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
  const [urlReady, setUrlReady] = useState(false);
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('blogs');
  // 互动统计（浏览量）：一次批量请求，供卡片角标使用；接口不可用时为空对象，角标自动隐藏
  const postStats = usePostStats(initialPosts.map((post) => post.slug));

  // 分类从 URL 恢复；浏览器前进/后退时同步
  useEffect(() => {
    const syncFromUrl = () => {
      const category = new URLSearchParams(window.location.search).get('category');
      setSelectedCategory(category || 'all');
    };
    syncFromUrl();
    setUrlReady(true);
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  // 分类写入 URL（replaceState 不会触发路由跳转，也不受静态导出限制）
  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams(window.location.search);
    if (selectedCategory === 'all') params.delete('category');
    else params.set('category', selectedCategory);
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState(null, '', nextUrl);
  }, [selectedCategory, urlReady]);

  // 获取卡片样式类名
  // 内容流中的文章卡片默认使用近实色背景（bg-card/95），
  // 去掉 backdrop-blur 后滚动时不再触发大量模糊合成，性能更好；
  // 仅浮动元素（如 sticky 侧边栏）传入 floating=true 保留毛玻璃；
  // 阴影统一引用 shadow-card 令牌（亮暗模式自动切换）
  const getGlassStyle = (baseStyle: string, floating = false) => {
    if (isBackgroundEnabled) {
      if (floating) {
        return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-card supports-[backdrop-filter]:bg-card/75`;
      }
      return `${baseStyle} bg-card/95 border-border shadow-card`;
    }
    return `bg-card ${baseStyle} border-border shadow-card`;
  };

  const handlePostHover = (post: BlogPost) => {
    // 命中了列表悬停彩蛋则直接返回，不再显示普通悬停消息
    if (Live2DMessageHelper.showListHoverEasterEgg(post.slug)) return;

    // 普通悬停消息
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
    const filtered = selectedCategory === 'all'
      ? [...initialPosts]
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

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
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
              {/* 空状态图标：emoji 在不同系统渲染差异太大（Windows 彩色扁平 / iOS 拟物），
                  换成主题色渐变圆底 + Lucide 图标，与全站的图标语言一致 */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center">
                <FileText className="w-9 h-9 text-primary/70" aria-hidden="true" />
              </div>
              <h2 className="font-heading text-2xl font-semibold text-foreground mb-3">暂无博客文章</h2>
              <p className="text-muted-foreground mb-8">还没有发布任何博客文章，请稍后再来查看。</p>
              <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors nav-link">
                返回首页
                <ArrowRight className="w-4 h-4" />
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
            {/* 侧栏是浮动面板，保留毛玻璃；阴影只走 getGlassStyle 里的 shadow-card，
                baseStyle 不再重复 shadow-lg（两个阴影类共存会打架） */}
            <div className={getGlassStyle("rounded-xl p-6 sticky top-24 border", true)}>
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
            {/* 移动端分类筛选：桌面侧栏是 hidden lg:block，小屏此前完全没有分类入口，
                只能浏览全量文章流。这里用横向滚动 chip 条补位，与桌面侧栏共用
                selectedCategory 状态；-mx-4 px-4 让滚动区贴到屏幕两侧边缘，
                手指滑动时内容不会被内边距截断 */}
            <div className="lg:hidden -mx-4 sm:mx-0 px-4 sm:px-0 mb-4 overflow-x-auto scrollbar-hide">
              <div className="flex gap-2 min-w-max sm:min-w-0 sm:flex-wrap">
                {categories.map((category) => {
                  // 计数算法与桌面侧栏保持一致：all 统计全部，其余按分类精确匹配
                  const count = initialPosts.filter(post => category === 'all' ? true : post.category === category).length;
                  const isCategoryActive = selectedCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => handleCategoryChange(category)}
                      aria-pressed={isCategoryActive}
                      className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                        isCategoryActive
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-card/95 text-muted-foreground border-border hover:text-primary hover:border-primary/30'
                      }`}
                    >
                      {category === 'all' ? '全部' : category}
                      <span className="ml-1.5 text-xs opacity-70">{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 文章统计 */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">
                {selectedCategory === 'all' ? '全部' : selectedCategory} 分类下共有 {filteredAndSortedPosts.length} 篇文章
              </p>
            </div>

            {/* 文章列表 */}
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
                <AnimatePresence mode="popLayout">
                {filteredAndSortedPosts.map((post) => (
                  /* 文章卡片：悬停反馈收敛为两层——卡片上浮（Framer Motion）
                     + 封面轻微缩放（CSS，见下方封面容器），其余标题变色、箭头
                     位移全部交给 group-hover 的 CSS 过渡。
                     原先同一张卡片同时触发 6 个以上动画（遮罩、浮层、标题、箭头、
                     间距），既互相抢戏又持续占用合成线程；阴影改由
                     hover:shadow-card-hover 令牌提供，不再用 whileHover 内联覆盖 */
                  <motion.article
                    key={post.slug}
                    layout
                    className={`${getGlassStyle("rounded-xl overflow-hidden cursor-pointer group relative")} border border-transparent hover:border-primary/30 hover:shadow-card-hover transition-[box-shadow,border-color] duration-300`}
                    initial={{ opacity: 0, scale: 0.97, y: MOTION_DISTANCE }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -MOTION_DISTANCE }}
                    whileHover={{ y: -3 }}
                    transition={{ duration: MOTION_DURATION, layout: { duration: MOTION_DURATION } }}
                    onMouseEnter={() => handlePostHover(post)}
                    onMouseLeave={handlePostLeave}
                  >
                    <Link href={`/blogs/${encodeURIComponent(post.slug)}`} className="nav-link">
                      {post.coverImage ? (
                        <div className="relative h-48 sm:h-56 overflow-hidden">
                          {/* 封面缩放改由 CSS group-hover 驱动：GPU 合成层只处理 transform，
                              比 motion 的 whileHover 少一个动画实例；时长略放长到 500ms，
                              让图片的缓慢推近与卡片上浮形成主次关系 */}
                          <div className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-[1.04]">
                            {/* 封面走响应式变体（GIF 封面也会换成动图 WebP，2.4MB→约 480KB） */}
                            <ManifestImage
                              src={post.coverImage}
                              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, 400px"
                              alt={post.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          </div>
                          <div className="absolute top-3 left-3 flex items-center gap-2">
                            {post.pinned && (
                              <span className="bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm shadow-lg flex items-center gap-1">
                                <Pin className="w-3 h-3" /> 置顶
                              </span>
                            )}
                            <span className="bg-primary/95 text-primary-foreground px-2 py-1 rounded-full text-xs sm:text-sm font-medium backdrop-blur-sm shadow-lg">{post.category}</span>
                          </div>
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            {/* 浏览量角标：互动接口可用且已返回数据时才出现 */}
                            {postStats[post.slug] && (
                              <span className="bg-black/60 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm flex items-center gap-1">
                                <Eye className="w-3 h-3" aria-hidden="true" />
                                {formatViewCount(postStats[post.slug].views)}
                              </span>
                            )}
                            <span className="bg-black/60 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">{post.readTime}分钟</span>
                          </div>
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
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            {/* 浏览量角标：互动接口可用且已返回数据时才出现 */}
                            {postStats[post.slug] && (
                              <span className="bg-black/60 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm flex items-center gap-1">
                                <Eye className="w-3 h-3" aria-hidden="true" />
                                {formatViewCount(postStats[post.slug].views)}
                              </span>
                            )}
                            <span className="bg-black/60 text-white px-2 py-1 rounded-full text-xs backdrop-blur-sm">{post.readTime}分钟</span>
                          </div>
                        </div>
                      )}
                      <div className="p-4 sm:p-6">
                        <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">
                          <span className="flex items-center gap-1 group/date">
                            <Calendar className="w-3 h-3 group-hover/date:text-primary transition-colors" />
                            {formatDate(post.date)}
                          </span>
                        </div>
                        {/* 标题变色由 group-hover 的 CSS 过渡完成：
                            颜色过渡无需合成层，交给浏览器比每个卡片挂一个 motion 实例更划算 */}
                        <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground mb-2 sm:mb-3 line-clamp-2 transition-colors duration-300 group-hover:text-primary">
                          {post.title}
                        </h2>
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
                                  <img src={getAssetPath(post.author.avatar)} alt={post.author.name} className="rounded-full object-cover ring-2 ring-background group-hover/author:ring-primary transition-all duration-300" width={28} height={28} loading="lazy" decoding="async" />
                                )}
                                <span className="text-xs sm:text-sm text-muted-foreground group-hover/author:text-foreground transition-colors truncate font-medium">{post.author.name}</span>
                              </div>
                            )}
                          </div>
                          {/* 底部提示：箭头位移同样交给 CSS，悬停时只做 4px 平移，
                              与封面缩放、卡片上浮共同构成克制的一层反馈 */}
                          <div className="flex items-center gap-2 text-primary text-sm font-medium">
                            <span>阅读文章</span>
                            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.article>
                ))}
                </AnimatePresence>
              </div>

            {filteredAndSortedPosts.length === 0 && (
              <div className="text-center py-14">
                {/* 筛选空态与整体空态同构：图标 + 主副文案 + 一个恢复操作，
                    比纯文字提示更能把访客带回可浏览的内容 */}
                <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-gradient-to-br from-primary/15 via-primary/5 to-transparent flex items-center justify-center">
                  <SearchX className="w-7 h-7 text-primary/70" aria-hidden="true" />
                </div>
                <p className="font-heading text-lg font-semibold text-foreground mb-2">该分类下暂无文章</p>
                <p className="text-muted-foreground text-sm mb-6">换个分类，或者回到全部文章看看</p>
                <button
                  type="button"
                  onClick={() => handleCategoryChange('all')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  查看全部文章
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
