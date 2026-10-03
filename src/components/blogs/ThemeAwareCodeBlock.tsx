'use client';

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
 * 因此由这个客户端组件在水合时通过 next-themes 决定高亮配色。
 * SSG 阶段与水合前一律使用亮色主题，与原 ClientBlogDetail
 * 的 mounted 前默认值保持一致。
 */
export default function ThemeAwareCodeBlock({
  code,
  language,
  displayName,
}: ThemeAwareCodeBlockProps) {
  const { resolvedTheme } = useTheme();
  const syntaxTheme = resolvedTheme === 'dark' ? oneDark : oneLight;

  return (
    <CollapsibleCodeBlock
      code={code}
      language={language}
      displayName={displayName}
      syntaxTheme={syntaxTheme}
    />
  );
}
