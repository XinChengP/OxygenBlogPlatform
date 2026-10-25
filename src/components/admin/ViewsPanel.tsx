'use client';

/**
 * 文章浏览量面板（后台仪表盘）
 *
 * 数据来源：cloudflare/interactions Worker 的 /admin/stats（Bearer ADMIN_TOKEN）。
 * 后台仅在本地开发环境运行（AdminGuard 已拦截生产访问），因此：
 *   - 请求走同源 /api/interactions/*（本地由 next.config rewrite 转发到 wrangler dev，
 *     或生产路由接管——但生产本面板不可达）；
 *   - Token 存 localStorage 仅作本地便利，不构成安全边界，真正的鉴权在 Worker。
 */

import { useCallback, useEffect, useState } from 'react';
import { Eye, KeyRound, RefreshCw, TriangleAlert, Loader2 } from 'lucide-react';

import { INTERACTIONS_API_URL } from '@/setting/InteractionSetting';

const TOKEN_STORAGE_KEY = 'admin_interactions_token';

/**
 * 管理面板的接口地址
 *
 * 后台只在本地运行。本地 wrangler dev 没有 D1 线上数据、也没有 secrets，
 * 因此本地走 dev server 的同源代理 /api/admin-stats（next.config 中转发到线上
 * 互动服务），浏览器不触发跨域；非本地环境保持同源 /api/interactions/*。
 */
function resolveAdminStatsEndpoint(): string {
  if (typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)) {
    return '/api/admin-stats';
  }
  return `${INTERACTIONS_API_URL}/admin/stats`;
}

interface AdminStats {
  totalViews: number;
  subscribers: number;
  pages: Array<{ path: string; views: number }>;
  updatedAt: string;
}

/** /blogs/<slug>/ → 可读的 slug 标识 */
function pathToSlug(path: string): string {
  return path.replace(/^\/blogs\//, '').replace(/\/$/, '');
}

export default function ViewsPanel() {
  /** 输入框的值 */
  const [tokenInput, setTokenInput] = useState('');
  /** 已保存并生效的 token，仅它变化会触发加载 */
  const [savedToken, setSavedToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const fetchStats = useCallback(async (tokenValue: string) => {
    if (!tokenValue) {
      setError('请先填入 ADMIN_TOKEN（wrangler secret put ADMIN_TOKEN 设置的值）');
      return;
    }
    setLoading(true);
    setError(null);
    try {
        const response = await fetch(resolveAdminStatsEndpoint(), {
        headers: { Authorization: `Bearer ${tokenValue}` },
        signal: AbortSignal.timeout(8000),
      });
        if (response.status === 401) {
          setError('Token 不正确（对照 `wrangler secret put ADMIN_TOKEN` 时设置的值）');
          return;
        }
      if (!response.ok) {
        setError(`接口返回 ${response.status}`);
        return;
      }
      setStats((await response.json()) as AdminStats);
    } catch {
      setError('无法连接互动服务（本地请先启动 wrangler dev，线上检查 Worker 部署）');
    } finally {
      setLoading(false);
    }
  }, []);

  // 挂载后读取已保存的 token（避免 SSR 水合差异），有则自动加载一次
  useEffect(() => {
    let saved = '';
    try {
      saved = window.localStorage.getItem(TOKEN_STORAGE_KEY) || '';
    } catch {
      saved = '';
    }
    setTokenInput(saved);
    if (saved) setSavedToken(saved);
  }, []);

  useEffect(() => {
    if (savedToken !== null) void fetchStats(savedToken);
  }, [savedToken, fetchStats]);

  const handleSaveAndLoad = () => {
    const value = tokenInput.trim();
    if (!value) {
      setError('请先填入 ADMIN_TOKEN');
      return;
    }
    try {
      window.localStorage.setItem(TOKEN_STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setSavedToken(value);
  };

  const maxViews = stats?.pages?.[0]?.views ?? 0;

  return (
    <div className="space-y-4">
      {/* Token 输入行 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="password"
            value={tokenInput}
            onChange={(event) => setTokenInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && handleSaveAndLoad()}
            placeholder="ADMIN_TOKEN（互动服务的 Worker secret）"
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                       bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white
                       focus:outline-none focus:ring-2 focus:ring-[#66ccff]/40"
          />
        </div>
        <button
          type="button"
          onClick={handleSaveAndLoad}
          disabled={loading}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg
                     bg-[#66ccff] text-white text-sm font-medium transition-colors hover:bg-[#66ccff]/90
                     disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          加载统计
        </button>
      </div>

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
          <TriangleAlert className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          {error}
        </p>
      )}

      {stats && (
        <>
          {/* 总览 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                <Eye className="w-3.5 h-3.5" /> 总浏览量
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">
                {stats.totalViews.toLocaleString('zh-CN')}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">邮件订阅者</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">
                {stats.subscribers.toLocaleString('zh-CN')}
              </p>
            </div>
          </div>

          {/* 明细：按浏览量降序，比例条直观对比 */}
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {stats.pages.map((page, index) => (
              <div key={page.path} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-right text-gray-400 tabular-nums flex-shrink-0">{index + 1}</span>
                <span className="w-40 sm:w-56 truncate text-gray-700 dark:text-gray-300" title={page.path}>
                  {pathToSlug(page.path)}
                </span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#66ccff]"
                    style={{ width: maxViews > 0 ? `${Math.max(4, (page.views / maxViews) * 100)}%` : '0%' }}
                  />
                </div>
                <span className="w-12 text-right tabular-nums text-gray-600 dark:text-gray-400 flex-shrink-0">
                  {page.views.toLocaleString('zh-CN')}
                </span>
              </div>
            ))}
            {stats.pages.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                还没有任何浏览记录
              </p>
            )}
          </div>

          {stats.updatedAt && (
            <p className="text-[10px] text-gray-400">
              数据更新于 {new Date(stats.updatedAt).toLocaleString('zh-CN')}
            </p>
          )}
        </>
      )}
    </div>
  );
}
