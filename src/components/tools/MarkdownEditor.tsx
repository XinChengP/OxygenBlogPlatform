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
  author: string;
  slug: string;
  coverImage: string;
  draft: boolean;
  featured: boolean;
  series: string;
  seriesOrder: number;
  language: string;
  canonicalUrl: string;
  seoTitle: string;
  seoDescription: string;
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

  const [saved, setSaved] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0); // 用于强制重新渲染
  
  // 撤销历史记录
  const [history, setHistory] = useState<string[]>([initialContent]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  
  // 博客模式状态
  const [blogMetadata, setBlogMetadata] = useState<BlogMetadata>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    category: '技术',
    tags: [],
    excerpt: '',
    readTime: 0,
    author: '歆橙',
    slug: '',
    coverImage: '',
    draft: false,
    featured: false,
    series: '',
    seriesOrder: 1,
    language: 'zh-CN',
    canonicalUrl: '',
    seoTitle: '',
    seoDescription: ''
  });
  const [newTag, setNewTag] = useState('');
  const [showMetadataPanel, setShowMetadataPanel] = useState(false);
  const [showCustomMetadataDialog, setShowCustomMetadataDialog] = useState(false);
  const [tempMetadata, setTempMetadata] = useState<BlogMetadata>(blogMetadata);
  const [showAdvancedMetadata, setShowAdvancedMetadata] = useState(false);
  
  const isDark = resolvedTheme === 'dark';

  // 计算字数统计和阅读时间
  useEffect(() => {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharCount(content.length);
    
    // 计算阅读时间（按每分钟500字计算）
    const readTime = Math.ceil(words.length / 500) || 1;
    setBlogMetadata(prev => ({ ...prev, readTime }));
  }, [content]);

  // 撤销功能
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
    }
  }, [history, historyIndex]);

  // 重做功能
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setContent(history[newIndex]);
    }
  }, [history, historyIndex]);

  // 添加到历史记录
  const addToHistory = useCallback((newContent: string) => {
    // 移除当前索引之后的历史记录
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newContent);
    
    // 限制历史记录数量（最多50步）
    if (newHistory.length > 50) {
      newHistory.shift();
    }
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

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
          case 'z':
            e.preventDefault();
            undo();
            break;
          case 'y':
            e.preventDefault();
            redo();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [content, undo, redo]);

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
    addToHistory(newContent); // 添加到历史记录
    
    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  }, [content, addToHistory]);

  // 智能格式化选中文本
  const formatSelectedText = (before: string, after: string = '') => {
    if (selectedText) {
      // 如果已有选中文本，直接格式化选中的部分
      const newContent = content.substring(0, selectionStart) + 
                        before + selectedText + after + 
                        content.substring(selectionEnd);
      setContent(newContent);
      addToHistory(newContent); // 添加到历史记录
    } else {
      // 如果没有选中文本，使用原来的插入逻辑
      insertText(before, after);
    }
  };

  // 工具栏操作 - 按功能分组
  const toolbarActions = {
    format: [
      { icon: 'H1', title: '一级标题', action: () => handleToolbarAction('# ', '') },
      { icon: 'H2', title: '二级标题', action: () => handleToolbarAction('## ', '') },
      { icon: 'H3', title: '三级标题', action: () => handleToolbarAction('### ', '') },
    ],
    text: [
      { icon: 'B', title: '粗体', action: () => handleToolbarAction('**', '**') },
      { icon: 'I', title: '斜体', action: () => handleToolbarAction('*', '*') },
      { icon: 'U', title: '下划线', action: () => handleToolbarAction('<u>', '</u>') },
      { icon: 'S', title: '删除线', action: () => handleToolbarAction('~~', '~~') },
    ],
    code: [
      { icon: '</>', title: '行内代码', action: () => handleToolbarAction('`', '`') },
      { icon: '{ }', title: '代码块', action: () => handleToolbarAction('```\n', '\n```') },
    ],
    list: [
      { icon: '•', title: '无序列表', action: () => handleToolbarAction('- ', '') },
      { icon: '1.', title: '有序列表', action: () => handleToolbarAction('1. ', '') },
      { icon: '☐', title: '任务列表', action: () => handleToolbarAction('- [ ] ', '') },
      { icon: '> ', title: '引用', action: () => handleToolbarAction('> ', '') },
    ],
    media: [
      { icon: '🔗', title: '链接', action: () => handleToolbarAction('[', '](url)') },
      { icon: '🖼️', title: '图片', action: () => handleToolbarAction('![', '](image-url)') },
    ],
    table: [
      { icon: '⊞', title: '表格', action: () => handleToolbarAction('\n| 标题1 | 标题2 | 标题3 |\n|-------|-------|-------|\n| 内容1 | 内容2 | 内容3 |\n', '') },
      { icon: '∥', title: '分割线', action: () => handleToolbarAction('\n---\n', '') },
    ]
  };

  // 直接处理工具栏按钮点击，确保历史记录正确保存
  const handleToolbarAction = (before: string, after: string = '') => {
    const textarea = document.querySelector('textarea[name="markdown-content"]') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = before + selectedText + after;
    
    const newContent = content.substring(0, start) + newText + content.substring(end);
    setContent(newContent);
    addToHistory(newContent); // 添加到历史记录
    
    // 设置光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
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
    
    // 行内代码（不在代码块内的）- 简洁的视觉样式
    html = html.replace(/`(.*?)`/g, (match, code) => {
      return `<code class="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md text-sm font-mono border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">${code}</code>`;
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
author: "${blogMetadata.author}"
slug: "${blogMetadata.slug}"
coverImage: "${blogMetadata.coverImage}"
draft: ${blogMetadata.draft}
featured: ${blogMetadata.featured}
series: "${blogMetadata.series}"
seriesOrder: ${blogMetadata.seriesOrder}
language: "${blogMetadata.language}"
canonicalUrl: "${blogMetadata.canonicalUrl}"
seoTitle: "${blogMetadata.seoTitle}"
seoDescription: "${blogMetadata.seoDescription}"
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

  // 一键生成博客元数据
  const generateBlogMetadata = () => {
    if (!content.trim()) {
      alert('请先输入文章内容，以便生成相关元数据！');
      return;
    }

    // 从内容中提取标签（查找 ## 标签 或 ### Tags 等标记）
    const tagsMatch = content.match(/^(?:##|###)\s*(?:标签|Tags?|标签[:：])\s*\n?([\s\S]*?)(?=^#|\n#|$)/im);
    let extractedTags: string[] = [];
    
    if (tagsMatch) {
      // 提取标签内容并分割
      const tagsContent = tagsMatch[1].trim();
      extractedTags = tagsContent
        .split(/[,，\s]+/) // 按逗号、空格分割
        .map(tag => tag.trim().replace(/^-|^\*|^\d+\.\s*/, '')) // 移除列表标记
        .filter(tag => tag.length > 0 && tag.length <= 20) // 过滤空标签和过长的标签
        .slice(0, 5); // 最多5个标签
    }

    // 生成URL标识
    const generateSlug = (title: string) => {
      return title
        .toLowerCase()
        .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .substring(0, 50);
    };

    // 准备临时元数据用于编辑 - 标题和摘要默认为空，分类默认为"洛佬"
    const generatedMetadata = {
      ...blogMetadata,
      title: '', // 标题默认为空
      excerpt: '', // 摘要默认为空
      tags: extractedTags.length > 0 ? extractedTags : blogMetadata.tags,
      category: '洛佬', // 分类默认为"洛佬"
      date: blogMetadata.date || new Date().toISOString().split('T')[0],
      readTime: Math.max(1, Math.ceil(wordCount / 500)),
      author: blogMetadata.author || '歆橙',
      slug: blogMetadata.slug || generateSlug(blogMetadata.title || '未命名文章'),
      coverImage: blogMetadata.coverImage || '',
      draft: blogMetadata.draft || false,
      featured: blogMetadata.featured || false,
      series: blogMetadata.series || '',
      seriesOrder: blogMetadata.seriesOrder || 1,
      language: blogMetadata.language || 'zh-CN',
      canonicalUrl: blogMetadata.canonicalUrl || '',
      seoTitle: blogMetadata.seoTitle || '',
      seoDescription: blogMetadata.seoDescription || ''
    };

    // 设置临时元数据并显示自定义对话框
    setTempMetadata(generatedMetadata);
    setShowCustomMetadataDialog(true);
  };

  // 处理发布到项目
  const handlePublish = () => {
    if (!blogMode) {
      alert('发布功能仅在博客模式下可用');
      return;
    }

    if (!blogMetadata.title.trim()) {
      alert('请输入文章标题');
      return;
    }

    if (!blogMetadata.excerpt.trim()) {
      alert('请输入文章摘要');
      return;
    }

    if (!content.trim()) {
      alert('请输入文章内容');
      return;
    }

    try {
      // 生成符合项目规范的Markdown内容
      const frontMatter = `---
title: "${blogMetadata.title}"
date: "${blogMetadata.date}"
category: "${blogMetadata.category}"
tags: [${blogMetadata.tags.map(tag => `"${tag}"`).join(', ')}]
excerpt: "${blogMetadata.excerpt}"
readTime: ${blogMetadata.readTime}
author: "${blogMetadata.author}"
slug: "${blogMetadata.slug}"
coverImage: "${blogMetadata.coverImage}"
draft: ${blogMetadata.draft}
featured: ${blogMetadata.featured}
series: "${blogMetadata.series}"
seriesOrder: ${blogMetadata.seriesOrder}
language: "${blogMetadata.language}"
canonicalUrl: "${blogMetadata.canonicalUrl}"
seoTitle: "${blogMetadata.seoTitle}"
seoDescription: "${blogMetadata.seoDescription}"
---

`;
      
      const fullContent = frontMatter + content;
      
      // 生成文件名（基于标题，转换为安全的文件名）
      const safeFileName = blogMetadata.title
        .replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase() || 'blog-post';
      
      const fileName = `${safeFileName}.md`;
      
      // 创建下载链接
      const blob = new Blob([fullContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      // 显示发布成功信息
      alert(`文章已成功生成！\n文件名：${fileName}\n请将文件保存到 src/content/blogs 目录中`);
      
    } catch (error) {
      console.error('发布失败:', error);
      alert('发布失败，请检查控制台错误信息');
    }
  };



  // 清空内容
  const handleClear = () => {
    if (confirm('确定要清空所有内容吗？')) {
      addToHistory(content); // 清空前记录当前状态
      setContent('');
      addToHistory(''); // 记录清空后的状态
    }
  };

  // 加载示例内容
  const loadSample = () => {
    addToHistory(content); // 加载示例前记录当前状态
    const sampleContent = blogMode ? getBlogTemplate() : getBasicTemplate();
    setContent(sampleContent);
    addToHistory(sampleContent); // 记录加载后的状态
    // 立即强制重新渲染以确保样式正确应用
    setRenderTrigger(prev => prev + 1);
  };
  
  // 基础模板
  const getBasicTemplate = () => {
    return `# Markdown 编辑器

欢迎使用 **Markdown 编辑器**！

## 功能特性

- ✅ 实时预览
- ✅ 智能格式化
- ✅ 快捷键支持
- ✅ 主题适配

## 代码示例

### JavaScript
\`\`\`js
const message = "Hello World";
console.log(message);
\`\`\`

### Python
\`\`\`python
message = "Hello World"
print(message)
\`\`\`

### HTML
\`\`\`html
<button>点击我</button>
\`\`\`

| 功能 | 状态 |
|------|------|
| 编辑 | ✅ |
| 预览 | ✅ |

---

> 开始创作你的技术文档吧！`;
  };
  
  // 博客模板
  const getBlogTemplate = () => {
    return `# 文章标题

> **摘要**：

> **关键词**：

---

## 引言


## 核心内容

### 第一部分


### 第二部分


## 总结


### 🏷️ 推荐标签
示例标签1, 示例标签2, 示例标签3

### 📅 发布建议
- **最佳时间**：周二至周四的上午 10-12 点
  pages: {
    signIn: '/login',
    signUp: '/register'
  }
}
\`\`\`

### 📊 性能优化策略

#### 数据获取优化

使用 Server Components 和缓存策略：

\`\`\`typescript
// app/posts/[id]/page.tsx
import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import { cache } from 'react'

// 缓存数据获取函数
const getPost = cache(async (id: string) => {
  const post = await prisma.post.findUnique({
    where: { id },
    include: {
      author: {
        select: { name: true, email: true }
      },
      comments: {
        include: {
          author: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })
  
  return post
})

export default async function PostPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const post = await getPost(params.id)
  
  if (!post) {
    notFound()
  }
  
  return (
    <article className="max-w-4xl mx-auto p-6">
      <h1 className="text-4xl font-bold mb-4">{post.title}</h1>
      <div className="text-gray-600 mb-8">
        作者: {post.author.name} | 发布时间: {new Date(post.createdAt).toLocaleDateString()}
      </div>
      <div className="prose prose-lg">{post.content}</div>
      
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-4">评论</h2>
        <CommentList comments={post.comments} />
      </section>
    </article>
  )
}
\`\`\`

#### 图片优化

使用 Next.js Image 组件优化图片加载：

\`\`\`typescript
// components/OptimizedImage.tsx
import Image from 'next/image'
import { getImageUrl } from '@/lib/utils'

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

### 🛡️ 错误处理与监控

#### 错误边界实现

创建错误边界组件处理运行时错误：

\`\`\`typescript
// components/error-boundary.tsx
'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // 这里可以发送错误到监控服务
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">出错了</h2>
          <p className="text-gray-600 mb-4">
            {this.state.error?.message || '发生了未知错误'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
\`\`\`

## 📊 效果验证

### 性能对比测试

通过实际项目测试，Next.js 15 相比前一版本在多个维度都有显著提升：

#### 核心性能指标
| 指标 | Next.js 14 | Next.js 15 | 提升幅度 |
|------|------------|------------|----------|
| 首屏加载时间 | 1.2s | 0.8s | **33% ↓** |
| 交互就绪时间 | 2.1s | 1.4s | **33% ↓** |
| JS 包大小 | 85KB | 65KB | **24% ↓** |
| 构建时间 | 45s | 32s | **29% ↓** |
| Lighthouse 评分 | 92 | 98 | **6% ↑** |

#### 用户体验指标
- **Largest Contentful Paint (LCP)**: 从 1.8s 优化到 1.2s
- **First Input Delay (FID)**: 保持在 16ms 的优秀水平
- **Cumulative Layout Shift (CLS)**: 从 0.08 优化到 0.03

### 开发者体验提升

> "Next.js 15 的开发体验真的太棒了！热更新速度明显提升，错误提示更加友好，特别是新的调试工具让我们能够快速定位和解决问题。"
> 
> —— 某大型互联网公司前端架构师

> "Server Components 的性能表现超出预期，我们的页面加载速度提升了 40%，同时 SEO 效果也有显著改善。"
> 
> —— 某电商平台技术负责人

## 🛠️ 最佳实践总结

### ✅ 强烈推荐
1. **采用 App Router**：新特性只有在 App Router 中才能完全发挥优势
2. **合理使用 Server Components**：默认使用服务端组件，只在需要客户端交互时使用 Client Components
3. **优化数据获取**：使用缓存和增量静态再生成策略
4. **重视类型安全**：充分利用 TypeScript 和 Zod 等工具
5. **建立监控体系**：集成 Sentry、LogRocket 等监控工具

### ❌ 常见陷阱
- **过度使用 Client Components**：这会失去服务端渲染的优势
- **忽视错误处理**：生产环境中一定要有完善的错误边界
- **忽略性能监控**：性能问题往往在生产环境才暴露
- **数据库查询优化不足**：N+1 查询问题在服务端渲染中影响更大

## 🔮 未来发展趋势

### 技术演进方向
- **边缘计算集成**：Next.js 与边缘计算平台的深度整合
- **AI 辅助开发**：智能化的代码生成和优化建议
- **微前端支持**：更好的大型应用架构支持
- **WebAssembly 集成**：利用 WASM 提升计算密集型任务性能

### 生态系统展望
- **更多数据库适配器**：Prisma、Drizzle ORM 的深度集成
- **云服务集成**：Vercel、Netlify、AWS 等平台的原生支持
- **开发工具完善**：更强大的调试、测试、部署工具链

## 📖 总结

### 核心要点回顾
1. **技术选型**：Next.js 15 + React 19 提供了强大的全栈开发能力
2. **架构设计**：合理规划项目结构，分离关注点
3. **性能优化**：从多个维度提升应用性能和用户体验
4. **最佳实践**：遵循推荐的模式，避免常见陷阱

### 行动建议
- **立即开始**：使用本文提供的模板和最佳实践开始你的 Next.js 15 项目
- **持续学习**：关注官方文档和社区动态，及时了解新特性
- **实践验证**：在实际项目中验证这些最佳实践的效果
- **分享经验**：将你的经验分享给社区，共同推进技术进步

---

> **💡 开发小贴士**：
> - 使用 \`next dev --turbo\` 启用 Turbopack 加速开发
> - 配置 \`experimental.optimizeCss\` 优化生产环境 CSS
> - 利用 \`@next/bundle-analyzer\` 分析包大小
> - 设置 \`images.domains\` 优化图片加载

### 🏷️ 推荐标签
Next.js, React 19, 全栈开发, 性能优化, TypeScript, Server Components, App Router

### 📅 发布建议
- **最佳时间**：周二至周四的上午 10-12 点
- **预热策略**：提前在社交媒体分享关键观点
- **互动跟进**：发布后及时回复评论，与读者互动
- **后续更新**：根据读者反馈持续完善内容`;
  };
  
  // 渲染自定义元数据对话框
  const renderCustomMetadataDialog = () => {
    if (!showCustomMetadataDialog) return null;

    return (
      <div className="fixed inset-0 bg-black/20 dark:bg-gray-900/20 backdrop-blur-md flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            ✨ 自定义博客元数据
          </h3>
          
          <div className="space-y-4">
            {/* 基础元数据 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  文章标题
                </label>
                <input
                  type="text"
                  value={tempMetadata.title}
                  onChange={(e) => setTempMetadata(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="输入文章标题"
                />
              </div>
              
              {/* 作者 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  作者
                </label>
                <input
                  type="text"
                  value={tempMetadata.author}
                  onChange={(e) => setTempMetadata(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="作者名称"
                />
              </div>
              
              {/* 分类 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  分类
                </label>
                <select
                  value={tempMetadata.category}
                  onChange={(e) => setTempMetadata(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              
              {/* 日期 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  发布日期
                </label>
                <input
                  type="date"
                  value={tempMetadata.date}
                  onChange={(e) => setTempMetadata(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              {/* 语言 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  语言
                </label>
                <select
                  value={tempMetadata.language}
                  onChange={(e) => setTempMetadata(prev => ({ ...prev, language: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="zh-TW">繁體中文</option>
                  <option value="en-US">English</option>
                  <option value="ja-JP">日本語</option>
                </select>
              </div>
              
              {/* 系列 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  系列名称
                </label>
                <input
                  type="text"
                  value={tempMetadata.series}
                  onChange={(e) => setTempMetadata(prev => ({ ...prev, series: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="系列文章名称（可选）"
                />
              </div>
            </div>
            
            {/* 标签 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                标签 (用逗号分隔)
              </label>
              <input
                type="text"
                value={tempMetadata.tags.join(', ')}
                onChange={(e) => {
                  const tags = e.target.value.split(/[,，\s]+/).map(tag => tag.trim()).filter(tag => tag.length > 0);
                  setTempMetadata(prev => ({ ...prev, tags: tags.slice(0, 5) }));
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder="例如: Next.js, React, 前端开发"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                最多5个标签，当前: {tempMetadata.tags.length}
              </p>
            </div>
            
            {/* 摘要 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                文章摘要
              </label>
              <textarea
                value={tempMetadata.excerpt}
                onChange={(e) => setTempMetadata(prev => ({ ...prev, excerpt: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                rows={3}
                placeholder="输入文章摘要"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {tempMetadata.excerpt.length}/200 字符
              </p>
            </div>
            
            {/* 高级元数据切换 */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowAdvancedMetadata(!showAdvancedMetadata)}
                className="flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {showAdvancedMetadata ? '收起高级设置' : '展开高级设置'}
                <svg 
                  className={`ml-1 w-4 h-4 transform transition-transform ${showAdvancedMetadata ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
            
            {/* 高级元数据 */}
            {showAdvancedMetadata && (
              <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 草稿状态 */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={tempMetadata.draft}
                        onChange={(e) => setTempMetadata(prev => ({ ...prev, draft: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        草稿状态
                      </span>
                    </label>
                  </div>
                  
                  {/* 特色文章 */}
                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={tempMetadata.featured}
                        onChange={(e) => setTempMetadata(prev => ({ ...prev, featured: e.target.checked }))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        特色文章
                      </span>
                    </label>
                  </div>
                  
                  {/* 系列顺序 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      系列顺序
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={tempMetadata.seriesOrder}
                      onChange={(e) => setTempMetadata(prev => ({ ...prev, seriesOrder: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="1"
                    />
                  </div>
                  
                  {/* 封面图片 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      封面图片
                    </label>
                    <input
                      type="url"
                      value={tempMetadata.coverImage}
                      onChange={(e) => setTempMetadata(prev => ({ ...prev, coverImage: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  
                  {/* 规范URL */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      规范URL
                    </label>
                    <input
                      type="url"
                      value={tempMetadata.canonicalUrl}
                      onChange={(e) => setTempMetadata(prev => ({ ...prev, canonicalUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="https://example.com/original-post"
                    />
                  </div>
                  
                  {/* SEO标题 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SEO标题
                    </label>
                    <input
                      type="text"
                      value={tempMetadata.seoTitle}
                      onChange={(e) => setTempMetadata(prev => ({ ...prev, seoTitle: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="优化搜索引擎显示的标题（可选）"
                    />
                  </div>
                  
                  {/* SEO描述 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      SEO描述
                    </label>
                    <textarea
                      value={tempMetadata.seoDescription}
                      onChange={(e) => setTempMetadata(prev => ({ ...prev, seoDescription: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      rows={2}
                      placeholder="优化搜索引擎显示的描述（可选）"
                      maxLength={160}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {tempMetadata.seoDescription.length}/160 字符
                    </p>
                  </div>
                  
                  {/* URL标识 */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL标识
                    </label>
                    <input
                      type="text"
                      value={tempMetadata.slug}
                      onChange={(e) => setTempMetadata(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="文章URL的自定义标识（可选）"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      留空将自动生成基于标题的标识
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 按钮组 */}
          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => {
                setBlogMetadata(tempMetadata);
                setShowCustomMetadataDialog(false);
              }}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              应用更改
            </button>
            <button
              onClick={() => setShowCustomMetadataDialog(false)}
              className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors text-sm font-medium"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    );
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
          
          {/* 基础元数据 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">基础元数据</h4>
            <div className="space-y-3">
              {/* 作者 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  作者
                </label>
                <input
                  type="text"
                  value={blogMetadata.author}
                  onChange={(e) => handleBlogMetadataChange('author', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="文章作者"
                />
              </div>
              
              {/* 语言 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  语言
                </label>
                <select
                  value={blogMetadata.language}
                  onChange={(e) => handleBlogMetadataChange('language', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="zh-CN">简体中文</option>
                  <option value="zh-TW">繁體中文</option>
                  <option value="en-US">English</option>
                  <option value="ja-JP">日本語</option>
                  <option value="ko-KR">한국어</option>
                </select>
              </div>
              
              {/* 系列文章 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  系列名称
                </label>
                <input
                  type="text"
                  value={blogMetadata.series}
                  onChange={(e) => handleBlogMetadataChange('series', e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="系列文章名称（可选）"
                />
              </div>
              
              {/* 系列顺序 */}
              {blogMetadata.series && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    系列顺序
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={blogMetadata.seriesOrder}
                    onChange={(e) => handleBlogMetadataChange('seriesOrder', parseInt(e.target.value) || 1)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* 高级设置 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">高级设置</h4>
              <button
                onClick={() => setShowAdvancedMetadata(!showAdvancedMetadata)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
              >
                {showAdvancedMetadata ? '收起' : '展开'}
              </button>
            </div>
            
            {showAdvancedMetadata && (
              <div className="space-y-3">
                {/* 草稿状态 */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="draft"
                    checked={blogMetadata.draft}
                    onChange={(e) => handleBlogMetadataChange('draft', e.target.checked)}
                    className="h-3 w-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="draft" className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                    草稿文章
                  </label>
                </div>
                
                {/* 特色文章 */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={blogMetadata.featured}
                    onChange={(e) => handleBlogMetadataChange('featured', e.target.checked)}
                    className="h-3 w-3 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="featured" className="ml-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                    特色文章
                  </label>
                </div>
                
                {/* 封面图片 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    封面图片
                  </label>
                  <input
                    type="url"
                    value={blogMetadata.coverImage}
                    onChange={(e) => handleBlogMetadataChange('coverImage', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                
                {/* URL标识 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    URL标识
                  </label>
                  <input
                    type="text"
                    value={blogMetadata.slug}
                    onChange={(e) => handleBlogMetadataChange('slug', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="留空将自动生成"
                  />
                </div>
                
                {/* 规范URL */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    规范URL
                  </label>
                  <input
                    type="url"
                    value={blogMetadata.canonicalUrl}
                    onChange={(e) => handleBlogMetadataChange('canonicalUrl', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/original-post"
                  />
                </div>
                
                {/* SEO标题 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SEO标题
                  </label>
                  <input
                    type="text"
                    value={blogMetadata.seoTitle}
                    onChange={(e) => handleBlogMetadataChange('seoTitle', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="针对搜索引擎优化的标题"
                  />
                </div>
                
                {/* SEO描述 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SEO描述
                  </label>
                  <textarea
                    value={blogMetadata.seoDescription}
                    onChange={(e) => handleBlogMetadataChange('seoDescription', e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="针对搜索引擎优化的描述（150-160字符）"
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* 快速操作 */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">快速操作</h4>
            <div className="space-y-2">
              <button
                onClick={generateBlogMetadata}
                className="w-full px-3 py-2 text-sm bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
              >
                ✨ 生成元数据
              </button>
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
              {blogMetadata.author && (
                <>
                  <span>•</span>
                  <span>{blogMetadata.author}</span>
                </>
              )}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              {blogMetadata.title || '无标题文章'}
            </h1>
            {blogMetadata.excerpt && (
              <p className="text-lg text-gray-600 dark:text-gray-300 italic">
                {blogMetadata.excerpt}
              </p>
            )}
            {blogMetadata.series && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 rounded">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  📚 系列文章: {blogMetadata.series}
                  {blogMetadata.seriesOrder > 1 && (
                    <span className="ml-2 text-blue-600 dark:text-blue-400">
                      (第{blogMetadata.seriesOrder}篇)
                    </span>
                  )}
                </p>
              </div>
            )}
            {blogMetadata.draft && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 rounded">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  📝 这是一篇草稿文章
                </p>
              </div>
            )}
            {blogMetadata.featured && (
              <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 rounded">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  ⭐ 这是一篇特色文章
                </p>
              </div>
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
            {blogMetadata.language && (
              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                语言: {blogMetadata.language}
              </div>
            )}
            {(blogMetadata.canonicalUrl || blogMetadata.slug) && (
              <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                {blogMetadata.canonicalUrl && (
                  <div>规范URL: <a href={blogMetadata.canonicalUrl} className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">{blogMetadata.canonicalUrl}</a></div>
                )}
                {blogMetadata.slug && (
                  <div>URL标识: {blogMetadata.slug}</div>
                )}
              </div>
            )}
            {(blogMetadata.seoTitle || blogMetadata.seoDescription) && (
              <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded text-xs">
                <div className="font-medium text-gray-700 dark:text-gray-300 mb-1">SEO信息:</div>
                {blogMetadata.seoTitle && <div className="text-gray-600 dark:text-gray-400">标题: {blogMetadata.seoTitle}</div>}
                {blogMetadata.seoDescription && <div className="text-gray-600 dark:text-gray-400">描述: {blogMetadata.seoDescription}</div>}
              </div>
            )}
          </footer>
        </article>
      </div>
    );
  };

  return (
    <div className="w-full backdrop-blur-sm bg-white/30 dark:bg-gray-900/30">
      {/* 工具栏 - 超紧凑设计 */}
        <div className={`mb-3 p-2 rounded-lg border ${isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-white/50 border-gray-200/50'} shadow-sm backdrop-blur-sm`}>
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
              onClick={undo}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                historyIndex <= 0
                  ? (isDark ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed')
                  : (isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300')
              }`}
              title="撤销 (Ctrl+Z)"
              disabled={historyIndex <= 0}
            >
              ↶ 撤销
            </button>
            <button
              onClick={redo}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                historyIndex >= history.length - 1
                  ? (isDark ? 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed' : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed')
                  : (isDark ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 border-gray-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300')
              }`}
              title="重做 (Ctrl+Y)"
              disabled={historyIndex >= history.length - 1}
            >
              ↷ 重做
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
            {blogMode && (
              <>
                <button
                  onClick={generateBlogMetadata}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                    isDark ? 'bg-yellow-600 hover:bg-yellow-700 text-white border-yellow-500' : 'bg-yellow-500 hover:bg-yellow-600 text-white border-yellow-400'
                  }`}
                  title="一键生成博客元数据"
                >
                  生成元数据
                </button>
                <button
                  onClick={handlePublish}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 ${
                    isDark ? 'bg-green-600 hover:bg-green-700 text-white border-green-500' : 'bg-green-500 hover:bg-green-600 text-white border-green-400'
                  }`}
                  title="发布到项目"
                >
                  发布
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 编辑器主体 */}
      <div className="flex gap-4" style={{ height }}>
        {/* 博客模式下显示元数据面板 */}
        {blogMode && showMetadataPanel && renderBlogMetadataPanel()}
        
        {/* 编辑区域 - 更紧凑 */}
        {(previewMode === 'edit' || previewMode === 'split') && (
          <div className={`${previewMode === 'split' ? 'w-1/2' : 'w-full'} rounded-lg border ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'} overflow-hidden backdrop-blur-sm`}>
            <div className={`px-3 py-2 border-b ${isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-50/50 border-gray-200/50'} backdrop-blur-sm`}>
              <h3 className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                ✏️ 编辑器
              </h3>
            </div>
            <div className="h-full">
              <textarea
                name="markdown-content"
                value={content}
                onChange={(e) => {
                  const newContent = e.target.value;
                  setContent(newContent);
                  addToHistory(newContent);
                }}
                onSelect={handleTextSelection}
                className={`w-full h-full p-3 resize-none focus:outline-none transition-colors duration-200 ${
                  isDark 
                    ? 'bg-gray-800/50 text-gray-100 placeholder-gray-400' 
                    : 'bg-white/50 text-gray-900 placeholder-gray-500'
                }`}
                placeholder="编写 Markdown... 快捷键：Ctrl+B 粗体，Ctrl+I 斜体，Ctrl+K 链接，Ctrl+S 保存，Ctrl+Z 撤销，Ctrl+Y 重做   祝您使用愉快！"
              />
            </div>
          </div>
        )}

        {/* 预览区域 - 修复背景透明问题 */}
        {(previewMode === 'preview' || previewMode === 'split') && (
          <div className={`${previewMode === 'split' ? 'w-1/2' : 'w-full'} rounded-lg border ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'} overflow-hidden bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm`}>
            <div className={`px-3 py-2 border-b ${isDark ? 'bg-gray-800/50 border-gray-700/50' : 'bg-gray-50/50 border-gray-200/50'} backdrop-blur-sm`}>
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
      <div className={`mt-3 px-3 py-1.5 rounded-lg border text-xs backdrop-blur-sm ${
        isDark 
          ? 'bg-gray-800/50 border-gray-700/50 text-gray-300' 
          : 'bg-gray-50/50 border-gray-200/50 text-gray-600'
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
            快捷键: Ctrl+B 粗体, Ctrl+I 斜体, Ctrl+K 链接, Ctrl+S 保存, Ctrl+Z 撤销, Ctrl+Y 重做
          </div>
        </div>
      </div>

      {/* 自定义元数据对话框 */}
      {renderCustomMetadataDialog()}
    </div>
  );
}