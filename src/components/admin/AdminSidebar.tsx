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
      <Link
        href={item.href}
        onClick={handleClick}
        className={`relative flex items-center justify-center w-full h-12 rounded-lg transition-all duration-200 group ${
          isActive || isChildActive
            ? 'bg-[#66ccff]/20 text-[#66ccff]'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title={item.label}
      >
        <Icon className="w-5 h-5" />
        
        {/* 激活指示器 */}
        {(isActive || isChildActive) && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 w-1 h-8 bg-[#66ccff] rounded-r-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}

        {/* 徽章 */}
        {item.badge && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {item.badge}
          </span>
        )}

        {/* 悬浮提示 */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {item.label}
        </div>
      </Link>
    );
  }

  // 展开状态下的完整导航项
  return (
    <div className="space-y-1">
      {/* 主导航项 */}
      <Link
        href={item.href}
        onClick={handleClick}
        className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg transition-all duration-200 group ${
          isActive || isChildActive
            ? 'bg-[#66ccff]/20 text-[#66ccff]'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Icon className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">{item.label}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* 徽章 */}
          {item.badge && (
            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
              {item.badge}
            </span>
          )}
          
          {/* 展开/折叠图标 */}
          {hasChildren && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
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
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-8 space-y-1 mt-1">
              {item.children!.map((child) => {
                const childIsActive = item.href === '/admin/gallery' 
                  ? usePathname() === child.href 
                  : false;
                
                return (
                  <Link
                    key={child.id}
                    href={child.href}
                    onClick={onMobileClose}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      childIsActive
                        ? 'bg-[#66ccff]/20 text-[#66ccff]'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-sm">{child.label}</span>
                  </Link>
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
    return pathname === item.href;
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
          <Link href="/admin" className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#66ccff] to-[#1e40af] flex items-center justify-center">
              <Server className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              管理后台
            </span>
          </Link>
        )}
        
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#66ccff] to-[#1e40af] flex items-center justify-center">
            <Server className="w-5 h-5 text-white" />
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
          className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} w-full px-3 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {!collapsed && <span className="text-sm">返回前台</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-r border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* 移动端侧边栏 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden fixed left-0 top-0 z-50 h-screen w-64 bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-700/50 shadow-xl"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminSidebar;
