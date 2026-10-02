'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ExternalLink,
  Globe,
  Library,
  Search,
  SearchX,
  X,
  Code2,
  Wrench,
  Palette,
  BookOpen,
  FolderGit2,
  Fish
} from 'lucide-react';
import {
  relatedLinks,
  categoryLabels,
  categoryColors,
  type RelatedLinkCategory,
  type RelatedLink
} from '@/setting/AboutSetting';
import { resolveLinkIcon } from '@/components/links/brandIcons';

/**
 * 分类 Lucide 图标映射（导航胶囊 / 分组标题使用）
 */
const CATEGORY_ICON_COMPONENTS: Record<
  RelatedLinkCategory,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  framework: Code2,
  tool: Wrench,
  ui: Palette,
  tutorial: BookOpen,
  project: FolderGit2,
  fish: Fish
};

/** 分组锚点 section 的 DOM id */
function sectionId(category: RelatedLinkCategory): string {
  return `links-cat-${category}`;
}

/** 从链接地址提取展示用的域名（去 www、去尾部斜杠） */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * 链接卡片组件
 * 视觉规范与全站卡片统一：rounded-xl、bg-card/95、border-border、shadow-card 令牌
 * 交互规范：原生 <a> 标签（支持键盘 Tab 聚焦、回车打开、中键新开标签），
 *          悬停位移 -3 与友链卡片一致；CSS 过渡只管阴影边框，位移由 Framer Motion 驱动
 * 相比旧版：卡片内展示解析出的品牌/语义图标，底部增加域名信息栏（与友链卡片呼应）
 */
