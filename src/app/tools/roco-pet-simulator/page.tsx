'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import BackgroundLayer from '@/components/BackgroundLayer';
import PageHeader from '@/components/ui/PageHeader';
import RocoPetSimulator from '@/components/tools/RocoPetSimulator';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { trackToolView } from '@/components/Analytics';

export default function RocoPetSimulatorPage() {
  const { resolvedTheme } = useTheme();
  const { containerStyle } = useBackgroundStyle('tools');
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 页面浏览统计
  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => {
        trackToolView('洛克王国宠物模拟器', '其他');
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  // 如果组件未挂载，返回 null
  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark' : ''} ${containerStyle.className}`}
      style={containerStyle.style}
    >
      <BackgroundLayer />

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <PageHeader
          title="阵容搭配模拟器"
          description="会赢吗？"
          size="lg"
          className="mb-8"
        />

        {/* 模拟器组件 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <RocoPetSimulator />
        </motion.div>

        {/* 使用说明卡片 - 放在底部，风格与博客一致 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`mt-8 rounded-xl p-5 backdrop-blur-sm ${
            isDark
              ? 'bg-[var(--color-card)]/80 border border-[var(--color-border)]'
              : 'bg-white/80 border border-gray-200'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${isDark ? 'bg-[var(--color-primary)]/20' : 'bg-blue-100'}`}>
              <span className="text-xl">💡</span>
            </div>
            <div className="flex-1">
              <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-[var(--color-foreground)]' : 'text-gray-900'}`}>
                使用说明
              </h3>
              <ul className={`text-sm space-y-2 ${isDark ? 'text-[var(--color-muted-foreground)]' : 'text-gray-600'}`}>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-0.5">•</span>
                  <span>右键点击宠物可进行操作：加入/移出禁赛、加入/移出阵容、切换外观、选择血脉</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-0.5">•</span>
                  <span>阵容最多可容纳6只宠物，总魔力值不能超过16</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-0.5">•</span>
                  <span>部分宠物存在互斥关系，无法同时参赛</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--color-primary)] mt-0.5">•</span>
                  <span>所有设置会自动保存到本地</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>


      </div>
    </main>
  );
}
