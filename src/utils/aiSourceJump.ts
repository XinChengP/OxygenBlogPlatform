'use client';

import { useEffect } from 'react';

/**
 * AI 来源跳转工具
 *
 * 天依问答的来源卡可能指向列表页中的某一条（动态、更新日志都是整页信息流），
 * 点击后需要滚动定位到目标卡片并短暂高亮，否则读者落地后找不到对应内容。
 *
 * 约定：目标卡片带 id = `${prefix}${key}`（如 moment-first-moment），
 * AI 来源的 url 使用 /page/#<prefix><key> 形式的 hash。
 */

/** 定位到目标元素并高亮一段时间；目标不存在（尚未渲染/被过滤）时返回 false */
export function highlightAndScroll(elementId: string, navOffset = 96, highlightMs = 2600): boolean {
  if (typeof document === 'undefined') return false;
  const element = document.getElementById(elementId);
  if (!element) return false;

  const top = element.getBoundingClientRect().top + window.scrollY - navOffset;
  window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  element.classList.add('ai-source-highlight');
  window.setTimeout(() => element.classList.remove('ai-source-highlight'), highlightMs);
  return true;
}

/**
 * 监听 location.hash（#<prefix><key>）：挂载时与 hash 变化时
 * 都尝试定位目标卡片。页面组件传入自己的前缀（moment- / changelog-）。
 */
export function useAiSourceHashJump(prefix: string): void {
  useEffect(() => {
    const jump = () => {
      const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (!hash.startsWith(prefix)) return undefined;
      // 静态导出页面卡片同步渲染，短暂延迟确保布局稳定后再定位
      const timer = window.setTimeout(() => highlightAndScroll(hash), 180);
      return () => window.clearTimeout(timer);
    };
    const cleanup = jump();
    window.addEventListener('hashchange', jump);
    return () => {
      window.removeEventListener('hashchange', jump);
      cleanup?.();
    };
  }, [prefix]);
}
