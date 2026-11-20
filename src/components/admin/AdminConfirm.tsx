'use client';

import React, { useEffect, useCallback, useId, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';
import { cn } from '@/utils/cn';
import AdminButton from './AdminButton';
// 用全站统一的滚动锁替代直接设置 body overflow，
// 避免破坏 sticky 侧栏与丢失滚动位置
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';

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
      icon: <TriangleAlert className="w-6 h-6" />,
      iconBg: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      confirmType: 'danger',
    },
    warning: {
      icon: <CircleAlert className="w-6 h-6" />,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
      confirmType: 'primary',
    },
    info: {
      icon: <Info className="w-6 h-6" />,
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

  // 无障碍关联：标题与描述分别有稳定 id，供屏幕阅读器朗读
  const titleId = useId();
  const descriptionId = useId();
  const contentRef = useRef<HTMLDivElement>(null);

  // 弹层打开时锁定焦点在对话框内部，关闭后归还焦点
  useFocusTrap(contentRef, open);

  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!open || loading) return;

      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'Enter') {
        const target = event.target as HTMLElement | null;

        // 焦点在输入控件上时，回车属于表单行为，不接管
        if (
          target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable)
        ) {
          return;
        }

        /*
          焦点在任意按钮上时交给按钮自身的点击行为：
          否则焦点停在「取消」上按回车会同时触发取消与全局确认，
          一次回车产生两个相反的结果。
        */
        if (target && target.tagName === 'BUTTON') return;

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
   * 统一走 useBodyScrollLock：不改变布局、保留滚动位置
   */
  useBodyScrollLock(open);

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
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative w-full max-w-md rounded-xl shadow-2xl bg-card border border-border focus:outline-none"
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
                  <h3 id={titleId} className="text-lg font-semibold text-card-foreground">
                    {title}
                  </h3>
                  <p id={descriptionId} className="mt-2 text-sm text-muted-foreground">
                    {message}
                  </p>
                </div>
              </div>
            </div>

            {/* 底部按钮 */}
            <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-border bg-muted/40 rounded-b-xl">
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
