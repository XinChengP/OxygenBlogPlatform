'use client';

import React from 'react';

export default function TestFontPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-foreground">
          测试字体 - 洛天依主题博客
        </h1>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">标题测试</h2>
          <h3 className="text-xl font-medium">副标题测试</h3>
          <p className="text-base">正文测试 - 这是使用 YueLuoShiZhang 字体的文本内容</p>
          <p className="text-sm">小字体测试 - 洛天依の个人博客</p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">中英文混合测试</h2>
          <p className="text-base">Hello World - 你好世界 - 洛天依の个人博客</p>
          <p className="text-base">技术分享 · 生活感悟 · 学习笔记 - Tianyi Blog</p>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">数字和符号测试</h2>
          <p className="text-base">1234567890 - !@#$%^&*()_+-=[]{}|;&apos;:&quot;,./&lt;&gt;?</p>
          <p className="text-base">2024年12月19日 - Version 1.0.0</p>
        </div>
      </div>
    </div>
  );
}