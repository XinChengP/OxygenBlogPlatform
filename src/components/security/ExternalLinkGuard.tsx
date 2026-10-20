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
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { Z_INDEX } from '@/utils/zIndex';

/*
  RedirectNotice 只在第一次点击外链时渲染，没必要把它（以及它依赖的
  framer-motion / 剪贴板 / Live2D 消息系统）打进全站首载包。
*/
const RedirectNotice = dynamic(() => import('./RedirectNotice'), {
  ssr: false,
  loading: () => <div className="h-48" />,
});

/**
 * 点外链时再加载看板娘消息模块。
 *
 * live2dMessageManager 连同 contextTracker、消息文案约 12KB(gzip)，
 * 而外链确认是低频事件，静态导入会让每一页都为它付费。
 */
function notifyLive2D(type: 'BLOCKED' | 'CONTINUE' | 'BACK' | 'COPY'): void {
  void import('@/utils/live2dMessageManager')
    .then(({ Live2DMessageHelper }) => Live2DMessageHelper.showExternalLinkMessage(type))
    .catch(() => undefined);
}

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
  const pathname = usePathname();
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [originAnchor, setOriginAnchor] = useState<HTMLAnchorElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(!!pendingUrl);

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

      if (!isExternalLink(anchor)) return;

      // 拦截默认跳转，弹出提醒
      event.preventDefault();
      setPendingUrl(anchor.href);
      setOriginAnchor(anchor);
      // 看板娘提示：即将离开本站
      notifyLive2D('BLOCKED');
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  /**
   * 继续访问：新窗口（新标签页）打开目标链接
   * 说明：在点击事件内直接调用 window.open 属于用户手势触发，
   * 不会被浏览器弹窗拦截器拦截；noopener 防止新页面反向操控本站
   */
  const handleContinue = useCallback(() => {
    if (!pendingUrl) return;
    setPendingUrl(null);
    setOriginAnchor(null);
    // 看板娘提示：送别
    notifyLive2D('CONTINUE');
    // 新标签页打开目标链接
    window.open(pendingUrl, '_blank', 'noopener,noreferrer');
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
    notifyLive2D('BACK');
  }, [originAnchor]);

  /**
   * 关闭（Esc / 遮罩点击）：等同返回，不跳转
   */
  const handleClose = useCallback(() => {
    handleBack();
  }, [handleBack]);

  // 路由变化时关闭弹窗，避免遮罩和滚动锁残留到新页面
  useEffect(() => {
    setPendingUrl(null);
    setOriginAnchor(null);
  }, [pathname]);

  // 打开时聚焦弹窗内首个控件；Esc 关闭；Tab 焦点陷阱
  useEffect(() => {
    if (!pendingUrl) return;
    const dialog = dialogRef.current;
    const getFocusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    getFocusable()[0]?.focus();

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;

      const items = getFocusable();
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [pendingUrl, handleClose]);

  return (
    <>
      {pendingUrl && (
        <div
          key="external-link-guard"
          className="guard-backdrop-in fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: Z_INDEX.modalBackdrop }}
          role="dialog"
          aria-modal="true"
          aria-label="外部链接跳转提醒"
        >
          {/* 遮罩层 */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* 弹窗主体：入场缩放 + 位移过渡（纯 CSS，避免为这一低频弹窗全局引入 framer-motion） */}
          <div
            ref={dialogRef}
            className="guard-dialog-in relative w-full max-w-md"
            style={{ zIndex: Z_INDEX.modal }}
          >
            <RedirectNotice
              url={pendingUrl}
              variant="modal"
              onContinue={handleContinue}
              onBack={handleBack}
              onClose={handleClose}
            />
          </div>
        </div>
      )}
    </>
  );
}
