'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

/**
 * 管理后台模态框组件属性接口
 */
interface AdminModalProps {
  /** 是否显示模态框 */
  open: boolean;
  /** 关闭回调函数 */
  onClose: () => void;
  /** 模态框标题 */
  title: string;
  /** 模态框内容 */
  children: React.ReactNode;
  /** 底部操作区域 */
  footer?: React.ReactNode;
  /** 模态框宽度 */
  width?: string;
  /** 是否显示关闭按钮 */
  closable?: boolean;
  /** 点击遮罩是否关闭 */
  maskClosable?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * AdminModal - 管理后台模态框组件
 * 
 * 功能特点：
 * - 动画效果（淡入淡出）
 * - 点击遮罩关闭
 * - ESC 键关闭
 * - 响应式宽度
 * - 支持自定义底部操作区
 * 
 * @param props - 组件属性
 * @returns 模态框组件
 */
const AdminModal: React.FC<AdminModalProps> = ({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'max-w-lg',
  closable = true,
  maskClosable = true,
  className,
}) => {
  /**
   * 处理 ESC 键关闭
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    },
    [open, onClose]
  );

  /**
   * 监听键盘事件
   */
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  /**
   * 打开时禁止背景滚动
   */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  /**
   * 处理遮罩点击
   */
  const handleMaskClick = () => {
    if (maskClosable) {
      onClose();
    }
  };

  /**
   * 阻止内容区域点击冒泡
   */
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleMaskClick}
          />

          {/* 模态框内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'relative w-full rounded-xl shadow-2xl',
              'bg-white dark:bg-gray-800',
              'border border-gray-200/50 dark:border-gray-700/50',
              'max-h-[90vh] flex flex-col',
              width,
              className
            )}
            onClick={handleContentClick}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50">
              {/* 标题 */}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </h3>

              {/* 关闭按钮 */}
              {closable && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="关闭"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {children}
            </div>

            {/* 底部操作区 */}
            {footer && (
              <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-xl">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AdminModal;
