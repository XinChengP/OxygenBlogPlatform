"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { Pin } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

/**
 * 博客文章接口
 * 与 page.tsx 中的服务端数据类型保持一致
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
  /** 封面图片路径，未配置时为空 */
  coverImage?: string;
  pinned?: boolean;
  pinnedAt?: string;
}

/**
 * 归档页面 Props 接口
 */
interface ClientArchivePageProps {
  /** 已按发布日期倒序排列的文章列表 */
  archivedPosts: BlogPost[];
}

/**
 * 将 YYYY-MM-DD 格式的日期转换为「2026.8.23」这种更轻量的展示格式
 *
 * 实现说明：
 * 刻意不经过 new Date() 解析。因为 new Date('2026-09-12') 会按 UTC 零点解析，
 * 在东八区以外的时区回退会导致日期显示偏差一天，直接用字符串拆分最稳妥。
 *
 * @param dateStr - 标准格式的日期字符串
 * @returns 去掉补零的展示用日期
 */
function formatTimelineDate(dateStr: string): string {
  const parts = dateStr.split('-');
  // 格式异常时原样返回，避免展示出 undefined
  if (parts.length !== 3) {
    return dateStr;
  }
  const [year, month, day] = parts;
  return `${year}.${Number(month)}.${Number(day)}`;
}

/**
 * 客户端归档页面组件
 *
 * 视觉结构：左侧日期列 + 中间竖向时间轴 + 右侧文章卡片
 * 与原行为相比的变化：
 * 1. 移除了年份折叠交互，全部文章在同一时间轴上平铺展示
 * 2. 卡片新增封面图展示
 * 3. 保留了原有的标签点击筛选浮层
 */
export default function ClientArchivePage({ archivedPosts }: ClientArchivePageProps) {
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('archive');
  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [tagPosts, setTagPosts] = useState<BlogPost[]>([]);

  // 毛玻璃样式函数
  const getGlassStyle = (baseStyle: string) => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };

  // 文章总数：服务端已返回扁平列表，直接取长度即可
  const totalPosts = archivedPosts.length;

  // 处理标签点击
  const handleTagClick = (tag: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 服务端已按时间倒序，筛选后天然保持有序，无需再次排序
    const filteredPosts = archivedPosts.filter(post => post.tags.includes(tag));
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

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <PageHeader
          title="归档"
          description={`共 ${totalPosts} 篇文章，按发布时间线浏览`}
          size="lg"
          className="mb-12"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {archivedPosts.length > 0 ? (
            <div className="relative">
              {/*
                竖向时间轴主线
                移动端定位在 left-[6.5px]，与下方圆点（left-0 起、宽 3.5）的中心 7px 对齐；
                桌面端定位在日期列（9rem）与卡片（间距 1.5rem）之间，取 156px。
              */}
              <div className="absolute left-[6.5px] md:left-[155.5px] top-3 bottom-3 w-px bg-gradient-to-b from-primary/60 via-border to-transparent pointer-events-none" />

              <div className="space-y-6">
                {archivedPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
                    className="relative md:grid md:grid-cols-[9rem_1fr] md:gap-x-6"
                  >
                    {/* 时间轴节点圆点 - 置于主线之上 */}
                    <span className="absolute left-0 top-[18px] md:left-[149px] w-3.5 h-3.5 rounded-full bg-card border-2 border-primary/60 ring-4 ring-background/60 z-10" />

                    {/* 日期列 - 仅桌面端展示，移动端日期并入卡片元信息 */}
                    <div className="hidden md:block text-right pt-[14px] pr-1">
                      <time
                        dateTime={post.date}
                        className="text-sm font-medium text-muted-foreground tabular-nums"
                      >
                        {formatTimelineDate(post.date)}
                      </time>
                    </div>

                    {/* 文章卡片 - 移动端靠左留出时间轴空间 */}
                    <div className="pl-8 md:pl-0">
                      <Link href={`/blogs/${encodeURIComponent(post.slug)}`} className="block group">
                        <div className={getGlassStyle("p-4 rounded-xl border transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30")}>
                          <div className="flex gap-4">
                            {/* 封面图 - 未配置封面时不渲染，文字自动占满整行 */}
                            {post.coverImage && (
                              <div className="shrink-0 w-24 h-20 sm:w-36 sm:h-28 rounded-lg overflow-hidden bg-muted">
                                <img
                                  src={post.coverImage}
                                  alt={post.title}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              {/* 标题行：置顶标记 + 标题 */}
                              <div className="flex items-start gap-2 mb-2">
                                {post.pinned && (
                                  <span className="shrink-0 mt-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-0.5 shadow-sm">
                                    <Pin className="w-3 h-3" />
                                    置顶
                                  </span>
                                )}
                                <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors duration-300 line-clamp-2">
                                  {post.title}
                                </h3>
                              </div>

                              {/* 元信息：移动端在此处补上日期 */}
                              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                <span className="md:hidden tabular-nums">{formatTimelineDate(post.date)}</span>
                                <span className="md:hidden text-border">·</span>
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
                              {post.tags.length > 0 && (
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
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </motion.div>
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
                            <span>{formatTimelineDate(post.date)}</span>
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
