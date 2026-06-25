"use client";

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { Pin, Calendar, Tag, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({});

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

  // 切换月份展开状态
  const toggleMonth = (key: string) => {
    setExpandedMonths(prev => ({
      ...prev,
      [key]: !prev[key]
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

  // 获取分类统计
  const categoryStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allPosts.forEach(post => {
      stats[post.category] = (stats[post.category] || 0) + 1;
    });
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [allPosts]);

  // 获取标签统计
  const tagStats = useMemo(() => {
    const stats: Record<string, number> = {};
    allPosts.forEach(post => {
      post.tags.forEach(tag => {
        stats[tag] = (stats[tag] || 0) + 1;
      });
    });
    return Object.entries(stats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [allPosts]);

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <PageHeader
          title="博客归档"
          description={`共 ${totalPosts} 篇文章，按年份、月份和日期归档`}
          size="lg"
          icon="📚"
          className="mb-8"
        />

        {/* 统计卡片区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10"
        >
          {/* 文章总数 */}
          <div className={getGlassStyle("p-5 rounded-xl border transition-all duration-300 hover:shadow-md")}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalPosts}</p>
                <p className="text-sm text-muted-foreground">文章总数</p>
              </div>
            </div>
          </div>

          {/* 分类数量 */}
          <div className={getGlassStyle("p-5 rounded-xl border transition-all duration-300 hover:shadow-md")}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tag className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{categoryStats.length}</p>
                <p className="text-sm text-muted-foreground">文章分类</p>
              </div>
            </div>
          </div>

          {/* 标签数量 */}
          <div className={getGlassStyle("p-5 rounded-xl border transition-all duration-300 hover:shadow-md")}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{tagStats.length}</p>
                <p className="text-sm text-muted-foreground">热门标签</p>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {timelineData.length > 0 ? (
            <div className="relative">
              {/* 时间轴竖线 */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-primary/20 to-transparent"></div>
              
              <div className="space-y-12">
                {timelineData.map(({ year, months, totalPosts: yearTotal }) => (
                  <div key={year} className="relative">
                    {/* 年份节点 */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="absolute left-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center z-10 shadow-lg shadow-primary/30">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                      
                      {/* 年份标题 */}
                      <motion.div
                        className="flex items-center gap-3 pl-16 cursor-pointer select-none"
                        onClick={() => toggleYear(year)}
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.2 }}
                      >
                        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                          {year}
                        </h2>
                        <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                          {yearTotal} 篇文章
                        </span>
                        {expandedYears[year] === false ? (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        )}
                      </motion.div>
                    </div>

                    {/* 月份列表 */}
                    {(expandedYears[year] !== false) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6 pl-16"
                      >
                        {months.map(({ month, posts }) => {
                          const monthKey = `${year}-${month}`;
                          const isMonthExpanded = expandedMonths[monthKey] !== false;
                          
                          return (
                            <div key={monthKey} className="relative">
                              {/* 月份标题 */}
                              <motion.div
                                className="flex items-center gap-2 mb-3 cursor-pointer select-none"
                                onClick={() => toggleMonth(monthKey)}
                                whileHover={{ x: 2 }}
                                transition={{ duration: 0.2 }}
                              >
                                <div className="absolute left-[-36px] w-3 h-3 rounded-full bg-primary/30 border-2 border-primary/50"></div>
                                <h3 className="text-lg font-semibold text-foreground">
                                  {month} 月
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                  ({posts.length} 篇)
                                </span>
                                {isMonthExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </motion.div>
                              
                              {/* 文章列表 */}
                              {isMonthExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  transition={{ duration: 0.3 }}
                                  className="space-y-3"
                                >
                                  {posts.map((post, index) => (
                                    <motion.div
                                      key={post.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ duration: 0.4, delay: index * 0.05 }}
                                      whileHover={{ y: -2 }}
                                      className={getGlassStyle("p-4 rounded-xl border transition-all duration-300 hover:shadow-md group")}
                                    >
                                      <Link
                                        href={`/blogs/${encodeURIComponent(post.slug)}`}
                                        className="block"
                                      >
                                        <div className="flex items-start justify-between gap-4">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              {post.pinned && (
                                                <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 shadow-sm">
                                                  <Pin className="w-3 h-3" />
                                                  置顶
                                                </span>
                                              )}
                                              <h4 className="text-base font-medium text-foreground group-hover:text-primary transition-colors duration-300 truncate">
                                                {post.title}
                                              </h4>
                                            </div>
                                            
                                            <div className="flex items-center text-sm text-muted-foreground mt-1.5 flex-wrap gap-2">
                                              <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {post.date}
                                              </span>
                                              <span className="text-border">•</span>
                                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                                                {post.category}
                                              </span>
                                              <span className="text-border">•</span>
                                              <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {post.readTime} 分钟
                                              </span>
                                            </div>
                                            
                                            {post.excerpt && (
                                              <p className="text-muted-foreground text-sm mt-2 line-clamp-2 leading-relaxed">
                                                {post.excerpt}
                                              </p>
                                            )}
                                            
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                              {post.tags.slice(0, 4).map((tag) => (
                                                <span
                                                  key={tag}
                                                  className="px-2 py-0.5 bg-muted/50 hover:bg-primary/20 text-muted-foreground hover:text-primary text-xs rounded-full cursor-pointer transition-all duration-300 border border-transparent hover:border-primary/30"
                                                  onClick={(e) => handleTagClick(tag, e)}
                                                >
                                                  #{tag}
                                                </span>
                                              ))}
                                              {post.tags.length > 4 && (
                                                <span className="px-2 py-0.5 bg-muted/50 text-muted-foreground text-xs rounded-full">
                                                  +{post.tags.length - 4}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          
                                          {/* 阅读指示器 */}
                                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                            <BookOpen className="w-4 h-4 text-primary" />
                                          </div>
                                        </div>
                                      </Link>
                                    </motion.div>
                                  ))}
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </div>
                ))}
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
                <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-muted/50 flex items-center justify-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-3">
                  暂无博客文章
                </h2>
                <p className="text-muted-foreground mb-8 leading-relaxed">
                  还没有发布任何博客文章，请稍后再来查看。
                </p>
                <Link 
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl transition-all duration-300 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                >
                  <BookOpen className="w-5 h-5" />
                  返回首页
                </Link>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* 热门标签区域 */}
        {tagStats.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12"
          >
            <h3 className="text-lg font-semibold text-foreground mb-4">热门标签</h3>
            <div className="flex flex-wrap gap-2">
              {tagStats.map(([tag, count]) => (
                <button
                  key={tag}
                  onClick={(e) => handleTagClick(tag, e)}
                  className="px-3 py-1.5 bg-muted/50 hover:bg-primary/20 text-muted-foreground hover:text-primary text-sm rounded-full transition-all duration-300 border border-border hover:border-primary/30 flex items-center gap-1.5"
                >
                  <span>#{tag}</span>
                  <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* 标签筛选浮层 */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.3 }}
            className={getGlassStyle("w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl p-6 border shadow-2xl")}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  标签筛选
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="text-primary">#{selectedTag}</span> 相关文章
                </p>
              </div>
              <button
                onClick={closeTagModal}
                className="w-10 h-10 rounded-full bg-muted/50 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all duration-300"
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
                  {tagPosts.map((post, index) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="p-4 rounded-xl border border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-md group"
                    >
                      <Link
                        href={`/blogs/${encodeURIComponent(post.slug)}`}
                        className="block"
                        onClick={closeTagModal}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          {post.pinned && (
                            <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
                              <Pin className="w-3 h-3" />
                              置顶
                            </span>
                          )}
                          <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors">
                            {post.title}
                          </h3>
                        </div>
                        <div className="flex items-center text-sm text-muted-foreground mt-1 flex-wrap gap-2">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {post.date}
                          </span>
                          <span className="text-border">•</span>
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                            {post.category}
                          </span>
                        </div>
                        {post.excerpt && (
                          <p className="text-muted-foreground text-sm mt-2 line-clamp-2 leading-relaxed">
                            {post.excerpt}
                          </p>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/50 flex items-center justify-center">
                  <Tag className="w-8 h-8 text-muted-foreground" />
                </div>
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