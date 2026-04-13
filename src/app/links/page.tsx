/**
 * 相关链接独立页面
 * 展示本站参考的资源链接
 * 使用与其他页面统一的布局风格：PageHeader + 主内容区
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Link2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import RelatedLinks from '@/components/RelatedLinks';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

/**
 * 相关链接页面组件
 * 独立展示相关链接资源，使用统一的页面布局风格
 */
export default function LinksPage() {
  const { resolvedTheme } = useTheme();
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('about');
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载，避免服务端渲染与客户端渲染不一致
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  // 主题颜色配置 - 使用天依蓝 #66ccff 作为主色调
  const primaryColor = '#66ccff';

  // 毛玻璃样式函数 - 与其他页面保持一致
  const getGlassStyle = (baseStyle: string = '') => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };

  // 如果还没有挂载，显示默认样式避免闪烁
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 pt-[65px]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 - 使用统一的 PageHeader 组件 */}
        <PageHeader
          title="相关链接"
          description="本站参考的资源"
          size="lg"
          className="mb-8"
          gradientStyle="primary"
          icon={<Link2 className="w-full h-full" />}
        />

        {/* 主内容区 - 相关链接展示 */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          {/* 相关链接组件 - 复用现有组件 */}
          <RelatedLinks />

          {/* 底部装饰性说明 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className={getGlassStyle("rounded-2xl p-6 border shadow-lg mt-8 text-center")}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.9 }}
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background: `linear-gradient(135deg, ${primaryColor} 0%, #06b6d4 100%)`,
              }}
            >
              <span className="text-white text-xl">💡</span>
            </motion.div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              友情链接
            </h3>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              如果您希望交换友情链接，欢迎通过留言板或邮件联系我。
              本站欢迎与洛天依、技术博客、个人创作等相关网站的友链交换。
            </p>
          </motion.div>
        </motion.main>
      </div>
    </div>
  );
}
