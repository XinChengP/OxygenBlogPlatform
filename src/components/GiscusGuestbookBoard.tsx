'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';
import GiscusComments from './GiscusComments';

export default function GiscusGuestbookBoard() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // 为留言板生成一个唯一的ID
  const guestbookId = 'guestbook-homepage';

  return (
    <div className="max-w-4xl mx-auto px-4 pb-8">
      {/* 留言板说明 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            博客留言板
          </h2>
        </div>
        
        <div className="text-gray-600 dark:text-gray-300 space-y-2">
          <p>
            欢迎在下方留言！这里使用了基于 GitHub Discussions 的 
            <a 
              href="https://giscus.app/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline mx-1"
            >
              Giscus
            </a>
            评论系统。
          </p>
          
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">使用说明：</p>
                <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                  <li>需要 GitHub 账号登录后即可留言</li>
                  <li>所有留言将保存在 GitHub Discussions 中，全球可见</li>
                  <li>支持 Markdown 格式和表情符号</li>
                  <li>支持回复和点赞功能</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Giscus 评论区 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
          <div className="flex items-center text-white">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <h3 className="text-lg font-medium">全球留言板</h3>
          </div>
        </div>
        
        <div className="p-6">
          <GiscusComments 
            id={guestbookId}
            title="博客留言板"
          />
        </div>
      </div>

      {/* 功能特性展示 */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white">全球可见</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            基于 GitHub Discussions，所有留言全球用户可见
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white">功能丰富</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            支持 Markdown、表情、回复、点赞等完整功能
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center mb-2">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white">安全可靠</h4>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            基于 GitHub 生态，数据安全且永久保存
          </p>
        </div>
      </div>

      {/* GitHub 链接 */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          留言板基于 
          <a 
            href="https://github.com/XinChengP/OxygenBlogPlatform" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline mx-1"
          >
            OxygenBlogPlatform
          </a>
          项目构建
        </p>
      </div>
    </div>
  );
}