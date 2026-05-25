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
  const [showInstructions, setShowInstructions] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 检查是否首次访问，显示使用说明弹窗
  useEffect(() => {
    if (mounted) {
      const hasSeenInstructions = localStorage.getItem('roco-simulator-instructions-seen');
      if (!hasSeenInstructions) {
        setShowInstructions(true);
        localStorage.setItem('roco-simulator-instructions-seen', 'true');
      }
    }
  }, [mounted]);

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

        {/* 使用说明弹窗 */}
        {showInstructions && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowInstructions(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`rounded-xl p-6 max-w-md w-full backdrop-blur-sm ${
                isDark
                  ? 'bg-[var(--color-card)]/95 border border-[var(--color-border)]'
                  : 'bg-white/95 border border-gray-200'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <div>
                <h3 className={`text-lg font-semibold mb-3 ${isDark ? 'text-[var(--color-foreground)]' : 'text-gray-900'}`}>
                  使用说明
                </h3>
                  <ul className={`text-sm space-y-2 ${isDark ? 'text-[var(--color-muted-foreground)]' : 'text-gray-600'}`}>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-primary)] mt-0.5">•</span>
                      <span>点击宠物头像添加到阵容，再次点击从阵容中移除</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-primary)] mt-0.5">•</span>
                      <span>右键点击宠物可进行操作：加入/移出禁赛、切换外观、选择血脉</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[var(--color-primary)] mt-0.5">•</span>
                      <span>在阵容放大视图中，可拖拽宠物图标调整位置顺序</span>
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
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowInstructions(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDark
                      ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary)]/80 text-white'
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  我知道了
                </button>
              </div>
            </motion.div>
          </div>
        )}


      </div>
    </main>
  );
}
