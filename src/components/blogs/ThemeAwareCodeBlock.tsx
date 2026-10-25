'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CollapsibleCodeBlock from '@/components/blogs/CollapsibleCodeBlock';

interface ThemeAwareCodeBlockProps {
  code: string;
  /** 传给高亮器的语言标识（已归一化） */
  language: string;
  /** 头部展示的语言名称 */
  displayName: string;
}

/**
 * 主题自适应代码块
 *
 * 正文在服务端构建期渲染，服务端无法得知访客主题，
 * 因此由这个客户端组件在挂载后通过 next-themes 决定高亮配色。
 * 注意：next-themes 在客户端首次渲染时会同步读取 localStorage，
 * 若直接使用 resolvedTheme，服务端（亮色）与水合首帧（暗色）的
 * 内联样式会不一致并触发 hydration mismatch。
 * 所以首帧固定使用与服务端一致的亮色主题，挂载完成后再切换。
 */
export default function ThemeAwareCodeBlock({
  code,
  language,
  displayName,
}: ThemeAwareCodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const syntaxTheme = mounted && resolvedTheme === 'dark' ? oneDark : oneLight;

  return (
    <CollapsibleCodeBlock
      code={code}
      language={language}
      displayName={displayName}
      syntaxTheme={syntaxTheme}
    />
  );
}
