'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

interface GiscusCommentsProps {
  id: string;
  title?: string;
}

export default function GiscusComments({ id, title }: GiscusCommentsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const ref = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState(isDark ? 'dark_dimmed' : 'light');

  useEffect(() => {
    // 根据当前主题选择最合适的Giscus主题
    // 使用更匹配博客风格的深色主题
    const giscusTheme = isDark ? 'dark_high_contrast' : 'light';
    setTheme(giscusTheme);

    // 如果已经存在giscus脚本，先移除
    const existingScript = document.querySelector('script[src*="giscus"]');
    if (existingScript) {
      existingScript.remove();
    }

    // 清空容器
    if (ref.current) {
      ref.current.innerHTML = '';
    }

    // 创建新的giscus脚本
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'XinChengP/OxygenBlogPlatform');
    script.setAttribute('data-repo-id', 'R_kgDOQQbz2g');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDOQQbz2s4CxkZ6');
    
    // 根据当前环境选择合适的映射方式
    // 本地开发环境使用pathname映射，避免PNA策略导致的CORS问题
    // 自定义域名使用url映射，确保不同域名下的讨论关联正确
    // GitHub Pages默认域名使用pathname映射，避免basePath导致的问题
    const isLocalhost = typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    
    const isGitHubPagesDefaultDomain = typeof window !== 'undefined' && 
      (window.location.hostname.includes('github.io') || window.location.hostname.includes('pages.dev'));
    
    const mapping = isLocalhost || isGitHubPagesDefaultDomain ? 'pathname' : 'url';
    script.setAttribute('data-mapping', mapping);
    
    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'bottom');
    script.setAttribute('data-theme', giscusTheme);
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', 'true');

    if (ref.current) {
      ref.current.appendChild(script);
    }

    // 添加样式以确保评论区与博客主题一致
    const style = document.createElement('style');
    style.innerHTML = `
      .giscus-frame {
        border-radius: 0.5rem;
        background-color: ${isDark ? 'var(--background)' : 'var(--background)'};
        border: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      // 清理函数
      if (existingScript) {
        existingScript.remove();
      }
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [isDark]);

  return (
    <div className={`giscus-container mt-8 transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <div 
        ref={ref} 
        className="w-full"
      />
    </div>
  );
}