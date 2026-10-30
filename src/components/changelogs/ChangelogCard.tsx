'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Changelog,
  CustomHonor,
  getAchievementColor,
  getAchievementLabel,
  getChangelogTypeColor,
  getChangelogTypeLabel,
  getContrastTextColor,
  sortAchievementsByPriority,
} from '@/types/changelogTypes';

/**
 * 后台「添加荣誉」写入的默认值。
 *
 * 这是 Tailwind 类名而非颜色值，需要保留旧字符串用于识别历史数据；
 * 渲染时统一映射到对比度更高的深蓝渐变。
 */
const STORED_DEFAULT_HONOR_COLOR =
  'bg-gradient-to-r from-blue-500 via-sky-400 via-cyan-400 via-blue-400 to-blue-600';

/** 默认荣誉标签的展示样式：白字在深蓝渐变上可读性更好 */
const DEFAULT_HONOR_CLASS = 'bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800';

/**
 * 单张开发日志卡片
 *
 * 从页面主组件中抽离并 memo：展开任意一条日志时，只有该卡片会重新渲染，
 * 其余卡片与右侧统计图不受影响。
 */
export interface ChangelogCardProps {
  changelog: Changelog;
  expanded: boolean;
  /** 构建期预渲染的正文 HTML（按需加载） */
  html?: string;
  /** 正文是否正在请求 */
  loading?: boolean;
  /** 正文是否加载失败（失败不写入缓存，可重试） */
  error?: boolean;
  onToggle: (id: string) => void;
  onPrefetch: (id: string) => void;
  onRetry: (id: string) => void;
}

/**
 * 荣誉标签
 *
 * 三种情况：
 * - 未设置颜色 / 历史默认值：使用站点默认深蓝渐变；
 * - CSS 渐变：保留渐变背景，白字；
 * - 纯色：按背景亮度自动选择黑/白字。
 */
function HonorBadge({ honor }: { honor: CustomHonor }) {
  const color = honor.color?.trim() || '';
  const isStoredDefault = !color || color === STORED_DEFAULT_HONOR_COLOR;
  const looksLikeTailwindClass = color.startsWith('bg-');
  const isGradient = /gradient/i.test(color);

  if (isStoredDefault || looksLikeTailwindClass) {
    return (
      <span
        className={`text-[11px] px-2 py-0.5 rounded-full text-white font-medium whitespace-nowrap ${DEFAULT_HONOR_CLASS}`}
        title={honor.name}
      >
        {honor.name}
      </span>
    );
  }

  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
      style={
        isGradient
          ? { background: color, color: '#ffffff' }
          : { backgroundColor: color, color: getContrastTextColor(color) }
      }
      title={honor.name}
    >
      {honor.name}
    </span>
  );
}

