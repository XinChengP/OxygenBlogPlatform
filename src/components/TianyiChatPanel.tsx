'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Loader2, Send, X } from 'lucide-react';

import live2dMessageManager from '@/utils/live2dMessageManager';

interface ChatSource {
  title: string;
  /** 站内路径（/blogs/slug/、/moments/、/tools/ 等） */
  url: string;
  /** 来源类型：blog | moment | changelog | site */
  type?: string;
}

interface ChatMessage {
  /** 自增稳定 id：列表渲染 key（项目规范禁止用 index 作 key） */
  id: number;
  role: 'user' | 'tianyi';
  text: string;
  sources?: ChatSource[];
}

/** 来源类型的图标与标签 */
const SOURCE_TYPE_META: Record<string, { icon: string; label: string }> = {
  blog: { icon: '📄', label: '文章' },
  moment: { icon: '📝', label: '动态' },
  changelog: { icon: '🛠️', label: '更新日志' },
  site: { icon: '🏠', label: '站点' },
};

interface TianyiChatPanelProps {
  onClose: () => void;
}

/**
 * 把天依回答里的【编号】引用渲染成可点击的内联文章链接。
 *
 * 服务端提示词强制模型只能用【编号】引用文章（编号之外的标题一律视为幻觉），
 * 编号 → 来源的映射由返回的 sources 决定，前端不信任回答文本里的任何标题。
 */
