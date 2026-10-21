'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { OPEN_SEARCH_EVENT, requestSearchOpen } from '@/utils/searchEvents';

const SearchDialog = dynamic(() => import('./SearchDialog'), { ssr: false });

/**
 * 搜索弹窗的按需加载包装器
 *
 * SearchDialog 依赖 fuse.js 与 framer-motion，若直接挂在根布局，
 * 所有页面首屏都会下载这部分代码。这里只在用户第一次唤起搜索时
 * 才加载真正的弹窗组件与索引。
 *
 * 索引预取由 Navigation 中的搜索按钮 hover/focus 触发（见 prefetchSearchIndex）；
 * 原先这里的空闲预取（load 后 3-4s 拉取约 40KB 的 /search-index.json）
 * 会在弱网设备上与首屏图片/字体等关键资源竞争带宽，已移除。
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

    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, open);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return loaded ? <SearchDialog /> : null;
}
