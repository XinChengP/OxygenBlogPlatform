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
      {/* Giscus 评论区 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <GiscusComments 
          id={guestbookId}
          title="博客留言板"
        />
      </div>
    </div>
  );
}