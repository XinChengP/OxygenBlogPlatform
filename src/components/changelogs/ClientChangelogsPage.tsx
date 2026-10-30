'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ACHIEVEMENT_GROUP_ORDER,
  CHANGELOG_TYPES,
  Changelog,
  ChangelogPeriodFilter,
  ChangelogPeriodMode,
  ChangelogType,
  getAchievementColor,
  getAchievementDescriptions,
  getAchievementGroupLabel,
  getAchievementLabel,
  getContrastTextColor,
  getPeriodLabel,
} from '@/types/changelogTypes';
import PageHeader from '@/components/ui/PageHeader';
import dynamic from 'next/dynamic';
import DeferredMount from '@/components/core/DeferredMount';
import ChangelogCard from './ChangelogCard';
import ChangelogFilterBar from './ChangelogFilterBar';
import MobileChangelogOverview from './MobileChangelogOverview';

// DeferredMount 保证图表只在进入视口后才会被客户端渲染，
// 因此不需要 dynamic 的 ssr:false；后者会让整个静态页面
// bailout 到 client-side rendering，直接访问时停留在骨架屏。
const TimeStatsChart = dynamic(() => import('./TimeStatsChart'));
const TypeStatsChart = dynamic(() => import('./TypeStatsChart'));
import { Live2DMessageHelper } from '@/utils/live2dMessageManager';
import { getAssetPath } from '@/utils/assetUtils';
// 全站层级令牌：成就说明弹窗的层级统一走这里
import { Z_INDEX } from '@/utils/zIndex';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/** 每次渲染的日志条数；筛选条件变化时回到第一页 */
const PAGE_SIZE = 20;

/** 深链定位时给固定导航留出的偏移 */
const NAV_OFFSET = 96;

/**
 * 当前正在执行的深链目标。
 *
 * 用户连续打开两条日志时，上一条的延迟校正必须失效，
 * 否则 1.5 秒后的回调会把页面重新拉回上一条日志。
 */
let activeChangelogJump: string | null = null;

/**
 * 滚动到指定日志并短暂高亮
 *
 * 与 utils/aiSourceJump 的 highlightAndScroll 不同：深链可能一次渲染 100+ 张卡片，
 * 图片/字体/正文加载会让目标位置在几百毫秒内反复变化。这里用原生 scrollIntoView
 * 定位（元素带 scroll-mt-24，会自动扣除固定导航），并在其后补几次校正。
 *
 * @param elementId 目标元素 id
 * @returns 目标是否存在且已具备布局高度
 */
