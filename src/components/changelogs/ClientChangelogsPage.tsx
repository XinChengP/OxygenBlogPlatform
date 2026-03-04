'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkEmoji from 'remark-emoji';
import rehypeHighlight from 'rehype-highlight';
import { Changelog, getChangelogTypeColor, getChangelogTypeLabel } from '@/types/changelogTypes';
import PageHeader from '@/components/ui/PageHeader';

/**
 * 客户端开发日志页面组件的Props接口
 */
interface ClientChangelogsPageProps {
  changelogs: Changelog[];
}

/**
 * 客户端开发日志页面组件
 * 展示开发日志列表，支持展开/收起功能
 * 使用时间线样式展示日志
 */
function ClientChangelogsPage({ changelogs }: ClientChangelogsPageProps) {
  // 管理每个日志的展开/收起状态
  // key为日志id，value为是否展开
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  /**
   * 切换日志的展开/收起状态
   * @param id 日志ID
   */
  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* 页面标题区域 */}
        <PageHeader
          title="开发日志"
          description="记录项目成长，见证每一次进步"
          icon="📋"
          size="lg"
          className="mb-12"
        />

        {/* 日志列表区域 */}
        <div className="space-y-6">
          {/* 空状态处理：没有日志时显示提示 */}
          {changelogs.length === 0 ? (
            <div className="p-6 rounded-lg border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75 text-center">
              <h3 className="text-xl font-semibold mb-2">暂无开发日志</h3>
              <p className="text-muted-foreground">还没有发布任何开发日志</p>
            </div>
          ) : (
            /* 时间线布局 */
            <div className="relative">
              {/* 左侧时间轴竖线 */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border/50 hidden sm:block"></div>

              {/* 日志卡片列表 */}
              {changelogs.map((changelog) => (
                <div key={changelog.id} className="relative flex gap-4 sm:gap-8">
                  {/* 时间轴圆点指示器 */}
                  <div className="hidden sm:flex flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 border-2 border-primary items-center justify-center z-10">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                  </div>

                  {/* 日志卡片内容 */}
                  <div className="flex-1 pb-6">
                    <div className="p-4 rounded-lg border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-md supports-[backdrop-filter]:bg-card/75">
                      {/* 卡片头部：日期和类型标签 */}
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-border/30">
                        <span className="text-muted-foreground text-xs">{changelog.date}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getChangelogTypeColor(changelog.type)} text-white font-medium`}>
                          {getChangelogTypeLabel(changelog.type)}
                        </span>
                      </div>

                      {/* 日志标题 */}
                      <h3 className="text-lg font-semibold mb-2">{changelog.title}</h3>

                      {/* 展开/收起按钮 */}
                      <button
                        onClick={() => toggleExpand(changelog.id)}
                        className="text-sm text-primary hover:text-primary/80 transition-colors mb-2 flex items-center gap-1"
                      >
                        {expandedLogs[changelog.id] ? (
                          <>
                            <span>收起内容</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            <span>展开查看</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </>
                        )}
                      </button>

                      {/* 可展开的内容区域 */}
                      {expandedLogs[changelog.id] && (
                        <div className="text-foreground text-sm mt-3 pt-3 border-t border-border/30">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm, remarkEmoji]}
                            rehypePlugins={[rehypeHighlight]}
                            components={{
                              // 标题样式
                              h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                              h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mb-3" {...props} />,
                              h3: ({ node, ...props }) => <h3 className="text-lg font-medium mb-2" {...props} />,
                              // 段落样式
                              p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                              // 列表样式
                              ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-2" {...props} />,
                              ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-2" {...props} />,
                              li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                              // 引用样式
                              blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-primary pl-4 italic mb-2" {...props} />,
                              // 强调样式
                              strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                              em: ({ node, ...props }) => <em className="italic" {...props} />,
                              // 代码样式
                              code: ({ node, className, children, ...props }: any) => {
                                const inline = !className || !className.includes('language-');
                                if (inline) {
                                  return <code className="bg-muted px-1 rounded" {...props}>{children}</code>;
                                }
                                return <pre className="bg-muted p-3 rounded overflow-x-auto mb-2" {...props}><code>{children}</code></pre>;
                              },
                            }}
                          >
                            {changelog.content}
                          </ReactMarkdown>

                          {/* 关联的Git提交信息 */}
                          {changelog.commits && changelog.commits.length > 0 && (
                            <div className="mt-4 pt-3 border-t border-border/30">
                              <p className="text-xs text-muted-foreground mb-2">关联提交：</p>
                              <div className="flex flex-wrap gap-2">
                                {changelog.commits.map((commit, index) => (
                                  <span key={index} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-mono">
                                    {commit}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ClientChangelogsPage;
