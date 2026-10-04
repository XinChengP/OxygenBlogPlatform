/**
 * 跳转链接提醒组件
 *
 * 用于在用户即将离开本站、跳转到外部链接前显示安全提示。
 * 该组件为纯展示组件，同时被两种形态复用：
 * 1. 独立页面 /redirect（通过 ?url= 参数接收目标链接）
 * 2. 全局外部链接拦截弹窗（ExternalLinkGuard）
 *
 * 视觉规范：沿用全站天依蓝玻璃卡片体系
 * （card/border/foreground/muted 语义令牌 + shadow-card + glass-card），
 * 不硬编码灰阶，亮暗主题自动适配。
 *
 * 无障碍：容器使用 role="alertdialog" + aria-modal，打开时自动聚焦主按钮，
 * Tab 焦点锁定在容器内，Esc 可关闭（由调用方传入 onClose 时启用）。
 *
 * @author 歆橙
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Copy, Check, ExternalLink, ArrowLeft, ShieldAlert } from 'lucide-react';
import { copyToClipboard } from '@/utils/clipboard';

/**
 * 跳转提醒组件属性
 */
export interface RedirectNoticeProps {
  /** 目标链接（完整 URL） */
  url: string;
  /** 点击「继续访问」回调；未提供时默认在新标签页打开目标链接 */
  onContinue?: () => void;
  /** 点击「返回上一页」回调；未提供时默认调用 history.back() */
  onBack?: () => void;
  /** 关闭回调（弹窗形态下传入，用于 Esc 关闭与遮罩点击关闭） */
  onClose?: () => void;
  /** 是否为弹窗形态（影响圆角与阴影强度） */
  variant?: 'page' | 'modal';
  /** 自定义追加类名 */
  className?: string;
}

/**
 * 提取链接的主机名用于醒目展示，解析失败时回退到原始字符串
 */
function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default function RedirectNotice({
  url,
  onContinue,
  onBack,
  onClose,
  variant = 'page',
  className = '',
}: RedirectNoticeProps) {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hostname = getHostname(url);

  // 打开时自动聚焦「继续访问」按钮，方便键盘用户直接操作
  useEffect(() => {
    const timer = setTimeout(() => {
      continueButtonRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // 清理复制状态定时器
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  /**
   * 复制目标链接到剪贴板
   */
  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      if (copyTimerRef.current) {
        clearTimeout(copyTimerRef.current);
      }
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    }
  }, [url]);

  /**
   * 继续访问：默认在新标签页打开，并带上安全属性
   */
  const handleContinue = useCallback(() => {
    if (onContinue) {
      onContinue();
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }, [onContinue, url]);

  /**
   * 返回上一页：默认调用 history.back()
   */
  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  }, [onBack]);

  // 键盘交互：Esc 关闭、Tab 焦点锁定
  useEffect(() => {
    if (!onClose) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      // 焦点锁定：仅在有多个可聚焦元素时启用
      if (event.key === 'Tab' && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      ref={containerRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="redirect-notice-title"
      aria-describedby="redirect-notice-desc"
      className={`
        relative overflow-hidden border border-border bg-card/95 backdrop-blur-md
        ${variant === 'modal' ? 'rounded-2xl shadow-2xl' : 'rounded-2xl shadow-card'}
        ${className}
      `}
    >
      {/* 顶部警示渐变装饰条 */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-amber-400 to-primary" />

      {/* 背景光晕装饰 */}
      <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative p-6 sm:p-8">
        {/* 警告图标 + 标题 */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-4">
            {/* 脉冲光晕 */}
            <span className="absolute inset-0 rounded-full bg-amber-400/30 animate-ping" />
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              className="relative w-16 h-16 rounded-full flex items-center justify-center
                         bg-gradient-to-br from-amber-400 to-primary shadow-lg"
            >
              <AlertTriangle className="w-8 h-8 text-white" strokeWidth={2.2} />
            </motion.div>
          </div>

          <h2
            id="redirect-notice-title"
            className="text-xl sm:text-2xl font-bold text-foreground mb-2 flex items-center gap-2"
          >
            <ShieldAlert className="w-5 h-5 text-primary" />
            前方出站啦！
          </h2>
          <p id="redirect-notice-desc" className="text-sm text-muted-foreground leading-relaxed max-w-md">
            即将跳出本站，外面的世界很精彩，但也要留个心眼哦 (•̀ᴗ•́)و
            <br />
            先瞄一眼下面的地址，确认这链接保熟再冲～
          </p>
        </div>

        {/* 目标链接展示区 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 text-xs font-medium text-muted-foreground">
            <ExternalLink className="w-3.5 h-3.5" />
            目标地址
          </div>
          <div
            className="flex items-center gap-3 p-3 rounded-xl bg-muted/60 border border-border"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate" title={hostname}>
                {hostname}
              </p>
              <p className="text-xs text-muted-foreground break-all line-clamp-2" title={url}>
                {url}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              aria-label={copied ? '已复制链接' : '复制链接'}
              className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center
                         border border-border bg-card hover:border-primary/50 hover:text-primary
                         text-muted-foreground transition-colors duration-200"
            >
              <AnimatePresence mode="wait" initial={false}>
                {copied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check className="w-4 h-4 text-green-500" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Copy className="w-4 h-4" />
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
          {/* 复制成功提示（对读屏软件友好） */}
          <p
            role="status"
            aria-live="polite"
            className={`mt-2 text-xs text-green-600 dark:text-green-400 transition-opacity duration-200 ${
              copied ? 'opacity-100' : 'opacity-0'
            }`}
          >
            链接已复制到剪贴板
          </p>
        </div>

        {/* 操作按钮组 */}
        <div className="flex flex-col sm:flex-row gap-3">
          <motion.button
            ref={continueButtonRef}
            type="button"
            onClick={handleContinue}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                       bg-primary text-primary-foreground font-medium
                       hover:bg-primary/90 transition-colors duration-200
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ExternalLink className="w-4 h-4" />
            继续访问
          </motion.button>

          <motion.button
            type="button"
            onClick={handleBack}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl
                       border border-border bg-card text-foreground font-medium
                       hover:border-primary/40 hover:bg-muted transition-colors duration-200
                       focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <ArrowLeft className="w-4 h-4" />
            返回上一页
          </motion.button>
        </div>

        {/* 底部安全提示 */}
        <p className="mt-5 text-center text-xs text-muted-foreground/80">
          🛡️ 小提醒：陌生站点别随手填账号密码，钱包和头发都要护住～
        </p>
      </div>
    </div>
  );
}
