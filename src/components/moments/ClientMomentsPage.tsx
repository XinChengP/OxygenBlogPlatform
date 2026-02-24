'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkEmoji from 'remark-emoji';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github.css';
import ImageGrid from './ImageGrid';
import { getAvatarPath, name } from '@/setting/AboutSetting';
import { getBilibiliVideoCount } from '@/utils/bilibiliUtils';

interface ClientMomentsPageProps {
  moments: Array<{ id: string; time: string; content: string; tags: string[]; images?: string[]; pinned?: boolean; filePath: string }>;
  blogCount: number;
  blogs: Array<{ id: string; title: string; date: string; updatedAt?: string; category?: string; tags?: string[] }>;
  categoryCount: number;
  tagCount: number;
}

function ClientMomentsPage({ moments, blogCount, blogs, categoryCount, tagCount }: ClientMomentsPageProps) {
  const [bilibiliVideos, setBilibiliVideos] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  console.log('Received stats from server:', {
    categoryCount,
    tagCount
  });

  // 获取B站视频数量
  useEffect(() => {
    const fetchBilibiliVideos = async () => {
      try {
        const count = await getBilibiliVideoCount('522845412');
        setBilibiliVideos(count);
      } catch (error) {
        console.error('获取B站视频数量失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBilibiliVideos();
  }, []);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">个人动态</h1>
          <p className="text-muted-foreground">记录生活点滴，分享日常思考</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 justify-center">
          {/* 左边：动态内容（70%宽度） */}
          <div className="lg:w-7/12 max-w-xl space-y-4">
            {(() => {
              // 混合动态和博客文章，按时间倒序排序
              const allItems = [
                ...moments.map(moment => ({
                  type: 'moment',
                  id: moment.id,
                  time: new Date(moment.time).getTime(),
                  pinned: moment.pinned || false,
                  data: moment
                })),
                ...blogs.map(blog => ({
                  type: 'blog',
                  id: blog.id,
                  time: new Date(blog.updatedAt || blog.date).getTime(),
                  pinned: false,
                  data: blog
                }))
              ];
              
              // 按置顶状态和时间倒序排序
              allItems.sort((a, b) => {
                // 置顶的动态优先显示
                if (a.pinned && !b.pinned) return -1;
                if (!a.pinned && b.pinned) return 1;
                // 都置顶或都不置顶时，按时间倒序排序
                return b.time - a.time;
              });
              
              if (allItems.length === 0) {
                return (
                  <div className="p-6 rounded-lg border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75 text-center">
                    <h3 className="text-xl font-semibold mb-2">暂无动态</h3>
                    <p className="text-muted-foreground">还没有发布任何动态，快来添加第一条吧！</p>
                  </div>
                );
              }
              
              return allItems.map(item => {
                if (item.type === 'moment') {
                  const moment = item.data as { id: string; time: string; content: string; tags: string[]; images?: string[]; pinned?: boolean; filePath: string };
                  return (
                    <div 
                      key={moment.id} 
                      className="p-4 rounded-lg border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-md supports-[backdrop-filter]:bg-card/75"
                    >
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-border/30">
                        <span className="text-muted-foreground text-xs">{moment.time}</span>
                        {moment.pinned && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                            置顶
                          </span>
                        )}
                      </div>
                      <div className="text-foreground text-sm">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm, remarkEmoji]}
                          rehypePlugins={[rehypeHighlight]}
                          components={{
                            h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mb-3" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-lg font-medium mb-2" {...props} />,
                            p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-2" {...props} />,
                            ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-2" {...props} />,
                            li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary pl-4 italic mb-2" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                            em: ({ node, ...props }) => <em className="italic" {...props} />,
                            code: ({ node, className, children, ...props }: any) => {
                              const inline = !className || !className.includes('language-');
                              if (inline) {
                                return <code className="bg-muted px-1 rounded" {...props}>{children}</code>;
                              }
                              return <pre className="bg-muted p-3 rounded overflow-x-auto mb-2" {...props}><code>{children}</code></pre>;
                            },
                          }}
                        >
                          {moment.content}
                        </ReactMarkdown>
                        
                        {/* 图片九宫格 */}
                        {moment.images && moment.images.length > 0 && (
                          <ImageGrid images={moment.images} />
                        )}
                      </div>
                    </div>
                  );
                } else {
                  const blog = item.data as { id: string; title: string; date: string; updatedAt?: string };
                  return (
                    <div 
                      key={blog.id} 
                      className="p-4 rounded-lg border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-md supports-[backdrop-filter]:bg-card/75"
                    >
                      <div className="text-foreground text-sm">
                        <p>在【{blog.updatedAt || blog.date}】发布了<a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/blogs/${blog.id}`} className="text-primary hover:underline">《{blog.title}》</a></p>
                      </div>
                    </div>
                  );
                }
              });
            })()}
          </div>

          {/* 右边：预留小组件（30%宽度） */}
          <div className="lg:w-3/12 max-w-md space-y-6">
            {/* 关于我卡片 */}
            <div className="p-6 rounded-lg border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75 sticky top-24">
              <div className="text-center mb-4">
                <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/about`} className="block w-20 h-20 rounded-full mx-auto mb-4 overflow-hidden border-2 border-primary/30 shadow-lg hover:shadow-xl transition-shadow">
                  <img 
                    src={getAvatarPath()} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                </a>
                <h3 className="text-xl font-bold mb-3"><a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/about`} className="hover:text-primary transition-colors">{name}</a></h3>
                <div className="flex justify-center space-x-1.5">
                  <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/moments`} className="text-center hover:text-primary transition-colors min-w-[45px]">
                    <div className="text-lg font-semibold">{moments.length}</div>
                    <div className="text-xs text-muted-foreground">动态</div>
                  </a>
                  <div className="w-px h-6 bg-border/50"></div>
                  <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/blogs`} className="text-center hover:text-primary transition-colors min-w-[45px]">
                    <div className="text-lg font-semibold">{blogCount}</div>
                    <div className="text-xs text-muted-foreground">博客</div>
                  </a>
                  <div className="w-px h-6 bg-border/50"></div>
                  <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/blogs`} className="text-center hover:text-primary transition-colors min-w-[45px]">
                    <div className="text-lg font-semibold">{categoryCount}</div>
                    <div className="text-xs text-muted-foreground">分类</div>
                  </a>
                  <div className="w-px h-6 bg-border/50"></div>
                  <a href={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/archive`} className="text-center hover:text-primary transition-colors min-w-[45px]">
                    <div className="text-lg font-semibold">{tagCount}</div>
                    <div className="text-xs text-muted-foreground">标签</div>
                  </a>
                </div>
              </div>
            </div>

            {/* 日历小组件 */}
            <div className="p-6 rounded-lg border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75">
              <div className="calendar">
                <div className="text-center mb-4">
                  <div className="text-lg font-medium">{new Date().getFullYear()}年 {new Date().toLocaleString('zh-CN', { month: 'long' })}</div>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
                  {['一', '二', '三', '四', '五', '六', '日'].map(day => (
                    <div key={day} className="font-medium text-muted-foreground py-1">{day}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs">
                  {Array.from({ length: 42 }, (_, i) => {
                    const date = new Date();
                    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
                    const startDate = new Date(firstDay);
                    // 调整起始日期，使周一成为第一天
                    const dayOfWeek = firstDay.getDay();
                    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                    startDate.setDate(startDate.getDate() - offset);
                    const currentDate = new Date(startDate);
                    currentDate.setDate(startDate.getDate() + i);
                    
                    const isCurrentMonth = currentDate.getMonth() === date.getMonth();
                    const isToday = currentDate.toDateString() === new Date().toDateString();
                    
                    return (
                      <div 
                        key={i} 
                        className={`aspect-square flex items-center justify-center rounded transition-colors ${isToday ? 'bg-primary text-primary-foreground font-medium' : isCurrentMonth ? 'text-foreground hover:bg-muted' : 'text-muted-foreground'}`}
                      >
                        {currentDate.getDate()}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ClientMomentsPage;