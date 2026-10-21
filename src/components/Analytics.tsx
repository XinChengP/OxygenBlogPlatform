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
  /**
   * 是否上报真实用户性能指标（TTFB / LCP / DCL / Load）
   * 用于定位「部分设备/部分省份访问慢」问题，不采集任何页面内容。
   * 可通过环境变量关闭：NEXT_PUBLIC_DISABLE_PERF_TRACKING=true
   */
  TRACK_PERFORMANCE: String(process.env.NEXT_PUBLIC_DISABLE_PERF_TRACKING).toLowerCase() !== 'true',
};

/** 真实用户性能指标（页面维度，仅采集一次） */
interface PerfMetrics {
  /** 首字节时间（ms） */
  ttfb?: number;
  /** DOMContentLoaded 时间（ms） */
  domInteractive?: number;
  /** load 事件时间（ms） */
  pageLoad?: number;
  /** 最大内容绘制时间（ms，可能为空：用户过早切走） */
  lcp?: number;
  /** 有效网络类型（4g / 3g / slow-2g...） */
  effectiveType?: string;
  /** 是否省流量模式 */
  saveData?: boolean;
}

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
         
        console.log('[51la] 统计 SDK 初始化成功');
      }
    }
  } catch (error) {
    // 开发环境下输出错误日志
    if (process.env.NODE_ENV === 'development') {
       
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
       
      console.log('[51la] 页面浏览追踪:', pageName, extraData);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
       
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
       
      console.log('[51la] 文章浏览追踪:', title, { slug, category });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
       
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
       
      console.log('[51la] 小工具浏览追踪:', toolName, { category });
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
       
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
       
      console.log('[51la] 事件追踪:', eventName, data);
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
       
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

  // 真实用户性能指标：SDK 未就绪先采集，初始化完成后统一上报
  const perfRef = useRef<PerfMetrics>({});
  const perfReportedRef = useRef(false);

  /**
   * 采集真实用户性能指标
   * - LCP 通过 PerformanceObserver 监听，用户首次交互后读取最后一条
   * - 其余字段来自 Navigation Timing V2 与 Network Information API
   * 只上报数字与网络类型，不包含页面内容；异常时静默失败。
   */
  useEffect(() => {
    if (!LA_CONFIG.TRACK_PERFORMANCE) return;
    if (typeof window === 'undefined') return;

    let lcpValue: number | undefined;

    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            lcpValue = entries[entries.length - 1].startTime;
          }
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
        // LCP 在用户首次交互（或 load 后 8s）后即为最终值
        const stop = () => {
          try { observer.disconnect(); } catch { /* 已断开 */ }
        };
        window.addEventListener('pointerdown', stop, { once: true });
        window.addEventListener('keydown', stop, { once: true });
        window.setTimeout(stop, 8000);
      } catch {
        // 浏览器不支持该 entry type（如部分旧 WebView），跳过 LCP
      }
    }

    const collect = () => {
      try {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        const conn = (navigator as Navigator & {
          connection?: { effectiveType?: string; saveData?: boolean };
        }).connection;

        perfRef.current = {
          ttfb: nav ? Math.round(nav.responseStart) : undefined,
          domInteractive: nav ? Math.round(nav.domInteractive) : undefined,
          pageLoad: nav ? Math.round(nav.loadEventEnd) : undefined,
          lcp: lcpValue !== undefined ? Math.round(lcpValue) : undefined,
          effectiveType: conn?.effectiveType,
          saveData: conn?.saveData === true ? true : undefined,
        };

        if (!perfReportedRef.current && isLAReady()) {
          perfReportedRef.current = true;
          trackEvent('页面性能', { ...perfRef.current });
        }
      } catch {
        // 性能上报失败不影响站点功能
      }
    };

    if (document.readyState === 'complete') {
      window.setTimeout(collect, 1500);
    } else {
      window.addEventListener('load', () => window.setTimeout(collect, 1500), { once: true });
    }
  }, []);

  /**
   * SDK 加载完成后的回调
   */
  const handleScriptLoad = useCallback(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initAnalytics();
      // 指标可能先于 SDK 就绪，这里做一次补发
      if (
        LA_CONFIG.TRACK_PERFORMANCE &&
        !perfReportedRef.current &&
        Object.keys(perfRef.current).length > 0
      ) {
        perfReportedRef.current = true;
        trackEvent('页面性能', { ...perfRef.current });
      }
    }
  }, []);

  /**
   * SDK 加载失败的回调
   * 仅在开发环境输出警告，不影响网站功能
   */
  const handleScriptError = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
       
      console.warn('[51la] SDK 脚本加载失败，统计功能将不可用');
    }
  }, []);

  // 组件卸载时清理（如果需要）
  useEffect(() => {
    return () => {
      // 清理逻辑（当前版本不需要特殊清理）
    };
  }, []);

  {/*
    lazyOnload：统计脚本不再以 afterInteractive 抢占首屏资源。
    原策略会让 React 在 <head> 生成 <link rel="preload" as="script">，
    36KB 的第三方 SDK 与 LCP 关键资源竞争带宽；
    lazyOnload 在页面 load 完成后再加载，不影响统计事件本身。
  */}
  return (
    <Script
      id="LA_COLLECT"
      src={LA_CONFIG.SDK_URL}
      strategy="lazyOnload"
      onLoad={handleScriptLoad}
      onError={handleScriptError}
      // 设置 charset 确保中文正确显示
      charSet="UTF-8"
    />
  );
}

// 导出配置供其他模块使用
export { LA_CONFIG };
