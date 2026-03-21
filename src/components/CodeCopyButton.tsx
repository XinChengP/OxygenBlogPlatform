'use client';

import React, { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline';

interface CodeCopyButtonProps {
  /**
   * 要复制的代码内容
   */
  code: string;
  /**
   * 按钮大小
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * 自定义类名
   */
  className?: string;
  /**
   * 复制成功后的提示文字
   * @default '已复制!'
   */
  successText?: string;
  /**
   * 默认显示的提示文字
   * @default '复制'
   */
  defaultText?: string;
  /**
   * 是否显示文字
   * @default true
   */
  showText?: boolean;
  /**
   * 复制成功后的回调函数
   */
  onCopy?: () => void;
  /**
   * 复制失败后的回调函数
   */
  onError?: (error: Error) => void;
}

/**
 * 代码复制按钮组件
 * 
 * 功能特性：
 * 1. 一键复制代码到剪贴板
 * 2. 复制成功视觉反馈
 * 3. 支持降级方案（兼容旧浏览器）
 * 4. 流畅的动画效果
 * 5. 多种尺寸可选
 * 
 * @param props - 组件属性
 * @returns 代码复制按钮
 */
function CodeCopyButton({
  code,
  size = 'md',
  className = '',
  successText = '已复制!',
  defaultText = '复制',
  showText = true,
  onCopy,
  onError,
}: CodeCopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  /**
   * 使用降级方案复制文本
   * 兼容不支持 Clipboard API 的浏览器
   * 
   * @param text - 要复制的文本
   * @returns 是否复制成功
   */
  const fallbackCopyTextToClipboard = useCallback((text: string): boolean => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  }, []);

  /**
   * 复制代码到剪贴板
   * 优先使用 Clipboard API，不支持时使用降级方案
   */
  const handleCopy = useCallback(async () => {
    if (isCopying || !code) return;

    setIsCopying(true);

    try {
      let copied = false;

      // 优先使用 Clipboard API
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(code);
          copied = true;
        } catch {
          // Clipboard API 失败，使用降级方案
          copied = fallbackCopyTextToClipboard(code);
        }
      } else {
        // 不支持 Clipboard API，使用降级方案
        copied = fallbackCopyTextToClipboard(code);
      }

      if (copied) {
        setIsCopied(true);
        onCopy?.();
        
        // 2秒后重置状态
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      } else {
        throw new Error('复制失败');
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error('复制失败');
      onError?.(err);
      
      // 显示错误提示
      console.error('[CodeCopyButton] 复制失败:', err);
    } finally {
      setIsCopying(false);
    }
  }, [code, isCopying, fallbackCopyTextToClipboard, onCopy, onError]);

  // 尺寸配置
  const sizeConfig = {
    sm: {
      button: 'px-2 py-1 gap-1',
      icon: 'h-3 w-3',
      text: 'text-xs',
    },
    md: {
      button: 'px-3 py-1.5 gap-2',
      icon: 'h-4 w-4',
      text: 'text-xs',
    },
    lg: {
      button: 'px-4 py-2 gap-2',
      icon: 'h-5 w-5',
      text: 'text-sm',
    },
  };

  const config = sizeConfig[size];

  return (
    <motion.button
      onClick={handleCopy}
      disabled={isCopying}
      className={`
        flex items-center justify-center
        ${config.button}
        rounded-md
        font-medium
        transition-all duration-200
        ${isCopied 
          ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' 
          : 'text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary hover:bg-white/50 dark:hover:bg-black/20'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      whileHover={{ scale: isCopying ? 1 : 1.05 }}
      whileTap={{ scale: isCopying ? 1 : 0.95 }}
      title={isCopied ? successText : defaultText}
      aria-label={isCopied ? successText : defaultText}
    >
      <motion.div
        initial={false}
        animate={{ scale: isCopied ? [1, 1.2, 1] : 1 }}
        transition={{ duration: 0.3 }}
      >
        {isCopied ? (
          <CheckIcon className={`${config.icon} text-green-600 dark:text-green-400`} />
        ) : (
          <ClipboardIcon className={config.icon} />
        )}
      </motion.div>
      
      {showText && (
        <span className={config.text}>
          {isCopied ? successText : defaultText}
        </span>
      )}

      {/* 复制成功时的涟漪效果 */}
      {isCopied && (
        <motion.div
          className="absolute inset-0 rounded-md bg-green-400/20"
          initial={{ scale: 0.8, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </motion.button>
  );
}

/**
 * 代码块头部组件
 * 包含语言显示和复制按钮
 */
interface CodeBlockHeaderProps {
  /**
   * 编程语言
   */
  language: string;
  /**
   * 要复制的代码
   */
  code: string;
  /**
   * 自定义类名
   */
  className?: string;
  /**
   * 是否显示复制按钮
   * @default true
   */
  showCopyButton?: boolean;
}

/**
 * 代码块头部组件
 * 显示语言标签和复制按钮
 * 
 * @param props - 组件属性
 * @returns 代码块头部
 */
export function CodeBlockHeader({
  language,
  code,
  className = '',
  showCopyButton = true,
}: CodeBlockHeaderProps) {
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

  return (
    <div
      className={`
        flex justify-between items-center
        px-4 py-3
        bg-gray-100 dark:bg-gray-800
        text-sm
        border-b border-gray-200 dark:border-gray-700
        rounded-t-lg
        ${className}
      `}
    >
      {/* 左侧：语言标识 */}
      <div className="flex items-center gap-2">
        {/* 装饰性圆点 */}
        <div className="flex items-center gap-1.5 mr-2">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
        </div>
        
        {/* 语言名称 */}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {getLanguageDisplayName(language)}
        </span>
      </div>

      {/* 右侧：复制按钮 */}
      {showCopyButton && (
        <CodeCopyButton code={code} size="sm" />
      )}
    </div>
  );
}

export default CodeCopyButton;
