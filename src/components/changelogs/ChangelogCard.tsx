'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Changelog,
  ChangelogType,
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
 * 日志类型的短代码（沿用 Conventional Commits 前缀）
 *
 * 日志本身是按天的提交记录，用等宽短码配合中文标签，
 * 让卡片头部带一点「构建日志」的技术质感；短码在等宽字体下宽度稳定，
 * 不同类型的徽标长度也不会跳动得太厉害。
 */
const TYPE_CODES: Record<ChangelogType, string> = {
  feature: 'feat',
  optimize: 'perf',
  fix: 'fix',
  docs: 'docs',
  style: 'style',
  refactor: 'refactor',
};

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
  /**
   * 在已渲染列表中的序号，用于入场动画的错峰延迟。
   * 与友链卡片一致：单帧 0.04s、封顶 0.3s，避免长列表后半段等太久。
   */
  index?: number;
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
        className={`text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium whitespace-nowrap shadow-sm ${DEFAULT_HONOR_CLASS}`}
        title={honor.name}
      >
        {honor.name}
      </span>
    );
  }

  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap shadow-sm"
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
  index = 0,
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

  // 折叠态元信息是否至少有一项可展示，避免输出空的统计行
  const hasMeta =
    changelog.commits.length > 0 ||
    (changelog.lineCount || 0) > 0 ||
    (typeof changelog.charCount === 'number' && changelog.charCount > 0);

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
    /*
      入场动画与博客/工具/友链卡片保持同一套节奏：
      opacity 0→1 + 上移 20px 归位，0.4s；错峰延迟单帧 0.04s、封顶 0.3s。
      用 motion.article 而不是 CSS keyframes：站点其它列表卡片都由 Framer Motion 驱动，
      统一实现后动效参数只改一处，也能和「加载更多」时的新卡片自然衔接。
    */
    <motion.article
      id={`changelog-${changelog.id}`}
      className="group/item relative pb-5 pl-9 scroll-mt-24 sm:pl-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.04, 0.3),
        ease: 'easeOut',
      }}
    >
      {/*
        时间轴节点：外圈用类型色描边，内圈实心点。
        外圈额外套一圈与页面同色的阴影，把竖线从节点背后「遮断」，
        避免竖线直接从圆点中间穿过。
      */}
      <span
        className="absolute left-0 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background"
        style={{
          borderColor: typeColor,
          boxShadow: '0 0 0 4px var(--background)',
        }}
        /*
          供月份牌联动使用：圆点滚动到悬浮月份牌背后时，
          页面通过 data-dot-color 取到当前日志的类型色，
          让牌面亮起同色边框与指示灯，把「遮挡」变成颜色交接。
        */
        data-changelog-dot
        data-dot-color={typeColor}
        aria-hidden="true"
      >
        <span
          className={`block rounded-full transition-all duration-300 ${
            expanded ? 'h-3 w-3' : 'h-2 w-2'
          }`}
          style={{ backgroundColor: typeColor }}
        />
      </span>

      {/* 卡片主体：悬停位移交给 Framer Motion（y: -3，与全站卡片一致），
          CSS 过渡只负责阴影与边框，避免同一个位移被两套过渡重复驱动 */}
      <motion.div
        className="group/card relative overflow-hidden rounded-xl border border-border/80 bg-card/85 shadow-card backdrop-blur-md transition-[box-shadow,border-color] duration-300 hover:border-primary/30 hover:shadow-card-hover supports-[backdrop-filter]:bg-card/70"
        whileHover={{ y: -3, transition: { duration: 0.3, ease: 'easeOut' } }}
      >
        {/* 顶部一条类型色渐隐高光：比整块彩色边框更克制，又能区分类型 */}
        <span
          className="pointer-events-none absolute inset-x-6 top-0 h-px opacity-60"
          style={{
            background: `linear-gradient(90deg, transparent, ${typeColor}, transparent)`,
          }}
          aria-hidden="true"
        />

        <div className="relative p-4 sm:p-[18px]">
          {/* 卡片头部：类型徽标 + 日期 / 荣誉与成就 */}
          <header className="mb-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold shadow-sm"
                style={{ backgroundColor: typeColor, color: getContrastTextColor(typeColor) }}
              >
                <span className="font-mono uppercase tracking-wider">
                  {TYPE_CODES[changelog.type]}
                </span>
                <span className="opacity-50">·</span>
                <span>{typeLabel}</span>
              </span>

              <time
                dateTime={changelog.date}
                className="font-mono text-[11px] tabular-nums tracking-wide text-muted-foreground"
              >
                {changelog.date}
              </time>
            </div>

            <div className="flex min-w-0 flex-wrap items-center justify-end gap-1">
              {changelog.honors?.map((honor, index) => (
                <HonorBadge key={`honor-${index}`} honor={honor} />
              ))}

              {sortedAchievements.map((achievement) => {
                const color = getAchievementColor(achievement);
                return (
                  <span
                    key={achievement}
                    className="text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap shadow-sm"
                    style={{ backgroundColor: color, color: getContrastTextColor(color) }}
                    title={getAchievementLabel(achievement)}
                  >
                    {getAchievementLabel(achievement)}
                  </span>
                );
              })}
            </div>
          </header>

          <h3 className="mb-2 break-words text-base font-semibold leading-snug text-foreground transition-colors group-hover/card:text-primary sm:text-[17px]">
            {changelog.title}
          </h3>

          {/* 折叠态摘要：不必展开就能判断这条日志讲了什么 */}
          {!expanded && changelog.excerpt && (
            <p className="mb-2.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
              {changelog.excerpt}
            </p>
          )}

          {/* 折叠态元信息：数字用等宽字体，形成「构建统计」的秩序感 */}
          {hasMeta && (
            <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted-foreground">
              {changelog.commits.length > 0 && (
                <span className="inline-flex items-baseline gap-1">
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground/85">
                    {changelog.commits.length}
                  </span>
                  次提交
                </span>
              )}
              {changelog.commits.length > 0 && (changelog.lineCount || 0) > 0 && (
                <span className="h-2.5 w-px bg-border/70" aria-hidden="true" />
              )}
              {(changelog.lineCount || 0) > 0 && (
                <span className="inline-flex items-baseline gap-1">
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground/85">
                    {changelog.lineCount}
                  </span>
                  行正文
                </span>
              )}
              {typeof changelog.charCount === 'number' &&
                changelog.charCount > 0 &&
                (changelog.lineCount || 0) > 0 && (
                  <span className="h-2.5 w-px bg-border/70" aria-hidden="true" />
                )}
              {typeof changelog.charCount === 'number' && changelog.charCount > 0 && (
                <span className="inline-flex items-baseline gap-1">
                  <span className="font-mono text-[11px] font-semibold tabular-nums text-foreground/85">
                    {changelog.charCount}
                  </span>
                  字
                </span>
              )}
            </div>
          )}

          {/* 底部操作条：展开为主操作，复制链接为次要操作 */}
          <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2.5">
            <button
              type="button"
              onClick={() => onToggle(changelog.id)}
              onPointerEnter={() => onPrefetch(changelog.id)}
              onFocus={() => onPrefetch(changelog.id)}
              aria-expanded={expanded}
              aria-controls={contentId}
              className="group/expand inline-flex items-center gap-1 rounded-md py-0.5 text-xs font-medium text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <span>{expanded ? '收起正文' : '展开正文'}</span>
              <svg
                className={`h-3.5 w-3.5 transition-transform duration-300 ${
                  expanded ? 'rotate-180' : 'group-hover/expand:translate-y-0.5'
                }`}
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
              className="inline-flex items-center gap-1 rounded-md py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <svg
                className="h-3.5 w-3.5"
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
              className="mt-3 overflow-hidden break-words border-t border-border/40 pt-3 text-sm text-foreground"
            >
              {html ? (
                <div dangerouslySetInnerHTML={{ __html: html }} />
              ) : error ? (
                <div className="flex flex-wrap items-center gap-3 py-2 text-muted-foreground">
                  <span>日志正文加载失败。</span>
                  <button
                    type="button"
                    onClick={() => onRetry(changelog.id)}
                    className="rounded text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    重试
                  </button>
                </div>
              ) : (
                <p className="flex items-center gap-2 py-2 text-muted-foreground">
                  {/* 三点脉冲：让「加载中」不只是静态文字 */}
                  <span className="inline-flex items-center gap-1" aria-hidden="true">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-primary" />
                    <span className="h-1 w-1 animate-pulse rounded-full bg-primary [animation-delay:150ms]" />
                    <span className="h-1 w-1 animate-pulse rounded-full bg-primary [animation-delay:300ms]" />
                  </span>
                  {loading ? '日志正文加载中…' : '准备加载正文…'}
                </p>
              )}

              {changelog.commits.length > 0 && (
                <div className="mt-4 border-t border-border/40 pt-3">
                  <p className="mb-2 text-xs text-muted-foreground">关联提交：</p>
                  <div className="flex flex-wrap gap-2">
                    {changelog.commits.map((commit, index) => (
                      <span
                        key={index}
                        className="break-all rounded-md border border-border/60 bg-muted/50 px-2 py-1 font-mono text-[11px] text-muted-foreground"
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
      </motion.div>
    </motion.article>
  );
}

export default memo(ChangelogCard);
