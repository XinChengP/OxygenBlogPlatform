'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import AdminSidebar from './AdminSidebar';

/**
 * 管理后台布局组件属性接口
 */
interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * 管理后台布局组件
 * 提供统一的侧边栏导航和主内容区域布局
 * 支持响应式设计和主题切换
 */
const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  // 侧边栏折叠状态
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // 移动端侧边栏显示状态
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // 组件挂载状态（用于避免水合错误）
  const [mounted, setMounted] = useState(false);
  
  // 获取当前主题
  const { resolvedTheme } = useTheme();

  /**
   * 组件挂载后设置状态
   * 避免服务端渲染与客户端不一致的问题
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 切换侧边栏折叠状态
   */
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };

  /**
   * 切换移动端菜单显示状态
   */
  const toggleMobileMenu = () => {
    setMobileMenuOpen(prev => !prev);
  };

  /**
   * 关闭移动端菜单
   */
  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  // 组件未挂载时返回占位符，避免水合错误
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66ccff]"></div>
        </div>
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'dark' : ''}`}>
      {/* 移动端遮罩层 */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={closeMobileMenu}
          />
        )}
      </AnimatePresence>

      {/* 侧边栏 */}
      <AdminSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileMenuOpen}
        onToggle={toggleSidebar}
        onMobileClose={closeMobileMenu}
      />

      {/* 主内容区域 */}
      <div
        className={`transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* 顶部工具栏 */}
        <header className="sticky top-0 z-30 h-16 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            {/* 左侧：移动端菜单按钮和面包屑 */}
            <div className="flex items-center space-x-4">
              {/* 移动端菜单按钮 */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="切换菜单"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>

              {/* 桌面端折叠按钮 */}
              <button
                onClick={toggleSidebar}
                className="hidden lg:flex p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="切换侧边栏"
              >
                <svg
                  className={`w-5 h-5 transition-transform duration-300 ${
                    sidebarCollapsed ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
              </button>

              {/* 面包屑导航占位 */}
              <div className="hidden sm:block text-gray-500 dark:text-gray-400 text-sm">
                管理后台
              </div>
            </div>

            {/* 右侧：用户信息和操作 */}
            <div className="flex items-center space-x-4">
              {/* 主题切换按钮 */}
              <button
                className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="切换主题"
              >
                {isDark ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                    />
                  </svg>
                )}
              </button>

              {/* 通知按钮 */}
              <button
                className="relative p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="通知"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {/* 通知红点 */}
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* 用户头像 */}
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#66ccff] to-[#1e40af] flex items-center justify-center text-white text-sm font-medium">
                  管
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  管理员
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="p-4 lg:p-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>

        {/* 页脚 */}
        <footer className="py-4 px-6 text-center text-sm text-gray-500 dark:text-gray-400 border-t border-gray-200/50 dark:border-gray-700/50">
          <p>
            © {new Date().getFullYear()} 洛天依主题博客 · 管理后台
          </p>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
