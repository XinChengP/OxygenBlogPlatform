'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkEmoji from 'remark-emoji';
import rehypeHighlight from 'rehype-highlight';
import {
  Changelog,
  getChangelogTypeColor,
  getChangelogTypeLabel,
  getAchievementLabel,
  getAchievementColor,
  sortAchievementsByPriority,
  getAchievementDescriptions,
  getAchievementGroupLabel,
  ACHIEVEMENT_GROUP_ORDER
} from '@/types/changelogTypes';
import PageHeader from '@/components/ui/PageHeader';
import dynamic from 'next/dynamic';
import DeferredMount from '@/components/core/DeferredMount';

const TimeStatsChart = dynamic(() => import('./TimeStatsChart'), { ssr: false });
const TypeStatsChart = dynamic(() => import('./TypeStatsChart'), { ssr: false });
import { Live2DMessageHelper } from '@/utils/live2dMessageManager';
// 全站层级令牌：成就说明弹窗的层级统一走这里
import { Z_INDEX } from '@/utils/zIndex';

// 通用 Markdown 组件属性
type MarkdownComponentProps = {
  children?: React.ReactNode;
  className?: string;
  [key: string]: any;
};

/**
 * 开发日志页面的 Markdown 渲染组件配置
 * 提取为模块级常量，避免每次渲染都创建新的组件引用
 * 防止 react-markdown 因 components 引用变化而重新构建组件树
 */
const changelogsMarkdownComponents: React.ComponentProps<typeof ReactMarkdown>['components'] = {
  // 标题样式 - 添加自动换行
  h1: ({ node, ...props }: MarkdownComponentProps) => <h1 className="text-2xl font-bold mb-4 break-words whitespace-normal" {...props} />,
  h2: ({ node, ...props }: MarkdownComponentProps) => <h2 className="text-xl font-semibold mb-3 break-words whitespace-normal" {...props} />,
  h3: ({ node, ...props }: MarkdownComponentProps) => <h3 className="text-lg font-medium mb-2 break-words whitespace-normal" {...props} />,
  h4: ({ node, ...props }: MarkdownComponentProps) => <h4 className="text-base font-medium mb-2 break-words whitespace-normal" {...props} />,
  h5: ({ node, ...props }: MarkdownComponentProps) => <h5 className="text-sm font-medium mb-1 break-words whitespace-normal" {...props} />,
  h6: ({ node, ...props }: MarkdownComponentProps) => <h6 className="text-xs font-medium mb-1 break-words whitespace-normal" {...props} />,
  // 段落样式 - 强制自动换行
  p: ({ node, ...props }: MarkdownComponentProps) => <p className="mb-2 break-words whitespace-normal overflow-wrap-anywhere" {...props} />,
  // 列表样式
  ul: ({ node, ...props }: MarkdownComponentProps) => <ul className="list-disc pl-6 mb-2 break-words" {...props} />,
  ol: ({ node, ...props }: MarkdownComponentProps) => <ol className="list-decimal pl-6 mb-2 break-words" {...props} />,
  li: ({ node, ...props }: MarkdownComponentProps) => <li className="mb-1 break-words whitespace-normal" {...props} />,
  // 引用样式
  blockquote: ({ node, ...props }: MarkdownComponentProps) => <blockquote className="border-l-4 border-primary pl-4 italic mb-2 break-words whitespace-normal" {...props} />,
  // 强调样式
  strong: ({ node, ...props }: MarkdownComponentProps) => <strong className="font-bold break-words" {...props} />,
  em: ({ node, ...props }: MarkdownComponentProps) => <em className="italic break-words" {...props} />,
  // 链接样式
  a: ({ node, ...props }: MarkdownComponentProps) => <a className="text-primary hover:underline break-words" {...props} />,
  // 代码样式
  code: ({ node, className, children, ...props }: MarkdownComponentProps) => {
    const inline = !className || !className.includes('language-');
    if (inline) {
      return <code className="bg-muted px-1 rounded break-words whitespace-normal" {...props}>{children}</code>;
    }
    return <pre className="bg-muted p-3 rounded overflow-x-auto mb-2" {...props}><code>{children}</code></pre>;
  },
  // 表格样式
  table: ({ node, ...props }: MarkdownComponentProps) => <div className="overflow-x-auto mb-2"><table className="w-full border-collapse" {...props} /></div>,
  th: ({ node, ...props }: MarkdownComponentProps) => <th className="border border-border px-2 py-1 text-left break-words" {...props} />,
  td: ({ node, ...props }: MarkdownComponentProps) => <td className="border border-border px-2 py-1 break-words" {...props} />,
};

