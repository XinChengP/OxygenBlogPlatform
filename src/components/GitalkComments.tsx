'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

interface GitalkCommentsProps {
  id: string; // 页面的唯一标识符，通常使用文章的 slug 或路径
  title?: string; // 页面标题，用于 GitHub Issue 的标题
  proxy?: string; // 自定义代理服务器，用于解决跨域问题
}

/**
 * Gitalk 评论组件
 * 
 * 基于 Gitalk 的评论系统，使用 GitHub Issue 作为后端
 * - 自动适配深色/浅色主题
 * - 根据页面 ID 区分不同页面的评论
 * - 响应式布局
 * 
 * @param id - 页面的唯一标识符
 * @param title - 页面标题（可选）
 * @returns JSX 元素
 */
export default function GitalkComments({ id, title, proxy }: GitalkCommentsProps) {
  const { theme, systemTheme } = useTheme();
  const gitalkRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') return;

    // 确保 Gitalk 脚本已加载
    const loadGitalk = async () => {
      try {
        // 如果已经初始化过，不再重复初始化
        if (isInitialized.current) return;
        
        // 检查 Gitalk 是否已经加载
        if (!(window as any).Gitalk) {
          // 动态加载 Gitalk 脚本
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/gitalk@latest/dist/gitalk.min.js';
          script.async = true;
          
          // 动态加载 Gitalk CSS
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/gitalk@latest/dist/gitalk.css';
          document.head.appendChild(link);
          
          script.onload = () => {
            // 脚本加载完成后初始化 Gitalk
            initGitalk();
          };
          
          script.onerror = () => {
            console.error('Gitalk 脚本加载失败');
            if (gitalkRef.current) {
              gitalkRef.current.innerHTML = '<div class="text-red-500">评论加载失败，请刷新页面重试</div>';
            }
          };
          
          document.head.appendChild(script);
        } else {
          // Gitalk 已经加载，直接初始化
          initGitalk();
        }
      } catch (error) {
        console.error('Gitalk 初始化失败:', error);
      }
    };

    // 初始化 Gitalk
    const initGitalk = () => {
      console.log('初始化 Gitalk, 容器ID:', id);
      
      if (!(window as any).Gitalk) {
        console.error('Gitalk 未加载');
        return;
      }
      
      if (!gitalkRef.current) {
        console.error('Gitalk 容器不存在');
        return;
      }
      
      try {
        // 获取当前主题
        const currentTheme = theme === 'system' ? systemTheme : theme;
        const gitalkTheme = currentTheme === 'dark' ? 'dark' : 'light';
        
        // 创建 Gitalk 实例
        const gitalkConfig = {
          clientID: 'Ov23limpQmaxtJEpMq7F',
          clientSecret: '1c2b5d7313a2cb63a1671812c42e0d4c18bb6960',
          repo: 'OxygenBlogPlatform', // GitHub 仓库名
          owner: 'XinChengP', // GitHub 用户名
          admin: ['XinChengP'], // GitHub 用户名数组
          id: id || location.pathname, // 页面的唯一标识
          title: title || document.title, // GitHub Issue 的标题
          body: location.href, // GitHub Issue 的内容
          language: 'zh-CN', // 语言
          labels: ['Gitalk'], // GitHub Issue 的标签
          perPage: 10, // 每页评论数
          pagerDirection: 'last', // 评论排序方式
          createIssueManually: false, // 是否手动创建 Issue
          distractionFreeMode: false, // 无干扰模式
          proxy: proxy || 'https://your-vercel-app.vercel.app/proxy/login/oauth/access_token', // 代理服务器，解决跨域问题
          enableHotKey: true, // 启用快捷键
          theme: gitalkTheme // 主题
        };
        
        console.log('Gitalk 配置:', gitalkConfig);
        
        // 创建 Gitalk 实例
        const gitalk = new (window as any).Gitalk(gitalkConfig);
        
        // 渲染 Gitalk
        try {
          gitalk.render('gitalk-container');
          isInitialized.current = true;
          console.log('Gitalk 初始化成功');
        } catch (error) {
          console.error('Gitalk 渲染失败:', error);
          if (gitalkRef.current) {
            gitalkRef.current.innerHTML = '<div class="text-red-500">评论系统渲染失败，请稍后再试</div>';
          }
        }
      } catch (error) {
        console.error('Gitalk 初始化异常:', error);
        if (gitalkRef.current) {
          gitalkRef.current.innerHTML = '<div class="text-red-500">评论系统初始化失败，请稍后再试</div>';
        }
      }
    };

    // 延迟加载，确保 DOM 已准备好
    const timer = setTimeout(() => {
      loadGitalk();
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [id, title]);

  // 主题变化时重新渲染 Gitalk
  useEffect(() => {
    if (isInitialized.current) {
      const currentTheme = theme === 'system' ? systemTheme : theme;
      const gitalkTheme = currentTheme === 'dark' ? 'dark' : 'light';
      
      // 尝试重新渲染 Gitalk 以应用新主题
      const gitalkContainer = document.querySelector('.gt-container') as HTMLElement;
      if (gitalkContainer) {
        // 重新渲染 Gitalk
        gitalkContainer.setAttribute('data-theme', gitalkTheme);
      }
    }
  }, [theme, systemTheme]);

  return (
    <div className="mt-12">
      <div className="bg-card rounded-lg shadow-sm p-6 md:p-8">
        <h3 className="text-xl font-semibold mb-6 text-foreground">评论</h3>
        <div 
          ref={gitalkRef}
          id="gitalk-container" 
          className="gitalk-container"
          style={{
            minHeight: '200px'
          }}
        />
      </div>
    </div>
  );
}