function scrollToChangelogTarget(elementId: string): boolean {
  const element = document.getElementById(elementId);
  if (!element || element.getBoundingClientRect().height < 40) return false;

  activeChangelogJump = elementId;
  const isStale = () => activeChangelogJump !== elementId;

  let interrupted = false;

  const markInterrupted = () => {
    interrupted = true;
  };

  const removeInteractionListeners = () => {
    window.removeEventListener('wheel', markInterrupted);
    window.removeEventListener('touchstart', markInterrupted);
    window.removeEventListener('keydown', markInterrupted);
  };

  const highlight = () => {
    const current = document.getElementById(elementId);
    if (!current) return;

    current.classList.add('ai-source-highlight');
    // 同时写内联样式：React 重新渲染卡片时会按 className 覆盖 classList，
    // 内联样式能让高亮在正文加载引起的重渲染后仍然保留。
    current.style.boxShadow =
      '0 0 0 2px rgba(102, 204, 255, .9), 0 0 28px rgba(102, 204, 255, .45)';
    current.style.backgroundColor = 'rgba(102, 204, 255, .14)';

    window.setTimeout(() => {
      const latest = document.getElementById(elementId);
      latest?.classList.remove('ai-source-highlight');
      if (latest) {
        latest.style.boxShadow = '';
        latest.style.backgroundColor = '';
      }
    }, 2600);
  };

  const scrollTargetIntoView = () => {
    const current = document.getElementById(elementId);
    if (!current) return false;
    /*
      原生定位而不是手动计算 scrollTo：
      - 元素带 scroll-mt-24（96px），会自动扣除固定导航；
      - 深链一次渲染 100+ 张卡片时文档高度还在变化，手算坐标容易被钳到错误的底部。
      同步调用而不是放进 rAF：后台标签页会暂停 rAF。
    */
    current.scrollIntoView({ block: 'start', behavior: 'auto' });
    highlight();
    return true;
  };

  /*
    后台标签页会暂停 rAF、节流定时器，首次 scrollIntoView 也可能因为文档还没撑开而无效。
    用户从新标签切回页面时再定位一次，保证深链在「新标签打开、稍后查看」的场景也生效。
  */
  const onVisibilityChange = () => {
    if (document.hidden) return;
    if (isStale()) {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      return;
    }
    if (interrupted) {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      return;
    }

    const current = document.getElementById(elementId);
    if (current && Math.abs(current.getBoundingClientRect().top - NAV_OFFSET) > 60) {
      current.scrollIntoView({ block: 'start', behavior: 'auto' });
      highlight();
    }
    document.removeEventListener('visibilitychange', onVisibilityChange);
  };

  // 用户主动滚动/按键时停止后续校正，避免和回看操作抢滚动位置
  window.addEventListener('wheel', markInterrupted, { passive: true, once: true });
  window.addEventListener('touchstart', markInterrupted, { passive: true, once: true });
  window.addEventListener('keydown', markInterrupted, { once: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  scrollTargetIntoView();

  // 图片/字体/正文晚到导致目标偏移时补校正
  [600, 1500, 3000].forEach((delay, index, all) => {
    window.setTimeout(() => {
      if (isStale()) return;
      if (interrupted) {
        removeInteractionListeners();
        return;
      }

      const current = document.getElementById(elementId);
      if (!current) {
        removeInteractionListeners();
        return;
      }

      if (Math.abs(current.getBoundingClientRect().top - NAV_OFFSET) > 60) {
        current.scrollIntoView({ block: 'start', behavior: 'auto' });
      }

      if (index === all.length - 1) {
        removeInteractionListeners();
        // 页面可见时不再需要 visibilitychange；后台标签页保留，切回时补一次
        if (!document.hidden) {
          document.removeEventListener('visibilitychange', onVisibilityChange);
        }
      }
    }, delay);
  });

  return true;
}

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
 * 客户端开发日志页面组件的 Props 接口
 */
interface ClientChangelogsPageProps {
  changelogs: Changelog[];
  /** 服务端渲染/构建时间，用于移动端“本月”统计，避免 hydration 月份不一致 */
  generatedAt: string;
}

/**
 * 客户端开发日志页面组件
 *
 * 功能：
 * - 按类型/年份/周期筛选，筛选状态同步到 URL query，可直接分享；
 * - 按月分组 + 时间线，首屏只渲染最近 20 篇，滚动到底部自动续载；
 * - 正文按需加载，支持 AI 来源的 #changelog-<id> 深链定位；
 * - 移动端顶部提供可折叠总览，统计图仍保留在页面底部。
 */
function ClientChangelogsPage({ changelogs, generatedAt }: ClientChangelogsPageProps) {
  // 展开/收起状态：ref 与 state 同步，回调可以保持稳定，避免所有卡片重渲染
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const expandedRef = useRef<Record<string, boolean>>({});

  // 正文按需加载：初始只下发元数据，首次展开/悬停时才取对应 HTML 片段
  const [htmlCache, setHtmlCache] = useState<Record<string, string>>({});
  const htmlCacheRef = useRef<Record<string, string>>({});
  const [htmlLoading, setHtmlLoading] = useState<Record<string, boolean>>({});
  const [htmlErrors, setHtmlErrors] = useState<Record<string, boolean>>({});
  const htmlRequestsRef = useRef<Set<string>>(new Set());

  // 筛选状态
  const [typeFilter, setTypeFilter] = useState<ChangelogType | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<ChangelogPeriodFilter | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersReady, setFiltersReady] = useState(false);

  // 成就说明弹窗
  const [showAchievementGuide, setShowAchievementGuide] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 分页哨兵与待定位的 AI 深链
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const pendingJumpRef = useRef<string | null>(null);

  // ---- 数据筛选与分组 ----

  /** 先应用年份/周期筛选（类型计数要基于这部分数据） */
  const yearAndPeriodFiltered = useMemo(() => {
    return changelogs.filter((item) => {
      if (yearFilter !== 'all' && !item.date.startsWith(yearFilter)) return false;
      if (
        periodFilter &&
        getPeriodLabel(item.date, periodFilter.mode) !== periodFilter.label
      ) {
        return false;
      }
      return true;
    });
  }, [changelogs, yearFilter, periodFilter]);

  /** 最终参与渲染的日志 */
  const filteredChangelogs = useMemo(() => {
    return typeFilter === 'all'
      ? yearAndPeriodFiltered
      : yearAndPeriodFiltered.filter((item) => item.type === typeFilter);
  }, [yearAndPeriodFiltered, typeFilter]);

  /** 类型筛选按钮上的计数：随年份/周期变化 */
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: yearAndPeriodFiltered.length };
    for (const item of yearAndPeriodFiltered) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }
    return counts;
  }, [yearAndPeriodFiltered]);

  /** 年份筛选按钮上的计数：随类型变化 */
  const yearCounts = useMemo(() => {
    const base = typeFilter === 'all'
      ? changelogs
      : changelogs.filter((item) => item.type === typeFilter);
    const counts: Record<string, number> = { all: base.length };
    for (const item of base) {
      const year = item.date.slice(0, 4);
      if (!year) continue;
      counts[year] = (counts[year] || 0) + 1;
    }
    return counts;
  }, [changelogs, typeFilter]);

  /** 可选的年份（倒序） */
  const years = useMemo(() => {
    const set = new Set<string>();
    for (const item of changelogs) {
      const year = item.date.slice(0, 4);
      if (year) set.add(year);
    }
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [changelogs]);

  const visibleChangelogs = useMemo(
    () => filteredChangelogs.slice(0, visibleCount),
    [filteredChangelogs, visibleCount]
  );

  /** 每个月份的总篇数（用于分组标题，不受分页影响） */
  const monthCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of filteredChangelogs) {
      const label = getPeriodLabel(item.date, 'month');
      counts.set(label, (counts.get(label) || 0) + 1);
    }
    return counts;
  }, [filteredChangelogs]);

  /** 按月份分组；visibleChangelogs 已按日期倒序，插入顺序即可用 */
  const groups = useMemo(() => {
    const result: Array<{
      key: string;
      label: string;
      total: number;
      items: Changelog[];
    }> = [];

    for (const item of visibleChangelogs) {
      const label = getPeriodLabel(item.date, 'month');
      const last = result[result.length - 1];
      if (last && last.label === label) {
        last.items.push(item);
      } else {
        result.push({
          key: label,
          label,
          total: monthCounts.get(label) || 0,
          items: [item],
        });
      }
    }

    return result;
  }, [visibleChangelogs, monthCounts]);

  const hasMore = visibleCount < filteredChangelogs.length;

  // ---- 正文加载 ----

  /**
   * 加载单篇正文 HTML 片段
   *
   * 使用 ref 读取缓存/在途请求，保证回调身份稳定（ChangelogCard 依赖它做 memo）。
   * 失败不写入 htmlCache，由 htmlErrors 单独记录，方便卡片上直接重试。
   *
   * @param id 日志 id
   * @param force 忽略缓存重新请求（重试时使用）
   */
  const loadChangelogHtml = useCallback((id: string, force = false) => {
    if (!id) return;
    if (htmlRequestsRef.current.has(id)) return;
    if (!force && htmlCacheRef.current[id]) return;

    htmlRequestsRef.current.add(id);
    setHtmlErrors((prev) => (prev[id] ? { ...prev, [id]: false } : prev));
    setHtmlLoading((prev) => ({ ...prev, [id]: true }));

    fetch(getAssetPath(`/_changelog-content/${encodeURIComponent(id)}.html`))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((html) => {
        htmlCacheRef.current[id] = html;
        setHtmlCache((prev) => ({ ...prev, [id]: html }));
      })
      .catch(() => {
        setHtmlErrors((prev) => ({ ...prev, [id]: true }));
      })
      .finally(() => {
        htmlRequestsRef.current.delete(id);
        setHtmlLoading((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      });
  }, []);

  /** 正文加载失败后的重试（绕过缓存检查） */
  const retryChangelogHtml = useCallback(
    (id: string) => loadChangelogHtml(id, true),
    [loadChangelogHtml]
  );

  const setExpanded = useCallback((id: string, value: boolean) => {
    const next = { ...expandedRef.current, [id]: value };
    expandedRef.current = next;
    setExpandedLogs(next);
  }, []);

  const toggleExpand = useCallback(
    (id: string) => {
      const willExpand = !expandedRef.current[id];
      setExpanded(id, willExpand);
      if (willExpand) loadChangelogHtml(id);
    },
    [setExpanded, loadChangelogHtml]
  );

  /** 展开当前已显示的日志（浏览器 Ctrl+F 只能搜到已渲染的正文） */
  const expandVisible = useCallback(() => {
    const ids = groups.flatMap((group) => group.items.map((item) => item.id));
    if (ids.length === 0) return;

    const next = { ...expandedRef.current };
    ids.forEach((id) => {
      next[id] = true;
    });
    expandedRef.current = next;
    setExpandedLogs(next);
    ids.forEach((id) => loadChangelogHtml(id));
  }, [groups, loadChangelogHtml]);

  const collapseAll = useCallback(() => {
    expandedRef.current = {};
    setExpandedLogs({});
  }, []);

  // ---- 筛选交互 ----

  const handleTypeChange = useCallback((type: ChangelogType | 'all') => {
    pendingJumpRef.current = null;
    activeChangelogJump = null;
    setTypeFilter((prev) => (type === 'all' ? 'all' : prev === type ? 'all' : type));
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleYearChange = useCallback((year: string) => {
    pendingJumpRef.current = null;
    activeChangelogJump = null;
    setPeriodFilter(null);
    setYearFilter((prev) => (year === 'all' ? 'all' : prev === year ? 'all' : year));
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleClearPeriod = useCallback(() => {
    pendingJumpRef.current = null;
    activeChangelogJump = null;
    setPeriodFilter(null);
    setVisibleCount(PAGE_SIZE);
  }, []);

  const handleClearAll = useCallback(() => {
    pendingJumpRef.current = null;
    activeChangelogJump = null;
    setTypeFilter('all');
    setYearFilter('all');
    setPeriodFilter(null);
    setVisibleCount(PAGE_SIZE);
  }, []);

  /**
   * 统计图点击回调
   *
   * 年粒度并入年份筛选；月/季写入 periodFilter，与年份筛选互斥。
   * 再次点击同一个点会取消筛选。
   */
  const handlePeriodSelect = useCallback((label: string, mode: ChangelogPeriodMode) => {
    pendingJumpRef.current = null;
    activeChangelogJump = null;
    if (mode === 'year') {
      const year = label.match(/(\d{4})年/)?.[1];
      if (!year) return;
      setPeriodFilter(null);
      setYearFilter((prev) => (prev === year ? 'all' : year));
    } else {
      setYearFilter('all');
      setPeriodFilter((prev) =>
        prev && prev.mode === mode && prev.label === label ? null : { mode, label }
      );
    }
    setVisibleCount(PAGE_SIZE);
  }, []);

  const loadMore = useCallback(() => {
    setVisibleCount((current) =>
      Math.min(filteredChangelogs.length, current + PAGE_SIZE)
    );
  }, [filteredChangelogs.length]);

  // ---- URL 同步 ----

  // 首次挂载读取 query：?type=fix&year=2026&period=2026年10月
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const type = params.get('type');
    if (type && CHANGELOG_TYPES.includes(type as ChangelogType)) {
      setTypeFilter(type as ChangelogType);
    }

    const year = params.get('year');
    if (year && /^\d{4}$/.test(year)) {
      setYearFilter(year);
    }

    const period = params.get('period');
    if (period) {
      if (/^\d{4}年$/.test(period)) {
        setYearFilter(period.slice(0, 4));
        setPeriodFilter(null);
      } else if (/^\d{4}年\d{1,2}月$/.test(period)) {
        setYearFilter('all');
        setPeriodFilter({ mode: 'month', label: period });
      } else if (/^\d{4}年[春夏秋冬]$/.test(period)) {
        setYearFilter('all');
        setPeriodFilter({ mode: 'quarter', label: period });
      }
    }

    setFiltersReady(true);
  }, []);

  // 筛选变化后回写 query（用 replaceState，不触发服务端导航）
  useEffect(() => {
    if (!filtersReady) return;

    const params = new URLSearchParams(window.location.search);

    if (typeFilter === 'all') params.delete('type');
    else params.set('type', typeFilter);

    if (yearFilter === 'all') params.delete('year');
    else params.set('year', yearFilter);

    if (periodFilter) params.set('period', periodFilter.label);
    else params.delete('period');

    const query = params.toString();
    const hasFilters =
      typeFilter !== 'all' || yearFilter !== 'all' || Boolean(periodFilter);
    // 用户开始筛选时丢弃深链 hash，避免刷新后 hash 又把筛选清空、跳回旧日志
    const hash = hasFilters ? '' : window.location.hash;
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [typeFilter, yearFilter, periodFilter, filtersReady]);

  // ---- AI 来源深链 ----

  /**
   * 定位到 #changelog-<id>
   *
   * 目标可能在当前筛选之外或分页之后：先清空筛选，并把可见条数扩到目标位置，
   * 再展开、加载正文。链接的优先级高于用户当前筛选。
   */
  const jumpToChangelog = useCallback(
    (hash: string) => {
      const id = hash.replace(/^changelog-/, '');
      if (!id) return;

      const index = changelogs.findIndex((item) => item.id === id);
      if (index < 0) return;

      activeChangelogJump = null;
      setTypeFilter('all');
      setYearFilter('all');
      setPeriodFilter(null);
      setVisibleCount(Math.max(PAGE_SIZE, index + 1));
      setExpanded(id, true);
      loadChangelogHtml(id);
      pendingJumpRef.current = `changelog-${id}`;
    },
    [changelogs, setExpanded, loadChangelogHtml]
  );

  useEffect(() => {
    const handleHash = () => {
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (hash.startsWith('changelog-')) jumpToChangelog(hash);
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [jumpToChangelog]);

  // 目标卡片渲染进 DOM 后再滚动；正文/字体/图片加载会改变卡片位置，
  // 由 scrollToChangelogTarget 在 1.8 秒内持续校正。
  // 不写依赖数组：深链可能一次展开到第 127 篇，DOM 提交分多帧完成，
  // 每次渲染后都检查一次待定位目标，找到后立即清除；5 秒仍找不到才放弃。
  useEffect(() => {
    const target = pendingJumpRef.current;
    if (!target) return;

    let cancelled = false;
    let attempts = 0;
    let interval: number | null = null;

    const tryScroll = () => {
      if (cancelled) return false;
      if (scrollToChangelogTarget(target)) {
        pendingJumpRef.current = null;
        if (interval) window.clearInterval(interval);
        return true;
      }
      return false;
    };

    if (tryScroll()) return;

    interval = window.setInterval(() => {
      attempts += 1;
      if (tryScroll()) return;
      if (attempts >= 100) {
        if (interval) window.clearInterval(interval);
        pendingJumpRef.current = null;
      }
    }, 100);

    return () => {
      cancelled = true;
      if (interval) window.clearInterval(interval);
    };
  });

  // 接近底部时自动续载；IntersectionObserver 不可用时保留手动按钮
  useEffect(() => {
    if (!hasMore) return;

    const target = loadMoreRef.current;
    if (!target || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((current) =>
            Math.min(filteredChangelogs.length, current + PAGE_SIZE)
          );
        }
      },
      { rootMargin: '600px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, filteredChangelogs.length]);

  // 弹窗打开时锁定页面滚动
  useBodyScrollLock(showAchievementGuide);

  // 页面加载时发送 Live2D 欢迎消息
  useEffect(() => {
    Live2DMessageHelper.showChangelogsMessage('PAGE_VISIT');
  }, []);

  // 弹窗焦点管理：打开时聚焦关闭按钮，Tab 在弹窗内循环，关闭后还原焦点
  useEffect(() => {
    if (!showAchievementGuide) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    const focusableSelector =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAchievementGuide(false);
        return;
      }
      if (event.key !== 'Tab') return;

      const root = dialogRef.current;
      if (!root) return;

      const focusable = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
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

        {/* 移动端总览：完整统计图仍在页面底部，这里只给最关键的摘要 */}
        <MobileChangelogOverview changelogs={changelogs} generatedAt={generatedAt} />

        {/* 主要内容区域 */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* 左侧：筛选 + 日志时间线 */}
          <div className="w-full lg:w-[70%] flex-shrink-0 flex-grow-0">
            <ChangelogFilterBar
              totalCount={changelogs.length}
              filteredCount={filteredChangelogs.length}
              typeFilter={typeFilter}
              yearFilter={yearFilter}
              periodFilter={periodFilter}
              typeCounts={typeCounts}
              yearCounts={yearCounts}
              years={years}
              onTypeChange={handleTypeChange}
              onYearChange={handleYearChange}
              onClearPeriod={handleClearPeriod}
              onReset={handleClearAll}
            />

            {/* 列表工具条 */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                共 {filteredChangelogs.length} 篇
                {filteredChangelogs.length > visibleChangelogs.length && (
                  <span className="ml-1 text-xs">
                    （已显示 {visibleChangelogs.length} 篇）
                  </span>
                )}
              </p>

              {filteredChangelogs.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={expandVisible}
                    className="rounded text-xs text-primary transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    展开已显示
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="rounded text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    全部收起
                  </button>
                </div>
              )}
            </div>

            {/* 空状态 / 分组时间线 */}
            {changelogs.length === 0 ? (
              <div className="rounded-lg border border-border bg-card/90 p-6 text-center shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
                <h3 className="mb-2 text-xl font-semibold">暂无开发日志</h3>
                <p className="text-muted-foreground">还没有发布任何开发日志</p>
              </div>
            ) : filteredChangelogs.length === 0 ? (
              <div className="rounded-lg border border-border bg-card/90 p-6 text-center shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-card/75">
                <h3 className="mb-2 text-xl font-semibold">没有符合条件的日志</h3>
                <p className="mb-3 text-muted-foreground">换个类型或年份试试</p>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded text-sm text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  清除筛选
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {groups.map((group) => (
                  <section key={group.key} aria-label={`${group.label}的日志`}>
                    {/* 月份分组标题：吸顶，滚动时保留时间上下文 */}
                    <h2 className="sticky top-16 lg:top-20 z-20 -mx-1 mb-3 flex items-center gap-2 rounded-md bg-background/85 px-2 py-1.5 text-sm font-semibold backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
                      <span className="h-4 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                      <span>{group.label}</span>
                      <span className="text-xs font-normal text-muted-foreground">
                        {group.total} 篇
                      </span>
                      <span className="h-px flex-1 bg-border/50" aria-hidden="true" />
                    </h2>

                    <div className="relative">
                      {/* 时间轴竖线 */}
                      <div
                        className="absolute left-3 sm:left-4 top-0 bottom-0 w-0.5 bg-border/50"
                        aria-hidden="true"
                      />

                      {group.items.map((changelog) => (
                        <ChangelogCard
                          key={changelog.id}
                          changelog={changelog}
                          expanded={Boolean(expandedLogs[changelog.id])}
                          html={htmlCache[changelog.id]}
                          loading={Boolean(htmlLoading[changelog.id])}
                          error={Boolean(htmlErrors[changelog.id])}
                          onToggle={toggleExpand}
                          onPrefetch={loadChangelogHtml}
                          onRetry={retryChangelogHtml}
                        />
                      ))}
                    </div>
                  </section>
                ))}

                {/* 续载：进入视口自动加载，同时保留手动按钮 */}
                {hasMore && (
                  <div ref={loadMoreRef} className="flex flex-col items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={loadMore}
                      className="rounded-full border border-border bg-card/90 px-4 py-2 text-sm text-foreground shadow-md backdrop-blur-md transition-colors hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 supports-[backdrop-filter]:bg-card/75"
                    >
                      加载更早的日志
                    </button>
                    <span className="text-xs text-muted-foreground">
                      已显示 {visibleChangelogs.length} / {filteredChangelogs.length}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 右侧：统计图表（移动端仍在底部，顶部已有总览） */}
          <div className="w-full lg:w-[30%] flex-shrink-0 flex-grow-0">
            <div className="space-y-4 lg:sticky lg:top-24">
              <DeferredMount minHeight={320}>
                <TimeStatsChart
                  changelogs={changelogs}
                  onPeriodSelect={handlePeriodSelect}
                  selectedPeriodLabel={
                    periodFilter?.label ??
                    (yearFilter !== 'all' ? `${yearFilter}年` : null)
                  }
                />
              </DeferredMount>

              <DeferredMount minHeight={280}>
                <TypeStatsChart
                  changelogs={changelogs}
                  selectedType={typeFilter}
                  onTypeSelect={handleTypeChange}
                />
              </DeferredMount>

              {/* 成就说明入口：点击弹出全部成就的触发条件说明 */}
              <button
                type="button"
                onClick={() => setShowAchievementGuide(true)}
                className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-300 backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75 hover:shadow-xl hover:border-primary/40 text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="achievement-guide-title"
            aria-describedby="achievement-guide-desc"
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
                ref={closeButtonRef}
                type="button"
                onClick={() => setShowAchievementGuide(false)}
                aria-label="关闭成就说明"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 内容区：可滚动 */}
            <div className="px-5 py-3 overflow-y-auto">
              <p id="achievement-guide-desc" className="text-xs text-muted-foreground mb-3">
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
                          {/* 成就标签：与日志卡片上的样式保持一致（同样按亮度选文字色） */}
                          <span
                            className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full font-medium mt-0.5 whitespace-nowrap"
                            style={{
                              backgroundColor: item.color,
                              color: getContrastTextColor(item.color),
                            }}
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
