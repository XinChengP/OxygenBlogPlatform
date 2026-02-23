'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { emojy, name } from '@/setting/NavigationSetting';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { useNavigationVisibility } from '@/contexts/NavigationVisibilityContext';


/**
 * 导航栏组件
 * 支持响应式设计和主题切换
 */
const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isNearTop, setIsNearTop] = useState(false);
  const pathname = usePathname();
  const { navigationStyle } = useBackgroundStyle('home');
  const { isVisible, isAtTop, setVisibility, setAtTop } = useNavigationVisibility();

  // 导航项配置
  const navItems = useMemo(() => [
    { href: '/', label: '首页' },
    { href: '/blogs', label: '博客' },
    { href: '/archive', label: '归档' },
    { href: '/gallery', label: '画廊' },
    { href: '/guestbook', label: '留言板' },
    { href: '/tools', label: '小工具' },
    { href: '/about', label: '关于' },
    // 设置选项已从导航栏隐藏，但功能仍然保留
  ], []);

  /**
   * 检查链接是否为当前页面
   */
  const isActive = useCallback((href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  }, [pathname]);

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

    // 保存当前滚动位置
    sessionStorage.setItem(`scrollPos_${pathname}`, window.scrollY.toString());
  }, [pathname]);

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
  }, [lastScrollY, isNearTop, pathname]);

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

  // 导航栏样式
  const navClassName = useMemo(() => {
    return `fixed top-0 left-0 right-0 z-[100000] transition-all duration-300 ${
      isAtTop 
        ? 'bg-transparent dark:bg-transparent border-transparent' 
        : 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50'
    }`;
  }, [isAtTop]);
  
  return (
    <motion.nav 
      className={navClassName}
      style={navigationStyle.style}
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : -100 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
            <span className={`text-2xl font-bold transition-colors duration-300 ${isAtTop ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{emojy}</span>
            <span className={`text-xl font-bold transition-colors duration-300 ${isAtTop ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{name}</span>
          </Link>
          
          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <div className="flex space-x-8">
              {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleLinkClick(e, item.href)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300 nav-link ${
                      pathname === item.href
                        ? isAtTop ? 'text-white' : 'text-primary dark:text-primary'
                        : isAtTop ? 'text-white hover:text-gray-200' : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-2">
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
        
        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              className="md:hidden overflow-hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => handleLinkClick(e, item.href)}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-300 nav-link ${
                      pathname === item.href
                        ? isAtTop ? 'text-white' : 'text-primary dark:text-primary'
                        : isAtTop ? 'text-white hover:text-gray-200' : 'text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary hover:bg-gray-50/80 dark:hover:bg-gray-800/50'
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
    </motion.nav>
  );
};

// 使用React.memo减少不必要的渲染
export default React.memo(Navigation);