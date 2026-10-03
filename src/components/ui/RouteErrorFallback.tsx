'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * 路由级错误兜底
 *
 * 渲染异常时保留站点导航（可返回首页或重试），
 * 取代原先直接穿透到整页白屏 global-error 的行为。
 * 各路由的 error.tsx 薄引用本组件。
 */
export default function RouteErrorFallback({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // 上报到控制台便于排查（生产 removeConsole 仅保留 error）
  useEffect(() => {
    console.error('[RouteError]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-20">
      <div className="max-w-md w-full mx-4 bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 shadow-lg p-8 text-center">
        <div className="text-4xl mb-4">😵</div>
        <h2 className="text-lg font-semibold text-foreground mb-2">页面出了点小问题</h2>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          内容渲染时遇到异常，可以尝试重新加载；如果持续出现，欢迎通过留言板告诉我。
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            重试
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-muted/60 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