/**
 * 成就说明分组数据（静态数据，与 achievementConfig 同源）
 * 按 ACHIEVEMENT_GROUP_ORDER 顺序整理为「分组标题 + 条目」，
 * 弹窗按分节渲染；提取到模块级，避免每次渲染重复计算。
 */
const achievementGroups = ACHIEVEMENT_GROUP_ORDER.map((group) => ({
  group,
  label: getAchievementGroupLabel(group),
  items: getAchievementDescriptions().filter((item) => item.group === group),
}));

/** 成就总数（用于弹窗顶部说明） */
const achievementTotalCount = achievementGroups.reduce(
  (total, section) => total + section.items.length,
  0
);

/**
 * 时间统计项接口
 */
interface TimeStatItem {
  label: string;
  count: number;
}

/**
 * 时间统计数据接口
 */
interface TimeStats {
  month: TimeStatItem[];
  quarter: TimeStatItem[];
  year: TimeStatItem[];
}

/**
 * 客户端开发日志页面组件的 Props 接口
 */
interface ClientChangelogsPageProps {
  changelogs: Changelog[];
  blogTimeStats?: TimeStats;
  momentTimeStats?: TimeStats;
}

/**
 * 客户端开发日志页面组件
 * 展示开发日志列表，支持展开/收起功能
 * 使用时间线样式展示日志
 */
