"use client";

import React, { useMemo, lazy, Suspense, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';



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
}

/**
 * 归档页面 Props 接口
 */
interface ClientArchivePageProps {
  archivedPosts: { [year: number]: { [month: number]: { [day: number]: BlogPost[] } } };
}

/**
 * 客户端归档页面组件
 * 使用左侧侧边栏 + 右侧内容区的布局
 */
export default function ClientArchivePage({ archivedPosts }: ClientArchivePageProps) {
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('archive');
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [tagPosts, setTagPosts] = useState<BlogPost[]>([]);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [activeMonth, setActiveMonth] = useState<number | null>(null);

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
    // 筛选同标签文章并按日期倒序排序（最新的在前）
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

  // 处理年份点击
  const handleYearClick = (year: number) => {
    setActiveYear(year === activeYear ? null : year);
    setActiveMonth(null); // 重置月份选择
  };

  // 处理月份点击
  const handleMonthClick = (month: number) => {
    setActiveMonth(month === activeMonth ? null : month);
  };

  // 获取所有年份并排序（降序）
  const years = useMemo(() => {
    return Object.keys(archivedPosts)
      .map(year => parseInt(year))
      .sort((a, b) => b - a);
  }, [archivedPosts]);

  // 准备筛选后的文章数据
  const filteredPosts = useMemo(() => {
    let result: { [year: number]: { [month: number]: { [day: number]: BlogPost[] } } } = {};
    
    // 如果没有选择年份，显示所有年份
    const targetYears = activeYear ? [activeYear] : years;
    
    targetYears.forEach(year => {
      result[year] = {};
      const yearData = archivedPosts[year];
      
      // 获取当前年份的所有月份并排序（降序）
      const months = Object.keys(yearData)
        .map(month => parseInt(month))
        .sort((a, b) => b - a);
      
      // 如果选择了月份，只显示该月份
      const targetMonths = activeMonth ? [activeMonth] : months;
      
      targetMonths.forEach(month => {
        if (yearData[month]) {
          result[year][month] = yearData[month];
        }
      });
    });
    
    return result;
  }, [archivedPosts, activeYear, activeMonth, years]);

  // 准备右侧内容区的时间轴数据
  const timelineData = useMemo(() => {
    const result: Array<{
      year: number;
      month: number;
      posts: BlogPost[];
    }> = [];
    
    // 获取所有年份并排序（降序）
    const years = Object.keys(filteredPosts)
      .map(year => parseInt(year))
      .sort((a, b) => b - a);
    
    years.forEach(year => {
      // 获取当前年份的所有月份并排序（降序）
      const months = Object.keys(filteredPosts[year])
        .map(month => parseInt(month))
        .sort((a, b) => b - a);
      
      months.forEach(month => {
        // 获取当前月份的所有日期并排序（降序）
        const days = Object.keys(filteredPosts[year][month])
          .map(day => parseInt(day))
          .sort((a, b) => b - a);
        
        // 收集当月所有文章
        const monthPosts: BlogPost[] = [];
        days.forEach(day => {
          monthPosts.push(...filteredPosts[year][month][day]);
        });
        
        result.push({
          year,
          month,
          posts: monthPosts
        });
      });
    });
    
    return result;
  }, [filteredPosts]);

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-transparent rounded-lg p-6 mb-8 text-center"
          >
            <h1 className="text-4xl font-bold text-foreground mb-4">博客归档</h1>
            <p className="text-muted-foreground">
              共 {totalPosts} 篇文章，按年份、月份和日期归档
            </p>
          </motion.div>

          <div className="flex gap-6">
            {/* 左侧侧边栏 */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className={getGlassStyle("w-64 rounded-lg border p-4 h-fit sticky top-6")}
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">年份列表</h2>
              <div className="space-y-2">
                {years.map(year => (
                  <div key={year} className="space-y-1">
                    <button
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-300 ${activeYear === year ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-muted text-foreground'}`}
                      onClick={() => handleYearClick(year)}
                    >
                      {year} 年
                    </button>
                    {/* 月份列表 - 只有当点击年份时才显示 */}
                    {activeYear === year && (
                      <div className="pl-4 space-y-1">
                        {Object.keys(archivedPosts[year])
                          .map(month => parseInt(month))
                          .sort((a, b) => b - a)
                          .map(month => (
                            <button
                              key={month}
                              className={`w-full text-left px-3 py-1.5 text-sm rounded-lg transition-all duration-300 ${activeMonth === month ? 'bg-primary/15 text-primary font-medium' : 'hover:bg-muted text-muted-foreground'}`}
                              onClick={() => handleMonthClick(month)}
                            >
                              {month} 月
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* 右侧内容区 */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex-1"
            >
              {timelineData.length > 0 ? (
                <div className="relative">
                  {/* 时间轴竖线 */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-primary/20"></div>
                  
                  <div className="space-y-10">
                    {timelineData.map(({ year, month, posts }) => (
                      <div key={`${year}-${month}`} className="relative pl-12">
                        {/* 时间轴节点 */}
                        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white dark:bg-black border-2 border-primary flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-primary"></div>
                        </div>
                        
                        {/* 月份文本 */}
                        <h3 className="text-xl font-semibold text-foreground mb-6">
                          {year} 年 {month} 月
                        </h3>
                        
                        {/* 文章列表 */}
                        <div className="space-y-4">
                          {posts.map((post) => (
                            <motion.div
                              key={post.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              whileHover={{ y: -2, boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}
                              transition={{ duration: 0.4 }}
                              className={getGlassStyle("p-4 rounded-lg border transition-all duration-300")}
                            >
                              <Link 
                                href={`/blogs/${post.slug}`}
                                className="block group"
                              >
                                <h5 className="text-lg font-medium text-foreground group-hover:text-primary transition-colors duration-300">
                                  {post.title}
                                </h5>
                                <div className="flex items-center text-sm text-muted-foreground mt-1 space-x-2">
                                  <span>{post.date}</span>
                                  <span>•</span>
                                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                                    {post.category}
                                  </span>
                                </div>
                                {post.excerpt && (
                                  <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                                    {post.excerpt}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {post.tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full cursor-pointer hover:bg-primary/20 hover:text-primary transition-all duration-300"
                                      onClick={(e) => handleTagClick(tag, e)}
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </Link>
                            </motion.div>
                          ))}
                        </div>
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
                    <div className="text-6xl mb-6">📄</div>
                    <h2 className="text-2xl font-semibold text-foreground mb-4">
                      暂无博客文章
                    </h2>
                    <p className="text-muted-foreground mb-8">
                      还没有发布任何博客文章，请稍后再来查看。
                    </p>
                    <Link 
                      href="/"
                      className="inline-flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
                    >
                      返回首页
                    </Link>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
      </div>
      
      

      {/* 标签筛选浮层 */}
      {showTagModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={getGlassStyle("w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl p-6 border")}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                标签: <span className="text-primary">#{selectedTag}</span>
              </h2>
              <button
                onClick={closeTagModal}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {tagPosts.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">共找到 {tagPosts.length} 篇相关文章</p>
                <div className="space-y-4">
                  {tagPosts.map((post) => (
                    <motion.div
                      key={post.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: Math.random() * 0.1 }}
                      className="p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-all duration-300"
                    >
                      <Link 
                        href={`/blogs/${post.slug}`}
                        className="block group"
                        onClick={closeTagModal}
                      >
                        <h3 className="text-lg font-medium text-foreground group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1 space-x-2">
                          <span>{post.date}</span>
                          <span>•</span>
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                            {post.category}
                          </span>
                        </div>
                        {post.excerpt && (
                          <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
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
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  暂无相关文章
                </h3>
                <p className="text-muted-foreground mb-6">
                  没有找到带有标签 #{selectedTag} 的文章
                </p>
                <button
                  onClick={closeTagModal}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
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