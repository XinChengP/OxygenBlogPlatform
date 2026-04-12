/**
 * 51la 网站统计组件
 * 
 * 本组件封装了 51la 统计 SDK 的加载和初始化逻辑
 * 适用于 GitHub Pages 静态部署环境
 * 
 * 功能说明：
 * - 动态加载 51la SDK 脚本
 * - 自动初始化统计配置
 * - 提供页面浏览和自定义事件追踪方法
 * 
 * @see https://www.51.la/ 51la 统计官网
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import Script from 'next/script';

/**
 * 51la 统计配置
 * 从环境变量读取配置，支持 GitHub Pages 部署
 */
const LA_CONFIG = {
  /** 统计站点 ID */
  ID: process.env.NEXT_PUBLIC_51LA_ID || '3PaiTXyPhK9fHSW3',
  /** 统计站点 CK */
  CK: process.env.NEXT_PUBLIC_51LA_CK || '3PaiTXyPhK9fHSW3',
  /** SDK 脚本地址 */
  SDK_URL: '//sdk.51.la/js-sdk-pro.min.js',
  /** 是否启用 hash 模式（GitHub Pages 静态部署建议启用） */
  HASH_MODE: true,
};

/**
 * 检查 51la SDK 是否已加载并初始化
 * @returns 是否已就绪
 */
function isLAReady(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.LA !== 'undefined' && 
         typeof window.LA.track === 'function';
}

/**
 * 初始化 51la 统计
 * 在 SDK 脚本加载完成后调用
 */
function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  
  try {
    if (typeof window.LA !== 'undefined') {
      window.LA.init({
        id: LA_CONFIG.ID,
        ck: LA_CONFIG.CK,
        hashMode: LA_CONFIG.HASH_MODE,
      });
      
      // 开发环境下输出日志
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[51la] 统计 SDK 初始化成功');
      }
    }
  } catch (error) {
    // 开发环境下输出错误日志
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[51la] 统计 SDK 初始化失败:', error);
    }
  }
}

/**
 * 追踪页面浏览事件
 * 
 * @param pageName 页面名称
 * @param extraData 额外的追踪数据
 */
export function trackPageView(
  pageName: string, 
  extraData?: Record<string, string | number | boolean>
): void {
  if (!isLAReady()) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[51la] SDK 未就绪，无法追踪页面浏览:', pageName);
    }
    return;
  }

  try {
    window.LA.track('页面浏览', {
      pageName,
      url: window.location.href,
      pathname: window.location.pathname,
      ...extraData,
    });
    
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[51la] 页面浏览追踪:', pageName, extraData);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[51la] 页面浏览追踪失败:', error);
    }
  }
}

/**
 * 追踪文章浏览事件
 * 
 * @param title 文章标题
 * @param slug 文章 slug
 * @param category 文章分类
 * @param extraData 额外的追踪数据
 */
export function trackArticleView(
  title: string,
  slug: string,
  category?: string,
  extraData?: Record<string, string | number | boolean>
): void {
  if (!isLAReady()) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[51la] SDK 未就绪，无法追踪文章浏览:', title);
    }
    return;
  }

  try {
    window.LA.track('文章浏览', {
      title,
      slug,
      category: category || '未分类',
      url: window.location.href,
      ...extraData,
    });
    
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[51la] 文章浏览追踪:', title, { slug, category });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[51la] 文章浏览追踪失败:', error);
    }
  }
}

/**
 * 追踪小工具浏览事件
 * 
 * @param toolName 小工具名称
 * @param category 小工具分类
 * @param extraData 额外的追踪数据
 */
export function trackToolView(
  toolName: string,
  category?: string,
  extraData?: Record<string, string | number | boolean>
): void {
  if (!isLAReady()) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[51la] SDK 未就绪，无法追踪小工具浏览:', toolName);
    }
    return;
  }

  try {
    window.LA.track('小工具浏览', {
      toolName,
      category: category || '未分类',
      url: window.location.href,
      pathname: window.location.pathname,
      ...extraData,
    });
    
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[51la] 小工具浏览追踪:', toolName, { category });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[51la] 小工具浏览追踪失败:', error);
    }
  }
}

/**
 * 追踪自定义事件
 * 
 * @param eventName 事件名称
 * @param data 事件数据
 */
export function trackEvent(
  eventName: string,
  data?: Record<string, string | number | boolean>
): void {
  if (!isLAReady()) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[51la] SDK 未就绪，无法追踪事件:', eventName);
    }
    return;
  }

  try {
    window.LA.track(eventName, {
      url: window.location.href,
      pathname: window.location.pathname,
      ...data,
    });
    
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[51la] 事件追踪:', eventName, data);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.error('[51la] 事件追踪失败:', error);
    }
  }
}

/**
 * Analytics 组件
 * 
 * 该组件负责加载 51la SDK 并初始化统计功能
 * 应在应用的根布局中使用，确保所有页面都能被追踪
 */
export default function Analytics(): React.ReactElement | null {
  // 使用 ref 确保初始化只执行一次
  const initializedRef = useRef(false);

  /**
   * SDK 加载完成后的回调
   */
  const handleScriptLoad = useCallback(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initAnalytics();
    }
  }, []);

  /**
   * SDK 加载失败的回调
   * 仅在开发环境输出警告，不影响网站功能
   */
  const handleScriptError = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[51la] SDK 脚本加载失败，统计功能将不可用');
    }
  }, []);

  // 组件卸载时清理（如果需要）
  useEffect(() => {
    return () => {
      // 清理逻辑（当前版本不需要特殊清理）
    };
  }, []);

  return (
    <Script
      id="LA_COLLECT"
      src={LA_CONFIG.SDK_URL}
      strategy="afterInteractive"
      onLoad={handleScriptLoad}
      onError={handleScriptError}
      // 设置 charset 确保中文正确显示
      charSet="UTF-8"
    />
  );
}

// 导出配置供其他模块使用
export { LA_CONFIG };
