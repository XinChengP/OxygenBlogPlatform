/**
 * 相关链接独立页面 - 优化版本
 * 展示本站参考的资源链接，支持分类筛选、搜索、视图切换
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link2, Sparkles } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import RelatedLinks from '@/components/RelatedLinks';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

/**
 * 相关链接页面组件
 * 独立展示相关链接资源，使用统一的页面布局风格
 */
export default function LinksPage() {
  const { containerStyle } = useBackgroundStyle('about');
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载，避免服务端渲染与客户端渲染不一致
  useEffect(() => {
    setMounted(true);
  }, []);

  // 如果还没有挂载，显示默认样式避免闪烁
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 pt-[80px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* 页面标题 - 使用统一的 PageHeader 组件 */}
        <PageHeader
          title="相关链接"
          description="本站参考的资源"
          size="lg"
          className="mb-8"
          gradientStyle="primary"
        />

        {/* 主内容区 - 相关链接展示 */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <RelatedLinks />
        </motion.main>
      </div>
    </div>
  );
}
