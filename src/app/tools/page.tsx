/**
 * 小工具页面
 * 预留的工具页面，目前为空壳
 */
'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';
import ScrollToTop from '@/components/ScrollToTop';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

export default function ToolsPage() {
  const { resolvedTheme } = useTheme();
  const { containerStyle } = useBackgroundStyle('tools');
  const [mounted, setMounted] = useState(false);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
  }, []);

  // 如果组件未挂载，显示占位符
  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <main 
      className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark' : ''} ${containerStyle.className}`}
      style={containerStyle.style}
    >
      <div className="container mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className={`text-4xl font-bold mb-8 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            小工具
          </h1>
          
          <div className={`max-w-2xl mx-auto p-8 rounded-lg ${
            isDark ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50/80 border-gray-200'
          } border backdrop-blur-sm`}>
            <p className={`text-lg ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              此页面为小工具模块的预留位置，暂未添加任何功能。
            </p>
          </div>
        </motion.div>
      </div>
      
      <ScrollToTop />
    </main>
  );
}