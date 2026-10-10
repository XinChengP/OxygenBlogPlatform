'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';
import type { IFuseOptions, FuseResult, FuseResultMatch, RangeTuple } from 'fuse.js';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, Loader2, CornerDownLeft } from 'lucide-react';
import { getAssetPath } from '@/utils/assetUtils';

/**
 * 搜索索引条目类型
 * 与 src/app/search-index.json/route.ts 的输出结构保持一致
 */
interface SearchIndexEntry {
  /** 文章标识，用于跳转 /blogs/[slug] */
  slug: string;
  /** 文章标题 */
  title: string;
  /** 分类 */
  category: string;
  /** 标签列表 */
  tags: string[];
  /** 摘要 */
  excerpt: string;
  /** 发布日期 */
  date: string;
  /** 正文纯文本 */
  plainContent: string;
}

/**
 * fuse.js 搜索结果中的命中信息
 * 直接复用 fuse.js 官方类型，indices 为 [start, end] 闭区间元组的只读数组
 */
type SearchMatch = FuseResultMatch;

/**
 * 唤起搜索框的自定义事件名
 * Navigation 组件的搜索按钮通过派发该事件打开弹窗，
 * 避免导航与弹窗之间建立状态依赖（解耦）
 */
export const OPEN_SEARCH_EVENT = 'oxygen:open-search';

/** 搜索结果最大返回条数 */
const MAX_RESULTS = 8;

/** 空搜索态展示的「最新文章」条数 */
const RECENT_COUNT = 5;

/** 正文命中片段的截取半径（命中位置前后各取多少字符） */
const SNIPPET_RADIUS = 60;

/**
 * fuse.js 实例配置
 * keys 权重：标题最重要，其次是标签、摘要，正文权重最低
 * ignoreLocation 让命中判断只看相关性、不受关键词出现在文本中的位置影响
 */
