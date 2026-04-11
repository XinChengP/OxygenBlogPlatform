'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  FileText,
  Image,
  Settings,
  ChevronDown,
  ChevronRight,
  PenLine,
  MessageSquare,
  Server,
  FolderOpen,
  Cloud,
  Wrench,
  Sparkles,
  CheckSquare,
  Database,
  History,
} from 'lucide-react';

/**
 * 侧边栏组件属性接口
 */
interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggle: () => void;
  onMobileClose: () => void;
}

/**
 * 导航项接口
 */
interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
  badge?: string | number;
}

/**
 * 导航项组件属性接口
 */
interface NavItemProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  isChildActive: boolean;
  expandedItems: Set<string>;
  toggleExpand: (id: string) => void;
  onMobileClose: () => void;
}

/**
 * 单个导航项组件
 * 支持折叠展开和子菜单
 */
const NavItemComponent: React.FC<NavItemProps> = ({
  item,
  collapsed,
  isActive,
  isChildActive,
  expandedItems,
  toggleExpand,
  onMobileClose,
}) => {
  const hasChildren = item.children && item.children.length > 0;
  const isExpanded = expandedItems.has(item.id);
  const Icon = item.icon;

  /**
   * 处理点击事件
   * 有子菜单时切换展开状态，无子菜单时关闭移动端菜单
   */
  const handleClick = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      toggleExpand(item.id);
    } else {
      onMobileClose();
    }
  };

  // 折叠状态下只显示图标
  if (collapsed) {
    return (
      <div className="relative group">
        <Link
          href={item.href}
          onClick={handleClick}
          className={`relative flex items-center justify-center w-full h-11 rounded-xl transition-all duration-300 ${
            isActive || isChildActive
              ? 'bg-gradient-to-r from-[#66ccff]/20 to-[#66ccff]/5 text-[#66ccff] shadow-lg shadow-[#66ccff]/10'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
          title={item.label}
        >
          <Icon className="w-5 h-5" />
          
          {/* 激活指示器 */}
          {(isActive || isChildActive) && (
            <motion.div
              layoutId="activeIndicator"
              className="absolute left-0 w-1 h-6 bg-gradient-to-b from-[#66ccff] to-[#4aa8e8] rounded-r-full"
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}

          {/* 徽章 */}
          {item.badge && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-400 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
              {item.badge}
            </span>
          )}
        </Link>

        {/* 悬浮提示 */}
        <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-sm font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl shadow-black/20">
          <div className="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-800 rotate-45" />
          {item.label}
        </div>
      </div>
    );
  }

  // 展开状态下的完整导航项
  return (
    <div className="space-y-1">
      {/* 主导航项 */}
      <Link
        href={item.href}
        onClick={handleClick}
        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl transition-all duration-300 group ${
          isActive || isChildActive
            ? 'bg-gradient-to-r from-[#66ccff]/20 to-[#66ccff]/5 text-[#66ccff] shadow-lg shadow-[#66ccff]/10'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
        }`}
      >
        <div className="flex items-center space-x-3">
          <div className={`p-1.5 rounded-lg transition-all duration-300 ${
            isActive || isChildActive
              ? 'bg-[#66ccff]/20'
              : 'bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="font-medium">{item.label}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 徽章 */}
          {item.badge && (
            <span className="px-2 py-0.5 bg-gradient-to-br from-red-400 to-red-600 text-white text-xs font-bold rounded-full shadow-lg shadow-red-500/30">
              {item.badge}
            </span>
          )}
          
          {/* 展开/折叠图标 */}
          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className={`p-0.5 rounded transition-colors ${
                isActive || isChildActive ? 'text-[#66ccff]' : 'text-gray-400'
              }`}
            >
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          )}
        </div>
      </Link>

      {/* 子菜单 */}
      <AnimatePresence>
        {hasChildren && isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="relative pl-8 space-y-1 mt-1">
              {/* 连接线 */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-gray-200 dark:from-gray-700 to-transparent" />
              
              {item.children!.map((child, index) => {
                const childPathname = usePathname();
                const childIsActive = childPathname === child.href;
                
                return (
                  <motion.div
                    key={child.id}
                    initial={{ x: -10, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link
                      href={child.href}
                      onClick={onMobileClose}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 group ${
                        childIsActive
                          ? 'bg-[#66ccff]/10 text-[#66ccff]'
                          : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                        childIsActive
                          ? 'bg-[#66ccff] scale-125'
                          : 'bg-gray-300 dark:bg-gray-600 group-hover:bg-gray-400 dark:group-hover:bg-gray-500'
                      }`} />
                      <span className="text-sm font-medium">{child.label}</span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * 管理后台侧边栏组件
 * 提供导航菜单，支持折叠/展开和响应式设计
 */
const AdminSidebar: React.FC<AdminSidebarProps> = ({
  collapsed,
  mobileOpen,
  onToggle,
  onMobileClose,
}) => {
  const pathname = usePathname();
  
  // 展开的菜单项集合
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set(['gallery']));

  /**
   * 切换菜单项展开状态
   */
  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /**
   * 导航菜单配置
   * 使用 useMemo 避免不必要的重新计算
   */
  const navItems: NavItem[] = useMemo(() => [
    {
      id: 'dashboard',
      label: '仪表盘',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      id: 'blogs',
      label: '文章管理',
      href: '/admin/blogs',
      icon: FileText,
      children: [
        {
          id: 'blogs-list',
          label: '文章列表',
          href: '/admin/blogs',
          icon: FileText,
        },
        {
          id: 'blogs-edit',
          label: '撰写文章',
          href: '/admin/blogs/edit',
          icon: PenLine,
        },
      ],
    },
    {
      id: 'moments',
      label: '动态管理',
      href: '/admin/moments',
      icon: MessageSquare,
      children: [
        {
          id: 'moments-list',
          label: '动态列表',
          href: '/admin/moments',
          icon: MessageSquare,
        },
        {
          id: 'moments-edit',
          label: '发布动态',
          href: '/admin/moments/edit',
          icon: PenLine,
        },
      ],
    },
    {
      id: 'todo',
      label: '待办管理',
      href: '/admin/todo',
      icon: CheckSquare,
    },
    {
      id: 'changelogs',
      label: '日志管理',
      href: '/admin/changelogs',
      icon: History,
      children: [
        {
          id: 'changelogs-list',
          label: '日志列表',
          href: '/admin/changelogs',
          icon: History,
        },
        {
          id: 'changelogs-edit',
          label: '撰写日志',
          href: '/admin/changelogs/edit',
          icon: PenLine,
        },
      ],
    },
    {
      id: 'gallery',
      label: '图床管理',
      href: '/admin/gallery',
      icon: Image,
      children: [
        {
          id: 'gallery-local',
          label: '本地图床',
          href: '/admin/gallery/local',
          icon: FolderOpen,
        },
        {
          id: 'gallery-remote',
          label: '远程图床',
          href: '/admin/gallery/remote',
          icon: Cloud,
        },
        {
          id: 'gallery-settings',
          label: '图床设置',
          href: '/admin/gallery/settings',
          icon: Wrench,
        },
      ],
    },
    {
      id: 'backup',
      label: '本地备份',
      href: '/admin/backup',
      icon: Database,
    },
    {
      id: 'settings',
      label: '系统设置',
      href: '/admin/settings',
      icon: Settings,
    },
  ], []);

  /**
   * 检查导航项是否为当前激活项
   */
  const isItemActive = (item: NavItem): boolean => {
    if (item.href === '/admin') {
      return pathname === '/admin';
    }
    return pathname === item.href || pathname.startsWith(item.href + '/');
  };

  /**
   * 检查导航项的子项是否有激活项
   */
  const hasActiveChild = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some(child => pathname === child.href);
  };

  // 侧边栏内容
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo 区域 */}
      <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-gray-200/50 dark:border-gray-700/50`}>
        {!collapsed && (
          <Link href="/admin" className="flex items-center space-x-3 group">
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#66ccff] to-[#4aa8e8] flex items-center justify-center shadow-lg shadow-[#66ccff]/30 group-hover:shadow-[#66ccff]/50 transition-shadow duration-300">
              <Sparkles className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                管理后台
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500">洛天依主题博客</span>
            </div>
          </Link>
        )}
        
        {collapsed && (
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#66ccff] to-[#4aa8e8] flex items-center justify-center shadow-lg shadow-[#66ccff]/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavItemComponent
            key={item.id}
            item={item}
            collapsed={collapsed}
            isActive={isItemActive(item)}
            isChildActive={hasActiveChild(item)}
            expandedItems={expandedItems}
            toggleExpand={toggleExpand}
            onMobileClose={onMobileClose}
          />
        ))}
      </nav>

      {/* 底部区域 */}
      <div className={`border-t border-gray-200/50 dark:border-gray-700/50 ${collapsed ? 'px-3' : 'px-4'} py-4`}>
        {/* 返回前台链接 */}
        <Link
          href="/"
          onClick={onMobileClose}
          className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} w-full px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-100 hover:to-transparent dark:hover:from-gray-800/50 dark:hover:to-transparent transition-all duration-300 group`}
        >
          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </div>
          {!collapsed && <span className="text-sm font-medium">返回前台</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 ease-out shadow-2xl shadow-black/5 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* 移动端侧边栏 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden fixed left-0 top-0 z-50 h-screen w-72 bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-700/50 shadow-2xl"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminSidebar;
