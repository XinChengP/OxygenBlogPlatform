'use client';

import { useState, useEffect } from 'react';
import { useBackgroundStyle } from '../hooks/useBackgroundStyle';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

/**
 * 从 Markdown 内容中提取标题
 */
const extractHeadings = (content: string): TocItem[] => {
  const headings: TocItem[] = [];
  const usedIds = new Set<string>();
  
  // 先移除代码块内容，避免代码块内的#被误识别为标题
  const codeBlockRegex = /```[\s\S]*?```/g;
  const inlineCodeRegex = /`[^`]*`/g;
  
  // 创建内容副本并移除代码块
  let cleanContent = content
    .replace(codeBlockRegex, '') // 移除代码块
    .replace(inlineCodeRegex, ''); // 移除行内代码
  
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  let match;

  while ((match = headingRegex.exec(cleanContent)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    
    // 跳过空标题
    if (!text) continue;
    
    // 使用与ClientBlogDetail中相同的ID生成逻辑
    let baseId = text
      .toLowerCase()
      .replace(/[^\w\u4e00-\u9fff\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    // 确保id唯一性
    let id = baseId;
    let counter = 1;
    while (usedIds.has(id)) {
      id = `${baseId}-${counter}`;
      counter++;
    }
    usedIds.add(id);
    
    headings.push({ id, text, level });
  }

  return headings;
};

/**
 * 滚动到指定元素
 */
const scrollToElement = (id: string) => {
  const element = document.getElementById(id);
  
  if (element) {
    const offset = 120;
    const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
    window.scrollTo({
      top: elementPosition - offset,
      behavior: 'smooth'
    });
  }
};

/**
 * 获取当前激活的标题
 */
const getActiveHeading = (headings: TocItem[]): string => {
  const scrollY = window.scrollY + 120;
  
  for (let i = headings.length - 1; i >= 0; i--) {
    const element = document.getElementById(headings[i].id);
    if (element) {
      const elementTop = element.offsetTop;
      if (scrollY >= elementTop) {
        return headings[i].id;
      }
    }
  }
  
  return headings[0]?.id || '';
};

export default function TableOfContents({ content }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeId, setActiveId] = useState('');
  const [isMobile, setIsMobile] = useState(true); // 默认为移动端，避免闪烁
  const [isCollapsed, setIsCollapsed] = useState(true); // 默认收起
  const headings = extractHeadings(content);
  const { isBackgroundEnabled } = useBackgroundStyle('blog-detail');

  // 毛玻璃样式函数
  const getGlassStyle = (baseClasses: string) => {
    if (isBackgroundEnabled) {
      return `${baseClasses} backdrop-blur-md bg-card/80 supports-[backdrop-filter]:bg-card/60 border-border/50`;
    }
    return `bg-card ${baseClasses} border-border`;
  };

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // 在小屏幕时自动收起桌面端目录
      if (window.innerWidth < 1200 && !mobile) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1200 && !mobile) {
        setIsCollapsed(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const active = getActiveHeading(headings);
      setActiveId(active);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <>
      {/* 移动端触发按钮 */}
      {isMobile && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={getGlassStyle("fixed bottom-6 right-4 z-50 w-12 h-12 rounded-full shadow-lg border flex items-center justify-center transition-all duration-200 hover:shadow-xl")}
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
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* 桌面端展开按钮 - 收起时显示 */}
      {!isMobile && isCollapsed && (
        <div className="fixed right-24 z-40" style={{ top: '80px' }}>
          <button
            onClick={() => setIsCollapsed(false)}
            className={getGlassStyle("p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shadow-sm border")}
            title="展开目录"
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
              onClick={() => setIsOpen(false)}
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