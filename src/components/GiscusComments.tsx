'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

interface GiscusCommentsProps {
  // 不再需要 id 参数，因为我们使用 pathname 映射
}

/**
 * Giscus 评论组件
 * 
 * 基于 Giscus 的评论系统，使用 GitHub Discussions 作为后端
 * - 自动适配深色/浅色主题
 * - 使用 pathname 映射，每个页面有独立的评论
 * - 响应式布局
 */
export default function GiscusComments({}: GiscusCommentsProps) {
  const { theme, systemTheme } = useTheme();
  const giscusRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') return;

    // 获取当前主题
    const getCurrentTheme = () => {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      return currentTheme === 'dark' ? 'dark' : 'light';
    };

    // 确保 Giscus 脚本已加载
    const loadGiscus = async () => {
      try {
        // 如果已经初始化过，不再重复初始化
        if (isInitialized.current) return;
        
        // 添加调试信息
        console.log('开始加载 Giscus 评论系统');
        console.log('仓库配置:', {
          repo: 'XinChengP/OxygenBlogPlatform',
          repoId: 'R_kgDOQQbz2g',
          categoryId: 'DIC_kwDOQQbz2s4CxkZ6',
          mapping: 'pathname',
          theme: getCurrentTheme()
        });
        
        // 检查 Giscus 是否已经加载
        if (!(window as any).Giscus && !scriptRef.current) {
          // 动态加载 Giscus 脚本
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
            console.log('Giscus 评论加载完成');
            isInitialized.current = true;
          };
          
          script.onerror = (error) => {
            console.error('Giscus 脚本加载失败:', error);
            if (giscusRef.current) {
              giscusRef.current.innerHTML = `
                <div class="text-red-500 p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-900/20 dark:border-red-800">
                  <p class="font-semibold mb-2">评论加载失败</p>
                  <p class="text-sm mb-3">请按以下步骤检查和修复：</p>
                  <ol class="text-sm list-decimal list-inside space-y-2 mb-3">
                    <li><strong>确保仓库为公开仓库</strong>：访问 <a href="https://github.com/XinChengP/OxygenBlogPlatform/settings" target="_blank" rel="noopener noreferrer" class="text-primary underline">仓库设置</a>，确认仓库为公开状态</li>
                    <li><strong>安装Giscus应用</strong>：访问 <a href="https://github.com/apps/giscus" target="_blank" rel="noopener noreferrer" class="text-primary underline">Giscus应用页面</a>，点击"Install"并选择您的仓库</li>
                    <li><strong>启用Discussions功能</strong>：在仓库设置页面的"Features"部分，勾选"Discussions"选项</li>
                    <li><strong>创建讨论分类</strong>：在仓库的Discussions页面，创建一个名为"General"的分类（如果不存在）</li>
                  </ol>
                  <p class="text-sm">完成以上步骤后，刷新页面重试。如仍有问题，请查看浏览器控制台的详细错误信息。</p>
                </div>
              `;
            }
          };
          
          scriptRef.current = script;
          document.head.appendChild(script);
        } else if ((window as any).Giscus) {
          isInitialized.current = true;
        }
      } catch (error) {
        console.error('Giscus 初始化失败:', error);
      }
    };

    // 延迟加载，确保 DOM 已准备好
    const timer = setTimeout(() => {
      loadGiscus();
      
      // 添加额外的检查，如果5秒后仍未加载成功，显示错误信息
      const checkTimer = setTimeout(() => {
        if (!isInitialized.current && giscusRef.current) {
          console.warn('Giscus 初始化超时');
          giscusRef.current.innerHTML = `
            <div class="text-yellow-600 p-4 border border-yellow-200 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
              <p class="font-semibold mb-2">评论加载超时</p>
              <p class="text-sm mb-3">可能的原因和解决方案：</p>
              <ol class="text-sm list-decimal list-inside space-y-2 mb-3">
                <li><strong>网络连接问题</strong>：检查网络连接，尝试刷新页面</li>
                <li><strong>GitHub仓库配置不正确</strong>：确认仓库为公开状态，已安装Giscus应用，并启用Discussions功能</li>
                <li><strong>浏览器阻止了脚本加载</strong>：检查浏览器设置，允许加载第三方脚本</li>
                <li><strong>广告拦截器</strong>：暂时禁用广告拦截器，然后刷新页面</li>
              </ol>
              <p class="text-sm">请打开浏览器控制台(F12)查看详细错误信息，或访问 <a href="/test/giscus" class="text-primary underline">测试页面</a> 进行进一步诊断。</p>
            </div>
          `;
        }
      }, 5000);
      
      return () => clearTimeout(checkTimer);
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [theme, systemTheme]);

  // 主题变化时重新渲染 Giscus
  useEffect(() => {
    if (isInitialized.current && (window as any).Giscus) {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      const giscusTheme = currentTheme === 'dark' ? 'dark' : 'light';
      
      // 发送主题变化消息到 Giscus iframe
      const iframe = document.querySelector('iframe.giscus-frame') as HTMLIFrameElement;
      if (iframe) {
        iframe.contentWindow?.postMessage(
          { giscus: { setConfig: { theme: giscusTheme } } },
          'https://giscus.app'
        );
      }
    }
  }, [theme, systemTheme]);

  return (
    <div className="mt-12">
      <div className="bg-card rounded-lg shadow-sm p-6 md:p-8">
        <h3 className="text-xl font-semibold mb-6 text-foreground">评论</h3>
        <div 
          ref={giscusRef}
          className="giscus-container"
          style={{
            minHeight: '200px'
          }}
        />
      </div>
    </div>
  );
}