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
    setTheme(isDark ? 'dark_dimmed' : 'light');

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
    script.setAttribute('data-theme', theme);
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', 'true');

    if (ref.current) {
      ref.current.appendChild(script);
    }

    return () => {
      // 清理函数
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [theme]);

  return (
    <div className="giscus-container mt-8">
      <div ref={ref} className="w-full" />
    </div>
  );
}