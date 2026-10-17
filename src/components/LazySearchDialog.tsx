'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { OPEN_SEARCH_EVENT, requestSearchOpen } from '@/utils/searchEvents';
import { prefetchSearchIndex } from '@/utils/searchIndex';

const SearchDialog = dynamic(() => import('./SearchDialog'), { ssr: false });

/**
 * 搜索弹窗的按需加载包装器
 *
 * SearchDialog 依赖 fuse.js 与 framer-motion，若直接挂在根布局，
 * 所有页面首屏都会下载这部分代码。这里只在用户第一次唤起搜索时
 * 才加载真正的弹窗组件；索引本身在浏览器空闲时预取。
 */
export default function LazySearchDialog() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const open = () => {
      // 记录打开意图：首次唤起时 SearchDialog 还在异步加载，
      // 它会在挂载后消费这个标记并自动打开。
      // 注意不要在这里再次派发 OPEN_SEARCH_EVENT，否则会自我递归。
      requestSearchOpen();
      setLoaded(true);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        requestSearchOpen();
        setLoaded(true);
      }
    };

    window.addEventListener(OPEN_SEARCH_EVENT, open);
    window.addEventListener('keydown', handleKeyDown);

    // 空闲时预取索引，首次打开无需等待下载
    const idle = (window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
    }).requestIdleCallback;
    let idleId: number | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (typeof idle === 'function') {
      idleId = idle(() => prefetchSearchIndex(), { timeout: 4000 });
    } else {
      timer = setTimeout(() => prefetchSearchIndex(), 3000);
    }

    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, open);
      window.removeEventListener('keydown', handleKeyDown);
      if (idleId !== null && typeof window.cancelIdleCallback === 'function') {
        window.cancelIdleCallback(idleId);
      }
      if (timer) clearTimeout(timer);
    };
  }, []);

  return loaded ? <SearchDialog /> : null;
}
