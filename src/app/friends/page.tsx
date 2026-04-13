/**
 * 友情链接独立页面
 * 展示所有友情链接，使用统一的页面布局风格
 * 包含毛玻璃效果、主题色（天依蓝 #66ccff）和动画效果
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import { Globe, Link2 } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import FriendsLink from '@/components/FriendsLink';

/**
 * 友链页面组件
 * 使用与其他页面统一的布局风格：PageHeader + 主内容区
 * 复用 FriendsLink 组件展示友链列表
 */
export default function FriendsPage() {
  const { resolvedTheme } = useTheme();
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('friends');
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载，避免服务端渲染与客户端渲染不一致
  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

  // 天依蓝主题色
  const primaryColor = '#66ccff';

  // 毛玻璃样式函数 - 与其他页面保持一致
  const getGlassStyle = (baseStyle: string = '') => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };

  // 如果还没有挂载，显示加载占位避免闪烁
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
          title="友情链接"
          description="互联网上的朋友们，让我们一起在这个广阔的世界中相遇"
          size="lg"
          className="mb-8"
          gradientStyle="primary"
          icon={<Globe className="w-full h-full" />}
        />

        {/* 主内容区 */}
        <motion.main
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-8"
        >
          {/* 友链列表 - 复用 FriendsLink 组件 */}
          <FriendsLink />

          {/* 交换友链说明 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className={getGlassStyle("rounded-2xl p-6 border shadow-lg")}
          >
            <div className="flex items-center mb-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.7 }}
                className="w-10 h-10 rounded-lg flex items-center justify-center mr-3"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, #06b6d4 50%, ${primaryColor} 100%)`,
                  backgroundSize: '200% 200%',
                }}
              >
                <Link2 className="w-5 h-5 text-white" />
              </motion.div>
              <h3 className="text-xl font-semibold text-foreground">交换友链</h3>
            </div>
            <div className="text-muted-foreground leading-relaxed space-y-3">
              <p>
                如果你想与我交换友链，欢迎通过以下方式联系我：
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>网站名称和描述</li>
                <li>网站链接</li>
                <li>头像链接（可选）</li>
              </ul>
              <p className="text-sm text-muted-foreground/70 mt-4">
                注：请确保你的网站内容健康、积极向上，且能够正常访问。
              </p>
            </div>
          </motion.div>

          {/* 底部装饰 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="text-center py-8"
          >
            <p className="text-muted-foreground text-sm">
              &ldquo;海内存知己，天涯若比邻&rdquo;
            </p>
          </motion.div>
        </motion.main>
      </div>
    </div>
  );
}
