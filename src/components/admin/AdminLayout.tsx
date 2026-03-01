'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, 
  X, 
  Sun, 
  Moon, 
  Sparkles
} from 'lucide-react';
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
  const { resolvedTheme, setTheme } = useTheme();

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

  /**
   * 切换主题
   */
  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  // 组件未挂载时返回占位符，避免水合错误
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
        <div className="flex items-center justify-center min-h-screen">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-[#66ccff]/20 border-t-[#66ccff]" />
            <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border-2 border-[#66ccff]/10" />
          </div>
        </div>
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'dark' : ''}`}>
      {/* 背景渐变 */}
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 -z-10" />
      
      {/* 装饰性背景元素 */}
      <div className="fixed top-0 right-0 w-96 h-96 bg-[#66ccff]/5 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 left-0 w-96 h-96 bg-[#66ccff]/5 rounded-full blur-3xl -z-10" />

      {/* 移动端遮罩层 */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
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
        className={`transition-all duration-500 ease-out ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* 顶部工具栏 */}
        <header className="sticky top-0 z-30 h-16 backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            {/* 左侧：移动端菜单按钮和页面标题 */}
            <div className="flex items-center space-x-4">
              {/* 移动端菜单按钮 */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={toggleMobileMenu}
                className="lg:hidden p-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-all duration-300"
                aria-label="切换菜单"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </motion.button>

              {/* 桌面端折叠按钮 */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleSidebar}
                className="hidden lg:flex p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-[#66ccff] transition-all duration-300"
                aria-label="切换侧边栏"
              >
                <motion.div
                  animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Menu className="w-5 h-5" />
                </motion.div>
              </motion.button>

              {/* 页面标题 */}
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#66ccff]/20 to-[#66ccff]/5">
                  <Sparkles className="w-4 h-4 text-[#66ccff]" />
                </div>
                <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  管理后台
                </h1>
              </div>
            </div>

            {/* 右侧：用户信息和操作 */}
            <div className="flex items-center space-x-2">
              {/* 主题切换按钮 */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleTheme}
                className="relative p-2.5 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-[#66ccff] transition-all duration-300"
                aria-label="切换主题"
              >
                <AnimatePresence mode="wait">
                  {isDark ? (
                    <motion.div
                      key="sun"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Sun className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ scale: 0, rotate: 90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: -90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Moon className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* 用户头像 */}
              <div className="flex items-center space-x-3 pl-2 pr-3 py-1.5 rounded-xl">
                <div className="relative">
                  <img
                    src="/星球卑.jpg"
                    alt="XinchengP"
                    className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-[#66ccff]/20"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">XinchengP</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        <main className="p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="max-w-7xl mx-auto"
          >
            {children}
          </motion.div>
        </main>

        {/* 页脚 */}
        <footer className="py-6 px-8 text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50">
            <Sparkles className="w-4 h-4 text-[#66ccff]" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} 洛天依主题博客 · 管理后台
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AdminLayout;
