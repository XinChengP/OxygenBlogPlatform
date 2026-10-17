'use client';

import React, {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ProcessedAudioItem } from '@/types/music';
import ArtistName from './ArtistName';

/** 单行固定高度（px）——虚拟列表靠它计算位置 */
const ROW_HEIGHT = 56;

/** 可视区域上下各多渲染几行，滚动时避免白屏 */
const OVERSCAN = 5;

interface FilteredSong {
  song: ProcessedAudioItem;
  /** 在原始播放列表中的索引 */
  index: number;
}

export interface PlaylistPanelProps {
  /** 完整播放列表 */
  songs: ProcessedAudioItem[];
  /** 当前播放索引 */
  currentIndex: number;
  /** 是否正在播放（用于显示跳动音条） */
  isPlaying: boolean;
  /** 是否展开（用户 hover / 键盘聚焦时） */
  expanded: boolean;
  /** 当前是否在使用本地兜底歌单 */
  isOnlineFallback: boolean;
  /** 是否正在手动刷新在线歌单 */
  isRefreshingOnline: boolean;
  /** 点击歌曲 */
  onSwitchSong: (index: number) => void;
  /** 搜索框聚焦状态变化（用于让播放器保持展开） */
  onSearchFocusChange: (focused: boolean) => void;
  /** 手动刷新在线歌单 */
  onRefreshOnline: () => void;
}

export interface PlaylistPanelHandle {
  /** 把当前播放歌曲滚动到可视区域中央 */
  locateCurrent: () => void;
}

/**
 * 播放中的跳动音条
 */
const PlayingBars = memo(function PlayingBars() {
  return (
    <div className="flex items-end justify-center gap-0.5 h-3">
      <span className="w-0.5 bg-[#66ccff] animate-[music-bar_0.6s_ease-in-out_infinite] motion-reduce:animate-none" style={{ height: '60%' }} />
      <span className="w-0.5 bg-[#66ccff] animate-[music-bar_0.8s_ease-in-out_infinite] motion-reduce:animate-none" style={{ height: '100%' }} />
      <span className="w-0.5 bg-[#66ccff] animate-[music-bar_0.7s_ease-in-out_infinite] motion-reduce:animate-none" style={{ height: '40%' }} />
    </div>
  );
});

/**
 * 播放列表面板
 *
 * 性能设计：
 * 1. 组件用 React.memo 包裹，播放进度每 250ms 更新时父组件会重渲染，
 *    但只要 songs/currentIndex/isPlaying/expanded 没变，这里会直接跳过；
 * 2. 列表虚拟化：无论歌单是 10 首还是 834 首，DOM 里始终只有可视区附近的十几行；
 * 3. 搜索在组件内部维护，输入时只重渲染本组件，不影响播放器其他区域；
 * 4. 行高固定 56px，滚动位置用 rAF 合并，避免高频重渲染。
 */