function LinkCard({ link, index }: { link: RelatedLink; index: number }) {
  const categoryColor = categoryColors[link.category];
  const CategoryIcon = CATEGORY_ICON_COMPONENTS[link.category];

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        // 延迟收敛到 0.04s/项并设置 0.3s 上限，避免同组条目多时入场等待过长
        delay: Math.min(index * 0.04, 0.3),
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      whileHover={{
        y: -3,
        transition: { duration: 0.3, ease: 'easeOut' }
      }}
      whileTap={{ scale: 0.98 }}
      /* 卡片容器使用全站统一视觉令牌；补全键盘聚焦光环（焦点环跟随主题色）。
         flex-col + h-full 让底部域名栏对齐，多卡片同行时高度一致 */
      className="group relative flex flex-col h-full p-5 rounded-xl overflow-hidden
                 bg-card/95 border border-border
                 shadow-card hover:shadow-card-hover
                 transition-[box-shadow,border-color] duration-300 hover:border-primary/30
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
    >
      {/* 悬停时的分类色光效：极低透明度径向渐变，仅增加层次不喧宾夺主 */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${categoryColor}14 0%, transparent 70%)`
        }}
      />

      <div className="relative flex flex-col flex-1">
        {/* 头部：站点图标 + 悬停显示的外链角标（纯 CSS group-hover 控制，无需状态重渲染） */}
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
                       transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3"
            style={{
              background: `linear-gradient(135deg, ${categoryColor}1f 0%, ${categoryColor}3d 100%)`,
              color: categoryColor
            }}
          >
            {resolveLinkIcon(link)}
          </div>
          <ExternalLink
            className="w-4 h-4 text-muted-foreground/50 translate-y-0.5
                       opacity-0 group-hover:opacity-100 group-hover:translate-y-0
                       transition-all duration-300"
          />
        </div>

        {/* 名称与分类胶囊 */}
        <h3 className="font-semibold text-foreground mb-1.5 line-clamp-1 text-sm
                       group-hover:text-primary transition-colors duration-300">
          {link.name}
        </h3>
        <span
          className="inline-flex self-start items-center gap-1 text-[10px] px-2 py-0.5 rounded-full mb-2"
          style={{
            backgroundColor: `${categoryColor}1a`,
            color: categoryColor
          }}
        >
          <CategoryIcon className="w-3 h-3" />
          {categoryLabels[link.category]}
        </span>

        {/* 描述：最多两行截断，flex-1 撑开中部使同行卡片底部对齐 */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3 flex-1">
          {link.description}
        </p>

        {/* 标签：最多展示 3 个 */}
        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {link.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-md bg-muted
                           text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 底部域名栏：与友链卡片的域名展示呼应，形成跨页面的统一语言 */}
        <div
          className="mt-auto pt-3 border-t border-border/70 flex items-center gap-1.5
                     text-[11px] text-muted-foreground/80"
        >
          <Globe className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{getHostname(link.url)}</span>
        </div>
      </div>
    </motion.a>
  );
}

/**
 * 分类导航胶囊
 * 激活态用主题色浅底 + 前景色文字（亮色主题下 primary 本身对比度不足，
 * 不采用实心主色底），分类图标始终保留分类色作为视觉锚点
 */
function CategoryPill({
  category,
  count,
  active,
  disabled,
  onClick
}: {
  category: RelatedLinkCategory;
  count: number;
  active: boolean;
  disabled: boolean;
  onClick: (category: RelatedLinkCategory) => void;
}) {
  const Icon = CATEGORY_ICON_COMPONENTS[category];
  const categoryColor = categoryColors[category];

  return (
    <button
      type="button"
      disabled={disabled}
      aria-current={active ? 'true' : undefined}
      aria-label={`跳转到${categoryLabels[category]}分类（${count} 个资源）`}
      onClick={() => !disabled && onClick(category)}
      className={`inline-flex flex-shrink-0 items-center gap-1.5 h-8 px-3 rounded-full
                  border text-xs whitespace-nowrap
                  transition-all duration-300
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                  ${
                    disabled
                      ? 'opacity-40 cursor-not-allowed bg-card/50 border-border/70 text-muted-foreground'
                      : active
                        ? 'bg-primary/15 border-primary/40 text-foreground font-medium shadow-sm'
                        : 'bg-card/50 border-border/70 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-muted/60'
                  }`}
    >
      <Icon className="w-3.5 h-3.5" style={{ color: disabled ? undefined : categoryColor }} />
      {categoryLabels[category]}
      <span className="text-[10px] tabular-nums opacity-70">{count}</span>
    </button>
  );
}

/**
 * 搜索无结果的空状态
 */
function SearchEmptyState({ onClear }: { onClear: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="py-16 text-center"
    >
      <div
        className="w-16 h-16 rounded-2xl bg-muted border border-border
                   flex items-center justify-center mx-auto mb-4"
      >
        <SearchX className="w-7 h-7 text-muted-foreground/60" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">没有找到相关资源</p>
      <p className="text-xs text-muted-foreground mb-5">换个关键词试试，或清除搜索查看全部</p>
      <button
        type="button"
        onClick={onClear}
        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full
                   bg-primary/10 border border-primary/20 text-primary text-xs font-medium
                   hover:bg-primary/20 transition-colors duration-300
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <X className="w-3.5 h-3.5" />
        清除搜索
      </button>
    </motion.div>
  );
}

/**
 * 相关链接组件
 * 吸收优秀博客「资源导航页」的常见设计：
 * 1. 顶部粘性工具栏：搜索框 + 分类快速导航胶囊（横向滚动，移动端友好）
 * 2. Scrollspy：滚动时高亮当前所在分类，点击胶囊平滑滚动到对应分组
 * 3. 搜索过滤：按名称/描述/标签实时过滤，空分组自动隐藏，导航计数同步更新
 * 4. 分组标题带渐变装饰线，卡片底部展示域名信息栏
 */
export default function RelatedLinks() {
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<RelatedLinkCategory | ''>('');
  const barRef = useRef<HTMLDivElement>(null);
  // 点击导航后的短暂时锁：避免平滑滚动途中 scrollspy 抢走高亮
  const spyLockUntilRef = useRef(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 全量分组（保持数据中的出现顺序）
  const { groupedAll, categoryOrder } = useMemo(() => {
    const groups: Partial<Record<RelatedLinkCategory, RelatedLink[]>> = {};
    const order: RelatedLinkCategory[] = [];
    relatedLinks.forEach((link) => {
      if (!groups[link.category]) {
        groups[link.category] = [];
        order.push(link.category);
      }
      groups[link.category]!.push(link);
    });
    return { groupedAll: groups, categoryOrder: order };
  }, []);

  const normalizedQuery = query.trim().toLowerCase();

  // 过滤后的分组：搜索时按名称/描述/标签/分类名匹配，空分组不渲染
  const filteredGroups = useMemo(() => {
    const result: Array<[RelatedLinkCategory, RelatedLink[]]> = [];
    for (const category of categoryOrder) {
      const items = groupedAll[category] ?? [];
      if (!normalizedQuery) {
        result.push([category, items]);
        continue;
      }
      const matched = items.filter(
        (link) =>
          link.name.toLowerCase().includes(normalizedQuery) ||
          link.description.toLowerCase().includes(normalizedQuery) ||
          (link.tags ?? []).some((tag) => tag.toLowerCase().includes(normalizedQuery)) ||
          categoryLabels[category].toLowerCase().includes(normalizedQuery)
      );
      if (matched.length > 0) result.push([category, matched]);
    }
    return result;
  }, [normalizedQuery, groupedAll, categoryOrder]);

  const resultCount = useMemo(
    () => filteredGroups.reduce((sum, [, links]) => sum + links.length, 0),
    [filteredGroups]
  );

  /**
   * 点击导航胶囊：清除搜索（保证目标分组可见）并平滑滚动到分组标题
   * 滚动偏移按粘性工具栏实际高度计算，兼容移动端双行工具栏；
   * 双重 rAF 等待清除搜索触发的重渲染完成后再取位置，避免落点偏差
   */
  const handlePillClick = useCallback((category: RelatedLinkCategory) => {
    const target = document.getElementById(sectionId(category));
    if (!target) return;

    spyLockUntilRef.current = Date.now() + 900;
    setActiveCategory(category);
    setQuery('');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.getElementById(sectionId(category));
        if (!el) return;
        const bar = barRef.current;
        const barBottom = bar ? bar.getBoundingClientRect().bottom : 80;
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - barBottom - 16,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
      });
    });
  }, []);

  // Scrollspy：滚动时把视口内「最后一个越过分栏线的分组」设为激活态（rAF 节流）
  useEffect(() => {
    if (!mounted || normalizedQuery) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      if (Date.now() < spyLockUntilRef.current) return;
      const bar = barRef.current;
      if (!bar) return;

      const visibleCategories = filteredGroups.map(([category]) => category);
      if (visibleCategories.length === 0) return;

      // 阈值取粘性工具栏下沿再留一点余量，与点击滚动的落点对齐
      const threshold = bar.getBoundingClientRect().bottom + 32;
      let current: RelatedLinkCategory = visibleCategories[0];
      for (const category of visibleCategories) {
        const el = document.getElementById(sectionId(category));
        if (!el) continue;
        if (el.getBoundingClientRect().top <= threshold) {
          current = category;
        } else {
          break;
        }
      }

      // 滚动到页底时强制点亮最后一个分组，避免末组过短永远无法激活
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) current = visibleCategories[visibleCategories.length - 1];

      setActiveCategory(current);
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [mounted, normalizedQuery, filteredGroups]);

  // 未挂载时展示与正式结构一致的骨架，避免加载闪空
  if (!mounted) {
    return (
      <div>
        <div className="h-7 w-44 bg-gray-200 dark:bg-gray-700 rounded-full mb-6"></div>
        <div className="h-16 bg-gray-200/70 dark:bg-gray-700/70 rounded-2xl mb-8"></div>
        <div className="space-y-8">
          {[1, 2].map((group) => (
            <div key={group}>
              <div className="h-8 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-44 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 统计信息 + 搜索结果摘要 */}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                     bg-primary/10 border border-primary/15
                     text-primary text-xs font-medium"
        >
          <Library className="w-3.5 h-3.5" />
          共 {relatedLinks.length} 个资源 · {categoryOrder.length} 个分类
        </span>

        {normalizedQuery && (
          <motion.span
            key={normalizedQuery}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-xs text-muted-foreground"
          >
            搜索到 <span className="font-semibold text-foreground">{resultCount}</span> 个结果
          </motion.span>
        )}
      </div>

      {/* 粘性工具栏：搜索框 + 分类快速导航；毛玻璃底保证滚动时压过背景图仍然可读 */}
      <div ref={barRef} className="sticky top-20 z-30 mb-8 -mx-2 px-2">
        <div
          className="rounded-2xl border border-border shadow-card px-3 py-2.5
                     bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/75"
        >
          <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
            {/* 搜索框 */}
            <div className="relative lg:w-56 flex-shrink-0">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5
                           text-muted-foreground/70 pointer-events-none"
              />
              <input
                type="text"
                role="searchbox"
                aria-label="搜索相关链接"
                placeholder="搜索资源、标签…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-full bg-muted/60 border border-border
                           text-sm text-foreground placeholder:text-muted-foreground/60
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/40
                           transition-colors duration-300"
              />
              {query && (
                <button
                  type="button"
                  aria-label="清除搜索"
                  onClick={() => setQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full
                             flex items-center justify-center text-muted-foreground/70
                             hover:text-foreground hover:bg-muted transition-colors duration-200
                             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 分类导航胶囊：小屏横向滚动，隐藏滚动条保持整洁 */}
            <nav
              aria-label="分类快速导航"
              className="flex items-center gap-2 overflow-x-auto py-0.5
                         [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {categoryOrder.map((category) => {
                const filtered = filteredGroups.find(([key]) => key === category);
                const count = filtered ? filtered[1].length : 0;
                return (
                  <CategoryPill
                    key={category}
                    category={category}
                    count={count}
                    active={activeCategory === category}
                    disabled={count === 0}
                    onClick={handlePillClick}
                  />
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* 分组列表 */}
      {filteredGroups.length > 0 ? (
        <div className="space-y-10">
          {filteredGroups.map(([category, links], groupIndex) => {
            const categoryColor = categoryColors[category];
            const GroupIcon = CATEGORY_ICON_COMPONENTS[category];
            return (
              <motion.section
                key={category}
                id={sectionId(category)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(groupIndex * 0.06, 0.24) }}
                className="scroll-mt-40"
              >
                {/* 分组标题：分类色图标块 + 标题 + 数量 + 渐变装饰线 */}
                <div className="flex items-center gap-2.5 mb-4">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${categoryColor}1f`,
                      color: categoryColor
                    }}
                  >
                    <GroupIcon className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {categoryLabels[category]}
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground tabular-nums">
                    {links.length}
                  </span>
                  <div className="flex-1 h-px ml-1 bg-gradient-to-r from-border via-border/60 to-transparent" />
                </div>

                {/* 组内卡片网格：断点与全站规范统一 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {links.map((link, index) => (
                    <LinkCard key={link.name} link={link} index={index} />
                  ))}
                </div>
              </motion.section>
            );
          })}
        </div>
      ) : (
        <SearchEmptyState onClear={() => setQuery('')} />
      )}
    </div>
  );
}