function ChangelogCard({
  changelog,
  expanded,
  html,
  loading = false,
  error = false,
  onToggle,
  onPrefetch,
  onRetry,
}: ChangelogCardProps) {
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<number | null>(null);

  // 成就排序结果只依赖 achievements，避免每次父组件渲染都重新排序
  const sortedAchievements = useMemo(
    () => sortAchievementsByPriority(changelog.achievements),
    [changelog.achievements]
  );

  const typeColor = getChangelogTypeColor(changelog.type);
  const typeLabel = getChangelogTypeLabel(changelog.type);
  const contentId = `changelog-content-${changelog.id}`;

  useEffect(
    () => () => {
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
    },
    []
  );

  /**
   * 复制单篇日志的永久链接（与本页 AI 来源跳转共用 #changelog-<id>）
   */
  const handleCopyPermalink = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}#changelog-${changelog.id}`;

    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // 非安全上下文或浏览器拒绝授权时的兜底
      window.prompt('复制此链接', url);
    }
  }, [changelog.id]);

  return (
    <article
      id={`changelog-${changelog.id}`}
      className="relative flex gap-3 sm:gap-8 scroll-mt-24 rounded-lg"
    >
      {/* 时间轴圆点：颜色跟随日志类型 */}
      <div
        className="flex flex-shrink-0 items-center justify-center w-6 h-6 sm:w-8 sm:h-8 mt-3 rounded-full bg-background border-2 z-10"
        style={{ borderColor: typeColor }}
        aria-hidden="true"
      >
        <span
          className="block w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full"
          style={{ backgroundColor: typeColor }}
        />
      </div>

      <div className="flex-1 pb-6 min-w-0">
        <div className="p-4 rounded-lg border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-md supports-[backdrop-filter]:bg-card/75 hover:border-primary/30">
          {/* 卡片头部：日期、荣誉/成就/类型标签 */}
          <header className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5 mb-2 pb-2 border-b border-border/30">
            <time
              dateTime={changelog.date}
              className="text-muted-foreground text-xs tabular-nums pt-0.5"
            >
              {changelog.date}
            </time>

            <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5">
              {changelog.honors?.map((honor, index) => (
                <HonorBadge key={`honor-${index}`} honor={honor} />
              ))}

              {sortedAchievements.map((achievement) => {
                const color = getAchievementColor(achievement);
                return (
                  <span
                    key={achievement}
                    className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                    style={{ backgroundColor: color, color: getContrastTextColor(color) }}
                    title={getAchievementLabel(achievement)}
                  >
                    {getAchievementLabel(achievement)}
                  </span>
                );
              })}

              <span
                className="text-[11px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                style={{ backgroundColor: typeColor, color: getContrastTextColor(typeColor) }}
              >
                {typeLabel}
              </span>
            </div>
          </header>

          <h3 className="text-base sm:text-lg font-semibold mb-1.5 break-words">
            {changelog.title}
          </h3>

          {/* 折叠态摘要：不必展开就能判断这条日志讲了什么 */}
          {!expanded && changelog.excerpt && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-2">
              {changelog.excerpt}
            </p>
          )}

          {/* 折叠态元信息 */}
          {(changelog.commits.length > 0 || (changelog.lineCount || 0) > 0) && (
            <p className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              {changelog.commits.length > 0 && (
                <span>{changelog.commits.length} 条提交</span>
              )}
              {(changelog.lineCount || 0) > 0 && (
                <span>{changelog.lineCount} 行正文</span>
              )}
              {typeof changelog.charCount === 'number' && changelog.charCount > 0 && (
                <span>{changelog.charCount} 字</span>
              )}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              onClick={() => onToggle(changelog.id)}
              onPointerEnter={() => onPrefetch(changelog.id)}
              onFocus={() => onPrefetch(changelog.id)}
              aria-expanded={expanded}
              aria-controls={contentId}
              className="text-sm text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span>{expanded ? '收起内容' : '展开查看'}</span>
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button
              type="button"
              onClick={handleCopyPermalink}
              aria-label={`复制《${changelog.title}》的链接`}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5"
                />
              </svg>
              <span aria-live="polite">{copied ? '已复制' : '复制链接'}</span>
            </button>
          </div>

          {/* 展开态：正文 + 关联提交 */}
          {expanded && (
            <div
              id={contentId}
              className="text-foreground text-sm mt-3 pt-3 border-t border-border/30 overflow-hidden break-words"
            >
              {html ? (
                <div dangerouslySetInnerHTML={{ __html: html }} />
              ) : error ? (
                <div className="flex flex-wrap items-center gap-3 py-2 text-muted-foreground">
                  <span>日志正文加载失败。</span>
                  <button
                    type="button"
                    onClick={() => onRetry(changelog.id)}
                    className="text-primary hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    重试
                  </button>
                </div>
              ) : (
                <p className="py-2 text-muted-foreground">
                  {loading ? '日志正文加载中…' : '准备加载正文…'}
                </p>
              )}

              {changelog.commits.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/30">
                  <p className="text-xs text-muted-foreground mb-2">关联提交：</p>
                  <div className="flex flex-wrap gap-2">
                    {changelog.commits.map((commit, index) => (
                      <span
                        key={index}
                        className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground font-mono break-all"
                      >
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
    </article>
  );
}

export default memo(ChangelogCard);
