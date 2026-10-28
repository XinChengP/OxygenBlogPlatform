'use client';

import { useEffect, useState } from 'react';
import { isElectron } from '@/utils/isElectron';

/**
 * 打字机组件
 *
 * 性能说明（第四批）：
 * - 原实现用 framer-motion 的 animate() + repeat: Infinity 常驻动画循环，
 *   首页加载后每帧都在更新 motion value，即使标签页不可见也占主线程。
 * - 现在改为 setTimeout 状态机：打字 60ms/字、删除 30ms/字、整句停留 1.5s；
 *   标签页隐藏时暂停，prefers-reduced-motion 时直接显示静态文本。
 * - 这样首页不再需要 framer-motion，首载可少一个约 41KB(gzip) 的 chunk。
 */
export interface ITypewriterProps {
  delay: number;
  texts: string[];
  baseText?: string;
}

const TYPE_INTERVAL_MS = 60;
const DELETE_INTERVAL_MS = 30;
const HOLD_FULL_MS = 1500;
const HOLD_EMPTY_MS = 500;

export default function Typewriter({ delay, texts, baseText = '' }: ITypewriterProps) {
  const [displayText, setDisplayText] = useState(baseText);
  const [started, setStarted] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  // 减少动态效果：只显示第一句静态文本
  // Electron 桌面端不受系统减少动态效果影响，始终播放打字机动画
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduceMotion(!isElectron() && query.matches);
    sync();
    query.addEventListener?.('change', sync);
    return () => query.removeEventListener?.('change', sync);
  }, []);

  // 页面隐藏时暂停打字，避免后台定时器继续更新 DOM
  useEffect(() => {
    const sync = () => setIsHidden(document.hidden);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  // 保留原来的入场节奏：delay + 1 秒后开始循环
  useEffect(() => {
    if (reduceMotion) {
      setDisplayText(texts[0] || baseText);
      return;
    }
    const timer = setTimeout(() => {
      setDisplayText('');
      setStarted(true);
    }, Math.max(0, delay + 1) * 1000);
    return () => clearTimeout(timer);
  }, [delay, reduceMotion, texts, baseText]);

  useEffect(() => {
    if (!started || isHidden || reduceMotion || texts.length === 0) return;

    const currentText = texts[textIndex % texts.length] || '';
    let timer: ReturnType<typeof setTimeout>;

    if (!deleting) {
      if (charIndex < currentText.length) {
        timer = setTimeout(() => {
          const next = charIndex + 1;
          setDisplayText(currentText.slice(0, next));
          setCharIndex(next);
        }, TYPE_INTERVAL_MS);
      } else {
        // 整句显示完整后停留一会再删除
        timer = setTimeout(() => setDeleting(true), HOLD_FULL_MS);
      }
    } else if (charIndex > 0) {
      timer = setTimeout(() => {
        const next = charIndex - 1;
        setDisplayText(currentText.slice(0, next));
        setCharIndex(next);
      }, DELETE_INTERVAL_MS);
    } else {
      // 删除空后切下一句
      timer = setTimeout(() => {
        setDeleting(false);
        setTextIndex(index => (index + 1) % texts.length);
      }, HOLD_EMPTY_MS);
    }

    return () => clearTimeout(timer);
  }, [started, isHidden, reduceMotion, textIndex, charIndex, deleting, texts]);

  return (
    <span>
      <span>{displayText}</span>
      <BlinkingCursor />
    </span>
  );
}

/** 闪烁光标 - 纯 CSS 动画 */
function BlinkingCursor() {
  return (
    <span
      className="inline-block h-8 w-[1px] translate-y-1 bg-neutral-900 dark:bg-neutral-100"
      style={{ animation: 'blink 1s linear infinite' }}
    />
  );
}
