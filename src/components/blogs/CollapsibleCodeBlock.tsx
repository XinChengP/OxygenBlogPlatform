'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
// 按需注册语言的 Prism 轻量版（全量入口会把 300 种语言打进 chunk，见 prismLanguages.ts）
import SyntaxHighlighter from '@/components/ui/prismLanguages';
import CodeCopyButton from '@/components/CodeCopyButton';

// 折叠状态下展示的行数
const COLLAPSED_VISIBLE_LINES = 30;

interface CollapsibleCodeBlockProps {
  /** 完整代码内容 */
  code: string;
  /** 传给高亮器的语言标识（已归一化） */
  language: string;
  /** 头部展示的语言名称 */
  displayName: string;
  /** react-syntax-highlighter 主题（随明暗模式切换） */
  syntaxTheme: Record<string, React.CSSProperties>;
}

/**
 * 可折叠代码块
 *
 * 超过 COLLAPSED_VISIBLE_LINES 行的代码默认折叠：只渲染并高亮前若干行，
 * 底部叠加渐隐遮罩和"展开全部"按钮，避免几千行代码一次性构建 DOM 拖慢页面。
 * 行数不足时不折叠，外观与普通代码块保持一致。
 */
export default function CollapsibleCodeBlock({
  code,
  language,
  displayName,
  syntaxTheme,
}: CollapsibleCodeBlockProps) {
  const [expanded, setExpanded] = useState(false);

  const lines = useMemo(() => code.split('\n'), [code]);
  const totalLines = lines.length;
  const collapsible = totalLines > COLLAPSED_VISIBLE_LINES;
  const collapsed = collapsible && !expanded;

  // 折叠时只把前 N 行交给高亮器，完整内容仍由复制按钮与展开后的渲染提供
  const visibleCode = collapsed ? lines.slice(0, COLLAPSED_VISIBLE_LINES).join('\n') : code;

  return (
    <div className="relative my-6 rounded-2xl overflow-hidden shadow-lg border border-border/30">
      {/* 代码块头部 - 玻璃态风格 */}
      <div className="flex justify-between items-center bg-gradient-to-r from-card/90 to-card/70 backdrop-blur-md px-4 py-3 text-sm border-b border-border/30">
        <div className="flex items-center gap-3">
          {/* 窗口控制点装饰 */}
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400/80 shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-400/80 shadow-sm"></span>
            <span className="w-3 h-3 rounded-full bg-green-400/80 shadow-sm"></span>
          </div>
          <span className="font-medium text-foreground/80 ml-2">{displayName}</span>
          {collapsible && (
            <span className="text-xs text-muted-foreground/80">共 {totalLines.toLocaleString()} 行</span>
          )}
        </div>
        <CodeCopyButton
          code={code}
          size="sm"
          showText={true}
          className="text-foreground/70 hover:text-primary hover:bg-primary/10"
        />
      </div>

      {/* 代码内容区域 */}
      <div className={`relative overflow-hidden ${collapsible ? 'bg-card' : ''}`}>
        <SyntaxHighlighter
          style={syntaxTheme as any}
          language={language}
          PreTag="div"
          className="!bg-transparent"
          customStyle={{
            margin: 0,
            borderRadius: 0,
            background: 'transparent',
          }}
          codeTagProps={{
            style: {
              background: 'transparent',
            }
          }}
        >
          {visibleCode}
        </SyntaxHighlighter>

        {/* 折叠时的底部渐隐遮罩 */}
        <AnimatePresence>
          {collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none"
            />
          )}
        </AnimatePresence>
      </div>

      {/* 展开/收起控制条 */}
      {collapsible && (
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border/30 bg-card/60 py-2.5 text-sm text-primary/80 transition-colors hover:bg-primary/5 hover:text-primary"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          {expanded ? '收起代码' : `展开全部（共 ${totalLines.toLocaleString()} 行）`}
        </button>
      )}
    </div>
  );
}
