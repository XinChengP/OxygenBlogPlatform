'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { emojy, name } from '@/setting/NavigationSetting';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { useNavigationVisibility } from '@/contexts/NavigationVisibilityContext';
import { Users, MessageSquare, Link2, User, ChevronDown } from 'lucide-react';

/**
 * 导航项类型定义
 */
interface NavItem {
  href: string;
  label: string;
}

/**
 * 下拉菜单项类型定义
 */
interface DropdownItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

/**
 * 下拉菜单配置类型
 */
interface DropdownConfig {
  label: string;
  icon: React.ReactNode;
  items: DropdownItem[];
}

/**
 * 导航栏组件
 * 支持响应式设计和主题切换
 * 包含社交和关于下拉菜单
 * 
 * 注意：所有 hooks 必须在条件返回之前调用，遵循 React Hooks 规则
 */
const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isNearTop, setIsNearTop] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const pathname = usePathname();
  
  // 所有 hooks 必须在条件返回之前调用
  const { navigationStyle } = useBackgroundStyle('home');
  const { isVisible, isAtTop, setVisibility, setAtTop } = useNavigationVisibility();

  // 普通导航项配置（不包含下拉菜单的项）
  const regularNavItems = useMemo(() => [
    { href: '/', label: '首页' },
    { href: '/blogs', label: '博客' },
    { href: '/archive', label: '归档' },
    { href: '/gallery', label: '画廊' },
    { href: '/moments', label: '动态' },
    { href: '/tools', label: '小工具' },
  ], []);

  // 社交下拉菜单配置
  const socialDropdown: DropdownConfig = useMemo(() => ({
    label: '社交',
    icon: <Users className="w-4 h-4" />,
    items: [
      { href: '/friends', label: '友链' },
      { href: '/guestbook', label: '留言板' },
    ],
  }), []);

  // 关于下拉菜单配置
  const aboutDropdown: DropdownConfig = useMemo(() => ({
    label: '关于',
    icon: <User className="w-4 h-4" />,
    items: [
      { href: '/about', label: '关于我' },
      { href: '/changelogs', label: '日志' },
      { href: '/links', label: '相关链接' },
    ],
  }), []);

  /**
   * 检查链接是否为当前页面
   */
  const isActive = useCallback((href: string) => {
    // 空字符串不视为任何页面的激活状态
    if (!href || href === '') {
      return false;
    }
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  }, [pathname]);

  /**
   * 检查下拉菜单是否包含当前页面
   */
  const isDropdownActive = useCallback((dropdown: DropdownConfig) => {
    return dropdown.items.some(item => isActive(item.href));
  }, [isActive]);

  /**
   * 切换移动端菜单显示状态
   */
  const toggleMobileMenu = useCallback(() => {
    setIsMenuOpen(prev => !prev);
  }, []);
  
  /**
   * 关闭移动端菜单
   */
  const closeMobileMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  /**
   * 处理链接点击事件
   * 优化页面切换体验
   */
  const handleLinkClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    // 如果点击的是当前页面，滚动到顶部
    if (pathname === href) {
      e.preventDefault();
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
      return;
    }

    // 移动端关闭菜单
    setIsMenuOpen(false);
    // 关闭下拉菜单
    setActiveDropdown(null);

    // 保存当前滚动位置
    sessionStorage.setItem(`scrollPos_${pathname}`, window.scrollY.toString());
  }, [pathname]);

  /**
   * 处理下拉菜单悬停
   */
  const handleDropdownEnter = useCallback((label: string) => {
    setActiveDropdown(label);
  }, []);

  /**
   * 处理下拉菜单离开
   */
  const handleDropdownLeave = useCallback(() => {
    setActiveDropdown(null);
  }, []);

  /**
   * 监听滚动事件，添加滚动效果和隐藏/显示逻辑
   */
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // 节流：只在滚动位置变化超过10px时更新状态
      if (Math.abs(currentScrollY - lastScrollY) < 10) return;
      
      // 设置滚动状态
      setIsScrolled(currentScrollY > 10);
      
      // 检查是否在页面顶部
      setAtTop(currentScrollY <= 10);
      
      // 如果在首页，导航栏始终可见
      if (pathname === '/') {
        setVisibility(true);
      } else {
        // 如果鼠标在页面顶部附近，始终显示导航栏
        if (isNearTop) {
          setVisibility(true);
        } else {
          // 向下滚动超过100px时隐藏导航栏
          if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setVisibility(false);
          } 
          // 向上滚动时显示导航栏
          else if (currentScrollY < lastScrollY) {
            setVisibility(true);
          }
        }
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isNearTop, pathname, setVisibility, setAtTop]);

  /**
   * 监听鼠标移动，检测是否在页面顶部区域
   * 使用节流优化
   */
  useEffect(() => {
    let mouseMoveTimeout: NodeJS.Timeout;
    
    const handleMouseMove = (e: MouseEvent) => {
      // 节流：只在鼠标移动事件触发后50ms更新状态
      clearTimeout(mouseMoveTimeout);
      mouseMoveTimeout = setTimeout(() => {
        // 当鼠标在页面顶部100px区域内时，显示导航栏
        setIsNearTop(e.clientY <= 100);
      }, 50);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(mouseMoveTimeout);
    };
  }, []);

  // 导航栏样式 - 应用性能优化
  const navClassName = useMemo(() => {
    return `fixed top-0 left-0 right-0 z-[100000] transition-all duration-300 gpu-accelerated ${
      isAtTop
        ? 'bg-transparent dark:bg-transparent border-transparent'
        : 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50'
    }`;
  }, [isAtTop]);

  // 获取链接样式
  const getLinkClassName = useCallback((href: string, isDropdown = false, isDropdownItemActive = false) => {
    const baseClasses = 'px-2 xl:px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300 nav-link whitespace-nowrap flex items-center gap-1';
    const isCurrent = isActive(href);
    
    if (isCurrent || isDropdownItemActive) {
      return `${baseClasses} ${isAtTop ? 'text-white' : 'text-primary dark:text-primary'}`;
    }
    
    if (isDropdown) {
      return `${baseClasses} ${isAtTop ? 'text-white hover:text-gray-200' : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary'}`;
    }
    
    return `${baseClasses} ${isAtTop ? 'text-white hover:text-gray-200' : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary'}`;
  }, [isActive, isAtTop]);

  // 渲染下拉菜单
  const renderDropdown = useCallback((dropdown: DropdownConfig) => {
    const isDropdownActiveState = isDropdownActive(dropdown);
    const isOpen = activeDropdown === dropdown.label;
    
    return (
      <div
        key={dropdown.label}
        className="relative"
        onMouseEnter={() => handleDropdownEnter(dropdown.label)}
        onMouseLeave={handleDropdownLeave}
      >
        <button
          className={getLinkClassName('', true, isDropdownActiveState)}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          {dropdown.label}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className={`absolute top-full left-0 mt-1 w-24 rounded-lg shadow-lg border overflow-hidden ${
                isAtTop 
                  ? 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-gray-200/50 dark:border-gray-700/50' 
                  : 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-gray-200/50 dark:border-gray-700/50'
              }`}
            >
              <div className="py-1">
                {dropdown.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleLinkClick(e, item.href)}
                    className={`block px-4 py-2 text-sm transition-colors duration-200 ${
                      pathname === item.href
                        ? 'text-primary dark:text-primary bg-primary/10 dark:bg-primary/10'
                        : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }, [activeDropdown, handleDropdownEnter, handleDropdownLeave, getLinkClassName, handleLinkClick, pathname, isAtTop, isDropdownActive]);

  // 后台页面不显示导航栏 - 在所有 hooks 调用之后再条件返回
  if (pathname.startsWith('/admin')) {
    return null;
  }
  
  return (
    <>
    <motion.nav
      className={navClassName}
      style={{
        ...navigationStyle.style,
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : -100 }}
      transition={{
        duration: 0.3,
        ease: "easeInOut",
        // 使用 will-change 优化动画性能
        type: "tween"
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
            <span className={`text-2xl font-bold transition-colors duration-300 ${isAtTop ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{emojy}</span>
            <span className={`text-xl font-bold transition-colors duration-300 ${isAtTop ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{name}</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden lg:flex items-center">
            <div className="flex items-center space-x-1 xl:space-x-4">
              {/* 普通导航项 */}
              {regularNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className={getLinkClassName(item.href)}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* 社交下拉菜单 */}
              {renderDropdown(socialDropdown)}
              
              {/* 关于下拉菜单 */}
              {renderDropdown(aboutDropdown)}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-2">
            <button 
              onClick={toggleMobileMenu}
              className={`transition-colors duration-300 ${
                isAtTop 
                  ? 'text-white hover:text-gray-200' 
                  : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary'
              } p-2`}
              aria-label="切换菜单"
            >
              <svg 
                className={`w-6 h-6 transition-transform duration-200 ${isMenuOpen ? 'rotate-90' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>
    </motion.nav>
    
    {/* Mobile menu - 右侧气泡式菜单（放在导航栏外部，使用 Portal 方式定位） */}
    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          className="lg:hidden fixed top-16 right-2 z-[100001]"
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.95 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {/* 气泡式菜单容器 - 透明度和导航栏保持一致 */}
          <div className={`
            min-w-[140px] rounded-2xl shadow-xl border
            ${isAtTop 
              ? 'bg-white/70 dark:bg-gray-900/70 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md' 
              : 'bg-white/70 dark:bg-gray-900/70 border-gray-200/50 dark:border-gray-700/50 backdrop-blur-md'
            }
            py-3 px-2
          `}>
            {/* 普通导航项 */}
            <div className="space-y-1">
              {regularNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className={`block px-4 py-2 rounded-xl text-base font-medium transition-all duration-200 text-right ${
                    pathname === item.href
                      ? 'text-primary dark:text-primary bg-primary/10 dark:bg-primary/10'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            {/* 分隔线 */}
            <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-2 mx-2" />
            
            {/* 社交分类 */}
            <div className="space-y-1">
              <div className={`px-4 py-1 text-xs font-medium text-right ${isAtTop ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>
                社交
              </div>
              {socialDropdown.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className={`block px-4 py-2 rounded-xl text-base font-medium transition-all duration-200 text-right ${
                    pathname === item.href
                      ? 'text-primary dark:text-primary bg-primary/10 dark:bg-primary/10'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            {/* 分隔线 */}
            <div className="border-t border-gray-200/50 dark:border-gray-700/50 my-2 mx-2" />
            
            {/* 关于分类 */}
            <div className="space-y-1">
              <div className={`px-4 py-1 text-xs font-medium text-right ${isAtTop ? 'text-gray-400 dark:text-gray-500' : 'text-gray-400 dark:text-gray-500'}`}>
                关于
              </div>
              {aboutDropdown.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  className={`block px-4 py-2 rounded-xl text-base font-medium transition-all duration-200 text-right ${
                    pathname === item.href
                      ? 'text-primary dark:text-primary bg-primary/10 dark:bg-primary/10'
                      : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </>);
};

// 使用React.memo减少不必要的渲染
export default React.memo(Navigation);
