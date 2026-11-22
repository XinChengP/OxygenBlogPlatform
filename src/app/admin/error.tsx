'use client';

import RouteErrorFallback from '@/components/ui/RouteErrorFallback';

/**
 * 管理后台路由级错误兜底
 *
 * 与全站其它路由保持一致：渲染异常时给出「重试 / 返回首页」出口，
 * 而不是直接白屏。错误详情由 RouteErrorFallback 输出到控制台。
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorFallback error={error} reset={reset} />;
}
