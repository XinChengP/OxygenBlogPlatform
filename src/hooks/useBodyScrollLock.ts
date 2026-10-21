'use client';

import { useEffect } from 'react';

/**
 * 全站滚动锁
 *
 * 本文件重写过，原因是旧实现有两个副作用：
 * 1. 旧实现直接给 body 设置 `overflow: hidden`，这会让 body 变成滚动容器，
 *    从而使全站 `position: sticky` 元素失去粘性、回落到文档流原位。
 *    用户已经滚动到页面中段时，这些元素落在视口之外，
 *    看起来就成了「点开弹窗后右侧卡片消失」。
 * 2. 部分浏览器在恢复 overflow 之后会把文档滚动位置重置为 0，
 *    表现为「触发出站提示后回到页面顶部」。
 *
 * 现在的实现完全不改动布局相关样式（不碰 overflow / position / padding），
 * 而是：
 * - 记录锁定瞬间的滚动位置，锁定期间持续守护，解锁时精确还原；
 * - 只拦截「背景区域」的滚轮、触摸滚动与键盘滚动；
 * - 事件发生在固定定位弹层内时一律放行，
 *   保证弹窗自身的滚动、图片滚轮缩放、拖拽等交互不受影响。
 *
 * 因为页面从未停止滚动，sticky 元素的粘性上下文始终有效，
 * 锁定期间页面视觉完全静止，不会出现卡片跳动或消失。
 */

/** 同时打开的弹层数量，归零时才真正解除锁定 */
let lockCount = 0;

/** 锁定开始时的滚动位置，解锁时用于精确还原 */
let savedScrollY = 0;

/** 挂在 window 上的监听器，引用计数归零时统一移除 */
let wheelHandler: ((event: WheelEvent) => void) | null = null;
let touchMoveHandler: ((event: TouchEvent) => void) | null = null;
let keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
let scrollHandler: (() => void) | null = null;

/** 会引发页面滚动的按键（Space 在 KeyboardEvent.key 中是单个空格字符） */
const SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'Home', 'End']);

/**
 * 判断事件目标是否位于固定定位的弹层内
 *
 * 项目内所有弹窗与遮罩都使用 `position: fixed` 的容器，
 * 命中即视为「用户正在与弹层交互」，其滚动类事件不应被拦截。
 *
 * @param target 事件目标
 * @returns 是否在固定定位层内
 */
function isInsideFixedLayer(target: EventTarget | null): boolean {
  let node = target as HTMLElement | null;

  while (node && node !== document.body && node !== document.documentElement) {
    if (window.getComputedStyle(node).position === 'fixed') {
      return true;
    }
    node = node.parentElement;
  }

  return false;
}

/**
 * 判断事件目标是否落在可滚动区域内
 *
 * 弹层内部常有一块 `overflow-y: auto` 的内容区，
 * 这类区域的滚轮与触摸滚动需要正常工作。
 *
 * @param target 事件目标
 * @returns 是否在可滚动区域内
 */
function isInsideScrollableArea(target: EventTarget | null): boolean {
  let node = target as HTMLElement | null;

  while (node && node !== document.body && node !== document.documentElement) {
    const overflowY = window.getComputedStyle(node).overflowY;
    const canScroll =
      (overflowY === 'auto' || overflowY === 'scroll') &&
      node.scrollHeight > node.clientHeight;

    if (canScroll) return true;
    node = node.parentElement;
  }

  return false;
}

/**
 * 判断事件目标是否为可编辑控件
 *
 * 输入框、文本域、下拉框与富文本需要正常响应按键，
 * 不能被滚动锁拦掉（例如空格键在输入框里必须能输入）。
 *
 * @param target 事件目标
 * @returns 是否为可编辑控件
 */
function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;

  const tag = element.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
}

/**
 * 把文档滚动位置拉回锁定时的位置
 *
 * 直接给 scrollingElement.scrollTop 赋值，而不调用 window.scrollTo：
 * 后者会受平滑滚动设置影响产生动画抖动，前者是即时生效的。
 */
function restoreScrollPosition(): void {
  const scrollingElement = document.scrollingElement || document.documentElement;

  // 留 1px 容差，避免亚像素滚动位置导致反复赋值
  if (Math.abs(scrollingElement.scrollTop - savedScrollY) > 1) {
    scrollingElement.scrollTop = savedScrollY;
  }
}

/**
 * 挂载全局监听（引用计数从 0 变为 1 时执行一次）
 */
function attachListeners(): void {
  savedScrollY = window.scrollY;

  // 滚轮：背景区域一律阻止，弹层内放行
  wheelHandler = (event: WheelEvent) => {
    if (isInsideFixedLayer(event.target) || isInsideScrollableArea(event.target)) return;
    event.preventDefault();
  };
  // passive 必须为 false，否则 preventDefault 无效
  window.addEventListener('wheel', wheelHandler, { passive: false });

  // 触摸滚动：判断规则与滚轮一致
  touchMoveHandler = (event: TouchEvent) => {
    if (isInsideFixedLayer(event.target) || isInsideScrollableArea(event.target)) return;
    event.preventDefault();
  };
  window.addEventListener('touchmove', touchMoveHandler, { passive: false });

  // 键盘滚动：输入控件与弹层内的按键放行
  keyDownHandler = (event: KeyboardEvent) => {
    if (!SCROLL_KEYS.has(event.key)) return;
    if (isEditableTarget(event.target)) return;
    if (isInsideFixedLayer(event.target)) return;
    event.preventDefault();
  };
  window.addEventListener('keydown', keyDownHandler);

  /*
    兜底守护：拖动滚动条、页面内容高度变化、其他脚本主动滚动等
    仍可能改变滚动位置，这里持续拉回锁定瞬间的位置。
    解锁时还会再还原一次，确保关闭弹窗后不会停在别处。
  */
  scrollHandler = () => restoreScrollPosition();
  window.addEventListener('scroll', scrollHandler, { passive: true });
}

/**
 * 卸载全局监听并还原滚动位置（引用计数归零时执行一次）
 */
function detachListeners(): void {
  if (wheelHandler) window.removeEventListener('wheel', wheelHandler);
  if (touchMoveHandler) window.removeEventListener('touchmove', touchMoveHandler);
  if (keyDownHandler) window.removeEventListener('keydown', keyDownHandler);
  if (scrollHandler) window.removeEventListener('scroll', scrollHandler);

  wheelHandler = null;
  touchMoveHandler = null;
  keyDownHandler = null;
  scrollHandler = null;

  // 关闭弹窗后回到打开前的位置，避免「回到顶部」
  restoreScrollPosition();
}

/**
 * 锁定/恢复页面滚动
 *
 * 锁定期间页面不滚动、sticky 定位不受影响；
 * 引用计数保证搜索弹窗与外链提醒等多个弹层叠加时不会提前解锁。
 *
 * @param locked 是否需要锁定
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    if (lockCount === 0) {
      attachListeners();
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        detachListeners();
      }
    };
  }, [locked]);
}
