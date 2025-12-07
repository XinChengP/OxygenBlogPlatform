'use client';

import { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow, prism } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Download, Copy, Check, FileText, Eye, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from 'next-themes';
import { cn } from '@/utils/cn';
import 'highlight.js/styles/github.css';
import 'highlight.js/styles/github-dark.css';

interface MarkdownEditorProps {
  className?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  initialContent?: string;
  height?: string;
  blogMode?: boolean;
}

const toolbarItems = [
  { icon: '**粗体**', label: '粗体', action: '**' },
  { icon: '*斜体*', label: '斜体', action: '*' },
  { icon: '# 标题', label: '标题', action: '# ' },
  { icon: '[链接](url)', label: '链接', action: '[](http://)' },
  { icon: '`代码`', label: '行内代码', action: '`' },
  { icon: '```\n代码块\n```', label: '代码块', action: '```\n\n```' },
  { icon: '- 列表', label: '无序列表', action: '- ' },
  { icon: '1. 列表', label: '有序列表', action: '1. ' },
  { icon: '> 引用', label: '引用', action: '> ' },
  { icon: '---', label: '分割线', action: '\n---\n' },
];

export default function MarkdownEditor({ 
  className, 
  defaultValue = '', 
  onChange, 
  initialContent,
  height = '600px',
  blogMode = false
}: MarkdownEditorProps) {
  const [content, setContent] = useState(initialContent || defaultValue);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const { theme } = useTheme();

  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    onChange?.(value);
  }, [onChange]);

  const insertText = useCallback((before: string, after: string = '') => {
    const textarea = document.querySelector('textarea');
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    
    handleContentChange(newText);
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  }, [content, handleContentChange]);

  const handleToolbarClick = useCallback((action: string) => {
    const lines = action.split('\n');
    if (lines.length > 1) {
      insertText(lines[0] + '\n', '\n' + lines[lines.length - 1]);
    } else {
      const match = action.match(/^(\[.*\]\()(.*)(\))$/);
      if (match) {
        insertText(match[1], match[3]);
      } else {
        const beforeMatch = action.match(/^(.+)(\*+)$/);
        if (beforeMatch) {
          insertText(beforeMatch[1], beforeMatch[2]);
        } else {
          insertText(action);
        }
      }
    }
  }, [insertText]);

  const copyToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('复制失败:', error);
    }
  }, [content]);

  const downloadFile = useCallback(() => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  const downloadHtml = useCallback(() => {
    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown文档</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
        code { background: #f6f8fa; padding: 2px 4px; border-radius: 3px; font-family: 'Monaco', 'Consolas', monospace; }
        blockquote { border-left: 4px solid #dfe2e5; padding-left: 16px; margin: 0; color: #6a737d; }
    </style>
</head>
<body>
    ${content}
</body>
</html>`;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'document.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content]);

  const syntaxTheme = useMemo(() => {
    return theme === 'dark' ? tomorrow : prism;
  }, [theme]);

  const components = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={syntaxTheme}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  };

  return (
    <div className={cn('flex flex-col bg-background', className)} style={{ height }}>
      {/* 工具栏 */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card/50">
        <div className="flex items-center gap-2 flex-wrap">
          {toolbarItems.map((item, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => handleToolbarClick(item.action)}
              className="text-xs h-8 px-2"
              title={item.label}
            >
              {item.icon.length > 10 ? item.label : item.icon}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? <Edit3 className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? '编辑' : '预览'}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? '已复制' : '复制'}
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadFile}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            下载MD
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={downloadHtml}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            下载HTML
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 flex relative overflow-hidden">
        {!showPreview ? (
          <Textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="在这里输入 Markdown 内容...\n\n支持：\n- 标题：# 标题\n- 粗体：**粗体**\n- 斜体：*斜体*\n- 代码：`code`\n- 链接：[文字](url)\n- 图片：![alt](url)\n- 列表：- 项目\n- 引用：> 引用\n- 代码块：```语言\n代码\n```"
            className="flex-1 resize-none border-0 rounded-none focus:ring-0 focus:ring-offset-0 p-6 text-sm leading-relaxed font-mono"
            rows={20}
          />
        ) : (
          <div className="flex-1 overflow-auto">
            <div className="p-6 prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={components}
              >
                {content || '*开始编写 Markdown 内容...*'}
              </ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* 状态栏 */}
      <div className="flex items-center justify-between p-2 text-xs text-muted-foreground border-t border-border bg-card/30">
        <div className="flex items-center gap-4">
          <span>字符数: {content.length}</span>
          <span>行数: {content.split('\n').length}</span>
          <span>词数: {content.trim() ? content.trim().split(/\s+/).length : 0}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-xs">
            Markdown
          </span>
          {showPreview && (
            <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs">
              预览模式
            </span>
          )}
        </div>
      </div>
    </div>
  );
}