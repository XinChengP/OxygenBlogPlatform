'use client';

import { useEffect } from 'react';

// 多个弹层可能同时打开，用引用计数保证最后一个关闭时才恢复页面滚动
let lockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

/**
 * 锁定/恢复 body 滚动
 *
 * 锁定期间补偿滚动条宽度，避免桌面端页面内容横向跳动；
 * 引用计数保证搜索弹窗与外链提醒叠加时不会提前解锁。
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      previousOverflow = document.body.style.overflow;
      previousPaddingRight = document.body.style.paddingRight;

      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        document.body.style.overflow = previousOverflow;
        document.body.style.paddingRight = previousPaddingRight;
      }
    };
  }, [locked]);
}
