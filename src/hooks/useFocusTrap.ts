'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * 弹层焦点陷阱 Hook
 *
 * 作用：
 * 1. 弹层打开时把焦点移入弹层，关闭时归还给原来的触发元素；
 * 2. 拦截 Tab / Shift+Tab，让焦点在弹层内部循环，不会跑到背景页面。
 *
 * 为什么需要：
 * 仅靠「打开时 focus 一次」并不能阻止键盘用户按 Tab 把焦点移出弹窗，
 * 背景页面在视觉上被遮罩，但依然可能被键盘操作，属于可访问性缺陷。
 *
 * @param containerRef - 弹层内容容器的引用，容器需带 tabIndex={-1} 以便无按钮时也能接收焦点
 * @param active - 弹层是否处于打开状态
 */
export function useFocusTrap<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  active: boolean
): void {
  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    // 记录打开前的焦点，关闭后归还，避免用户"迷路"
    const previousFocus = document.activeElement as HTMLElement | null;

    // 延迟聚焦，等待入场动画挂载完成后再移动焦点
    const focusTimer = window.setTimeout(() => container.focus(), 30);

    /**
     * 收集弹层内可聚焦元素
     * 使用属性选择器而非 querySelectorAll('*')，避免把不可交互元素算进来
     */
    const getFocusableElements = (): HTMLElement[] => {
      const selector =
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
      return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
        // 过滤掉 display:none 等不可见元素，防止焦点落到看不见的控件上
        element => element.offsetParent !== null || element === document.activeElement
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusable = getFocusableElements();

      // 弹层内没有可聚焦元素时，把焦点锁在容器上
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const activeElement = document.activeElement;

      if (event.shiftKey) {
        // 反向 Tab：从第一个元素或容器本身出发时跳到最后一个
        if (
          activeElement === first ||
          activeElement === container ||
          !container.contains(activeElement)
        ) {
          event.preventDefault();
          last.focus();
        }
      } else {
        // 正向 Tab：从最后一个元素出发时回到第一个
        if (activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (!container.contains(activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [active, containerRef]);
}
