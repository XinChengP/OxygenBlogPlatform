/**
 * 全局外部链接拦截守卫
 *
 * 挂载于根布局，通过事件委托监听全站链接点击：
 * 当用户点击指向「本站以外域名」的链接时，拦截默认跳转行为，
 * 弹出跳转提醒弹窗，由用户确认后再打开目标链接。
 *
 * 判定规则：
 * - 站内链接（同源、以 / 或 # 开头、mailto/tel 等协议、锚点）不拦截；
 * - 命中 data-skip-external-guard 属性、或带 download 属性的链接不拦截；
 * - 修饰键点击（Ctrl/Cmd/Shift/中键）不拦截，尊重用户的「新标签页打开」习惯；
 * - 已在本站允许域名列表中的链接不拦截。
 *
 * @author 歆橙
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RedirectNotice from './RedirectNotice';
import { Live2DMessageHelper } from '@/utils/live2dMessageManager';

/**
 * 视为「站内」的额外域名白名单（部署主站 + 本地开发）
 */
const ALLOWED_HOSTS = [
  'xinchengp.cn',
  'blog.xinchengp.cn',
  'localhost',
  '127.0.0.1',
];

/**
 * 判断某个 URL 是否为「应触发提醒」的外部链接
 */
function isExternalLink(anchor: HTMLAnchorElement): boolean {
  const rawHref = anchor.getAttribute('href');
  if (!rawHref) return false;

  // 显式跳过标记 / 下载链接
  if (anchor.hasAttribute('data-skip-external-guard')) return false;
  if (anchor.hasAttribute('download')) return false;

  // 纯锚点、站内相对路径、协议相对以外的相对路径
  if (rawHref.startsWith('#')) return false;
  if (rawHref.startsWith('/') && !rawHref.startsWith('//')) return false;

  // 非 http(s) 协议（mailto/tel/javascript 等）不拦截
  if (!/^https?:\/\//i.test(rawHref)) return false;

  let url: URL;
  try {
    url = new URL(rawHref, window.location.href);
  } catch {
    return false;
  }

  const currentHost = window.location.hostname;
  const targetHost = url.hostname;

  // 同源
  if (targetHost === currentHost) return false;

  // 白名单域名（含子域）
  const isAllowed = ALLOWED_HOSTS.some(
    (host) => targetHost === host || targetHost.endsWith(`.${host}`)
  );
  return !isAllowed;
}

export default function ExternalLinkGuard(): React.ReactElement | null {
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [originAnchor, setOriginAnchor] = useState<HTMLAnchorElement | null>(null);
  // 用于「继续访问」时避免再次触发拦截
  const bypassRef = useRef(false);

  /**
   * 全局点击委托
   */
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      // 修饰键点击以及中键：交由浏览器默认行为（新标签页打开）
      if (event.defaultPrevented) return;
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      // 找到被点击的链接（可能点在内层元素上）
      const target = event.target as Element | null;
      const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor) return;

      // 绕过标记（继续访问时手动触发）
      if (bypassRef.current) {
        bypassRef.current = false;
        return;
      }

      if (!isExternalLink(anchor)) return;

      // 拦截默认跳转，弹出提醒
      event.preventDefault();
      setPendingUrl(anchor.href);
      setOriginAnchor(anchor);
      // 看板娘提示：即将离开本站
      Live2DMessageHelper.showExternalLinkMessage('BLOCKED');
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  /**
   * 继续访问：在新标签页打开目标链接
   */
  const handleContinue = useCallback(() => {
    if (!pendingUrl) return;
    bypassRef.current = true;
    window.open(pendingUrl, '_blank', 'noopener,noreferrer');
    setPendingUrl(null);
    setOriginAnchor(null);
    // 看板娘提示：送别
    Live2DMessageHelper.showExternalLinkMessage('CONTINUE');
  }, [pendingUrl]);

  /**
   * 返回上一页：若存在来源链接则恢复焦点，否则仅关闭弹窗
   */
  const handleBack = useCallback(() => {
    // 关闭后把焦点交还给触发链接，保持键盘操作连续性
    originAnchor?.focus?.();
    setPendingUrl(null);
    setOriginAnchor(null);
    // 看板娘提示：留下来了
    Live2DMessageHelper.showExternalLinkMessage('BACK');
  }, [originAnchor]);

  /**
   * 关闭（Esc / 遮罩点击）：等同返回，不跳转
   */
  const handleClose = useCallback(() => {
    handleBack();
  }, [handleBack]);

  // 弹窗打开时锁定页面滚动
  useEffect(() => {
    if (!pendingUrl) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [pendingUrl]);

  return (
    <AnimatePresence>
      {pendingUrl && (
        <motion.div
          key="external-link-guard"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* 遮罩层 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* 弹窗主体：入场缩放 + 位移过渡 */}
          <motion.div
            className="relative w-full max-w-md"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            <RedirectNotice
              url={pendingUrl}
              variant="modal"
              onContinue={handleContinue}
              onBack={handleBack}
              onClose={handleClose}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
