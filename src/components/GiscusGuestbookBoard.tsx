'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';
import GiscusComments from './GiscusComments';

export default function GiscusGuestbookBoard() {
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
          {/*
            区域标题
            评论区目前只有一块内容，直接铺开会让读者一时看不出这里是做什么的。
            用一个小标题 + 一句说明先给出预期，再进入评论内容。
            同时这个标题与首屏的 PageHeader 构成 h1 → h2 的层级关系，便于屏幕阅读器跳读。
          */}
          <div className="flex items-center gap-2.5 mb-5">
            <MessageSquare className="w-5 h-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-foreground">留言区</h2>
            {/*
              说明文字必须与实际规则一致：
              本站评论基于 GitHub Discussions，必须使用 GitHub 账号登录后才能发言，
              并不支持匿名留言。若写成「无需注册」会误导读者。
            */}
            <span className="text-sm text-muted-foreground">
              （使用 GitHub 账号登录后即可留言）
            </span>
          </div>

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
