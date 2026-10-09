/**
 * 外部链接跳转提醒 - 独立页面
 *
 * 访问方式：/redirect?url=<目标链接>
 * 用途：
 * 1. 作为外链中转页，任何外部链接都可指向本页，由本页统一展示安全提示；
 * 2. 便于直接分享/测试提醒页面效果。
 *
 * 说明：使用 window.location.search 解析参数而非 useSearchParams，
 * 兼容静态导出（GitHub Pages）场景，避免需要 Suspense 边界导致的构建问题。
 *
 * @author 歆橙
 */

'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import RedirectNotice from '@/components/security/RedirectNotice';
import PageHeader from '@/components/ui/PageHeader';
import { Live2DMessageHelper } from '@/utils/live2dMessageManager';

export default function RedirectPage() {
  const [targetUrl, setTargetUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // 挂载后解析查询参数，避免服务端与客户端渲染不一致
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const url = params.get('url') || params.get('target') || '';
      setTargetUrl(url.trim());
    } catch {
      setTargetUrl('');
    }
    setReady(true);
    // 看板娘提示：即将离开本站
    Live2DMessageHelper.showExternalLinkMessage('BLOCKED');
  }, []);

  // 返回上一页：优先 history.back()，无历史记录则回首页
  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  // 继续访问：新窗口（新标签页）打开目标链接
  // 安全校验：仅允许 http/https 协议（目标来自查询参数，用户可控），
  // 防止 javascript: 等危险协议被注入执行
  const handleContinue = () => {
    let target: string | null = null;
    try {
      if (targetUrl && /^https?:$/i.test(new URL(targetUrl).protocol)) {
        target = targetUrl;
      }
    } catch {
      target = null;
    }
    if (target) {
      // 新标签页打开目标链接（点击事件内调用，不会被弹窗拦截器拦截）
      window.open(target, '_blank', 'noopener,noreferrer');
      Live2DMessageHelper.showExternalLinkMessage('CONTINUE');
    } else {
      // 未提供有效目标链接时回首页
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* 页面标题 */}
        <PageHeader
          title="链接跳转提醒"
          description="别急着跑，先看清要去哪儿，确认安全再出发～"
          size="lg"
          className="mb-10"
          gradientStyle="primary"
          showDivider
        />

        {/* 提醒卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {ready &&
            (targetUrl ? (
              <RedirectNotice
                url={targetUrl}
                variant="page"
                onContinue={handleContinue}
                onBack={handleBack}
              />
            ) : (
              <RedirectNotice
                url="（未提供目标链接）"
                variant="page"
                onBack={handleBack}
                onContinue={handleContinue}
              />
            ))}
        </motion.div>
      </div>
    </div>
  );
}
