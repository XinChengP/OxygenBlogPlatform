'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useBackgroundStyle } from '../hooks/useBackgroundStyle';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import type { TocItem } from '@/utils/tocUtils';
import { isElectron } from '@/utils/isElectron';

interface TableOfContentsProps {
  items: TocItem[];
}

/**
 * 滚动到指定元素
 */
const scrollToElement = (id: string) => {
  const element = document.getElementById(id);
  
  if (element) {
    const offset = 120;
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    // Electron 桌面端始终用平滑滚动，不受系统减少动态效果影响
    const reduceMotion = !isElectron() && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({
      top: elementPosition - offset,
      behavior: reduceMotion ? 'auto' : 'smooth'
    });
    // 同步地址栏 hash，便于复制定位链接（replaceState 不会触发额外滚动）
    history.replaceState(null, '', `#${encodeURIComponent(id)}`);
  }
};

/**
 * 获取当前激活的标题
 * 传入挂载时缓存好的元素与 offsetTop，避免每个滚动事件都查询 DOM/读取布局
 */
const getActiveHeading = (
  headings: TocItem[],
  elements: Array<{ id: string; top: number }>,
): string => {
  const scrollY = window.scrollY + 120;
  
  for (let i = elements.length - 1; i >= 0; i--) {
    if (scrollY >= elements[i].top) {
      return elements[i].id;
    }
  }
  
  return headings[0]?.id || '';
};

