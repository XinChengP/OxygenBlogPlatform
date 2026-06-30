'use client';

import { useEffect, useRef } from 'react';

interface GiscusCommentsProps {
  id: string;
  title?: string;
  type?: 'blog' | 'guestbook';
}

export default function GiscusComments({ id, title, type = 'blog' }: GiscusCommentsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // 清理上一次的脚本（仅清理本实例添加的）
    if (scriptRef.current && scriptRef.current.parentNode) {
      scriptRef.current.parentNode.removeChild(scriptRef.current);
    }
    ref.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';
    script.setAttribute('data-repo', 'XinChengP/OxygenBlogPlatform');
    script.setAttribute('data-repo-id', 'R_kgDOQQbz2g');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDOQQbz2s4CxkZ6');
    script.setAttribute('data-id', id);

    if (type === 'guestbook') {
      script.setAttribute('data-term', 'guestbook');
      script.setAttribute('data-mapping', 'specific');
    } else {
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

    ref.current.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (scriptRef.current && scriptRef.current.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
        scriptRef.current = null;
      }
    };
  }, [id, type]);

  return (
    <div className="w-full">
      <div ref={ref} className="w-full" />
    </div>
  );
}