const fuseOptions: IFuseOptions<SearchIndexEntry> = {
  keys: [
    { name: 'title', weight: 0.4 },
    { name: 'tags', weight: 0.3 },
    { name: 'excerpt', weight: 0.2 },
    { name: 'plainContent', weight: 0.1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
  includeMatches: true,
  // 中文没有空格分词，最小匹配一个字符即可
  minMatchCharLength: 1,
};

// 索引数据模块级缓存：整个站点的所有 SearchDialog 实例共享，只 fetch 一次
let cachedIndex: SearchIndexEntry[] | null = null;
let pendingFetch: Promise<SearchIndexEntry[]> | null = null;

/**
 * 加载搜索索引（按需 fetch，带模块级缓存与请求去重）
 * 多次并发调用会复用同一个进行中的请求，避免重复下载
 */
async function loadSearchIndex(): Promise<SearchIndexEntry[]> {
  if (cachedIndex) return cachedIndex;
  if (pendingFetch) return pendingFetch;

  pendingFetch = fetch(getAssetPath('/search-index.json'))
    .then((res) => {
      if (!res.ok) throw new Error(`索引加载失败（${res.status}）`);
      return res.json() as Promise<SearchIndexEntry[]>;
    })
    .then((data) => {
      cachedIndex = data;
      return data;
    })
    .finally(() => {
      // 无论成功失败都清空进行中的请求，失败后允许重试
      pendingFetch = null;
    });

  return pendingFetch;
}

/**
 * 合并重叠/相邻的命中区间
 * fuse.js 返回的 indices 可能互相重叠，直接切片渲染会出现重复文字
 * 注：fuse.js 的 RangeTuple 是 [start, end] 闭区间元组
 */
function mergeIndices(indices: readonly RangeTuple[]): RangeTuple[] {
  const sorted = [...indices].sort((a, b) => a[0] - b[0]);
  const merged: RangeTuple[] = [];

  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    // 与上一区间重叠或相邻（end + 1 >= start）时合并
    if (last && end + 1 >= last[0] && start <= last[1] + 1) {
      last[0] = Math.min(last[0], start);
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }

  return merged;
}

/** 高亮标记的统一样式：天依蓝底色 + 半透明强调 */
const MARK_CLASS = 'bg-primary/15 text-primary font-semibold rounded-sm px-0.5';

/**
 * 按命中区间渲染带高亮的文本
 * 无命中数据时原样返回文本本身
 */
function renderHighlighted(
  text: string,
  indices?: readonly RangeTuple[],
): React.ReactNode {
  if (!text) return null;
  if (!indices || indices.length === 0) return text;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  const merged = mergeIndices(indices);

  merged.forEach(([start, end], i) => {
    // 区间可能越界（值不一致时 fuse 偶发），做边界保护
    const safeStart = Math.max(0, Math.min(start, text.length));
    const safeEnd = Math.max(safeStart, Math.min(end, text.length - 1));
    if (safeStart > cursor) {
      parts.push(<span key={`p${i}`}>{text.slice(cursor, safeStart)}</span>);
    }
    parts.push(
      <mark key={`m${i}`} className={MARK_CLASS}>
        {text.slice(safeStart, safeEnd + 1)}
      </mark>,
    );
    cursor = safeEnd + 1;
  });

  if (cursor < text.length) {
    parts.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return parts;
}

/**
 * 从正文命中区间中截取摘要片段
 * 取第一个命中位置前后各 SNIPPET_RADIUS 字符，并在片段内保留高亮区间
 */
function buildContentSnippet(
  content: string,
  indices: readonly RangeTuple[],
): { text: string; indices: RangeTuple[] } | null {
  if (!indices || indices.length === 0 || !content) return null;

  // 命中位置（fuse 的 indices 基于 code unit，中文 BMP 字符无偏移问题）
  const firstHit = indices[0][0];
  const start = Math.max(0, firstHit - SNIPPET_RADIUS);
  const end = Math.min(content.length, firstHit + SNIPPET_RADIUS);
  const text = `${start > 0 ? '…' : ''}${content.slice(start, end)}${end < content.length ? '…' : ''}`;

  // 平移命中区间到片段内部，供高亮渲染
  const offset = start + (start > 0 ? 1 : 0);
  const shifted = indices
    .map(([s, e]) => [s - offset, e - offset] as RangeTuple)
    .filter(([s, e]) => e >= 0 && s < text.length);

  return { text, indices: shifted };
}

/** 日期展示格式：YYYY.MM.DD */
function formatDate(date: string): string {
  if (!date) return '';
  return date.replaceAll('-', '.');
}

/** 结果项的行内样式类（抽公共常量，选中态在 className 中追加） */
const RESULT_BASE_CLASS =
  'flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors duration-150';

export default function SearchDialog() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState<SearchIndexEntry[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  // 选中项索引：-1 表示未选中（回车不做任何操作）
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  /** fuse 实例：索引加载完成后重建 */
  const fuse = useMemo(
    () => (index ? new Fuse(index, fuseOptions) : null),
    [index],
  );

  /**
   * 搜索结果
   * 空关键词时展示最新的 RECENT_COUNT 篇文章作为默认入口
   */
  const results = useMemo<FuseResult<SearchIndexEntry>[]>(() => {
    if (!fuse || !query.trim()) return [];
    return fuse.search(query.trim()).slice(0, MAX_RESULTS);
  }, [fuse, query]);

  /** 打开弹窗：重置状态并按需加载索引 */
  const openDialog = useCallback(() => {
    setIsOpen(true);
    setQuery('');
    setActiveIndex(-1);
    setLoadError(null);
    if (!index && !pendingFetch) {
      loadSearchIndex()
        .then(setIndex)
        .catch((err: Error) => setLoadError(err.message || '索引加载失败'));
    }
  }, [index]);

  /** 关闭弹窗 */
  const closeDialog = useCallback(() => setIsOpen(false), []);

  // 全局快捷键与自定义事件监听
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Ctrl+K（Windows）/ Cmd+K（Mac）唤起；openDialog 幂等，重复触发无害
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openDialog();
        return;
      }
      // Esc 关闭（焦点不在输入框时也能关闭）
      if (e.key === 'Escape') {
        closeDialog();
      }
    };
    const handleOpenEvent = () => openDialog();

    window.addEventListener('keydown', handleKeydown);
    window.addEventListener(OPEN_SEARCH_EVENT, handleOpenEvent);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener(OPEN_SEARCH_EVENT, handleOpenEvent);
    };
  }, [openDialog, closeDialog]);

  // 弹窗打开期间锁定页面滚动，关闭后恢复
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // 打开后聚焦输入框（等动画挂载完成）
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // 查询变化时重置选中项
  useEffect(() => setActiveIndex(-1), [query, setActiveIndex]);

  /**
   * 跳转到文章页
   * slug 含中文时需编码，与 RSS 生成链接的口径一致
   */
  const goToPost = useCallback(
    (slug: string) => {
      closeDialog();
      router.push(`/blogs/${encodeURIComponent(slug)}`);
    },
    [closeDialog, router],
  );

  /** 键盘导航：上下选择、回车跳转、Esc 关闭 */
  const handleInputKeydown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      const list = results.length > 0
        ? results.map((r) => r.item)
        : index
          ? index.slice(0, RECENT_COUNT)
          : [];
      if (list.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((activeIndex + 1) % list.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((activeIndex - 1 + list.length) % list.length);
      } else if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < list.length) {
        e.preventDefault();
        goToPost(list[activeIndex].slug);
      }
    },
    [results, index, activeIndex, setActiveIndex, goToPost],
  );

  // 选中项滚动到可视区域
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl || activeIndex < 0) return;
    const activeEl = listEl.querySelector<HTMLElement>(
      `[data-result-index="${activeIndex}"]`,
    );
    activeEl?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  /**
   * 单条结果渲染
   * 标题高亮取 fuse 的 title 命中区间；正文命中时展示上下文片段
   */
  const renderResult = (result: FuseResult<SearchIndexEntry>, displayIndex: number) => {
    const { item, matches } = result;
    const titleMatch = matches?.find((m) => m.key === 'title');
    const contentMatch = matches?.find((m) => m.key === 'plainContent');
    const snippet = contentMatch
      ? buildContentSnippet(item.plainContent, contentMatch.indices)
      : null;
    const isActive = displayIndex === activeIndex;

    return (
      <div
        key={item.slug}
        data-result-index={displayIndex}
        role="option"
        aria-selected={isActive}
        onClick={() => goToPost(item.slug)}
        onMouseEnter={() => setActiveIndex(displayIndex)}
        className={`${RESULT_BASE_CLASS} ${isActive ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
      >
        <FileText
          className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/60'}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate text-sm font-medium text-foreground">
              {renderHighlighted(item.title, titleMatch?.indices)}
            </p>
            <span className="flex-shrink-0 text-xs text-muted-foreground/70">
              {formatDate(item.date)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground/80">
            {item.category}
            {item.tags.length > 0 && ` · ${item.tags.slice(0, 3).join(' / ')}`}
          </p>
          {snippet ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {renderHighlighted(snippet.text, snippet.indices)}
            </p>
          ) : item.excerpt ? (
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {item.excerpt}
            </p>
          ) : null}
        </div>
      </div>
    );
  };

  /** 空态列表：最新文章 */
  const renderRecentList = () => {
    if (!index) return null;
    return (
      <div className="py-2">
        <p className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/60">
          最新文章
        </p>
        {index.slice(0, RECENT_COUNT).map((item, i) => {
          const isActive = i === activeIndex;
          return (
            <div
              key={item.slug}
              data-result-index={i}
              role="option"
              aria-selected={isActive}
              onClick={() => goToPost(item.slug)}
              onMouseEnter={() => setActiveIndex(i)}
              className={`${RESULT_BASE_CLASS} ${isActive ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
            >
              <FileText
                className={`mt-0.5 h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground/60'}`}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                  <span className="flex-shrink-0 text-xs text-muted-foreground/70">
                    {formatDate(item.date)}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground/80">{item.category}</p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="search-dialog-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 pt-[12vh]"
          onClick={closeDialog}
          role="dialog"
          aria-modal="true"
          aria-label="站内搜索"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card/95 shadow-card backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 搜索输入区 */}
            <div className="flex items-center gap-3 border-b border-border/50 px-4 py-3">
              <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground/60" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeydown}
                placeholder="搜索文章，标题、标签或正文…"
                className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                aria-label="搜索关键词"
              />
              <button
                type="button"
                onClick={closeDialog}
                aria-label="关闭搜索"
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground/60 transition-colors hover:bg-muted/60 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* 结果区域：区分加载中 / 加载失败 / 正常渲染 */}
            <div ref={listRef} role="listbox" aria-label="搜索结果" className="max-h-[50vh] overflow-y-auto">
              {!index && !loadError && (
                <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在加载搜索索引…
                </div>
              )}
              {loadError && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  {loadError}，请稍后重试
                </div>
              )}
              {index && query.trim() === '' && renderRecentList()}
              {index && query.trim() !== '' && results.length === 0 && (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  没有找到与「{query}」相关的文章
                </div>
              )}
              {index && query.trim() !== '' && results.map(renderResult)}
            </div>

            {/* 底部操作提示条 */}
            <div className="flex items-center gap-4 border-t border-border/50 px-4 py-2 text-xs text-muted-foreground/60">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
                选择
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[10px]">
                  <CornerDownLeft className="inline h-3 w-3" />
                </kbd>
                打开
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-border bg-muted/50 px-1 py-0.5 font-mono text-[10px]">Esc</kbd>
                关闭
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
