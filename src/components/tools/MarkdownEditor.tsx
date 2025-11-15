'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { categories } from '@/setting/blogSetting';
import { ClipboardIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import { safeMarkdownToHtml } from '@/utils/safeMarked';

const CodeBlock = dynamic(() => import('./CodeBlock'), {
  ssr: false
});

interface MarkdownEditorProps {
  initialContent?: string;
  onSave?: (content: string) => void;
  height?: string;
  blogMode?: boolean;
  onBlogMetadataChange?: (metadata: BlogMetadata) => void;
}

interface BlogMetadata {
  title: string;
  date: string;
  category: string;
  tags: string[];
  excerpt: string;
  readTime: number;
}

interface ToolbarButtonProps {
  icon: string;
  title: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  compact?: boolean;
}

function ToolbarButton({ icon, title, onClick, variant = 'secondary', compact = false }: ToolbarButtonProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return isDark 
          ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500' 
          : 'bg-blue-500 hover:bg-blue-600 text-white border-blue-400';
      case 'success':
        return isDark 
          ? 'bg-green-600 hover:bg-green-700 text-white border-green-500' 
          : 'bg-green-500 hover:bg-green-600 text-white border-green-400';
      case 'danger':
        return isDark 
          ? 'bg-red-600 hover:bg-red-700 text-white border-red-500' 
          : 'bg-red-500 hover:bg-red-600 text-white border-red-400';
      default:
        return isDark 
          ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300';
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={title}
      className={`${compact ? 'px-2 py-1.5' : 'px-3 py-2'} rounded-lg font-medium text-sm border transition-all duration-200 ${getVariantStyles()}`}
    >
      <span className={compact ? 'text-sm' : 'text-base'}>{icon}</span>
    </motion.button>
  );
}

