/**
 * 管理后台通用组件库
 * 
 * 本模块导出博客管理后台所需的所有通用组件
 * 所有组件均使用 TypeScript 编写，支持深色/浅色模式
 * 
 * 组件列表：
 * - AdminCard: 卡片组件，用于内容容器
 * - AdminButton: 按钮组件，支持多种类型和尺寸
 * - AdminInput: 输入框组件，支持图标前缀和密码显示切换
 * - AdminLoading: 加载状态组件，支持多种加载样式
 * - AdminTable: 表格组件，支持排序、分页、行选择
 * - AdminModal: 模态框组件，支持动画效果
 * - AdminToast: 消息提示组件，支持全局调用
 * - AdminConfirm: 确认对话框组件，支持危险操作样式
 * - AdminForm: 表单组件，支持动态字段渲染
 * - AdminSearchBar: 搜索栏组件，支持筛选器和防抖
 */

// 卡片组件
export { default as AdminCard } from './AdminCard';

// 按钮组件
export { default as AdminButton } from './AdminButton';

// 输入框组件
export { default as AdminInput } from './AdminInput';

// 加载状态组件
export { default as AdminLoading, TableSkeleton, CardSkeleton } from './AdminLoading';

// 表格组件
export { default as AdminTable } from './AdminTable';

// 模态框组件
export { default as AdminModal } from './AdminModal';

// 消息提示组件
export { default as ToastProvider, useToast, toast, GlobalToastListener } from './AdminToast';

// 确认对话框组件
export { default as AdminConfirm } from './AdminConfirm';

// 表单组件
export { default as AdminForm } from './AdminForm';

// 搜索栏组件
export { default as AdminSearchBar } from './AdminSearchBar';

// 布局组件
export { default as AdminLayout } from './AdminLayout';
export { default as AdminSidebar } from './AdminSidebar';

// 仪表盘组件
export { default as DashboardClient } from './DashboardClient';

// 类型导出
export type { default as AdminCardProps } from './AdminCard';
export type { default as AdminButtonProps } from './AdminButton';
export type { default as AdminInputProps } from './AdminInput';
export type { default as AdminLoadingProps } from './AdminLoading';
export type { default as AdminTableProps } from './AdminTable';
export type { default as AdminModalProps } from './AdminModal';
export type { default as AdminConfirmProps } from './AdminConfirm';
export type { default as AdminFormProps } from './AdminForm';
export type { default as AdminSearchBarProps } from './AdminSearchBar';
