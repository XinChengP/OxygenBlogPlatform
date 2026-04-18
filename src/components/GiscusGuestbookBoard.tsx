'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import GiscusComments from './GiscusComments';

export default function GiscusGuestbookBoard() {
  const { resolvedTheme } = useTheme();

  // 为留言板生成一个唯一的ID
  const guestbookId = 'guestbook-homepage';

  return (
    // 留言板容器
    <div className="w-full">
      {/* 主卡片 */}
      <motion.div 
        className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-3xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* 顶部渐变装饰条 */}
        <div 
          className="h-1.5 w-full"
          style={{ 
            background: 'linear-gradient(90deg, #66ccff 0%, #06b6d4 50%, #1e40af 100%)' 
          }}
        />

        {/* 内容区域 */}
        <div className="p-6 md:p-8">
          {/* Giscus 评论区 */}
          <div className="relative">
            <GiscusComments 
              id={guestbookId}
              title="博客留言板"
              type="guestbook"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
