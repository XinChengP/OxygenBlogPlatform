import type { Metadata } from 'next';
import AdminLayout from '@/components/admin/AdminLayout';
import { ToastProvider, GlobalToastListener } from '@/components/admin';
import AdminGuard from './AdminGuard';

/**
 * 管理后台元数据配置
 */
export const metadata: Metadata = {
  title: '管理后台 | 洛天依主题博客',
  description: '博客管理后台，用于管理文章、动态、图床等内容',
  robots: {
    index: false,
    follow: false,
  },
};

/**
 * 管理后台布局组件
 * 包装所有管理后台页面，提供统一的布局和主题支持
 * 主题由根布局的 ThemeProvider 提供，此处无需重复嵌套
 * 在静态导出模式下显示提示信息
 */
export default function AdminRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ToastProvider>
      {/* 必须挂载全局监听器，否则 toast.success/error 等事件没有接收方，所有操作提示都会静默丢失 */}
      <GlobalToastListener />
      <AdminGuard>
        <AdminLayout>
          {children}
        </AdminLayout>
      </AdminGuard>
    </ToastProvider>
  );
}
