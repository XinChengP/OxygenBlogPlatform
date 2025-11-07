"use client";

import React from 'react';
import ScrollToTop from '@/components/ScrollToTop';

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">博客设置</h1>
        <p className="text-muted-foreground">设置功能正在开发中...</p>
      </div>
      
      {/* 添加页面滚动导航组件 */}
      <ScrollToTop />
    </div>
  );
}