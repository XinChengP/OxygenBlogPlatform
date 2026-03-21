'use client';

import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import CodeCopyButton from '@/components/CodeCopyButton';

interface CodeBlockProps {
  language: string;
  code: string;
  displayLanguage?: string;
  /**
   * 是否显示复制按钮
   * @default true
   */
  showCopyButton?: boolean;
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 获取语言的显示名称
 * 将技术语言标识符转换为友好的显示名称
 * 
 * @param lang - 语言标识符
 * @returns 友好的语言名称
 */
const getLanguageDisplayName = (lang: string): string => {
  const languageMap: Record<string, string> = {
    'js': 'JavaScript',
    'ts': 'TypeScript',
    'jsx': 'JSX',
    'tsx': 'TSX',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'go': 'Go',
    'rs': 'Rust',
    'rb': 'Ruby',
    'php': 'PHP',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'scala': 'Scala',
    'r': 'R',
    'sql': 'SQL',
    'sh': 'Shell',
    'bash': 'Bash',
    'ps1': 'PowerShell',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'sass': 'Sass',
    'less': 'Less',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML',
    'toml': 'TOML',
    'ini': 'INI',
    'md': 'Markdown',
    'dockerfile': 'Dockerfile',
    'docker': 'Docker',
    'vue': 'Vue',
    'svelte': 'Svelte',
    'angular': 'Angular',
  };

  return languageMap[lang.toLowerCase()] || lang.toUpperCase() || '代码';
};

/**
 * 代码块组件 - 增强版
 * 
 * 功能特性：
 * 1. 语法高亮显示
 * 2. 一键复制代码功能
 * 3. 自动适配深色/浅色主题
 * 4. 显示编程语言标签
 * 5. 美观的视觉效果
 * 
 * @param props - 组件属性
 * @returns 代码块组件
 */
export default function CodeBlock({
  language,
  code,
  displayLanguage,
  showCopyButton = true,
  className = '',
}: CodeBlockProps) {
  const { theme } = useTheme();

  const syntaxTheme = theme === 'dark' ? oneDark : oneLight;

  return (
    <div className={`
      code-block-container 
      my-8 
      rounded-xl 
      border-2 
      border-gray-200 dark:border-gray-700 
      shadow-lg hover:shadow-xl 
      transition-all duration-300 
      overflow-hidden 
      bg-white dark:bg-gray-900
      ${className}
    `}>
      {/* 增强的头部 - 包含语言标签和复制按钮 */}
      <div className="
        code-block-header 
        flex justify-between items-center 
        bg-gradient-to-r from-[#66ccff]/10 to-[#66ccff]/20 
        dark:from-gray-800 dark:to-gray-700 
        px-6 py-3 
        text-sm 
        border-b-2 border-[#66ccff] dark:border-gray-600
      ">
        {/* 左侧：装饰圆点和语言标签 */}
        <div className="flex items-center gap-3">
          {/* 装饰性圆点 */}
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-400 rounded-full" />
            <span className="w-3 h-3 bg-yellow-400 rounded-full" />
            <span className="w-3 h-3 bg-green-400 rounded-full" />
          </div>
          
          {/* 语言标签 */}
          <span className="
            language-label 
            font-semibold 
            text-[#66ccff] dark:text-[#66ccff] 
            uppercase tracking-wide text-xs
          ">
            {displayLanguage || getLanguageDisplayName(language) || '代码'}
          </span>
        </div>

        {/* 右侧：复制按钮 */}
        {showCopyButton && (
          <CodeCopyButton 
            code={code} 
            size="sm"
            className="bg-white/50 dark:bg-black/20 hover:bg-white dark:hover:bg-black/30"
          />
        )}
      </div>

      {/* 代码主体 */}
      <div className="code-block-body">
        <SyntaxHighlighter
          style={syntaxTheme}
          language={language || 'text'}
          PreTag="div"
          className="syntax-highlighter !m-0 !p-6 !bg-gray-50 dark:!bg-gray-950 !text-sm leading-relaxed"
          customStyle={{
            margin: 0,
            padding: '1.5rem',
            fontSize: '0.875rem',
            lineHeight: '1.7',
            backgroundColor: theme === 'dark' ? '#0a0a0a' : '#fafafa',
            borderRadius: 0,
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}
