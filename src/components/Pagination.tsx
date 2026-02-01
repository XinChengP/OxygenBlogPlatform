'use client';

import { motion } from 'framer-motion';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { useState, useEffect } from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * 翻页器组件
 * 支持移动端适配和暗色模式，具有美观的动画效果
 */
export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  className = '' 
}: PaginationProps) {
  const { isBackgroundEnabled } = useBackgroundStyle('blogs');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /**
   * 获取毛玻璃样式类名
   */
  const getGlassStyle = (baseStyle: string) => {
    if (isBackgroundEnabled) {
      return `${baseStyle} backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75`;
    }
    return `bg-card ${baseStyle} border-border`;
  };

  /**
   * 生成页码数组
   * 在移动端显示较少页码，桌面端显示更多
   */
  const generatePageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = isMobile ? 3 : 7; // 移动端显示3个，桌面端显示7个
    
    if (totalPages <= maxVisible) {
      // 如果总页数小于等于最大显示数，显示所有页码
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 复杂的页码显示逻辑
      const halfVisible = Math.floor(maxVisible / 2);
      
      if (currentPage <= halfVisible + 1) {
        // 当前页在前半部分
        for (let i = 1; i <= maxVisible - 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - halfVisible) {
        // 当前页在后半部分
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - maxVisible + 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 当前页在中间部分
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - halfVisible + 1; i <= currentPage + halfVisible - 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  /**
   * 处理页码点击
   */
  const handlePageClick = (page: number) => {
    if (page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // 如果只有一页或没有页面，不显示翻页器
  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = generatePageNumbers();

  return (
    <motion.div 
      className={`flex justify-center items-center mt-12 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={getGlassStyle("rounded-lg shadow-md p-2 border")}>
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 上一页按钮 */}
          <motion.button
            onClick={() => handlePageClick(currentPage - 1)}
            disabled={currentPage === 1}
            className={`
              flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md transition-all duration-200
              ${currentPage === 1 
                ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                : 'text-foreground hover:bg-primary/10 hover:text-primary active:scale-95'
              }
            `}
            whileHover={currentPage !== 1 ? { scale: 1.05 } : {}}
            whileTap={currentPage !== 1 ? { scale: 0.95 } : {}}
          >
            <ChevronLeftIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>

          {/* 页码按钮 */}
          <div className="flex items-center gap-1">
            {pageNumbers.map((page, index) => (
              <motion.div key={`${page}-${index}`}>
                {page === '...' ? (
                  <span className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground text-sm">
                    ...
                  </span>
                ) : (
                  <motion.button
                    onClick={() => handlePageClick(page as number)}
                    className={`
                      flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md text-sm font-medium transition-all duration-200
                      ${currentPage === page
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-foreground hover:bg-primary/10 hover:text-primary active:scale-95'
                      }
                    `}
                    whileHover={currentPage !== page ? { scale: 1.05 } : {}}
                    whileTap={currentPage !== page ? { scale: 0.95 } : {}}
                    initial={false}
                    animate={{
                      backgroundColor: currentPage === page ? 'var(--primary)' : 'transparent',
                      color: currentPage === page ? 'var(--primary-foreground)' : 'var(--foreground)'
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {page}
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>

          {/* 下一页按钮 */}
          <motion.button
            onClick={() => handlePageClick(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`
              flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-md transition-all duration-200
              ${currentPage === totalPages 
                ? 'text-muted-foreground cursor-not-allowed opacity-50' 
                : 'text-foreground hover:bg-primary/10 hover:text-primary active:scale-95'
              }
            `}
            whileHover={currentPage !== totalPages ? { scale: 1.05 } : {}}
            whileTap={currentPage !== totalPages ? { scale: 0.95 } : {}}
          >
            <ChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.button>
        </div>
      </div>

      {/* 页面信息 - 仅在桌面端显示 */}
      <div className="hidden sm:block ml-4">
        <span className="text-sm text-muted-foreground">
          第 {currentPage} 页，共 {totalPages} 页
        </span>
      </div>
    </motion.div>
  );
}