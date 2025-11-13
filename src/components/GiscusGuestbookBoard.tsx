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
      {/* 页面标题区域 */}
      <div className="text-center mb-12 relative">
        {/* 装饰性背景 */}
        <div className="absolute inset-0 -m-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 rounded-3xl"></div>
        <div className="absolute inset-0 -m-4 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 rounded-3xl"></div>
        
        <div className="relative bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-lg">
          {/* 图标 */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ChatBubbleLeftEllipsisIcon className="w-10 h-10 text-white" />
              </div>
              {/* 装饰性光环 */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 animate-pulse"></div>
            </div>
          </div>

          {/* 标题 */}
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            博客留言板
          </h1>
          
          {/* 描述 */}
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            欢迎留下您的想法、建议或任何想要分享的内容。每一句话都是对我们最大的鼓励！
          </p>

          {/* 装饰性分割线 */}
          <div className="flex items-center justify-center mt-6 space-x-2">
            <div className="w-12 h-0.5 bg-gradient-to-r from-transparent to-blue-400"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            <div className="w-16 h-0.5 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
            <div className="w-12 h-0.5 bg-gradient-to-l from-transparent to-purple-400"></div>
          </div>
        </div>
      </div>

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