const PlaylistPanel = memo(forwardRef<PlaylistPanelHandle, PlaylistPanelProps>(
  function PlaylistPanel(
    {
      songs,
      currentIndex,
      isPlaying,
      expanded,
      isOnlineFallback,
      isRefreshingOnline,
      onSwitchSong,
      onSearchFocusChange,
      onRefreshOnline,
    },
    ref
  ) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);
    const initialScrollDoneRef = useRef(false);
    const pendingLocateRef = useRef(false);

    const [query, setQuery] = useState('');
    const [scrollTop, setScrollTop] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(240);

    const normalizedQuery = query.trim().toLowerCase();

    const filtered: FilteredSong[] = useMemo(() => {
      return songs
        .map((song, index) => ({ song, index }))
        .filter(({ song }) => {
          if (!normalizedQuery) return true;
          return (
            song.name.toLowerCase().includes(normalizedQuery) ||
            song.artist.toLowerCase().includes(normalizedQuery)
          );
        });
    }, [songs, normalizedQuery]);

    const totalHeight = filtered.length * ROW_HEIGHT;

    /** 只渲染可视区附近的行 */
    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
    const endIndex = Math.min(
      filtered.length,
      Math.ceil((scrollTop + (viewportHeight || 240)) / ROW_HEIGHT) + OVERSCAN
    );
    const visibleItems = filtered.slice(startIndex, endIndex);

    /**
     * 滚动到指定行并居中
     */
    const scrollToIndex = useCallback((indexInFiltered: number) => {
      const el = scrollRef.current;
      if (!el || indexInFiltered < 0) return;

      const target = indexInFiltered * ROW_HEIGHT - (el.clientHeight - ROW_HEIGHT) / 2;
      const maxScroll = Math.max(0, filtered.length * ROW_HEIGHT - el.clientHeight);
      el.scrollTop = Math.max(0, Math.min(target, maxScroll));
    }, [filtered.length]);

    /**
     * 定位当前播放歌曲（供父组件按钮调用）
     *
     * 如果当前歌曲被搜索条件过滤掉了，先清空搜索，等列表更新后再滚动。
     */
    const locateCurrent = useCallback(() => {
      const indexInFiltered = filtered.findIndex(item => item.index === currentIndex);

      if (indexInFiltered === -1) {
        pendingLocateRef.current = true;
        setQuery('');
        return;
      }

      requestAnimationFrame(() => scrollToIndex(indexInFiltered));
    }, [currentIndex, filtered, scrollToIndex]);

    useImperativeHandle(ref, () => ({ locateCurrent }), [locateCurrent]);

    /**
     * 清空搜索后，如果之前点击过“定位”，等 filtered 更新完再滚动
     */
    useEffect(() => {
      if (!pendingLocateRef.current) return;

      const indexInFiltered = filtered.findIndex(item => item.index === currentIndex);
      if (indexInFiltered === -1) return;

      pendingLocateRef.current = false;
      requestAnimationFrame(() => scrollToIndex(indexInFiltered));
    }, [filtered, currentIndex, scrollToIndex]);

    /**
     * 展开时自动把当前播放歌曲滚到中间一次
     */
    useEffect(() => {
      if (!expanded) {
        initialScrollDoneRef.current = false;
        return;
      }

      if (initialScrollDoneRef.current) return;

      const indexInFiltered = filtered.findIndex(item => item.index === currentIndex);
      if (indexInFiltered === -1) return;

      initialScrollDoneRef.current = true;
      requestAnimationFrame(() => scrollToIndex(indexInFiltered));
    }, [expanded, filtered, currentIndex, scrollToIndex]);

    /**
     * 监听滚动容器高度变化（搜索过滤后行数变少时，容器高度会变）
     */
    useEffect(() => {
      if (!expanded) return;
      const el = scrollRef.current;
      if (!el) return;

      const update = () => setViewportHeight(el.clientHeight);
      update();

      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(update);
      observer.observe(el);
      return () => observer.disconnect();
    }, [expanded]);

    /** 滚动事件用 rAF 合并 */
    const handleScroll = useCallback(() => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setScrollTop(scrollRef.current?.scrollTop ?? 0);
      });
    }, []);

    useEffect(() => {
      return () => {
        if (rafRef.current !== null) {
          cancelAnimationFrame(rafRef.current);
        }
      };
    }, []);

    const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
      setQuery(event.target.value);
    }, []);

    const handleSearchKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        setQuery('');
        event.currentTarget.blur();
      }
    }, []);

    const handleRowKeyDown = useCallback((
      event: React.KeyboardEvent<HTMLDivElement>,
      index: number
    ) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onSwitchSong(index);
      }
    }, [onSwitchSong]);

    const currentSong = expanded ? null : songs[currentIndex];

    return (
      <div
        className="mt-2 rounded-b-2xl border-t border-[#66ccff]/20"
        data-nosnippet
      >
        {expanded ? (
          <>
            {/* 搜索栏：固定在滚动区域上方，不随列表滚动 */}
            <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
              <svg
                className="w-3.5 h-3.5 flex-shrink-0 text-slate-400 dark:text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="16.5" y1="16.5" x2="21" y2="21" />
              </svg>

              <input
                type="text"
                value={query}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                onFocus={() => onSearchFocusChange(true)}
                onBlur={() => onSearchFocusChange(false)}
                placeholder="搜索歌曲 / 歌手"
                aria-label="搜索歌曲或歌手"
                autoComplete="off"
                spellCheck={false}
                className="min-w-0 flex-1 bg-transparent text-xs text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
              />

              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  onMouseDown={(event) => event.preventDefault()}
                  className="p-0.5 rounded-full text-slate-400 hover:text-[#66ccff] hover:bg-[#66ccff]/10 transition-colors flex-shrink-0"
                  aria-label="清空搜索"
                  title="清空搜索"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="6" y1="6" x2="18" y2="18" />
                    <line x1="18" y1="6" x2="6" y2="18" />
                  </svg>
                </button>
              ) : null}

              {isOnlineFallback && (
                <span
                  className="flex-shrink-0 text-[10px] text-amber-500 dark:text-amber-400"
                  title="在线歌单加载失败，当前使用本地歌单兜底"
                >
                  本地兜底
                </span>
              )}

              <span className="flex-shrink-0 text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                {normalizedQuery
                  ? `${filtered.length}/${songs.length}`
                  : `共 ${songs.length} 首`}
              </span>

              <button
                type="button"
                onClick={onRefreshOnline}
                disabled={isRefreshingOnline}
                onMouseDown={(event) => event.preventDefault()}
                className={`p-0.5 rounded-full flex-shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70 ${
                  isRefreshingOnline
                    ? 'text-[#66ccff] cursor-wait'
                    : isOnlineFallback
                      ? 'text-amber-500 hover:text-[#66ccff] hover:bg-[#66ccff]/10'
                      : 'text-slate-400 hover:text-[#66ccff] hover:bg-[#66ccff]/10'
                }`}
                aria-label="刷新在线歌单"
                title={isOnlineFallback ? '重新加载在线歌单' : '刷新在线歌单'}
              >
                <svg
                  className={`w-3.5 h-3.5 ${isRefreshingOnline ? 'animate-spin motion-reduce:animate-none' : ''}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {/* 滚动区域：虚拟列表只渲染可视区附近的行 */}
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="max-h-[240px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#66ccff]/35"
              aria-label="播放列表"
            >
              {filtered.length === 0 ? (
                <div className="h-24 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                  未找到匹配的歌曲
                </div>
              ) : (
                <div className="relative" style={{ height: totalHeight }}>
                  {visibleItems.map(({ song, index }, offset) => {
                    const position = startIndex + offset;
                    const isCurrent = index === currentIndex;

                    return (
                      <div
                        key={`${song.name}-${song.artist}-${index}`}
                        data-current-song={isCurrent}
                        role="button"
                        tabIndex={0}
                        aria-current={isCurrent ? 'true' : undefined}
                        aria-label={`播放 ${song.name} - ${song.artist}`}
                        onClick={() => onSwitchSong(index)}
                        onKeyDown={(event) => handleRowKeyDown(event, index)}
                        className={`
                          absolute left-0 right-0 h-14 flex items-center gap-3 px-4 cursor-pointer transition-colors
                          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#66ccff]/70
                          ${isCurrent
                            ? 'bg-[#66ccff]/10 dark:bg-[#66ccff]/15 border-l-2 border-[#66ccff]'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-700/50 border-l-2 border-transparent'
                          }
                        `}
                        style={{ top: position * ROW_HEIGHT }}
                      >
                        <div className="text-xs text-slate-400 w-5 text-center flex-shrink-0">
                          {isCurrent && isPlaying ? (
                            <PlayingBars />
                          ) : (
                            index + 1
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div
                            className={`text-sm truncate ${
                              isCurrent
                                ? 'text-[#0099cc] dark:text-[#66ccff] font-medium'
                                : 'text-slate-700 dark:text-slate-200'
                            }`}
                            title={song.name}
                          >
                            {song.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            <ArtistName text={song.artist} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          /* 折叠状态：只显示当前播放歌曲作为占位，不暴露完整歌单 */
          currentSong ? (
            <div
              data-current-song="true"
              className="flex items-center gap-3 px-4 h-14 bg-[#66ccff]/10 dark:bg-[#66ccff]/15 border-l-2 border-[#66ccff] rounded-b-2xl"
            >
              <div className="text-xs text-slate-400 w-5 text-center flex-shrink-0">
                {isPlaying ? <PlayingBars /> : currentIndex + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm truncate text-[#0099cc] dark:text-[#66ccff] font-medium">
                  {currentSong.name}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  <ArtistName text={currentSong.artist} />
                </div>
              </div>
            </div>
          ) : null
        )}
      </div>
    );
  }
));

PlaylistPanel.displayName = 'PlaylistPanel';

export default PlaylistPanel;
