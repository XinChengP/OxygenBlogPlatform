'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Sun,
  Moon,
  Sparkles,
  LayoutDashboard,
  FileText,
  MessageSquare,
  CheckSquare,
  GraduationCap,
  History,
  Image,
  FolderOpen,
  Server,
  Database,
  Settings,
} from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import { getAvatarPath, name as siteAuthorName } from '@/setting/AboutSetting';

/**
 * 管理后台布局组件属性接口
 */
interface AdminLayoutProps {
  children: React.ReactNode;
}

/**
 * 路由与页面标题映射
 * 顺序按路径长度从长到短排列，保证前缀匹配时优先命中更具体的子页面
 */
const PAGE_META: Array<{
  prefix: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { prefix: '/admin/blogs/edit', label: '文章编辑', icon: FileText },
  { prefix: '/admin/moments/edit', label: '动态编辑', icon: MessageSquare },
  { prefix: '/admin/changelogs/edit', label: '日志编辑', icon: History },
  { prefix: '/admin/gallery/local', label: '本地图床', icon: FolderOpen },
  { prefix: '/admin/gallery/remote', label: '图床管理器', icon: Server },
  { prefix: '/admin/gallery', label: '图床管理', icon: Image },
  { prefix: '/admin/blogs', label: '文章管理', icon: FileText },
  { prefix: '/admin/moments', label: '动态管理', icon: MessageSquare },
  { prefix: '/admin/todo', label: '待办管理', icon: CheckSquare },
  { prefix: '/admin/study', label: '学习打卡', icon: GraduationCap },
  { prefix: '/admin/changelogs', label: '日志管理', icon: History },
  { prefix: '/admin/backup', label: '本地备份', icon: Database },
  { prefix: '/admin/settings', label: '系统设置', icon: Settings },
  { prefix: '/admin', label: '仪表盘', icon: LayoutDashboard },
];

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
  // 当前路由，用于在顶栏展示所在页面
  const pathname = usePathname();

  /**
   * 当前页面信息（标题与图标）
   * 未匹配到路由时回退到「管理后台」
   */
  const currentPage = useMemo(() => {
    const matched = PAGE_META.find(
      item => pathname === item.prefix || pathname.startsWith(item.prefix + '/')
    );
    return matched ?? { prefix: '/admin', label: '管理后台', icon: Sparkles };
  }, [pathname]);

  const PageIcon = currentPage.icon;

  /**
   * 组件挂载后设置状态
   * 避免服务端渲染与客户端不一致的问题
   * 同时恢复上次的侧边栏折叠状态
   */
  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem('admin-sidebar-collapsed') === '1');
    } catch {
      // localStorage 不可用时保持默认展开
    }
    setMounted(true);
  }, []);

  /**
   * 切换侧边栏折叠状态并持久化，刷新后保持上次的选择
   */
  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('admin-sidebar-collapsed', next ? '1' : '0');
      } catch {
        // 隐私模式/配额不足时忽略，不影响本次交互
      }
      return next;
    });
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

  // 组件未挂载时渲染后台骨架，避免首屏是一整屏居中转圈导致的布局跳变
  if (!mounted) {
    return (
      <div className="min-h-screen">
        {/* 侧栏骨架 */}
        <div className="hidden lg:block fixed left-0 top-0 h-screen w-64 border-r border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-900/70">
          <div className="h-16 border-b border-gray-200/50 dark:border-gray-700/50" />
          <div className="p-3 space-y-2 animate-pulse">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-10 rounded-xl bg-gray-200/60 dark:bg-gray-800/60" />
            ))}
          </div>
        </div>

        {/* 顶栏与内容骨架 */}
        <div className="lg:ml-64">
          <div className="h-16 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/70 dark:bg-gray-900/70" />
          <div className="p-4 lg:p-8 space-y-4 animate-pulse">
            <div className="h-8 w-48 rounded-lg bg-gray-200/60 dark:bg-gray-800/60" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 rounded-xl bg-gray-200/50 dark:bg-gray-800/50" />
              ))}
            </div>
            <div className="h-64 rounded-xl bg-gray-200/40 dark:bg-gray-800/40" />
          </div>
        </div>
      </div>
    );
  }

  const isDark = resolvedTheme === 'dark';

  return (
    /*
      不再手动叠加 dark class：
      根 html 已由 ThemeProvider（attribute="class"）统一控制暗色，
      这里再根据 resolvedTheme 叠加一次属于重复声明，且 SSR 阶段
      resolvedTheme 为 undefined 时会先渲染成浅色。
    */
    <div className="min-h-screen transition-colors duration-500">
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
                aria-label={sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
                aria-expanded={!sidebarCollapsed}
                aria-controls="admin-sidebar"
              >
                <motion.div
                  animate={{ rotate: sidebarCollapsed ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Menu className="w-5 h-5" />
                </motion.div>
              </motion.button>

              {/* 当前页面标题（面包屑） */}
              {/*
                面包屑只承担「我在哪」的定位作用，视觉上必须弱于页面内 h1，
                否则顶栏标题与页面标题两处大字并存，重复感很强。
              */}
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="hidden sm:flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-[#66ccff]/15 to-[#66ccff]/5 shrink-0">
                  <PageIcon className="w-3.5 h-3.5 text-[#66ccff]/80" />
                </div>
                <div className="flex items-baseline space-x-2 min-w-0">
                  <span className="hidden md:inline text-sm text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    管理后台
                  </span>
                  <span className="hidden md:inline text-gray-300 dark:text-gray-600">/</span>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate">
                    {currentPage.label}
                  </span>
                </div>
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
                    src={getAvatarPath()}
                    alt={siteAuthorName}
                    className="w-9 h-9 rounded-xl object-cover shadow-lg shadow-[#66ccff]/20"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{siteAuthorName}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 主内容 */}
        {/* 用 div 而非 main：根布局已提供 main 地标，嵌套 main 属于无效 HTML */}
        <div className="p-4 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="max-w-[1440px] mx-auto"
          >
            {children}
          </motion.div>
        </div>

        {/* 页脚 */}
        <footer className="py-6 px-4 lg:px-8 text-center">
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
