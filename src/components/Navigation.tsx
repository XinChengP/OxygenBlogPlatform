'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { emojy, name } from '@/setting/NavigationSetting';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { useNavigationVisibility } from '@/contexts/NavigationVisibilityContext';
import { Users, MessageSquare, Link2, User, ChevronDown, Search } from 'lucide-react';
import { OPEN_SEARCH_EVENT } from '@/utils/searchEvents';
import { prefetchSearchIndex } from '@/utils/searchIndex';
import { Z_INDEX } from '@/utils/zIndex';
import { isElectron } from '@/utils/isElectron';

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
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const pathname = usePathname();
  const lastScrollYRef = useRef(0);
  const isNearTopRef = useRef(false);
  const scrollTickingRef = useRef(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  
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
      { href: '/study', label: '学习记录' },
      { href: '/changelogs', label: '开发日志' },
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
    // 先关闭菜单，同页点击也不会让移动端菜单停留在展开状态
    setIsMenuOpen(false);
    setActiveDropdown(null);

    // 如果点击的是当前页面，滚动到顶部
    if (pathname === href) {
      e.preventDefault();
      // Electron 桌面端始终用平滑滚动
      const reduceMotion = !isElectron() && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }, [pathname]);

  /**
   * 下拉菜单键盘操作：Enter/Space/↓ 展开，Esc 收起
   */
  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>, label: string) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setActiveDropdown(null);
      const trigger = e.currentTarget.querySelector<HTMLButtonElement>('button');
      trigger?.focus();
      return;
    }

    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveDropdown(label);
      // 等菜单挂载后再把焦点移到第一项
      requestAnimationFrame(() => {
        const firstItem = e.currentTarget.querySelector<HTMLAnchorElement>('[role="menu"] a');
        firstItem?.focus();
      });
    }
  }, []);

  /**
   * 焦点离开整个下拉容器时收起，避免焦点陷阱失效
   */
  const handleDropdownBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setActiveDropdown(null);
    }
  }, []);

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
   * 打开站内搜索弹窗
   * 通过派发自定义事件通知全局挂载的 SearchDialog，
   * 导航与弹窗之间无需建立状态依赖
   */
  const handleSearchClick = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_SEARCH_EVENT));
  }, []);

  /**
   * 监听滚动事件，添加滚动效果和隐藏/显示逻辑
   *
   * 使用 ref 保存上一次位置，effect 只绑定一次；
   * rAF 合并同一帧内的多次 scroll 事件，避免每个事件都读写布局。
   */
  useEffect(() => {
    const handleScroll = () => {
      if (scrollTickingRef.current) return;
      scrollTickingRef.current = true;

      requestAnimationFrame(() => {
        scrollTickingRef.current = false;

        const currentScrollY = window.scrollY;
        const lastScrollY = lastScrollYRef.current;

        setAtTop(currentScrollY <= 10);

        if (pathname === '/') {
          setVisibility(true);
        } else if (isNearTopRef.current) {
          setVisibility(true);
        } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setVisibility(false);
        } else if (currentScrollY < lastScrollY) {
          setVisibility(true);
        }

        lastScrollYRef.current = currentScrollY;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pathname, setVisibility, setAtTop]);

  /**
   * 鼠标靠近顶部时显示导航栏
   * 首页导航始终可见，无需常驻 mousemove 监听
   */
  useEffect(() => {
    if (pathname === '/') return;

    let rafId = 0;
    const handleMouseMove = (e: MouseEvent) => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        const nearTop = e.clientY <= 100;
        if (nearTop === isNearTopRef.current) return;
        isNearTopRef.current = nearTop;
        if (nearTop) setVisibility(true);
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [pathname, setVisibility]);

  // 移动端菜单：Esc 关闭、点击外部关闭、路由变化关闭
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMenuOpen(false);
        mobileMenuButtonRef.current?.focus();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (mobileMenuRef.current?.contains(target)) return;
      if (mobileMenuButtonRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
    setActiveDropdown(null);
  }, [pathname]);

  // 导航栏样式 - 应用性能优化
  const navClassName = useMemo(() => {
    return `fixed top-0 left-0 right-0 transition-all duration-300 gpu-accelerated nav-glass ${
      isAtTop
        ? 'bg-transparent dark:bg-transparent border-transparent'
        : 'glass-card border-b'
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
      return `${baseClasses} ${isAtTop ? 'text-white hover:text-white/80' : 'text-foreground hover:text-primary dark:hover:text-primary'}`;
    }

    // 下拉菜单项与普通导航项的样式规则完全一致（原本就是同一段代码，合并避免重复）
    return `${baseClasses} ${isAtTop ? 'text-white hover:text-white/80' : 'text-foreground hover:text-primary dark:hover:text-primary'}`;
  }, [isActive, isAtTop]);

  // 渲染下拉菜单
  const renderDropdown = useCallback((dropdown: DropdownConfig) => {
    const isDropdownActiveState = isDropdownActive(dropdown);
    const isOpen = activeDropdown === dropdown.label;
    const menuId = `nav-dropdown-${dropdown.label}`;
    
    return (
      <div
        key={dropdown.label}
        className="relative"
        onMouseEnter={() => handleDropdownEnter(dropdown.label)}
        onMouseLeave={handleDropdownLeave}
        onKeyDown={(e) => handleDropdownKeyDown(e, dropdown.label)}
        onBlur={handleDropdownBlur}
      >
        <button
          type="button"
          className={getLinkClassName('', true, isDropdownActiveState)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-controls={menuId}
          onClick={() => setActiveDropdown(isOpen ? null : dropdown.label)}
        >
          {dropdown.label}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {isOpen && (
          <div
            id={menuId}
            role="menu"
            className="nav-dropdown-in absolute top-full left-0 mt-1 min-w-[8rem] rounded-lg shadow-lg border overflow-hidden glass-card"
          >
            <div className="py-1">
              {dropdown.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  role="menuitem"
                  onClick={(e) => handleLinkClick(e, item.href)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={`block px-4 py-2 text-sm transition-colors duration-200 ${
                    pathname === item.href
                      ? 'text-primary dark:text-primary bg-primary/10 dark:bg-primary/10'
                      : 'text-foreground hover:text-primary dark:hover:text-primary hover:bg-muted/60'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }, [activeDropdown, handleDropdownEnter, handleDropdownLeave, handleDropdownKeyDown, handleDropdownBlur, getLinkClassName, handleLinkClick, pathname, isActive, isDropdownActive]);

  // 后台页面不显示导航栏 - 在所有 hooks 调用之后再条件返回
  if (pathname.startsWith('/admin')) {
    return null;
  }
  
  return (
    <>
    <nav
      className={navClassName}
      style={{
        ...navigationStyle.style,
        zIndex: Z_INDEX.navigation,
        willChange: 'transform',
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        transition: 'transform 0.3s ease-in-out, background-color 0.3s, border-color 0.3s',
      }}
      inert={!isVisible}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2" onClick={closeMobileMenu}>
            <span className={`text-2xl font-bold transition-colors duration-300 ${isAtTop ? 'text-white' : 'text-foreground'}`}>{emojy}</span>
            <span className={`text-xl font-bold transition-colors duration-300 ${isAtTop ? 'text-white' : 'text-foreground'}`}>{name}</span>
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
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={getLinkClassName(item.href)}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* 社交下拉菜单 */}
              {renderDropdown(socialDropdown)}

              {/* 关于下拉菜单 */}
              {renderDropdown(aboutDropdown)}

              {/* 站内搜索按钮 */}
              <button
                type="button"
                onClick={handleSearchClick}
                onPointerEnter={prefetchSearchIndex}
                onFocus={prefetchSearchIndex}
                aria-label="搜索文章（快捷键 Ctrl+K）"
                className={`px-2 xl:px-3 py-2 rounded-md transition-colors duration-300 ${
                  isAtTop
                    ? 'text-white hover:text-white/80'
                    : 'text-foreground hover:text-primary dark:hover:text-primary'
                }`}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center space-x-2">
            {/* 移动端站内搜索按钮 */}
            <button
              type="button"
              onClick={handleSearchClick}
              onPointerEnter={prefetchSearchIndex}
              onFocus={prefetchSearchIndex}
              aria-label="搜索文章"
              className={`p-2 transition-colors duration-300 ${
                isAtTop
                  ? 'text-white hover:text-white/80'
                  : 'text-foreground hover:text-primary dark:hover:text-primary'
              }`}
            >
              <Search className="w-6 h-6" />
            </button>
            <button
              ref={mobileMenuButtonRef}
              type="button"
              onClick={toggleMobileMenu}
              className={`transition-colors duration-300 ${
                isAtTop 
                  ? 'text-white hover:text-white/80' 
                  : 'text-foreground hover:text-primary dark:hover:text-primary'
              } p-2`}
              aria-label="切换菜单"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav-menu"
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
    </nav>
    
    {/* Mobile menu - 右侧气泡式菜单（放在导航栏外部，使用 Portal 方式定位） */}
    {isMenuOpen && (
      <div
        ref={mobileMenuRef}
        id="mobile-nav-menu"
        className="nav-pop-in lg:hidden fixed top-16 right-2"
        style={{ zIndex: Z_INDEX.mobileMenu }}
      >
          {/* 气泡式菜单容器 - 浮层固定用毛玻璃，不随 isAtTop 变化 */}
          <div className={`
            min-w-[140px] rounded-2xl shadow-xl border glass-card-strong
            py-3 px-2
          `}>
            {/* 普通导航项 */}
            <div className="space-y-1">
              {regularNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={`block px-4 py-2 rounded-xl text-base font-medium transition-all duration-200 text-right ${
                    pathname === item.href
                      ? 'text-primary dark:text-primary bg-primary/10 dark:bg-primary/10'
                      : 'text-foreground hover:text-primary dark:hover:text-primary hover:bg-muted/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            {/* 分隔线 */}
            <div className="border-t border-border/50 my-2 mx-2" />
            
            {/* 社交分类 */}
            <div className="space-y-1">
              <div className="px-4 py-1 text-xs font-medium text-right text-muted-foreground">
                社交
              </div>
              {socialDropdown.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={`block px-4 py-2 rounded-xl text-base font-medium transition-all duration-200 text-right ${
                    pathname === item.href
                      ? 'text-primary dark:text-primary bg-primary/10 dark:bg-primary/10'
                      : 'text-foreground hover:text-primary dark:hover:text-primary hover:bg-muted/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            {/* 分隔线 */}
            <div className="border-t border-border/50 my-2 mx-2" />
            
            {/* 关于分类 */}
            <div className="space-y-1">
              <div className="px-4 py-1 text-xs font-medium text-right text-muted-foreground">
                关于
              </div>
              {aboutDropdown.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleLinkClick(e, item.href)}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                  className={`block px-4 py-2 rounded-xl text-base font-medium transition-all duration-200 text-right ${
                    pathname === item.href
                      ? 'text-primary dark:text-primary bg-primary/10 dark:bg-primary/10'
                      : 'text-foreground hover:text-primary dark:hover:text-primary hover:bg-muted/50'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
    )}
  </>);
};

// 使用React.memo减少不必要的渲染
export default React.memo(Navigation);
