'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

export default function GiscusTest() {
  const { theme, systemTheme } = useTheme();
  const giscusRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 获取当前主题
    const getCurrentTheme = () => {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      return currentTheme === 'dark' ? 'dark' : 'light';
    };

    // 创建 Giscus 脚本
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    // 设置 Giscus 配置
    script.setAttribute('data-repo', 'XinChengP/OxygenBlogPlatform');
    script.setAttribute('data-repo-id', 'R_kgDOQQbz2g');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDOQQbz2s4CxkZ6');
    script.setAttribute('data-mapping', 'pathname');
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', getCurrentTheme());
    script.setAttribute('data-lang', 'zh-CN');
    
    script.onload = () => {
      console.log('Giscus 测试页面加载完成');
    };
    
    script.onerror = (error) => {
      console.error('Giscus 测试页面加载失败:', error);
      if (giscusRef.current) {
        giscusRef.current.innerHTML = `
          <div class="text-red-500 p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <p class="font-semibold mb-2">评论加载失败</p>
            <p class="text-sm">错误信息: ${error}</p>
            <p class="text-sm mt-2">请检查以下设置：</p>
            <ul class="text-sm list-disc list-inside mt-2">
              <li>GitHub仓库是否为公开仓库</li>
              <li>是否安装了Giscus应用</li>
              <li>是否启用了Discussions功能</li>
            </ul>
          </div>
        `;
      }
    };
    
    if (giscusRef.current) {
      giscusRef.current.appendChild(script);
    }

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [theme, systemTheme]);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Giscus 评论系统测试</h1>
        
        <div className="mb-8 p-4 bg-card rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">配置信息</h2>
          <ul className="space-y-2">
            <li><strong>仓库:</strong> XinChengP/OxygenBlogPlatform</li>
            <li><strong>仓库ID:</strong> R_kgDOQQbz2g</li>
            <li><strong>分类ID:</strong> DIC_kwDOQQbz2s4CxkZ6</li>
            <li><strong>映射方式:</strong> pathname</li>
            <li><strong>语言:</strong> zh-CN</li>
          </ul>
        </div>
        
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">评论区</h2>
          <div ref={giscusRef} className="min-h-[200px]" />
        </div>
        
        <div className="mt-8 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">故障排除</h3>
          <p>如果评论区未正常显示，请检查：</p>
          <ol className="list-decimal list-inside mt-2 space-y-1">
            <li>GitHub仓库是否为公开仓库</li>
            <li>是否安装了Giscus应用 (<a href="https://github.com/apps/giscus" target="_blank" rel="noopener noreferrer" className="text-primary underline">检查安装状态</a>)</li>
            <li>是否启用了Discussions功能 (<a href="https://github.com/XinChengP/OxygenBlogPlatform/settings" target="_blank" rel="noopener noreferrer" className="text-primary underline">检查仓库设置</a>)</li>
            <li>浏览器控制台是否有错误信息</li>
          </ol>
        </div>
      </div>
    </div>
  );
}