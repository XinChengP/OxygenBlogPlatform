"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { Pin, ChevronDown } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

/**
 * 博客文章接口
 */
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  tags: string[];
  slug: string;
  readTime: number;
  year: number;
  month: number;
  day: number;
  pinned?: boolean;
  pinnedAt?: string;
}

/**
 * 归档页面 Props 接口
 */
interface ClientArchivePageProps {
  archivedPosts: { [year: number]: { [month: number]: { [day: number]: BlogPost[] } } };
}

/**
 * 客户端归档页面组件
 * 显示时间轴布局的归档内容
 */
export default function ClientArchivePage({ archivedPosts }: ClientArchivePageProps) {
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('archive');
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [tagPosts, setTagPosts] = useState<BlogPost[]>([]);
  const [expandedYears, setExpandedYears] = useState<Record<number, boolean>>({});

  // 毛玻璃样式函数
  const getGlassStyle = (baseStyle: string) => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };

  // 计算文章总数
  const totalPosts = useMemo(() => {
    let count = 0;
    for (const year in archivedPosts) {
      for (const month in archivedPosts[year]) {
        for (const day in archivedPosts[year][month]) {
          count += archivedPosts[year][month][day].length;
        }
      }
    }
    return count;
  }, [archivedPosts]);

  // 获取所有文章的扁平化列表
  const allPosts = useMemo(() => {
    const posts: BlogPost[] = [];
    for (const year in archivedPosts) {
      for (const month in archivedPosts[year]) {
        for (const day in archivedPosts[year][month]) {
          posts.push(...archivedPosts[year][month][day]);
        }
      }
    }
    return posts;
  }, [archivedPosts]);

  // 处理标签点击
  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const filteredPosts = allPosts
      .filter(post => post.tags.includes(tag))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setSelectedTag(tag);
    setTagPosts(filteredPosts);
    setShowTagModal(true);
  };

  // 关闭标签浮层
  const closeTagModal = () => {
    setShowTagModal(false);
    setSelectedTag('');
    setTagPosts([]);
  };

  // 切换年份展开状态
  const toggleYear = (year: number) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  // 准备时间轴数据（按年份分组）
  const timelineData = useMemo(() => {
    const result: Array<{
      year: number;
      months: Array<{
        month: number;
        posts: BlogPost[];
      }>;
      totalPosts: number;
    }> = [];

    const years = Object.keys(archivedPosts)
      .map(year => parseInt(year))
      .sort((a, b) => b - a);

    years.forEach(year => {
      const months = Object.keys(archivedPosts[year])
        .map(month => parseInt(month))
        .sort((a, b) => b - a);

      let yearTotalPosts = 0;
      const monthData: Array<{
        month: number;
        posts: BlogPost[];
      }> = [];

      months.forEach(month => {
        const days = Object.keys(archivedPosts[year][month])
          .map(day => parseInt(day))
          .sort((a, b) => b - a);

        const monthPosts: BlogPost[] = [];
        days.forEach(day => {
          monthPosts.push(...archivedPosts[year][month][day]);
        });

        yearTotalPosts += monthPosts.length;
        monthData.push({
          month,
          posts: monthPosts
        });
      });

      result.push({
        year,
        months: monthData,
        totalPosts: yearTotalPosts
      });
    });

    return result;
  }, [archivedPosts]);

  // 月份中文名
  const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <PageHeader
          title="博客归档"
          description={`共 ${totalPosts} 篇文章，按年份、月份和日期归档`}
          size="lg"
          className="mb-8"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {timelineData.length > 0 ? (
            <div className="relative">
              {/* 装饰性背景元素 */}
              <div className="absolute -left-4 top-0 w-24 h-24 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -right-4 bottom-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
              
              {/* 年份列表 */}
              <div className="space-y-16">
                {timelineData.map(({ year, months, totalPosts: yearTotal }) => {
                  const isExpanded = expandedYears[year] !== false;
                  
                  return (
                    <div key={year} className="relative">
                      {/* 年份标题 - 可点击展开/收起 */}
                      <motion.div
                        className="flex items-center gap-4 cursor-pointer select-none group"
                        onClick={() => toggleYear(year)}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* 年份文字 */}
                        <div className="flex-1">
                          <h2 className="text-4xl font-bold bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent group-hover:from-primary group-hover:via-primary/80 group-hover:to-primary/60 transition-all duration-500">
                            {year}
                          </h2>
                          <p className="text-sm text-muted-foreground mt-1">
                            {yearTotal} 篇文章 · {months.length} 个月
                          </p>
                        </div>
                        
                        {/* 展开/收起图标 */}
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.3 }}
                          className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-300"
                        >
                          <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                        </motion.div>
                      </motion.div>
                      
                      {/* 月份内容 */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="mt-8 space-y-8 pl-6 border-l-2 border-gradient-to-b from-primary/50 via-primary/20 to-transparent">
                              {months.map(({ month, posts }) => (
                                <div key={`${year}-${month}`} className="relative">
                                  {/* 月份标记 */}
                                  <div className="absolute -left-[29px] top-1 w-3.5 h-3.5 rounded-full bg-card border-2 border-primary/50"></div>
                                  
                                  {/* 月份标题 */}
                                  <div className="flex items-center gap-3 mb-4">
                                    <h3 className="text-lg font-semibold text-foreground">
                                      {monthNames[month - 1]}
                                    </h3>
                                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                                      {posts.length} 篇
                                    </span>
                                  </div>
                                  
                                  {/* 文章列表 - 紧凑布局 */}
                                  <div className="space-y-3">
                                    {posts.map((post) => (
                                      <motion.div
                                        key={post.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        whileHover={{ x: 4 }}
                                        transition={{ duration: 0.3 }}
                                        className="group"
                                      >
                                        <Link
                                          href={`/blogs/${encodeURIComponent(post.slug)}`}
                                          className="block"
                                        >
                                          <div className={getGlassStyle("p-4 rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30")}>
                                            {/* 标题行 */}
                                            <div className="flex items-center gap-2 mb-2">
                                              {post.pinned && (
                                                <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-0.5 shadow-sm">
                                                  <Pin className="w-3 h-3" />
                                                  置顶
                                                </span>
                                              )}
                                              <h4 className="text-base font-medium text-foreground group-hover:text-primary transition-colors duration-300">
                                                {post.title}
                                              </h4>
                                            </div>
                                            
                                            {/* 元信息 */}
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                              <span>{post.date}</span>
                                              <span className="text-border">·</span>
                                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                                                {post.category}
                                              </span>
                                              <span className="text-border">·</span>
                                              <span>{post.readTime} 分钟</span>
                                            </div>
                                            
                                            {/* 摘要 */}
                                            {post.excerpt && (
                                              <p className="text-muted-foreground text-sm mt-2 line-clamp-2 leading-relaxed">
                                                {post.excerpt}
                                              </p>
                                            )}
                                            
                                            {/* 标签 */}
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                              {post.tags.map((tag) => (
                                                <span
                                                  key={tag}
                                                  className="px-2 py-0.5 bg-muted/50 hover:bg-primary/20 text-muted-foreground hover:text-primary text-xs rounded-full cursor-pointer transition-all duration-300 border border-transparent hover:border-primary/30"
                                                  onClick={(e) => handleTagClick(tag, e)}
                                                >
                                                  #{tag}
                                                </span>
                                              ))}
                                            </div>
                                          </div>
                                        </Link>
                                      </motion.div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <motion.div 
              className="text-center py-20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-6">📄</div>
                <h2 className="text-2xl font-semibold text-foreground mb-3">
                  暂无博客文章
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  还没有发布任何博客文章，请稍后再来查看。
                </p>
                <Link 
                  href="/"
                  className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                >
                  返回首页
                </Link>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* 标签筛选浮层 */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3, type: "spring", damping: 25 }}
            className={getGlassStyle("w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6 border shadow-2xl")}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  标签筛选
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent font-medium">#{selectedTag}</span> 相关文章
                </p>
              </div>
              <button
                onClick={closeTagModal}
                className="w-10 h-10 rounded-full bg-muted/50 hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-all duration-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {tagPosts.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  共找到 <span className="font-medium text-foreground">{tagPosts.length}</span> 篇相关文章
                </p>
                <div className="space-y-3">
                  {tagPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                      className="group"
                    >
                      <Link
                        href={`/blogs/${encodeURIComponent(post.slug)}`}
                        className="block"
                        onClick={closeTagModal}
                      >
                        <div className="p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md hover:shadow-primary/10">
                          <div className="flex items-center gap-2 mb-1">
                            {post.pinned && (
                              <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-0.5 shadow-sm">
                                <Pin className="w-3 h-3" />
                                置顶
                              </span>
                            )}
                            <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                              {post.title}
                            </h3>
                          </div>
                          <div className="flex items-center text-sm text-muted-foreground mt-1 gap-2">
                            <span>{post.date}</span>
                            <span className="text-border">·</span>
                            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                              {post.category}
                            </span>
                          </div>
                          {post.excerpt && (
                            <p className="text-muted-foreground text-sm mt-2 line-clamp-2 leading-relaxed">
                              {post.excerpt}
                            </p>
                          )}
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  暂无相关文章
                </h3>
                <p className="text-muted-foreground mb-6">
                  没有找到带有标签 #{selectedTag} 的文章
                </p>
                <button
                  onClick={closeTagModal}
                  className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-all duration-300 shadow-lg shadow-primary/20"
                >
                  关闭
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}