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
    script.setAttribute('data-mapping', 'pathname');
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