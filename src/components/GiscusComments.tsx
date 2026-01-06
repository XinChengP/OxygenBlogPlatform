'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

interface GiscusCommentsProps {
  id: string;
  title?: string;
  // 新增：区分是博客文章还是留言板
  type?: 'blog' | 'guestbook';
}

export default function GiscusComments({ id, title, type = 'blog' }: GiscusCommentsProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const ref = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState(isDark ? 'dark_dimmed' : 'light');

  useEffect(() => {
    // 根据当前主题选择最合适的Giscus主题
    // 使用更匹配博客风格的深色主题
    const giscusTheme = isDark ? 'dark_high_contrast' : 'light';
    setTheme(giscusTheme);

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
    
    // 根据类型设置不同的映射方式
    if (type === 'guestbook') {
      // 留言板：使用固定的term，确保讨论帖唯一性
      script.setAttribute('data-term', 'guestbook');
      script.setAttribute('data-mapping', 'term');
    } else {
      // 博客文章：根据环境选择映射方式
      const isLocalhost = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
      
      const isGitHubPagesDefaultDomain = typeof window !== 'undefined' && 
        (window.location.hostname.includes('github.io') || window.location.hostname.includes('pages.dev'));
      
      const mapping = isLocalhost || isGitHubPagesDefaultDomain ? 'pathname' : 'url';
      script.setAttribute('data-mapping', mapping);
    }
    
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
      // 移除所有giscus脚本
      const giscusScripts = document.querySelectorAll('script[src*="giscus"]');
      giscusScripts.forEach(script => script.remove());
      
      // 移除添加的样式
      if (style && style.parentNode) {
        style.parentNode.removeChild(style);
      }
    };
  }, [isDark, type]);

  return (
    <div className={`giscus-container mt-8 transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      <div 
        ref={ref} 
        className="w-full"
      />
    </div>
  );
}