function ClientChangelogsPage({ changelogs, blogTimeStats, momentTimeStats }: ClientChangelogsPageProps) {
  // 管理每个日志的展开/收起状态
  // key 为日志 id，value 为是否展开
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});

  // 成就说明弹窗的显示状态
  const [showAchievementGuide, setShowAchievementGuide] = useState(false);

  // 刻意不使用 useBodyScrollLock：它会给 body 设置 overflow: hidden，
  // 这会让右侧 lg:sticky 的统计栏失去粘性定位、回落到文档流原位；
  // 当用户已滚动到页面中段时，该位置在视口之外，看起来就像卡片「消失」。
  // 弹窗内容不长，且已有 Esc 与点击遮罩两种关闭方式，因此这里不锁定页面滚动。

  // 页面加载时发送Live2D欢迎消息
  useEffect(() => {
    Live2DMessageHelper.showChangelogsMessage('PAGE_VISIT');
  }, []);

  // 按下 Esc 关闭成就说明弹窗
  useEffect(() => {
    if (!showAchievementGuide) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAchievementGuide(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAchievementGuide]);

  /**
   * 切换日志的展开/收起状态
   * @param id 日志 ID
   */
  const toggleExpand = (id: string) => {
    setExpandedLogs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-[80px] pb-16">
        {/* 页面标题区域 */}
        <PageHeader
          title="开发日志"
          description="博客の成长历程"
          size="lg"
          className="mb-12"
        />

        {/* 主要内容区域 - 使用固定宽度布局 */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左侧：日志内容（固定 70% 宽度） */}
          <div className="w-full lg:w-[70%] flex-shrink-0 flex-grow-0">
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
                      <div className="flex-1 pb-6 min-w-0">
                        <div className="p-4 rounded-lg border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-md supports-[backdrop-filter]:bg-card/75">
                          {/* 卡片头部：日期、成就标签和类型标签 */}
                          <div className="flex justify-between items-center mb-2 pb-2 border-b border-border/30">
                            <span className="text-muted-foreground text-xs">{changelog.date}</span>
                            <div className="flex items-center gap-1.5">
                              {/* 自定义荣誉标签 - 显示在最左侧 */}
                              {changelog.honors && changelog.honors.length > 0 &&
                                changelog.honors.map((honor, index) => {
                                  // 默认荣誉颜色 - 天依蓝渐变
                                  const defaultHonorColor = 'bg-gradient-to-r from-blue-500 via-sky-400 via-cyan-400 via-blue-400 to-blue-600';
                                  // 如果honor定义了color且不是默认颜色，则使用自定义颜色（通过style设置）
                                  // 否则使用默认的渐变背景色（通过className设置）
                                  const hasCustomColor = honor.color && honor.color !== defaultHonorColor;
                                  return (
                                    <span
                                      key={`honor-${index}`}
                                      className={`text-xs px-2 py-0.5 rounded-full text-white font-medium ${hasCustomColor ? '' : defaultHonorColor}`}
                                      style={hasCustomColor ? { background: honor.color } : undefined}
                                      title={honor.name}
                                    >
                                      {honor.name}
                                    </span>
                                  );
                                })
                              }
                              {/* 成就标签 - 显示在类型标签左侧 */}
                              {changelog.achievements && changelog.achievements.length > 0 &&
                                sortAchievementsByPriority(changelog.achievements).map((achievement) => (
                                  <span
                                    key={achievement}
                                    className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                                    style={{ backgroundColor: getAchievementColor(achievement) }}
                                    title={getAchievementLabel(achievement)}
                                  >
                                    {getAchievementLabel(achievement)}
                                  </span>
                                ))
                              }
                              {/* 类型标签 */}
                              <span
                                className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                                style={{ backgroundColor: getChangelogTypeColor(changelog.type) }}
                              >
                                {getChangelogTypeLabel(changelog.type)}
                              </span>
                            </div>
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
                            <div className="text-foreground text-sm mt-3 pt-3 border-t border-border/30 overflow-hidden break-words">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm, remarkEmoji]}
                                rehypePlugins={[rehypeHighlight]}
                                components={changelogsMarkdownComponents}
                              >
                                {changelog.content}
                              </ReactMarkdown>

                              {/* 关联的 Git 提交信息 */}
                              {changelog.commits && changelog.commits.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-border/30">
                                  <p className="text-xs text-muted-foreground mb-2">关联提交：</p>
                                  <div className="flex flex-wrap gap-2">
                                    {changelog.commits.map((commit, index) => (
                                      <span key={index} className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-mono break-all">
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

          {/* 右侧：统计图表（固定 30% 宽度） */}
          <div className="w-full lg:w-[30%] flex-shrink-0 flex-grow-0">
            <div className="space-y-4 lg:sticky lg:top-24">
              <DeferredMount minHeight={320}>
                <TimeStatsChart changelogs={changelogs} blogTimeStats={blogTimeStats} momentTimeStats={momentTimeStats} />
              </DeferredMount>
              <DeferredMount minHeight={280}>
                <TypeStatsChart changelogs={changelogs} blogTimeStats={blogTimeStats} momentTimeStats={momentTimeStats} />
              </DeferredMount>

              {/* 成就说明入口：点击弹出全部成就的触发条件说明 */}
              <button
                type="button"
                onClick={() => setShowAchievementGuide(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75 hover:shadow-xl hover:border-primary/40 text-sm text-muted-foreground hover:text-foreground"
              >
                {/* 奖杯图标 */}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 4h8v5a4 4 0 01-8 0V4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 5H6a2 2 0 000 4h2M16 5h2a2 2 0 010 4h-2M12 13v3M9 20h6" />
                </svg>
                <span>查看成就说明</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 成就说明弹窗：列出全部成就的名称、颜色与触发条件 */}
      {showAchievementGuide && (
        <div
          className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
          style={{ zIndex: Z_INDEX.modalBackdrop }}
        >
          {/* 遮罩层：点击空白处关闭；只做半透明压暗、不加模糊
              —— 网站统计卡片本身是毛玻璃样式，再叠加一层 blur 会让它
              看起来像「消失」，去掉模糊后背景仍可正常辨认 */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowAchievementGuide(false)}
            aria-hidden="true"
          />

          {/* 弹窗主体 */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="achievement-guide-title"
            className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden"
            style={{ zIndex: Z_INDEX.modal }}
          >
            {/* 头部：标题与关闭按钮 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
              <h3
                id="achievement-guide-title"
                className="text-base font-bold flex items-center gap-2 bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent"
              >
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 4h8v5a4 4 0 01-8 0V4z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 5H6a2 2 0 000 4h2M16 5h2a2 2 0 010 4h-2M12 13v3M9 20h6" />
                </svg>
                成就说明
              </h3>
              <button
                type="button"
                onClick={() => setShowAchievementGuide(false)}
                aria-label="关闭成就说明"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 内容区：可滚动 */}
            <div className="px-5 py-3 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-3">
                共 {achievementTotalCount} 种成就，随日志自动计算，无需手动申请。
              </p>

              {/* 按维度分组展示，每组一个小标题 */}
              <div className="space-y-3.5">
                {achievementGroups.map((section) => (
                  <div key={section.group}>
                    <h4 className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                      <span className="w-1 h-3 rounded-full bg-primary" aria-hidden="true" />
                      {section.label}
                    </h4>
                    <ul className="space-y-2">
                      {section.items.map((item) => (
                        <li key={item.key} className="flex items-start gap-3">
                          {/* 成就标签：与日志卡片上的样式保持一致 */}
                          <span
                            className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full text-white font-medium mt-0.5"
                            style={{ backgroundColor: item.color }}
                          >
                            {item.label}
                          </span>
                          <span className="text-sm text-foreground break-words">{item.condition}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* 自定义荣誉：一句简单介绍，不展开配置细节 */}
              <div className="mt-4 pt-3 border-t border-border/50">
                <h4 className="text-xs font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                  <span className="w-1 h-3 rounded-full bg-primary" aria-hidden="true" />
                  自定义荣誉
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  除自动成就外，日志还可在 frontmatter 里手动挂上自定义荣誉标签
                  （如纪念版本、特别致谢），与自动成就并排显示在日志卡片头部。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientChangelogsPage;
