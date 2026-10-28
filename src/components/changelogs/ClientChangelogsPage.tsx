'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// DeferredMount 保证图表只在进入视口后才会被客户端渲染，
// 因此不需要 dynamic 的 ssr:false；后者会让整个静态页面
// bailout 到 client-side rendering，直接访问时停留在骨架屏。
const TimeStatsChart = dynamic(() => import('./TimeStatsChart'));
const TypeStatsChart = dynamic(() => import('./TypeStatsChart'));
import { Live2DMessageHelper } from '@/utils/live2dMessageManager';
import { getAssetPath } from '@/utils/assetUtils';
import { highlightAndScroll } from '@/utils/aiSourceJump';
// 全站层级令牌：成就说明弹窗的层级统一走这里
import { Z_INDEX } from '@/utils/zIndex';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

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

  // 日志正文按需加载：初始只下发元数据，首次展开/悬停时才取对应 HTML 片段
  const [htmlCache, setHtmlCache] = useState<Record<string, string>>({});
  const [htmlLoading, setHtmlLoading] = useState<Record<string, boolean>>({});
  const htmlRequestsRef = useRef<Set<string>>(new Set());

  // AI 来源跳转：问答面板引用某篇日志时，url 携带 #changelog-<id>，滚动定位并高亮，
  // 同时自动展开该条日志并预取正文（更新日志默认折叠，且正文是按需加载的——
  // 程序化滚动不会触发悬停事件，必须显式加载，否则定位过去只看到「展开后加载正文…」）
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (!hash.startsWith('changelog-')) return;
    const id = hash.replace(/^changelog-/, '');
    if (!id) return;
    setExpandedLogs((prev) => ({ ...prev, [id]: true }));
    loadChangelogHtml(id);
    // 等展开布局稳定后再定位，直接滚可能算错目标位置
    const timer = window.setTimeout(() => highlightAndScroll(hash), 260);
    return () => window.clearTimeout(timer);
  }, []);

  const loadChangelogHtml = useCallback((id: string) => {
    if (htmlCache[id] || htmlRequestsRef.current.has(id)) return;

    htmlRequestsRef.current.add(id);
    setHtmlLoading(prev => ({ ...prev, [id]: true }));

    fetch(getAssetPath(`/_changelog-content/${encodeURIComponent(id)}.html`))
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then(html => {
        setHtmlCache(prev => ({ ...prev, [id]: html }));
      })
      .catch(() => {
        setHtmlCache(prev => ({
          ...prev,
          [id]: '<p>日志正文加载失败，请刷新重试。</p>',
        }));
      })
      .finally(() => {
        htmlRequestsRef.current.delete(id);
        setHtmlLoading(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      });
  }, [htmlCache]);

  /**
   * 切换日志的展开/收起状态
   * @param id 日志 ID
   */
  const toggleExpand = (id: string) => {
    const willExpand = !expandedLogs[id];
    setExpandedLogs(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    if (willExpand) loadChangelogHtml(id);
  };

  // 弹窗打开时锁定页面滚动
  // useBodyScrollLock 已改为「不改动布局、保存并还原滚动位置」的实现，
  // 不会再让右侧 lg:sticky 统计栏失效，也不会在关闭后回到顶部
  useBodyScrollLock(showAchievementGuide);

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
                    <div
                      key={changelog.id}
                      id={`changelog-${changelog.id}`}
                      className="relative flex gap-4 sm:gap-8 scroll-mt-24"
                    >
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
                            onPointerEnter={() => loadChangelogHtml(changelog.id)}
                            onFocus={() => loadChangelogHtml(changelog.id)}
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

                          {/* 可展开的内容区域：正文按需从构建期生成的 HTML 片段加载 */}
                          {expandedLogs[changelog.id] && (
                            <div className="text-foreground text-sm mt-3 pt-3 border-t border-border/30 overflow-hidden break-words">
                              {htmlCache[changelog.id] ? (
                                <div dangerouslySetInnerHTML={{ __html: htmlCache[changelog.id] }} />
                              ) : (
                                <p className="py-2 text-muted-foreground">
                                  {htmlLoading[changelog.id] ? '日志正文加载中…' : '展开后加载正文…'}
                                </p>
                              )}

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
