"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Timeline } from '@/components/ui/timeline';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import ScrollToTop from '@/components/ScrollToTop';

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
}

/**
 * 归档页面 Props 接口
 */
interface ClientArchivePageProps {
  archivedPosts: { [year: number]: BlogPost[] };
}

/**
 * 客户端归档页面组件
 * 使用 Timeline 组件展示按年份归档的博客文章
 */
export default function ClientArchivePage({ archivedPosts }: ClientArchivePageProps) {
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('archive');

  // 毛玻璃样式函数
  const getGlassStyle = (baseStyle: string) => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };

  // 计算文章总数
  const totalPosts = useMemo(() => {
    return Object.values(archivedPosts).reduce((sum, posts) => sum + posts.length, 0);
  }, [archivedPosts]);

  // 准备 Timeline 数据
  const timelineData = useMemo(() => {
    // 获取所有年份并排序（降序）
    const years = Object.keys(archivedPosts)
      .map(year => parseInt(year))
      .sort((a, b) => b - a);

    return years.map(year => ({
      title: `${year}`,
      content: (
        <div className="space-y-6">
          {archivedPosts[year].map((post) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className={getGlassStyle("p-4 rounded-lg border")}
            >
              <Link 
                href={`/blogs/${post.slug}`}
                className="block group"
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
                <div className="flex flex-wrap gap-2 mt-3">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-muted text-muted-foreground text-xs rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      ),
    }));
  }, [archivedPosts, getGlassStyle]);

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
              共 {totalPosts} 篇文章，按年份归档
            </p>
          </motion.div>

          {timelineData.length > 0 ? (
            <Timeline data={timelineData} />
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
      </div>
      
      {/* 添加页面滚动导航组件 */}
      <ScrollToTop />
    </div>
  );
}