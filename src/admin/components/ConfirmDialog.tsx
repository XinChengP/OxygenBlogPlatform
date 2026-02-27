'use client';

import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'confirm' | 'success' | 'error' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

/**
 * 确认弹窗组件
 * 用于显示确认对话框、成功/错误提示
 */
export default function ConfirmDialog({
  isOpen,
  title,
  message,
  type = 'confirm',
  confirmText = '确认',
  cancelText = '取消',
  onConfirm,
  onCancel,
  onClose,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const iconConfig = {
    confirm: { icon: AlertTriangle, color: 'text-orange-500', bgColor: 'bg-orange-50 dark:bg-orange-900/20' },
    success: { icon: CheckCircle, color: 'text-green-500', bgColor: 'bg-green-50 dark:bg-green-900/20' },
    error: { icon: AlertTriangle, color: 'text-red-500', bgColor: 'bg-red-50 dark:bg-red-900/20' },
    info: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  };

  const config = iconConfig[type];
  const Icon = config.icon;

  // 点击遮罩层关闭
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose?.() || onCancel?.();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden transform animate-scale-in">
        {/* 头部图标 */}
        <div className={`${config.bgColor} p-6 flex justify-center`}>
          <div className={`${config.color} p-3 rounded-full bg-white dark:bg-gray-700 shadow-lg`}>
            <Icon size={32} />
          </div>
        </div>

        {/* 内容区域 */}
        <div className="p-6 text-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* 按钮区域 */}
        <div className="px-6 pb-6 flex gap-3 justify-center">
          {type === 'confirm' ? (
            <>
              <button
                onClick={onCancel || onClose}
                className="px-6 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className="px-6 py-2.5 rounded-lg bg-[#66ccff] text-[#1e40af] hover:bg-[#66ccff]/80 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={onClose || onCancel}
              className="px-8 py-2.5 rounded-lg bg-[#66ccff] text-[#1e40af] hover:bg-[#66ccff]/80 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
            >
              知道了
            </button>
          )}
        </div>

        {/* 关闭按钮 */}
        <button
          onClick={onClose || onCancel}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scale-in {
          from { 
            opacity: 0;
            transform: scale(0.9);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