function renderAnswerWithSources(
  text: string,
  sources: ChatSource[] | undefined,
  onSourceClick: () => void
) {
  if (!sources || sources.length === 0) return text;

  const parts = text.split(/(【\d+】)/g);
  return parts.map((part, index) => {
    const match = /^【(\d+)】$/.exec(part);
    if (match) {
      const source = sources[Number(match[1]) - 1];
      if (source) {
        return (
          <Link
            key={index}
            href={source.url}
            onClick={onSourceClick}
            className="text-primary hover:underline mx-0.5"
            title={source.title}
          >
            {source.title}
          </Link>
        );
      }
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * 天依 AI 导览面板（挂在 Live2D 看板娘上方）
 *
 * 数据来源：同源 /api/interactions/chat（Workers AI + Vectorize RAG）。
 * 回答同时在 Live2D 气泡里推送前 60 字，完整内容与文章卡在面板内展示。
 * 限流（单人 8 问/小时、全站 200 问/天）由服务端控制，这里只做友好文案。
 */
export default function TianyiChatPanel({ onClose }: TianyiChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: 'tianyi',
      text: '你好呀awa，我是天依！博客里写了什么、文章在哪，直接问我就好～',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  // 消息自增 id 发号器（ref 不触发重渲染）
  const nextId = useRef(1);

  // 新消息自动滚到底部
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const question = input.trim();
    if (!question || loading) return;
    setInput('');
    setMessages((prev) => [...prev, { id: nextId.current++, role: 'user', text: question }]);
    setLoading(true);

    try {
      const response = await fetch('/api/interactions/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
        signal: AbortSignal.timeout(45_000),
      });
      const data = (await response.json().catch(() => ({}))) as {
        answer?: string;
        sources?: ChatSource[];
        /** 服务端错误码：rate_limited=个人问太快 / daily_limit_reached=全站今日额度用完 */
        error?: string;
      };

      let answer: string;
      let success = false;
      if (response.ok) {
        answer = data.answer || '天依走神了，再问一次好不好？';
        success = true;
      } else if (response.status === 429) {
        // 区分两类限流：全站今日额度耗尽（不是读者的错）与个人问得太快
        answer = data.error === 'daily_limit_reached'
          ? '今天大家问得太热情啦，问答额度用完咯，明天再来找我了～'
          : '问得有点太快啦，休息一下再问我 qwq';
      } else if (response.status === 503) {
        answer = '天依的大脑还没配置好，等歆橙修一修～';
      } else {
        answer = '网络好像不太顺畅，稍后再试试？';
      }

      // 失败时把问题回填到输入框（仅当用户没输入新内容），方便直接重试
      if (!success) setInput((cur) => cur || question);
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: 'tianyi', text: answer, sources: data.sources },
      ]);
      // 成功的回答同步推进 Live2D 气泡：气泡只显示前 60 字，完整内容看面板；
      // 错误提示只在面板内展示，不推气泡（避免同一句话出现两遍）
      if (success) {
        live2dMessageManager.showMessage(
          `${answer.slice(0, 60)}${answer.length > 60 ? '…' : ''}`,
          6000,
          4
        );
      }
    } catch {
      // 网络异常同样回填问题，让读者能直接重试
      setInput((cur) => cur || question);
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: 'tianyi', text: '网络好像断断了，稍后再问我一次？' },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // 中文输入法组合中的回车不发送
    if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void send();
    }
  };

  return (
    <div
      className="absolute bottom-[calc(100%+12px)] right-0 w-[320px] max-w-[86vw] z-[10003]
                 flex flex-col rounded-2xl border border-border/50 bg-card/95 backdrop-blur-md shadow-2xl"
      style={{ maxHeight: 'min(480px, 70vh)' }}
      role="dialog"
      aria-label="问天依"
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <span aria-hidden="true">🎶</span>
          问天依
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭问答面板"
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 消息列表 */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2.5 text-xs leading-relaxed">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-xl px-2.5 py-1.5 whitespace-pre-wrap break-words ${
                message.role === 'user'
                  ? 'bg-primary/15 text-foreground rounded-br-sm'
                  : 'bg-muted/70 text-foreground rounded-bl-sm'
              }`}
            >
              {message.role === 'tianyi'
                ? renderAnswerWithSources(message.text, message.sources, onClose)
                : message.text}
              {/*
                来源卡：仅在回答没有【编号】内联引用时渲染，避免同一来源出现两遍
                （类型图标区分文章/动态/日志/站点页面；按 url 去重防重复）
              */}
              {message.role === 'tianyi' &&
                message.sources &&
                message.sources.length > 0 &&
                !/【\d+】/.test(message.text) &&
                (() => {
                  const seen = new Set<string>();
                  const uniqueSources = message.sources.filter((source) => {
                    if (seen.has(source.url)) return false;
                    seen.add(source.url);
                    return true;
                  });
                  return (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {uniqueSources.map((source) => {
                        const typeMeta = SOURCE_TYPE_META[source.type ?? 'blog'] ?? SOURCE_TYPE_META.blog;
                        return (
                          <Link
                            key={source.url}
                            href={source.url}
                            onClick={onClose}
                            className="inline-flex items-center gap-0.5 rounded-full border border-primary/30 bg-primary/10
                                       px-2 py-0.5 text-[10px] text-primary hover:bg-primary/20 transition-colors"
                          >
                            <span aria-hidden="true">{typeMeta.icon}</span>
                            {source.title}
                          </Link>
                        );
                      })}
                    </div>
                  );
                })()}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-xl bg-muted/70 px-2.5 py-1.5 text-muted-foreground flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
              天依思考中…
            </div>
          </div>
        )}
      </div>

      {/* 输入行 */}
      <div className="flex items-center gap-1.5 px-2.5 py-2 border-t border-border/40">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="问问天依：有没有讲 XX 的文章？"
          maxLength={200}
          className="flex-1 min-w-0 rounded-lg border border-border/50 bg-background/70 px-2.5 py-1.5 text-xs
                     text-foreground placeholder:text-muted-foreground/60
                     focus:outline-none focus:ring-1 focus:ring-primary/40"
          aria-label="向天依提问"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={loading || !input.trim()}
          aria-label="发送"
          className="flex-shrink-0 p-1.5 rounded-lg bg-primary text-primary-foreground
                     transition-colors hover:bg-primary/90 disabled:opacity-40"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
