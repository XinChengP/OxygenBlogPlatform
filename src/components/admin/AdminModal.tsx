'use client';

import React, { useEffect, useCallback, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';
// 用全站统一的滚动锁替代直接设置 body overflow，
// 避免破坏 sticky 侧栏与丢失滚动位置
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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
  // 用于无障碍关联标题，并管理打开/关闭时的焦点
  const titleId = useId();
  const contentRef = useRef<HTMLDivElement>(null);

  /*
    焦点管理统一交给 useFocusTrap：
    打开时聚焦弹窗并把 Tab 限制在内部，关闭时把焦点归还给触发元素。
    原来只做了一次 focus，键盘用户按 Tab 仍会跑到被遮罩的背景页面。
  */
  useFocusTrap(contentRef, open);

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
   * 统一走 useBodyScrollLock：不改变布局、保留滚动位置
   */
  useBodyScrollLock(open);

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
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={cn(
              'relative w-full rounded-xl shadow-2xl',
              'bg-card',
              'border border-border',
              'max-h-[90vh] flex flex-col',
              width,
              className
            )}
            onClick={handleContentClick}
          >
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              {/* 标题 */}
              <h3 id={titleId} className="text-lg font-semibold text-card-foreground">
                {title}
              </h3>

              {/* 关闭按钮 */}
              {closable && (
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  aria-label="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {children}
            </div>

            {/* 底部操作区 */}
            {footer && (
              <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-border bg-muted/40 rounded-b-xl">
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
