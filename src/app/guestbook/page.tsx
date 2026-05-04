/**
 * 留言板页面
 * 使用与其他页面统一的布局风格：PageHeader + 内容区域
 */
'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';

// 动态导入大型组件
const LazyGiscusGuestbookBoard = lazy(() => import('@/components/GiscusGuestbookBoard'));

// 加载占位组件
function GuestbookSkeleton() {
  return (
    <div className="space-y-4">
      {/* 评论区占位 */}
      <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
    </div>
  );
}

export default function Guestbook() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // 主题颜色 - 使用天依蓝配色
  const primaryColor = '#66ccff';
  const accentColor = '#06b6d4';

  useEffect(() => {
    setMounted(true);
  }, [theme]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景装饰元素 - 添加柔和的渐变背景 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* 左上角装饰圆 */}
        <motion.div 
          className="absolute -top-20 -left-20 w-96 h-96 rounded-full opacity-30"
          style={{ 
            background: `radial-gradient(circle, ${primaryColor}40 0%, transparent 70%)`,
          }}
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.4, 0.3]
          }}
          transition={{ 
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        {/* 右下角装饰圆 */}
        <motion.div 
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ 
            background: `radial-gradient(circle, ${accentColor}40 0%, transparent 70%)`,
          }}
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.3, 0.2]
          }}
          transition={{ 
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-[80px] pb-16">
        {/* 页面标题 - 使用统一的 PageHeader 组件 */}
        <PageHeader
          title="留言板"
          description="欢迎留下您的想法和建议"
          size="lg"
          className="mb-12"
          gradientStyle="primary"
          showDivider
        />

        {/* 留言板主体 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Suspense fallback={<GuestbookSkeleton />}>
            <LazyGiscusGuestbookBoard />
          </Suspense>
        </motion.div>
      </div>
    </div>
  );
}
