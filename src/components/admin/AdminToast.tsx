'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';

/**
 * 消息提示类型
 */
type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * 单个消息提示数据接口
 */
interface ToastItem {
  /** 唯一标识 */
  id: string;
  /** 消息内容 */
  message: string;
  /** 消息类型 */
  type: ToastType;
  /** 持续时间（毫秒） */
  duration?: number;
}

/**
 * 消息提示上下文接口
 */
interface ToastContextType {
  /** 添加消息提示 */
  addToast: (message: string, type: ToastType, duration?: number) => void;
  /** 移除消息提示 */
  removeToast: (id: string) => void;
}

/**
 * 消息提示上下文
 */
const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * 获取消息提示类型的样式配置
 * @param type - 消息类型
 * @returns 样式配置对象
 */
const getToastStyles = (type: ToastType) => {
  const styles: Record<ToastType, { bg: string; icon: React.ReactNode }> = {
    success: {
      bg: 'bg-green-500 dark:bg-green-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-red-500 dark:bg-red-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      ),
    },
    warning: {
      bg: 'bg-yellow-500 dark:bg-yellow-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-[#66ccff] dark:bg-[#55bbef]',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  };
  return styles[type];
};

/**
 * 单个消息提示组件
 */
const ToastItemComponent: React.FC<{
  toast: ToastItem;
  onClose: (id: string) => void;
}> = ({ toast, onClose }) => {
  const styles = getToastStyles(toast.type);

  /**
   * 自动关闭定时器
   */
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg',
        'text-white',
        styles.bg
      )}
    >
      {/* 图标 */}
      <span className="flex-shrink-0">{styles.icon}</span>
      {/* 消息内容 */}
      <span className="flex-1 text-sm font-medium">{toast.message}</span>
      {/* 关闭按钮 */}
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </motion.div>
  );
};

/**
 * 消息提示容器组件
 * 用于包裹整个应用，提供消息提示上下文
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 消息列表状态
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /**
   * 添加消息提示
   */
  const addToast = useCallback((message: string, type: ToastType, duration?: number) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
  }, []);

  /**
   * 移除消息提示
   */
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* 消息提示容器 */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col space-y-2 max-w-sm">
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastItemComponent
              key={toast.id}
              toast={toast}
              onClose={removeToast}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

/**
 * 使用消息提示的 Hook
 * @returns 消息提示上下文
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

/**
 * 全局消息提示对象
 * 提供便捷的全局调用方法
 */
export const toast = {
  /**
   * 成功消息
   */
  success: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin-toast', {
        detail: { message, type: 'success', duration }
      }));
    }
  },
  /**
   * 错误消息
   */
  error: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin-toast', {
        detail: { message, type: 'error', duration }
      }));
    }
  },
  /**
   * 警告消息
   */
  warning: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin-toast', {
        detail: { message, type: 'warning', duration }
      }));
    }
  },
  /**
   * 信息消息
   */
  info: (message: string, duration?: number) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('admin-toast', {
        detail: { message, type: 'info', duration }
      }));
    }
  },
};

/**
 * 全局消息提示监听组件
 * 用于在组件外部调用消息提示
 */
export const GlobalToastListener: React.FC = () => {
  const { addToast } = useToast();

  useEffect(() => {
    /**
     * 处理全局消息提示事件
     */
    const handleToast = (event: CustomEvent) => {
      const { message, type, duration } = event.detail;
      addToast(message, type, duration);
    };

    window.addEventListener('admin-toast', handleToast as EventListener);
    return () => {
      window.removeEventListener('admin-toast', handleToast as EventListener);
    };
  }, [addToast]);

  return null;
};

export default ToastProvider;
