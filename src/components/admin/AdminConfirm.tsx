'use client';

import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import AdminButton from './AdminButton';

/**
 * 确认对话框类型
 */
type ConfirmType = 'danger' | 'warning' | 'info';

/**
 * 管理后台确认对话框组件属性接口
 */
interface AdminConfirmProps {
  /** 是否显示对话框 */
  open: boolean;
  /** 关闭回调函数 */
  onClose: () => void;
  /** 确认回调函数 */
  onConfirm: () => void;
  /** 对话框标题 */
  title: string;
  /** 对话框消息内容 */
  message: string;
  /** 确认按钮文本 */
  confirmText?: string;
  /** 取消按钮文本 */
  cancelText?: string;
  /** 对话框类型 */
  type?: ConfirmType;
  /** 是否显示加载状态 */
  loading?: boolean;
}

/**
 * 获取确认对话框类型的图标和颜色配置
 * @param type - 对话框类型
 * @returns 图标和颜色配置
 */
const getConfirmStyles = (type: ConfirmType) => {
  const styles: Record<ConfirmType, { icon: React.ReactNode; iconBg: string; confirmType: 'danger' | 'primary' }> = {
    danger: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      confirmType: 'danger',
    },
    warning: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
      confirmType: 'primary',
    },
    info: {
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-[#66ccff]/20 dark:bg-[#66ccff]/10 text-[#66ccff]',
      confirmType: 'primary',
    },
  };
  return styles[type];
};

/**
 * AdminConfirm - 管理后台确认对话框组件
 * 
 * 功能特点：
 * - 危险操作红色样式
 * - 加载状态支持
 * - 键盘快捷键支持（Enter 确认，Escape 取消）
 * - 动画效果
 * 
 * @param props - 组件属性
 * @returns 确认对话框组件
 */
const AdminConfirm: React.FC<AdminConfirmProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  type = 'info',
  loading = false,
}) => {
  const styles = getConfirmStyles(type);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open || loading) return;

      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'Enter') {
        onConfirm();
      }
    },
    [open, loading, onClose, onConfirm]
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
   * 处理确认操作
   */
  const handleConfirm = () => {
    if (!loading) {
      onConfirm();
    }
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
            onClick={() => !loading && onClose()}
          />

          {/* 对话框内容 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-md rounded-xl shadow-2xl bg-white dark:bg-gray-800 border border-gray-200/50 dark:border-gray-700/50"
            onClick={e => e.stopPropagation()}
          >
            {/* 内容区域 */}
            <div className="p-6">
              {/* 图标和标题 */}
              <div className="flex items-start space-x-4">
                {/* 图标 */}
                <div className={cn('flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center', styles.iconBg)}>
                  {styles.icon}
                </div>

                {/* 标题和消息 */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {message}
                  </p>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-xl">
              {/* 取消按钮 */}
              <AdminButton
                type="secondary"
                onClick={onClose}
                disabled={loading}
              >
                {cancelText}
              </AdminButton>

              {/* 确认按钮 */}
              <AdminButton
                type={styles.confirmType}
                onClick={handleConfirm}
                loading={loading}
              >
                {confirmText}
              </AdminButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AdminConfirm;
