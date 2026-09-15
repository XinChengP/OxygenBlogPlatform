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

/**
 * 加载占位组件
 *
 * 骨架的作用是让「加载中」与「加载完成」两种状态的高度尽量接近，
 * 避免评论区出现时把页面内容整体顶下去。
 * 原实现是一个固定 h-96 的空白灰块，与实际评论高度差距明显，
 * 且灰块形状与「卡片 + 标题 + 输入框」的真实结构毫无关联，观感像页面出错。
 * 这里改为按真实结构分块：外层卡片留出内边距，内部依次模拟标题行、输入框、若干条评论。
 */
function GuestbookSkeleton() {
  return (
    <div className="w-full">
      {/*
        卡片外壳：圆角、底色、描边、阴影必须与真实卡片（GiscusGuestbookBoard）逐项对齐，
        否则加载完成的一瞬间，卡片外形会发生可见的变化，像是页面重排了一下。
        这里同样使用语义令牌 bg-card/60 + border-border/40，而非硬编码灰阶。
      */}
      <div className="relative bg-card/60 backdrop-blur-sm rounded-2xl shadow-sm border border-border/40 overflow-hidden">
        {/* 顶部渐变装饰条：与真实卡片一一对应 */}
        <div
          className="h-1.5 w-full"
          style={{
            background: 'linear-gradient(90deg, #66ccff 0%, #06b6d4 50%, #1e40af 100%)'
          }}
        />

        <div className="p-6 md:p-8">
          {/* 标题行占位：宽度与真实标题「留言区」+ 说明文字的量级接近 */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-5 h-5 rounded bg-muted animate-pulse" />
            <div className="w-16 h-6 rounded bg-muted animate-pulse" />
          </div>

          {/* 评论输入框占位：Giscus 将输入框置于顶部 */}
          <div className="h-24 rounded-xl bg-muted/60 animate-pulse mb-6" />

          {/* 评论条目占位：三条足以覆盖常见留言量，高度接近真实列表 */}
          <div className="space-y-4">
            {[0, 1, 2].map((index) => (
              <div key={index} className="flex gap-3">
                {/* 头像 */}
                <div className="w-9 h-9 rounded-full bg-muted animate-pulse flex-shrink-0" />
                {/* 昵称与正文 */}
                <div className="flex-1 space-y-2">
                  <div className="w-24 h-4 rounded bg-muted animate-pulse" />
                  <div className="w-full h-4 rounded bg-muted/60 animate-pulse" />
                  <div className="w-3/5 h-4 rounded bg-muted/60 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
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
          description="留下点什么吧awa"
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
