'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { emojy, name } from '@/setting/NavigationSetting';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';

/**
 * 导航栏组件
 * 支持响应式设计和主题切换
 */
export default function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isNearTop, setIsNearTop] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const pathname = usePathname();
  const { navigationStyle } = useBackgroundStyle('home');

  /**
   * 监听滚动事件，添加滚动效果和隐藏/显示逻辑
   */
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // 设置滚动状态
      setIsScrolled(currentScrollY > 10);
      
      // 检查是否在页面顶部
      setIsAtTop(currentScrollY <= 10);
      
      // 如果在首页，导航栏始终可见
      if (pathname === '/') {
        setIsVisible(true);
      } else {
        // 如果鼠标在页面顶部附近，始终显示导航栏
        if (isNearTop) {
          setIsVisible(true);
        } else {
          // 向下滚动超过100px时隐藏导航栏
          if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsVisible(false);
          } 
          // 向上滚动时显示导航栏
          else if (currentScrollY < lastScrollY) {
            setIsVisible(true);
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
   */
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // 当鼠标在页面顶部100px区域内时，显示导航栏
      if (e.clientY <= 100) {
        setIsNearTop(true);
      } else {
        setIsNearTop(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  /**
   * 检查链接是否为当前页面
   */
  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };
  
  const navItems = [
    { href: '/', label: '首页' },
    { href: '/blogs', label: '博客' },
    { href: '/archive', label: '归档' },
    { href: '/guestbook', label: '留言板' },
    { href: '/about', label: '关于' },
    { href: '/settings', label: '设置' },
  ];
  
  /**
   * 切换移动端菜单显示状态
   */
  const toggleMobileMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  /**
   * 关闭移动端菜单
   */
  const closeMobileMenu = () => {
    setIsMenuOpen(false);
  };
  
  return (
    <motion.nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isAtTop 
          ? 'bg-transparent dark:bg-transparent border-transparent' 
          : 'bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50'
      }`}
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
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-300 ${
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
                    onClick={closeMobileMenu}
                    className={`block px-3 py-2 rounded-md text-base font-medium transition-colors duration-300 ${
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
}