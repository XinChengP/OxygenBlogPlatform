'use client';

import React, { useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import {
  LayoutDashboard,
  FileText,
  Image,
  Settings,
  ChevronDown,
  MessageSquare,
  FolderOpen,
  Server,
  CheckSquare,
  Database,
  History,
  GraduationCap,
  Sparkles,
  ArrowLeft,
} from 'lucide-react';

/**
 * 侧边栏组件属性接口
 */
interface AdminSidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
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
  /** 所属分组，用于在导航中插入分组标题 */
  group?: string;
}

/**
 * 导航项组件属性接口
 * pathname 通过 prop 从父组件传入，避免在 map 回调中调用 usePathname 违反 Hook 规则
 */
interface NavItemProps {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  isChildActive: boolean;
  expandedItems: Set<string>;
  toggleExpand: (id: string) => void;
  onMobileClose: () => void;
  pathname: string;
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
  pathname,
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

  // 折叠状态下只显示图标，悬停时在右侧弹出浮层补足文字与子菜单
  if (collapsed) {
    return (
      <div className="relative group">
        {/*
          去掉 overflow-hidden：
          原来的溢出裁剪会把 -top-1 -right-1 的徽章直接裁掉，
          折叠态下永远看不到待办数量。
        */}
        <Link
          href={item.href}
          onClick={handleClick}
          aria-current={isActive || isChildActive ? 'page' : undefined}
          className={`relative flex items-center justify-center w-full h-11 rounded-xl transition-all duration-300 ${
            isActive || isChildActive
              ? 'bg-gradient-to-r from-[#66ccff]/20 to-[#66ccff]/5 text-[#66ccff] shadow-lg shadow-[#66ccff]/10'
              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
          title={item.label}
        >
          <Icon className="w-5 h-5" />
        </Link>

        {/*
          折叠态浮层：
          1. 补足被省略的文字标签；
          2. 有子菜单时直接列出子项，避免「必须先展开侧栏才能进子页」；
          3. 用 pl-3 让图标与浮层之间的空隙也属于浮层，鼠标移动时不会断开 hover。
        */}
        <div className="pointer-events-none absolute left-full top-0 pl-3 z-50 opacity-0 -translate-x-1 transition-all duration-150 group-hover:opacity-100 group-hover:translate-x-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
          <div className="min-w-[176px] rounded-xl border border-border bg-card shadow-xl p-1.5">
            <div className="px-2.5 py-1.5 text-xs font-semibold text-muted-foreground">
              {item.label}
            </div>
            {hasChildren &&
              item.children!.map(child => {
                const childIsActive =
                  pathname === child.href || pathname.startsWith(child.href + '/');
                const ChildIcon = child.icon;
                return (
                  <Link
                    key={child.id}
                    href={child.href}
                    onClick={onMobileClose}
                    aria-current={childIsActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm transition-colors',
                      childIsActive
                        ? 'bg-[#66ccff]/10 text-[#66ccff]'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-muted'
                    )}
                  >
                    <ChildIcon className="w-4 h-4" />
                    {child.label}
                  </Link>
                );
              })}
          </div>
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
        aria-current={isActive || isChildActive ? 'page' : undefined}
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
                // 直接使用父组件传入的 pathname 判断激活状态
                // 禁止在此处调用 usePathname()，map 回调内调用 Hook 会违反 React Hook 规则导致页面崩溃
                const childIsActive = pathname === child.href || pathname.startsWith(child.href + '/');

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
  onMobileClose,
}) => {
  const pathname = usePathname();
  
  // 展开的菜单项集合
  const [expandedItems, setExpandedItems] = React.useState<Set<string>>(new Set([]));

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
   * 按「内容 / 运营 / 系统」分组，降低十项平铺带来的查找成本。
   */
  const navItems: NavItem[] = useMemo(() => [
    {
      id: 'dashboard',
      label: '仪表盘',
      href: '/admin',
      icon: LayoutDashboard,
      group: '内容',
    },
    {
      id: 'blogs',
      label: '文章管理',
      href: '/admin/blogs',
      icon: FileText,
      group: '内容',
    },
    {
      id: 'moments',
      label: '动态管理',
      href: '/admin/moments',
      icon: MessageSquare,
      group: '内容',
    },
    {
      id: 'changelogs',
      label: '日志管理',
      href: '/admin/changelogs',
      icon: History,
      group: '内容',
    },
    {
      id: 'gallery',
      label: '图床管理',
      href: '/admin/gallery',
      icon: Image,
      group: '内容',
      children: [
        {
          id: 'gallery-local',
          label: '本地图床',
          href: '/admin/gallery/local',
          icon: FolderOpen,
        },
        {
          // 原「远程图床」已由本地图床管理器替代，路由沿用旧地址避免书签失效
          id: 'gallery-manager',
          label: '图床管理器',
          href: '/admin/gallery/remote',
          icon: Server,
        },
      ],
    },
    {
      id: 'todo',
      label: '待办管理',
      href: '/admin/todo',
      icon: CheckSquare,
      group: '运营',
    },
    {
      id: 'study',
      label: '学习打卡',
      href: '/admin/study',
      icon: GraduationCap,
      group: '运营',
    },
    {
      id: 'backup',
      label: '本地备份',
      href: '/admin/backup',
      icon: Database,
      group: '系统',
    },
    {
      id: 'settings',
      label: '系统设置',
      href: '/admin/settings',
      icon: Settings,
      group: '系统',
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
    return item.children.some(child => pathname === child.href || pathname.startsWith(child.href + '/'));
  };

  /**
   * 当前路由命中某个子菜单时自动展开其父级
   * 直接访问 /admin/gallery/local 这类地址时也能看到选中的子项
   */
  useEffect(() => {
    const activeParent = navItems.find(item =>
      item.children?.some(child => pathname === child.href || pathname.startsWith(child.href + '/'))
    );
    if (!activeParent) return;

    setExpandedItems(prev => {
      if (prev.has(activeParent.id)) return prev;
      const next = new Set(prev);
      next.add(activeParent.id);
      return next;
    });
  }, [pathname, navItems]);

  /**
   * 渲染侧边栏内容
   * 抽成函数是为了让桌面端与移动端能使用不同的折叠状态：
   * 原来两端复用同一份 JSX，桌面折叠后打开移动端菜单也会只剩图标。
   */
  const renderSidebarContent = (isCollapsed: boolean) => (
    <div className="flex flex-col h-full">
      {/* Logo 区域 */}
      <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} h-16 px-4 border-b border-gray-200/50 dark:border-gray-700/50`}>
        {!isCollapsed && (
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

        {isCollapsed && (
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#66ccff] to-[#4aa8e8] flex items-center justify-center shadow-lg shadow-[#66ccff]/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        )}
      </div>

      {/* 导航菜单 */}
      <nav className={`flex-1 px-3 py-4 space-y-1 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto'}`}>
        {navItems.map((item, index) => {
          const previousGroup = index > 0 ? navItems[index - 1].group : undefined;
          // 分组变化时插入标题；首项总是要显示自己的分组标题
          const showGroupLabel = Boolean(item.group) && item.group !== previousGroup;

          return (
            <React.Fragment key={item.id}>
              {showGroupLabel &&
                (isCollapsed
                  ? index > 0 && (
                      // 折叠态用分隔线代替文字标题，避免文字被裁切
                      <div className="py-2">
                        <div className="border-t border-border/60" />
                      </div>
                    )
                  : (
                      <div
                        className={`px-3 text-[11px] font-semibold tracking-widest text-gray-400 dark:text-gray-500 ${
                          index === 0 ? 'pb-1' : 'pt-4 pb-1'
                        }`}
                      >
                        {item.group}
                      </div>
                    ))}
              <NavItemComponent
                item={item}
                collapsed={isCollapsed}
                isActive={isItemActive(item)}
                isChildActive={hasActiveChild(item)}
                expandedItems={expandedItems}
                toggleExpand={toggleExpand}
                onMobileClose={onMobileClose}
                pathname={pathname}
              />
            </React.Fragment>
          );
        })}
      </nav>

      {/* 底部区域 */}
      <div className={`border-t border-gray-200/50 dark:border-gray-700/50 ${isCollapsed ? 'px-3' : 'px-4'} py-4`}>
        {/* 返回前台链接 */}
        <Link
          href="/"
          onClick={onMobileClose}
          className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'} w-full px-3 py-2.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-gradient-to-r hover:from-gray-100 hover:to-transparent dark:hover:from-gray-800/50 dark:hover:to-transparent transition-all duration-300 group`}
        >
          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 group-hover:bg-white dark:group-hover:bg-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </div>
          {!isCollapsed && <span className="text-sm font-medium">返回前台</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* 桌面端侧边栏 */}
      <aside
        id="admin-sidebar"
        className={`hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50 transition-all duration-300 ease-out shadow-2xl shadow-black/5 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {renderSidebarContent(collapsed)}
      </aside>

      {/* 移动端侧边栏：始终使用展开形态，不受桌面折叠状态影响 */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: '-100%', opacity: 0.5 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0.5 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="lg:hidden fixed left-0 top-0 z-50 h-screen w-72 bg-white dark:bg-gray-900 border-r border-gray-200/50 dark:border-gray-700/50 shadow-2xl overflow-y-auto"
          >
            {renderSidebarContent(false)}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
};

export default AdminSidebar;
