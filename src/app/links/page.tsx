'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PageHeader from '@/components/ui/PageHeader';
import RelatedLinks from '@/components/RelatedLinks';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

export default function LinksPage() {
  const { containerStyle } = useBackgroundStyle('about');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 未挂载时的骨架占位：使用与主渲染相同的容器样式（containerStyle），
  // 避免硬编码渐变背景导致挂载前后背景跳变；圆角统一为 rounded-xl
  if (!mounted) {
    return (
      <div className={containerStyle.className} style={containerStyle.style}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <div className="animate-pulse space-y-8">
            <div className="h-32 bg-muted rounded-xl"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-40 bg-muted rounded-xl"></div>
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
        <PageHeader
          title="相关链接"
          description="本站参考的资源"
          size="lg"
          className="mb-12"
          gradientStyle="primary"
          showDivider
        />

        <motion.main
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <RelatedLinks />
        </motion.main>
      </div>
    </div>
  );
}
