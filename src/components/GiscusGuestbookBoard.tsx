'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import GiscusComments from './GiscusComments';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline';

export default function GiscusGuestbookBoard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // 为留言板生成一个唯一的ID
  const guestbookId = 'guestbook-homepage';

  return (
    <div className="max-w-5xl mx-auto px-4 pb-12">
      {/* Giscus 评论区 */}
      <div className="relative">
        {/* 装饰性背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-gray-50/80 to-blue-50/80 dark:from-gray-800/80 dark:via-gray-900/80 dark:to-blue-900/20 rounded-2xl backdrop-blur-sm"></div>
        
        {/* 主容器 */}
        <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* 顶部装饰条 */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500"></div>
          
          {/* 内容区域 */}
          <div className="p-6 md:p-8">
            <GiscusComments 
              id={guestbookId}
              title="博客留言板"
            />
          </div>
        </div>

        {/* 底部装饰元素 */}
        <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-xl"></div>
        <div className="absolute -top-4 -left-4 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-pink-400/20 rounded-full blur-xl"></div>
      </div>

      {/* 底部提示文字 */}
      <div className="text-center mt-8">
        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center space-x-2">
          <span>✨</span>
          <span>每一句话都是珍贵的交流</span>
          <span>🌟</span>
        </p>
      </div>
    </div>
  );
}