export default function TableOfContents({ items }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [isMobile, setIsMobile] = useState(true); // 默认为移动端，避免闪烁
  const [isCollapsed, setIsCollapsed] = useState(true); // 默认收起
  const headings = items;
  const headingTopsRef = useRef<Array<{ id: string; top: number }>>([]);
  const didInitCollapseRef = useRef(false);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);
  const { isBackgroundEnabled } = useBackgroundStyle('blog-detail');

  useBodyScrollLock(isMobile && isOpen);

  // 毛玻璃样式函数
  const getGlassStyle = (baseClasses: string) => {
    if (isBackgroundEnabled) {
      return `${baseClasses} glass-card`;
    }
    return `bg-card ${baseClasses} border-border`;
  };

  // 缓存标题元素的文档偏移；窗口变化与内容稳定后重新测量
  useEffect(() => {
    const measure = () => {
      headingTopsRef.current = headings
        .map((heading) => {
          const element = document.getElementById(heading.id);
          return element
            ? { id: heading.id, top: element.getBoundingClientRect().top + window.scrollY }
            : null;
        })
        .filter((item): item is { id: string; top: number } => item !== null);
    };

    measure();
    const timer = setTimeout(measure, 500);
    window.addEventListener('resize', measure);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', measure);
    };
  }, [headings]);

  // 仅首次按窗口宽度设置收起状态，之后保留用户的手动选择
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!didInitCollapseRef.current) {
        didInitCollapseRef.current = true;
        setIsCollapsed(!mobile && window.innerWidth < 1200);
      }
    };

    checkMobile();
    const mq = window.matchMedia('(max-width: 767px)');
    mq.addEventListener('change', checkMobile);

    return () => mq.removeEventListener('change', checkMobile);
  }, []);

  // 滚动高亮：rAF 合并 + 使用缓存偏移，避免每个 scroll 事件读取 layout
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const active = getActiveHeading(headings, headingTopsRef.current);
        setActiveId(prev => (prev === active ? prev : active));
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  // 移动端抽屉：Esc 关闭并归还焦点
  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        mobileTriggerRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, isOpen]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <>
      {/* 移动端触发按钮 */}
      {isMobile && (
        <button
          ref={mobileTriggerRef}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? '关闭文章目录' : '打开文章目录'}
          aria-expanded={isOpen}
          aria-controls="article-toc"
          /*
            位置说明：不能沿用 bottom-6，否则会与右下角全局的 ScrollToTop 按钮组重叠。
            全局按钮组横向占用 right-6（24px）至 68px，纵向自底部 24px 起向上堆叠，
            默认三个按钮（设置 / 回到顶部 / 转到页底）共占 24px ~ 172px 的高度区间。
            因此这里把按钮抬到 180px（172px 上限再加 8px 间隙），使其恰好位于按钮组正上方，
            两者不再互相遮挡；横向仍保持 right-4，视觉上与本页其他浮动元素对齐。
          */
          className={getGlassStyle("fixed bottom-[180px] right-4 z-50 w-12 h-12 rounded-full shadow-lg border flex items-center justify-center transition-all duration-200 hover:shadow-xl")}
        >
          <svg
            className="w-5 h-5 text-foreground/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h8m-8 6h16"
            />
          </svg>
        </button>
      )}

      {/* 背景遮罩 - 仅移动端 */}
      {isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 z-20 transition-opacity duration-300"
          onClick={() => {
            setIsOpen(false);
            mobileTriggerRef.current?.focus();
          }}
          aria-hidden="true"
        />
      )}

      {/* 桌面端展开按钮 - 收起时显示 */}
      {!isMobile && isCollapsed && (
        <div className="fixed right-24 z-40" style={{ top: '80px' }}>
          <button
            onClick={() => setIsCollapsed(false)}
            className={getGlassStyle("p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shadow-sm border")}
            title="展开目录"
            aria-label="展开目录"
            aria-expanded={false}
            aria-controls="article-toc"
          >
            <svg 
              className="w-4 h-4" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* 目录侧边栏 */}
      <div
        id="article-toc"
        role={isMobile ? 'dialog' : undefined}
        aria-modal={isMobile && isOpen ? true : undefined}
        aria-label="文章大纲"
        aria-hidden={isMobile ? !isOpen : isCollapsed}
        inert={isMobile ? !isOpen : isCollapsed}
        className={`
          fixed z-30 transition-all duration-300 ease-in-out flex flex-col
          ${isMobile ? (
            `w-1/2 h-full right-0 ${
              isOpen ? 'translate-x-0' : 'translate-x-full'
            } ${getGlassStyle("border-l shadow-sm")}`
          ) : (
            `w-64 right-20 ${
              isCollapsed ? 'translate-x-full' : 'translate-x-0'
            } ${getGlassStyle("border shadow-sm rounded-lg")}`
          )}
        `}
        style={{ 
          top: isMobile ? '0' : '80px', 
          height: isMobile ? '100vh' : 'calc(100vh - 160px)'
        }}
      >
        {/* 侧边栏头部 */}
        {isMobile ? (
          <div className="flex items-center justify-between p-4 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-primary rounded-full"></div>
              <h3 className="text-sm font-medium text-foreground">文章大纲</h3>
            </div>
            <button
              onClick={() => {
                setIsOpen(false);
                mobileTriggerRef.current?.focus();
              }}
              aria-label="关闭文章目录"
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between p-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="w-1 h-3.5 bg-primary rounded-full"></div>
              <h3 className="text-sm font-medium text-foreground">文章大纲</h3>
            </div>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title={isCollapsed ? '展开目录' : '收起目录'}
              aria-label={isCollapsed ? '展开目录' : '收起目录'}
              aria-expanded={!isCollapsed}
              aria-controls="article-toc"
            >
              <svg 
                className={`w-4 h-4 transition-transform duration-200 ${
                  isCollapsed ? 'rotate-180' : ''
                }`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}

        {/* 目录内容 */}
        <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
          <nav className="px-2">
            {headings.map((heading) => {
              const isActive = activeId === heading.id;
              const levelIndent = (heading.level - 1) * 12;
              
              return (
                <button
                  key={heading.id}
                  onClick={() => {
                    scrollToElement(heading.id);
                    if (isMobile) setIsOpen(false);
                  }}
                  className={`
                    w-full text-left px-3 py-2 rounded-xl text-sm transition-all duration-200 relative group cursor-pointer
                    ${isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                    ${heading.level === 1 ? 'font-medium' : ''}
                    ${heading.level === 2 ? 'font-normal' : ''}
                    ${heading.level >= 3 ? 'text-xs' : ''}
                  `}
                  style={{ paddingLeft: `${12 + levelIndent}px` }}
                >
                  {/* 活跃指示器 */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full" />
                  )}
                  
                  {/* 层级点 */}
                  {heading.level > 1 && (
                    <span 
                      className="absolute w-1 h-1 bg-border rounded-full group-hover:bg-primary transition-colors"
                      style={{ left: `${levelIndent}px`, top: '50%', transform: 'translateY(-50%)' }}
                    />
                  )}
                  
                  <span className="block truncate">
                    {heading.text}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* 底部统计 */}
        <div className="px-4 py-3 border-t border-border/30">
          <div className="text-xs text-muted-foreground flex items-center justify-between">
            <span>共 {headings.length} 个章节</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <span>已同步</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}