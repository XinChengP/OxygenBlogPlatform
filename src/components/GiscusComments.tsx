'use client';

import { useEffect, useRef } from 'react';

interface GiscusCommentsProps {
  id: string;
  title?: string;
  type?: 'blog' | 'guestbook';
}

export default function GiscusComments({ id, title, type = 'blog' }: GiscusCommentsProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 清空容器
    if (ref.current) {
      ref.current.innerHTML = '';
    }

    // 创建giscus脚本
    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'XinChengP/OxygenBlogPlatform');
    script.setAttribute('data-repo-id', 'R_kgDOQQbz2g');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDOQQbz2s4CxkZ6');

    // 根据类型设置映射方式
    if (type === 'guestbook') {
      // 留言板：使用固定term确保唯一性
      script.setAttribute('data-term', 'guestbook');
      script.setAttribute('data-mapping', 'specific');
    } else {
      // 博客文章：使用pathname映射
      script.setAttribute('data-mapping', 'pathname');
    }

    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    script.setAttribute('data-theme', 'preferred_color_scheme');
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', 'true');

    if (ref.current) {
      ref.current.appendChild(script);
    }

    return () => {
      // 清理giscus脚本
      const giscusScripts = document.querySelectorAll('script[src*="giscus"]');
      giscusScripts.forEach(script => script.remove());
    };
  }, [type]);

  return (
    <div className="w-full">
      <div ref={ref} className="w-full" />
    </div>
  );
}
