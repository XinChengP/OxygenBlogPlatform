import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ClipboardIcon } from '@heroicons/react/24/outline';
import { useTheme } from 'next-themes';

interface CodeBlockProps {
  language: string;
  code: string;
  displayLanguage?: string;
}

export default function CodeBlock({ language, code, displayLanguage }: CodeBlockProps) {
  const { theme } = useTheme();
  const [copied, setCopied] = React.useState(false);
  
  const syntaxTheme = theme === 'dark' ? oneDark : oneLight;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  
  return (
    <div className="code-block-container my-8 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-white dark:bg-gray-900">
      {/* 增强的头部 - 更明显的视觉层次 */}
      <div className="code-block-header flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 px-6 py-3 text-sm border-b-2 border-blue-200 dark:border-gray-600">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-400 rounded-full"></span>
            <span className="w-3 h-3 bg-yellow-400 rounded-full"></span>
            <span className="w-3 h-3 bg-green-400 rounded-full"></span>
          </div>
          <span className="language-label font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide text-xs">
            {displayLanguage || language || '代码'}
          </span>
        </div>
        <button 
          onClick={copyToClipboard}
          className={`copy-button flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 transform hover:scale-105 ${
            copied 
              ? 'bg-green-500 text-white shadow-md' 
              : 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md'
          }`} 
          title="复制代码"
        >
          <ClipboardIcon className="h-4 w-4" />
          <span className="copy-text font-medium">{copied ? '已复制!' : '复制代码'}</span>
        </button>
      </div>
      
      {/* 增强的代码主体 - 更高的对比度 */}
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
            borderRadius: 0
          }}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}