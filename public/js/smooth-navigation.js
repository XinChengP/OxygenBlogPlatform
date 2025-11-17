/**
 * 页面切换优化脚本
 * 用于改善静态导出站点的页面切换体验
 */

(function() {
  'use strict';
  
  // 页面状态管理
  const pageState = {
    scrollPositions: {},
    isNavigating: false,
    navigationStartTime: 0
  };

  // 保存当前滚动位置
  function saveScrollPosition() {
    const currentPath = window.location.pathname;
    pageState.scrollPositions[currentPath] = window.scrollY;
    sessionStorage.setItem('pageScrollPositions', JSON.stringify(pageState.scrollPositions));
  }

  // 恢复滚动位置
  function restoreScrollPosition() {
    const currentPath = window.location.pathname;
    const savedPositions = JSON.parse(sessionStorage.getItem('pageScrollPositions') || '{}');
    const savedPosition = savedPositions[currentPath];
    
    if (savedPosition !== undefined) {
      setTimeout(() => {
        window.scrollTo({
          top: savedPosition,
          behavior: 'instant' // 使用即时滚动避免闪烁
        });
      }, 0);
    }
  }

  // 监听页面可见性变化
  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') {
      // 页面变为可见时，恢复滚动位置
      restoreScrollPosition();
    } else {
      // 页面变为不可见时，保存滚动位置
      saveScrollPosition();
    }
  }

  // 监听页面加载
  function handleLoad() {
    restoreScrollPosition();
  }

  // 监听页面卸载
  function handleBeforeUnload() {
    saveScrollPosition();
  }

  // 监听点击事件，处理导航链接
  function handleClick(event) {
    const link = event.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

    // 如果是外部链接，不处理
    if (link.hostname !== window.location.hostname) return;

    // 保存当前页面状态
    saveScrollPosition();
    
    // 添加页面过渡效果
    document.documentElement.classList.add('page-transitioning');
    
    // 设置导航状态
    pageState.isNavigating = true;
    pageState.navigationStartTime = Date.now();
  }

  // 监听浏览器历史记录变化
  function handlePopState() {
    // 浏览器后退/前进按钮被点击
    restoreScrollPosition();
  }

  // 节流函数
  function throttle(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // 初始化
  function init() {
    // 恢复之前的滚动位置
    const savedPositions = JSON.parse(sessionStorage.getItem('pageScrollPositions') || '{}');
    pageState.scrollPositions = savedPositions;
    
    // 立即恢复当前页面的滚动位置
    restoreScrollPosition();

    // 添加事件监听器
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('load', handleLoad);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleClick);
    
    // 监听滚动事件，节流处理
    const throttledSaveScroll = throttle(saveScrollPosition, 100);
    window.addEventListener('scroll', throttledSaveScroll, { passive: true });

    // 页面加载完成后移除过渡效果
    window.addEventListener('load', () => {
      setTimeout(() => {
        document.documentElement.classList.remove('page-transitioning');
      }, 100);
    });
  }

  // 添加CSS样式
  function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* 页面过渡效果 */
      html.page-transitioning {
        opacity: 0.95;
        transition: opacity 0.2s ease-in-out;
      }
      
      /* 平滑滚动 */
      html {
        scroll-behavior: smooth;
      }
      
      /* 减少运动偏好的用户设置 */
      @media (prefers-reduced-motion: reduce) {
        html {
          scroll-behavior: auto;
        }
        
        html.page-transitioning {
          transition: none;
        }
      }
      
      /* 页面加载时的淡入效果 */
      body {
        animation: pageFadeIn 0.3s ease-out;
      }
      
      @keyframes pageFadeIn {
        from {
          opacity: 0.8;
        }
        to {
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 启动优化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      addStyles();
      init();
    });
  } else {
    addStyles();
    init();
  }
})();