export default function MarkdownEditor({ 
  initialContent = '', 
  onSave,
  height = '600px',
  blogMode = false,
  onBlogMetadataChange
}: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();
  const [content, setContent] = useState(initialContent);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview' | 'split' | 'blog'>('edit');
  const [copiedCode, setCopiedCode] = useState<string>('');

  // 切换预览模式
  const togglePreview = () => {
    if (blogMode) {
      const modes = ['edit', 'split', 'preview', 'blog'] as const;
      const currentIndex = modes.indexOf(previewMode as any);
      const nextIndex = (currentIndex + 1) % modes.length;
      setPreviewMode(modes[nextIndex]);
    } else {
      const modes = ['edit', 'split', 'preview'] as const;
      // 如果当前模式是blog，先切换到edit
      const currentMode = previewMode === 'blog' ? 'edit' : previewMode;
      const currentIndex = modes.indexOf(currentMode);
      const nextIndex = (currentIndex + 1) % modes.length;
      setPreviewMode(modes[nextIndex]);
    }
  };
  
  // 处理博客元数据变化
  const handleBlogMetadataChange = (field: keyof BlogMetadata, value: any) => {
    setBlogMetadata(prev => ({ ...prev, [field]: value }));
  };
  
  // 添加标签
  const addTag = () => {
    if (newTag.trim() && !blogMetadata.tags.includes(newTag.trim())) {
      handleBlogMetadataChange('tags', [...blogMetadata.tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  // 删除标签
  const removeTag = (tagToRemove: string) => {
    handleBlogMetadataChange('tags', blogMetadata.tags.filter(tag => tag !== tagToRemove));
  };
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0); // 用于强制重新渲染
  
  // 博客模式状态
  const [blogMetadata, setBlogMetadata] = useState<BlogMetadata>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    category: '技术',
    tags: [],
    excerpt: '',
    readTime: 0
  });
  const [newTag, setNewTag] = useState('');
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  
  const isDark = resolvedTheme === 'dark';

  // 计算字数统计和阅读时间
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(content.length);
    
    // 计算阅读时间（按每分钟200字计算）
    const readTime = Math.ceil(words.length / 200) || 1;
    setBlogMetadata(prev => ({ ...prev, readTime }));
  }, [content]);

  // 复制代码功能
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(''), 2000);
    });
  };
  
  // 主题变化时强制重新渲染
  useEffect(() => {
    // 立即强制重新渲染以应用新的主题样式
    setRenderTrigger(prev => prev + 1);
  }, [isDark]);

  // 处理代码块的复制功能
  useEffect(() => {
    const timer = setTimeout(() => {
      const copyButtons = document.querySelectorAll('.copy-button');
      
      copyButtons.forEach((button) => {
        if (!button.hasAttribute('data-listener')) {
          button.setAttribute('data-listener', 'true');
          button.addEventListener('click', () => {
            const wrapper = button.closest('[data-code-id]');
            const codeElement = wrapper?.querySelector('code');
            const code = codeElement?.textContent || '';
            
            if (code) {
              copyToClipboard(code);
              
              // 更新按钮状态
              const buttonText = button.querySelector('span:last-child') || button;
              const originalText = buttonText.textContent;
              if (buttonText) {
                buttonText.textContent = '已复制!';
                setTimeout(() => {
                  if (buttonText) buttonText.textContent = originalText;
                }, 2000);
              }
            }
          });
        }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [content, copiedCode]);

  // 渲染预览内容 - 使用异步处理
  const [renderedContent, setRenderedContent] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(false);
  
  useEffect(() => {
    const updatePreview = async () => {
      if (!content.trim()) {
        setRenderedContent('');
        return;
      }
      
      setIsRendering(true);
      try {
        const html = await markdownToHtml(content);
        setRenderedContent(html);
      } catch (error) {
        console.error('预览渲染失败:', error);
        setRenderedContent(`<div class="text-red-500 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <p>预览渲染失败: ${error instanceof Error ? error.message : '未知错误'}</p>
        </div>`);
      } finally {
        setIsRendering(false);
      }
    };
    
    // 防抖处理，避免频繁渲染
    const timeoutId = setTimeout(updatePreview, 300);
    return () => clearTimeout(timeoutId);
  }, [content]);

  // 添加复制按钮事件委托
  useEffect(() => {
    const handleCopyClick = async (event: Event) => {
      const target = event.target as HTMLElement;
      const button = target.closest('.copy-button') as HTMLButtonElement;
      
      if (button && renderedContent) {
        // 不再阻止事件冒泡，让Live2D能够监听到copy事件
        // event.preventDefault();
        
        // 查找对应的代码块
        const codeContainer = button.closest('[data-code-id]') || button.closest('div[class*="rounded-xl"]');
        if (codeContainer) {
          const codeElement = codeContainer.querySelector('code') || codeContainer.querySelector('pre code');
          if (codeElement) {
            const codeText = codeElement.textContent || '';
            
            try {
              await navigator.clipboard.writeText(codeText);
              
              // 方法1: 使用 jQuery 触发（优先）
              if (typeof window !== 'undefined' && (window as any).jQuery) {
                try {
                  (window as any).jQuery(document).trigger('copy');
                  console.log('✅ jQuery 复制事件已触发');
                } catch (jqueryError) {
                  console.log('❌ jQuery 触发失败:', jqueryError);
                }
              }
              
              // 方法2: 使用原生事件
              try {
                const copyEvent = new Event('copy', { 
                  bubbles: true, 
                  cancelable: true,
                  composed: true // 允许事件穿透 Shadow DOM
                });
                document.dispatchEvent(copyEvent);
                console.log('✅ 原生复制事件已触发');
              } catch (nativeError) {
                console.log('❌ 原生事件触发失败:', nativeError);
              }
              
              // 方法3: 触发自定义事件
              try {
                const customCopyEvent = new CustomEvent('custom-copy', {
                  bubbles: true,
                  cancelable: true,
                  detail: { source: 'markdown-editor' }
                });
                document.dispatchEvent(customCopyEvent);
                console.log('✅ 自定义复制事件已触发');
              } catch (customError) {
                console.log('❌ 自定义事件触发失败:', customError);
              }
              
              // 方法4: 直接调用消息管理器（如果可用）
              // 注释掉：避免使用外部消息管理器，使用组件内部状态
              // if (window.GlobalMessageManager) {
              //   window.GlobalMessageManager.show('复制成功！代码已复制到剪贴板~', 2000);
              //   console.log('✅ 直接调用消息管理器');
              // }
              
              // 方法5: 使用消息总线模式（如果存在）
              if (typeof window !== 'undefined' && (window as any).MessageBus) {
                try {
                  (window as any).MessageBus.publish('copy-success', {
                    source: 'markdown-editor',
                    message: '代码复制成功！'
                  });
                  console.log('✅ 消息总线事件已发布');
                } catch (busError) {
                  console.log('❌ 消息总线发布失败:', busError);
                }
              }
              
              // 方法6: 使用发布订阅模式
              if (typeof window !== 'undefined') {
                try {
                  // 创建并分发多个事件确保兼容性
                  const events = [
                    new Event('copy', { bubbles: true, cancelable: true }),
                    new CustomEvent('code-copy', { 
                      bubbles: true, 
                      detail: { source: 'markdown-editor', code: codeText }
                    }),
                    new CustomEvent('clipboard-copy', { 
                      bubbles: true, 
                      detail: { text: codeText, source: 'editor' }
                    })
                  ];
                  
                  events.forEach(event => {
                    document.dispatchEvent(event);
                    console.log(`✅ 事件 ${event.type} 已分发`);
                  });
                } catch (multiEventError) {
                  console.log('❌ 多事件分发失败:', multiEventError);
                }
              }
              
              // 更新按钮状态
              const originalText = button.innerHTML;
              button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 h-4 w-4"><polyline points="20 6 9 17 4 12"></polyline></svg>已复制!';
              button.classList.remove('bg-blue-500', 'hover:bg-blue-600');
              button.classList.add('bg-green-500', 'hover:bg-green-600');
              
              // 2秒后恢复原状
              setTimeout(() => {
                button.innerHTML = originalText;
                button.classList.remove('bg-green-500', 'hover:bg-green-600');
                button.classList.add('bg-blue-500', 'hover:bg-blue-600');
              }, 2000);
              
            } catch (error) {
              console.error('❌ 复制失败:', error);
              // 降级方案：使用document.execCommand
              const textArea = document.createElement('textarea');
              textArea.value = codeText;
              document.body.appendChild(textArea);
              textArea.select();
              try {
                document.execCommand('copy');
                
                // 同样触发copy事件
                if (typeof window !== 'undefined' && (window as any).jQuery) {
                  (window as any).jQuery(document).trigger('copy');
                } else {
                  const copyEvent = new Event('copy', { bubbles: true });
                  document.dispatchEvent(copyEvent);
                }
                
                console.log('使用降级方案复制成功并分发事件');
              } catch (err) {
                console.error('降级方案也失败了:', err);
              }
              document.body.removeChild(textArea);
            }
          }
        }
      }
    };

    // 添加事件监听器到文档
    document.addEventListener('click', handleCopyClick);
    
    // 清理函数
    return () => {
      document.removeEventListener('click', handleCopyClick);
    };
  }, [renderedContent]);
  
  // 初始化博客模式
  useEffect(() => {
    if (blogMode && !initialContent) {
      setContent(getBlogTemplate());
    }
  }, [blogMode, initialContent]);
  
  // 博客元数据变化通知
  useEffect(() => {
    if (blogMode && onBlogMetadataChange) {
      onBlogMetadataChange(blogMetadata);
    }
  }, [blogMetadata, blogMode, onBlogMetadataChange]);

  // 快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault();
            handleSave();
            break;
          case 'b':
            e.preventDefault();
            insertText('**', '**');
            break;
          case 'i':
            e.preventDefault();
            insertText('*', '*');
            break;
          case 'k':
            e.preventDefault();
            insertText('[', '](url)');
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content]);

  // 监听文本选择
  const handleTextSelection = () => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);
      
      setSelectionStart(start);
      setSelectionEnd(end);
      setSelectedText(selected);
    }
  };

  // 插入文本到当前光标位置
  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = document.querySelector('textarea[name="markdown-content"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = before + selectedText + after;
    
    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);
    
    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  }, [content]);

  // 智能格式化选中文本
  const formatSelectedText = (before: string, after: string = '') => {
    if (selectedText) {
      // 如果已有选中文本，直接格式化选中的部分
      const newContent = content.substring(0, selectionStart) + 
                        before + selectedText + after + 
                        content.substring(selectionEnd);
      setContent(newContent);
    } else {
      // 如果没有选中文本，使用原来的插入逻辑
      insertText(before, after);
    }
  };

  // 工具栏操作 - 按功能分组
  const toolbarActions = {
    format: [
      { icon: 'H1', title: '一级标题', action: () => formatSelectedText('# ', '') },
      { icon: 'H2', title: '二级标题', action: () => formatSelectedText('## ', '') },
      { icon: 'H3', title: '三级标题', action: () => formatSelectedText('### ', '') },
    ],
    text: [
      { icon: 'B', title: '粗体', action: () => formatSelectedText('**', '**') },
      { icon: 'I', title: '斜体', action: () => formatSelectedText('*', '*') },
      { icon: 'U', title: '下划线', action: () => formatSelectedText('<u>', '</u>') },
      { icon: 'S', title: '删除线', action: () => formatSelectedText('~~', '~~') },
    ],
    code: [
      { icon: '</>', title: '行内代码', action: () => formatSelectedText('`', '`') },
      { icon: '{ }', title: '代码块', action: () => formatSelectedText('```\n', '\n```') },
    ],
    list: [
      { icon: '•', title: '无序列表', action: () => formatSelectedText('- ', '') },
      { icon: '1.', title: '有序列表', action: () => formatSelectedText('1. ', '') },
      { icon: '☐', title: '任务列表', action: () => formatSelectedText('- [ ] ', '') },
      { icon: '> ', title: '引用', action: () => formatSelectedText('> ', '') },
    ],
    media: [
      { icon: '🔗', title: '链接', action: () => formatSelectedText('[', '](url)') },
      { icon: '🖼️', title: '图片', action: () => formatSelectedText('![', '](image-url)') },
    ],
    table: [
      { icon: '⊞', title: '表格', action: () => formatSelectedText('\n| 标题1 | 标题2 | 标题3 |\n|-------|-------|-------|\n| 内容1 | 内容2 | 内容3 |\n', '') },
      { icon: '∥', title: '分割线', action: () => formatSelectedText('\n---\n', '') },
    ]
  };

  // 渲染代码块组件
  const renderCodeBlocks = (html: string, codeBlocks: Array<{language: string, code: string, displayLanguage: string, id: string}>) => {
    const codeBlockMap = new Map(codeBlocks.map(block => [block.id, block]));
    
    // 使用正则表达式匹配所有代码块占位符
    return html.replace(/<!--CODE_BLOCK:(\w+)-->/g, (match, id) => {
      const codeBlock = codeBlockMap.get(id);
      if (!codeBlock) return match;
      
      // 返回与博客一致的HTML结构
      return `<div class="my-6 rounded-lg border bg-card text-card-foreground shadow-sm" data-code-id="${id}">
        <div class="flex items-center justify-between border-b bg-muted/50 px-4 py-2">
          <span class="text-sm text-muted-foreground">${codeBlock.displayLanguage}</span>
          <button class="copy-button inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3" title="复制代码">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 h-4 w-4">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
            </svg>
            复制
          </button>
        </div>
        <div class="p-4">
          <pre class="text-sm"><code>${codeBlock.code}</code></pre>
        </div>
      </div>`;
    });
  };
  const parseCodeBlocks = (markdown: string) => {
    const codeBlocks: Array<{language: string, code: string, displayLanguage: string, id: string}> = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;
    
    while ((match = regex.exec(markdown)) !== null) {
      const language = match[1] || '';
      let cleanCode = match[2];
      
      // 移除开头的换行符
      cleanCode = cleanCode.replace(/^\n/, '');
      
      // 标准化语言名称
      const normalizedLanguage = language ? language.toLowerCase().trim() : '';
      const displayLanguage = normalizedLanguage ? 
        (normalizedLanguage === 'javascript' ? 'JavaScript' :
         normalizedLanguage === 'typescript' ? 'TypeScript' :
         normalizedLanguage === 'python' ? 'Python' :
         normalizedLanguage === 'java' ? 'Java' :
         normalizedLanguage === 'cpp' || normalizedLanguage === 'c++' ? 'C++' :
         normalizedLanguage === 'html' ? 'HTML' :
         normalizedLanguage === 'css' ? 'CSS' :
         normalizedLanguage.charAt(0).toUpperCase() + normalizedLanguage.slice(1)) : '';
      
      codeBlocks.push({
        language: normalizedLanguage,
        code: cleanCode,
        displayLanguage: displayLanguage || '代码',
        id: `code-block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      });
    }
    
    return codeBlocks;
  };

  // Markdown 转 HTML - 使用安全的marked库
  const markdownToHtml = async (markdown: string): Promise<string> => {
    try {
      // 首先尝试使用安全的marked库
      const markedHtml = await safeMarkdownToHtml(markdown);
      
      // 对marked的输出进行后处理，添加自定义样式
      let html = markedHtml;
      
      // 添加自定义表格样式
      html = html.replace(/<table>/g, '<div class="overflow-x-auto my-6"><table class="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">');
      html = html.replace(/<\/table>/g, '</table></div>');
      html = html.replace(/<thead>/g, '<thead class="bg-gray-50 dark:bg-gray-700">');
      html = html.replace(/<th>/g, '<th class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600">');
      html = html.replace(/<tbody>/g, '<tbody>');
      html = html.replace(/<tr>/g, '<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">');
      html = html.replace(/<td>/g, '<td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">');
      
      // 添加自定义标题样式
      html = html.replace(/<h1>/g, '<h1 class="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">');
      html = html.replace(/<h2>/g, '<h2 class="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">');
      html = html.replace(/<h3>/g, '<h3 class="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100">');
      
      // 添加自定义链接样式
      html = html.replace(/<a /g, '<a class="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors" target="_blank" rel="noopener noreferrer" ');
      
      // 添加自定义图片样式
      html = html.replace(/<img /g, '<img class="max-w-full h-auto rounded-lg my-3 shadow-md hover:shadow-lg transition-shadow" ');
      
      // 添加自定义引用样式
      html = html.replace(/<blockquote>/g, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 py-3 px-4 rounded-r-lg">');
      
      return html;
    } catch (error) {
      console.error('Markdown转HTML失败，使用备用方案:', error);
      return fallbackMarkdownToHtml(markdown);
    }
  };
  
  // 备用Markdown转HTML实现
  const fallbackMarkdownToHtml = (markdown: string): string => {
    let html = markdown;
    
    // 表格处理 - 防止String.repeat错误
    try {
      const tableRegex = /\n\n((\|.*\|.*\n)+)/g;
      html = html.replace(tableRegex, (match, tableContent) => {
        try {
          const lines = tableContent.trim().split('\n');
          if (lines.length < 2) return match;
          
          let tableHtml = '<div class="overflow-x-auto my-6"><table class="min-w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">\n';
          
          // 处理表头
          const headerLine = lines[0];
          const headers = headerLine.split('|').map((h: string) => h.trim()).filter((h: string) => h);
          
          if (headers.length > 0) {
            tableHtml += '<thead class="bg-gray-50 dark:bg-gray-700">\n<tr>\n';
            headers.forEach((header: string) => {
              tableHtml += `<th class="px-4 py-3 text-left text-sm font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-600">${header}</th>\n`;
            });
            tableHtml += '</tr>\n</thead>\n';
          }
          
          // 处理表行（跳过分隔符行）
          tableHtml += '<tbody>\n';
          for (let i = 2; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() && !line.match(/^\|[-:\s|]*\|$/)) {
              const cells = line.split('|').map((c: string) => c.trim()).filter((c: string) => c);
              if (cells.length > 0) {
                tableHtml += '<tr class="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">\n';
                cells.forEach((cell: string) => {
                  tableHtml += `<td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">${cell}</td>\n`;
                });
                tableHtml += '</tr>\n';
              }
            }
          }
          tableHtml += '</tbody>\n</table></div>';
          
          return tableHtml;
        } catch (error) {
          console.error('表格处理错误:', error);
          return match; // 如果出错，返回原始内容
        }
      });
    } catch (error) {
      console.error('表格正则表达式错误:', error);
    }
    
    // 代码块 - 使用与博客一致的风格
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (match, language, code) => {
      let cleanCode = language ? code.split('\n').slice(1).join('\n') : code;
      
      // 移除开头的换行符
      cleanCode = cleanCode.replace(/^\n/, '');
      
      // 标准化语言名称
      const normalizedLanguage = language ? language.toLowerCase().trim() : '';
      const displayLanguage = normalizedLanguage ? 
        (normalizedLanguage === 'javascript' ? 'JavaScript' :
         normalizedLanguage === 'typescript' ? 'TypeScript' :
         normalizedLanguage === 'python' ? 'Python' :
         normalizedLanguage === 'java' ? 'Java' :
         normalizedLanguage === 'cpp' || normalizedLanguage === 'c++' ? 'C++' :
         normalizedLanguage === 'html' ? 'HTML' :
         normalizedLanguage === 'css' ? 'CSS' :
         normalizedLanguage.charAt(0).toUpperCase() + normalizedLanguage.slice(1)) : '';
      
      // 返回增强的HTML结构 - 更明显的代码块
      return `<div class="my-8 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden bg-white dark:bg-gray-900" data-code-id="code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}">
        <div class="flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 px-6 py-3 border-b-2 border-blue-200 dark:border-gray-600">
          <div class="flex items-center gap-3">
            <div class="flex items-center gap-2">
              <span class="w-3 h-3 bg-red-400 rounded-full"></span>
              <span class="w-3 h-3 bg-yellow-400 rounded-full"></span>
              <span class="w-3 h-3 bg-green-400 rounded-full"></span>
            </div>
            <span class="text-sm font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">${displayLanguage || '代码'}</span>
          </div>
          <button class="copy-button inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow-md px-4 py-2" title="复制代码">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2 h-4 w-4">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
            </svg>
            复制代码
          </button>
        </div>
        <div class="p-6 bg-gray-50 dark:bg-gray-950">
          <pre class="text-sm leading-relaxed"><code>${cleanCode}</code></pre>
        </div>
      </div>`;
    });
    
    // 标题
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-semibold mt-4 mb-2 text-gray-900 dark:text-gray-100">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold mt-6 mb-3 text-gray-900 dark:text-gray-100">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold mt-8 mb-4 text-gray-900 dark:text-gray-100">$1</h1>');
    
    // 粗体和斜体
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic text-gray-700 dark:text-gray-300">$1</em>');
    
    // 行内代码（不在代码块内的）- 增强的视觉样式
    html = html.replace(/`(.*?)`/g, (match, code) => {
      return `<code class="px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded-md text-sm font-mono border border-yellow-200 dark:border-yellow-700 shadow-sm hover:shadow-md transition-all duration-200">${code}</code>`;
    });
    
    // 链接
    html = html.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2" class="text-blue-600 dark:text-blue-400 hover:underline hover:text-blue-800 dark:hover:text-blue-300 transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // 图片
    html = html.replace(/!\[([^\]]*)\]\(([^\)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-3 shadow-md hover:shadow-lg transition-shadow" />');
    
    // 引用
    html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-gray-300 dark:border-gray-600 pl-4 my-4 italic text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/30 py-3 px-4 rounded-r-lg">$1</blockquote>');
    
    // 列表 - 先处理有序列表，再处理无序列表
    html = html.replace(/^\d+\. (.*$)/gim, '<li class="ml-6 my-1 list-decimal text-gray-700 dark:text-gray-300">$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li class="ml-6 my-1 list-disc text-gray-700 dark:text-gray-300">• $1</li>');
    
    // 段落
    html = html.replace(/\n\n/g, '</p><p class="mb-4 text-gray-700 dark:text-gray-300">');
    html = '<p class="mb-4 text-gray-700 dark:text-gray-300">' + html + '</p>';
    
    // 清理多余的标签
    html = html.replace(/<p class="mb-4[^>]*><\/p>/g, '');
    html = html.replace(/<p class="mb-4[^>]*>\s*<h/g, '<h');
    html = html.replace(/h([1-6])><\/p>/g, 'h$1>');
    html = html.replace(/<p class="mb-4[^>]*>\s*<pre/g, '<pre');
    html = html.replace(/pre><\/p>/g, 'pre>');
    html = html.replace(/<p class="mb-4[^>]*>\s*<blockquote/g, '<blockquote');
    html = html.replace(/blockquote><\/p>/g, 'blockquote>');
    html = html.replace(/<p class="mb-4[^>]*>\s*<li/g, '<li');
    html = html.replace(/li><\/p>/g, 'li>');
    
    return html;
  };

  // 处理保存
  const handleSave = () => {
    let saveContent = content;
    
    // 博客模式下添加 Front Matter
    if (blogMode) {
      const frontMatter = `---
title: "${blogMetadata.title || '无标题'}"
date: "${blogMetadata.date}"
category: "${blogMetadata.category}"
tags: [${blogMetadata.tags.map(tag => `"${tag}"`).join(', ')}]
excerpt: "${blogMetadata.excerpt || ''}"
readTime: ${blogMetadata.readTime}
---

`;
      saveContent = frontMatter + content;
    }
    
    if (onSave) {
      onSave(saveContent);
    } else {
      // 默认保存到本地文件
      const blob = new Blob([saveContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = blogMode ? `${blogMetadata.title || 'blog'}.md` : 'blog-post.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    // 显示保存成功反馈
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // 处理复制
  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    
    // 显示复制成功反馈
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 清空内容
  const handleClear = () => {
    if (confirm('确定要清空所有内容吗？')) {
      setContent('');
    }
  };

  // 加载示例内容
  const loadSample = () => {
    const sampleContent = blogMode ? getBlogTemplate() : getBasicTemplate();
    setContent(sampleContent);
    // 立即强制重新渲染以确保样式正确应用
    setRenderTrigger(prev => prev + 1);
  };
  
  // 基础模板
  const getBasicTemplate = () => {
    return `# 🚀 Markdown 编辑器示例

欢迎使用现代化的 **Markdown 编辑器**！这个编辑器专为开发者和技术写作者设计。

## ✨ 核心功能

- **🎯 实时预览** - 所见即所得的编辑体验
- **🤖 智能格式化** - 选中文本自动应用Markdown格式
- **⌨️ 快捷键支持** - 高效的键盘操作（Ctrl+B 粗体，Ctrl+I 斜体）
- **💾 自动保存** - 内容实时保存到浏览器本地存储
- **🌓 主题适配** - 代码块背景色智能适配明暗主题
- **📊 文档统计** - 实时显示字数、字符数和预计阅读时间

## 📝 代码示例展示

### JavaScript - 异步编程示例

\`\`\`javascript
// 现代异步编程示例
async function fetchData(url) {
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('获取数据失败:', error);
  }
}

// 使用示例
fetchData('https://api.example.com/users')
  .then(data => console.log('用户数据:', data));
\`\`\`

### Python - 数据处理示例

\`\`\`python
import json
from datetime import datetime

# 博客文章类
class BlogPost:
    def __init__(self, title, content, author):
        self.title = title
        self.content = content
        self.author = author
        self.created_at = datetime.now()
        self.published = False
    
    def publish(self):
        self.published = True
        return f"文章 '{self.title}' 已发布"

# 使用示例
post = BlogPost("Python 编程指南", "本文介绍Python基础...", "张三")
print(post.publish())
\`\`\`

### CSS - 现代布局示例

\`\`\`css
/* 响应式卡片布局 */
.card-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 2rem;
  color: white;
  transition: transform 0.3s ease;
}

.card:hover {
  transform: translateY(-5px);
}
\`\`\`

## 📋 快速开始清单

1. **基础操作**
   - [x] 编写Markdown文本
   - [x] 使用工具栏格式化
   - [ ] 学习快捷键操作

2. **高级功能**
   - [x] 插入代码块
   - [x] 创建任务列表
   - [ ] 使用引用和表格

3. **导出和分享**
   - [ ] 复制HTML代码
   - [ ] 下载Markdown文件
   - [ ] 分享文档链接

### 技术栈概览

- **前端框架**: React 19 + Next.js 15
- **样式方案**: Tailwind CSS 4 + CSS Variables
- **代码高亮**: Highlight.js
- **图标库**: Heroicons + Lucide React
- **动画库**: Framer Motion

## 🔗 相关链接

- [React 官方文档](https://react.dev/)
- [Next.js 文档](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/)
- [Markdown 语法指南](https://www.markdownguide.org/)

---

> **🎯 开始使用**: 现在你已经了解了Markdown编辑器的基本功能，开始创作你的技术文档吧！记得利用左侧的工具栏和快捷键来提高写作效率。`;
  };
  
  // 博客模板
  const getBlogTemplate = () => {
    return `# 📝 文章标题

> **摘要**：在这里写文章的摘要，简要介绍文章的核心内容和价值，吸引读者继续阅读。

## 🎯 引言

在这里写文章的背景信息，说明：
- **为什么这个话题重要？**
- **目标读者是谁？**
- **阅读本文能收获什么？**

## 📚 背景知识

### 相关概念解释

在深入主题之前，先介绍一些必要的背景知识：

**关键概念1**：解释这个概念是什么，为什么重要。

**关键概念2**：解释这个概念是什么，如何与主题相关。

### 现状分析

当前在这个领域存在什么问题或挑战？现有的解决方案有什么局限性？

## 🚀 核心内容

### 💡 解决方案概述

详细介绍你的解决方案或观点：

#### 第一步：问题分析
- 详细描述问题的本质
- 分析问题产生的原因
- 明确解决的目标和范围

#### 第二步：方案设计
- 阐述解决方案的设计思路
- 说明选择这种方案的理由
- 对比不同方案的优缺点

#### 第三步：具体实现

\`\`\`javascript
// 这里可以放具体的代码实现
// 确保代码有良好的注释和错误处理
function implementSolution(params) {
  try {
    // 参数验证
    if (!params || !params.isValid()) {
      throw new Error('参数验证失败');
    }
    
    // 核心逻辑
    const result = processData(params);
    
    // 结果验证
    return validateResult(result);
  } catch (error) {
    console.error('实现过程出错:', error);
    throw error;
  }
}
\`\`\`

### 📊 效果验证

展示解决方案的效果：

#### 性能对比
| 指标 | 优化前 | 优化后 | 提升 |
|------|--------|--------|------|
| 响应时间 | 500ms | 200ms | 60% |
| 内存占用 | 100MB | 60MB | 40% |
| 并发处理 | 100 | 500 | 400% |

#### 用户反馈
> "这个解决方案真的解决了我们的痛点，使用起来非常流畅！"
> 
> —— 某用户反馈

## 🛠️ 最佳实践

### ✅ 推荐做法
1. **遵循设计原则**：保持代码简洁、可读、可维护
2. **注重性能优化**：合理使用缓存、避免不必要的计算
3. **做好错误处理**：完善的异常捕获和友好的错误提示
4. **编写单元测试**：确保代码质量和功能稳定性

### ❌ 常见误区
- **过度优化**：不要为了微小的性能提升而牺牲代码可读性
- **忽视边界情况**：要考虑各种异常输入和使用场景
- **缺乏文档**：好的代码需要配合好的文档才能发挥最大价值

## 🔮 进阶思考

### 未来展望
- 这个领域未来可能的发展方向
- 还可以进一步优化和改进的地方
- 与其他技术的结合可能性

### 相关资源推荐
- [相关技术文档链接]
- [优秀的开源项目推荐]
- [进一步学习的资料]

## 📖 总结

### 核心要点回顾
1. **问题本质**：明确了要解决的核心问题是什么
2. **解决思路**：提出了系统性的解决方案
3. **具体实现**：通过代码展示了完整的实现过程
4. **效果验证**：通过数据和用户反馈证明了方案的有效性

### 行动建议
- 立即尝试实现文中提到的解决方案
- 根据你的具体需求进行定制化调整
- 持续关注这个领域的最新发展动态

---

> **💡 温馨提示**：
> - 记得在左侧元数据面板填写完整的文章信息
> - 为文章添加合适的标签，方便读者搜索
> - 检查文章的语法和格式是否正确
> - 考虑添加相关的图片或图表来增强可读性

### 🏷️ 推荐标签
技术教程, 最佳实践, 代码优化, 用户体验

### 📅 发布建议
选择合适的时间发布，通常在工作日的上午9-11点或下午2-4点阅读量较高。`;
  };
  
  // 渲染博客元数据面板
  const renderBlogMetadataPanel = () => {
    if (!blogMode) return null;
    
    return (
      <div className="w-80 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">博客元数据</h3>
          
          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              文章标题
            </label>
            <input
              type="text"
              value={blogMetadata.title}
              onChange={(e) => handleBlogMetadataChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入文章标题"
            />
          </div>
          
          {/* 日期 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              发布日期
            </label>
            <input
              type="date"
              value={blogMetadata.date}
              onChange={(e) => handleBlogMetadataChange('date', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* 分类 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              分类
            </label>
            <select
              value={blogMetadata.category}
              onChange={(e) => handleBlogMetadataChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          {/* 标签 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              标签
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTag()}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="添加标签"
              />
              <button
                onClick={addTag}
                className="px-3 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                添加
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {blogMetadata.tags.map(tag => (
                <span key={tag} className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded">
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
          
          {/* 摘要 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              文章摘要
            </label>
            <textarea
              value={blogMetadata.excerpt}
              onChange={(e) => handleBlogMetadataChange('excerpt', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="输入文章摘要"
            />
          </div>
          
          {/* 阅读时间 */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            预计阅读时间: {blogMetadata.readTime} 分钟
          </div>
          
          {/* 快速操作 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">快速操作</h4>
            <div className="space-y-2">
              <button
                onClick={loadSample}
                className="w-full px-3 py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              >
                加载博客模板
              </button>
              <button
                onClick={() => setShowMetadataPanel(!showMetadataPanel)}
                className="w-full px-3 py-2 text-sm bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
              >
                {showMetadataPanel ? '隐藏面板' : '显示面板'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 博客预览模式
  const renderBlogPreview = () => {
    return (
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-800">
        <article className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8">
          {/* 文章头部 */}
          <header className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
              <span>{blogMetadata.category}</span>
              <span>•</span>
              <span>{blogMetadata.date}</span>
              <span>•</span>
              <span>{blogMetadata.readTime} 分钟阅读</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {blogMetadata.title || '无标题文章'}
            </h1>
            {blogMetadata.excerpt && (
              <p className="text-lg text-gray-600 dark:text-gray-300 italic">
                {blogMetadata.excerpt}
              </p>
            )}
          </header>
          
          {/* 标签 */}
          {blogMetadata.tags.length > 0 && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                {blogMetadata.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {/* 文章内容 */}
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {isRendering ? (
              <div className="flex items-center justify-center h-32">
                <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  <span className="text-sm">正在渲染文章内容...</span>
                </div>
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
            )}
          </div>
          
          {/* 文章底部 */}
          <footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>字数统计: {wordCount} 字</span>
              <span>字符数: {charCount} 字符</span>
            </div>
          </footer>
        </article>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* 工具栏 - 超紧凑设计 */}
      <div className={`mb-3 p-2 rounded-lg border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm`}>
        {/* 主要工具栏 - 超紧凑布局 */}
        <div className="flex flex-wrap items-center gap-1 mb-2">
          {Object.entries(toolbarActions).map(([group, actions]) => (
            <div key={group} className="flex items-center gap-0.5">
              {actions.map((action, index) => (
                <ToolbarButton
                  key={`${group}-${index}`}
                  icon={action.icon}
                  title={action.title}
                  onClick={action.action}
                  compact={true}
                />
              ))}
              {group !== 'table' && <div className="w-1.5 h-4 border-l ${isDark ? 'border-gray-600' : 'border-gray-300'} mx-0.5" />} {/* 更紧凑的分隔 */}
            </div>
          ))}
        </div>
        
        {/* 模式切换和快速操作 - 更紧凑的单行布局 */}
        <div className="flex flex-wrap items-center justify-between gap-1">
          <div className="flex items-center gap-0.5">
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mr-1`}>
              模式
            </span>
            <button
              onClick={() => setPreviewMode('edit')}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                previewMode === 'edit'
                  ? (isDark ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500' : 'bg-blue-500 hover:bg-blue-600 text-white border-blue-400')
                  : (isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300')
              }`}
              title="编辑模式"
            >
              编辑
            </button>
            <button
              onClick={() => setPreviewMode('preview')}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                previewMode === 'preview'
                  ? (isDark ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500' : 'bg-blue-500 hover:bg-blue-600 text-white border-blue-400')
                  : (isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300')
              }`}
              title="预览模式"
            >
              预览
            </button>
            <button
              onClick={() => setPreviewMode('split')}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                previewMode === 'split'
                  ? (isDark ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500' : 'bg-blue-500 hover:bg-blue-600 text-white border-blue-400')
                  : (isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300')
              }`}
              title="分屏模式"
            >
              分屏
            </button>
            {blogMode && (
              <button
                onClick={() => setPreviewMode('blog')}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                  previewMode === 'blog'
                    ? (isDark ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500' : 'bg-blue-500 hover:bg-blue-600 text-white border-blue-400')
                    : (isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300')
                }`}
                title="博客预览模式"
              >
                博客
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-0.5">
            <button
              onClick={handleCopy}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                copied
                  ? (isDark ? 'bg-green-600 hover:bg-green-700 text-white border-green-500' : 'bg-green-500 hover:bg-green-600 text-white border-green-400')
                  : (isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300')
              }`}
              title={copied ? "已复制" : "复制"}
            >
              {copied ? "已复制" : "复制"}
            </button>
            <button
              onClick={handleSave}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                saved
                  ? (isDark ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500' : 'bg-blue-500 hover:bg-blue-600 text-white border-blue-400')
                  : (isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300')
              }`}
              title={saved ? "已保存" : "保存"}
            >
              {saved ? "已保存" : "保存"}
            </button>
            <button
              onClick={handleClear}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                isDark ? 'bg-red-600 hover:bg-red-700 text-white border-red-500' : 'bg-red-500 hover:bg-red-600 text-white border-red-400'
              }`}
              title="清空"
            >
              清空
            </button>
            <button
              onClick={loadSample}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                isDark ? 'bg-purple-600 hover:bg-purple-700 text-white border-purple-500' : 'bg-purple-500 hover:bg-purple-600 text-white border-purple-400'
              }`}
              title="示例"
            >
              示例
            </button>
          </div>
        </div>
      </div>

      {/* 编辑器主体 */}
      <div className="flex gap-4" style={{ height }}>
        {/* 博客模式下显示元数据面板 */}
        {blogMode && showMetadataPanel && renderBlogMetadataPanel()}
        
        {/* 编辑区域 - 更紧凑 */}
        {(previewMode === 'edit' || previewMode === 'split') && (
          <div className={`${previewMode === 'split' ? 'w-1/2' : 'w-full'} rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
            <div className={`px-3 py-2 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                ✏️ 编辑器
              </h3>
            </div>
            <div className="h-full">
              <textarea
                name="markdown-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onSelect={handleTextSelection}
                className={`w-full h-full p-3 resize-none focus:outline-none transition-colors duration-200 ${
                  isDark 
                    ? 'bg-gray-800 text-gray-100 placeholder-gray-400' 
                    : 'bg-white text-gray-900 placeholder-gray-500'
                }`}
                placeholder="编写 Markdown... 快捷键：Ctrl+B 粗体，Ctrl+I 斜体，Ctrl+K 链接，Ctrl+S 保存"
              />
            </div>
          </div>
        )}

        {/* 预览区域 - 修复背景透明问题 */}
        {(previewMode === 'preview' || previewMode === 'split') && (
          <div className={`${previewMode === 'split' ? 'w-1/2' : 'w-full'} rounded-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'} overflow-hidden bg-white dark:bg-gray-800`}>
            <div className={`px-3 py-2 border-b ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                👁️ 预览
              </h3>
            </div>
            <div className={`h-full p-4 overflow-y-auto prose prose-sm max-w-none ${
              isDark 
                ? 'prose-invert prose-headings:text-gray-100 prose-p:text-gray-300 prose-strong:text-gray-200 prose-em:text-gray-300 prose-code:text-gray-200 prose-blockquote:text-gray-300 prose-blockquote:border-gray-600' 
                : 'prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-em:text-gray-700 prose-code:text-gray-800 prose-blockquote:text-gray-600 prose-blockquote:border-gray-300'
            }`}>
              {isRendering ? (
                <div className="flex items-center justify-center h-32">
                  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                    <span className="text-sm">正在渲染预览...</span>
                  </div>
                </div>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: renderedContent }} />
              )}
            </div>
          </div>
        )}

        {/* 博客预览模式 */}
        {previewMode === 'blog' && renderBlogPreview()}
      </div>

      {/* 状态栏 - 更紧凑 */}
      <div className={`mt-3 px-3 py-1.5 rounded-lg border text-xs ${
        isDark 
          ? 'bg-gray-800 border-gray-700 text-gray-300' 
          : 'bg-gray-50 border-gray-200 text-gray-600'
      }`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                wordCount > 0 ? 'bg-green-500' : 'bg-gray-400'
              }`}></span>
              {wordCount} 字
            </span>
            <span>{charCount} 字符</span>
            <span className="hidden sm:inline">{previewMode === 'edit' ? '编辑' : previewMode === 'preview' ? '预览' : '分屏'}</span>
          </div>
          <div className="text-xs opacity-75 hidden md:inline">
            快捷键: Ctrl+B 粗体, Ctrl+I 斜体, Ctrl+K 链接, Ctrl+S 保存
          </div>
        </div>
      </div>
    </div>
  );
}