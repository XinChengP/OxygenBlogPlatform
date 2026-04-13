/**
 * 防劫持保护组件
 * 实时监控页面是否被恶意篡改或劫持
 * 
 * 功能特性：
 * 1. 检测页面是否被嵌入到恶意iframe
 * 2. 监控DOM是否被非法修改
 * 3. 检测可疑脚本注入
 * 4. 监控网络请求异常
 * 5. 检测页面重定向劫持
 * 
 * @author 歆橙
 * @version 1.0.0
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * 劫持检测配置选项
 */
interface HijackingConfig {
  // 是否启用iframe逃逸检测
  enableIframeEscape: boolean;
  // 是否启用DOM监控
  enableDOMMonitoring: boolean;
  // 是否启用脚本监控
  enableScriptMonitoring: boolean;
  // 是否启用网络监控
  enableNetworkMonitoring: boolean;
  // 检测间隔（毫秒）
  checkInterval: number;
  // 允许的iframe祖先域名
  allowedAncestors: string[];
  // 可疑脚本关键词
  suspiciousScriptPatterns: string[];
  // 发现劫持时的回调
  onHijackingDetected: (type: string, details: unknown) => void;
}

/**
 * 默认配置
 */
const defaultConfig: HijackingConfig = {
  enableIframeEscape: true,
  enableDOMMonitoring: true,
  enableScriptMonitoring: true,
  enableNetworkMonitoring: true,
  checkInterval: 3000,
  allowedAncestors: [
    'localhost',
    '127.0.0.1',
    'github.io',
    'xinchengp.cn',
    'blog.xinchengp.cn',
  ],
  suspiciousScriptPatterns: [
    'eval\\s*\\(',
    'document\\.write',
    'innerHTML\\s*=',
    'outerHTML\\s*=',
    'insertAdjacentHTML',
    'appendChild.*script',
    'createElement.*script',
    'setAttribute.*on\\w+',
    'javascript:',
    'data:text/html',
    'atob\\s*\\(',
    'Function\\s*\\(',
    'setTimeout\\s*\\([^,]+,\\s*0\\s*\\)',
    'setInterval\\s*\\([^,]+,\\s*0\\s*\\)',
  ],
  onHijackingDetected: (type, details) => {
    console.error(`[防劫持检测] 发现异常: ${type}`, details);
    
    // 可以在这里添加上报逻辑
    if (typeof window !== 'undefined' && (window as unknown as Record<string, unknown>).gtag) {
      (window as unknown as Record<string, (type: string, name: string, params: Record<string, unknown>) => void>).gtag('event', 'security_hijacking_detected', {
        event_category: 'security',
        event_label: type,
        custom_parameter_1: JSON.stringify(details),
      });
    }
  },
};

/**
 * 检查页面是否被嵌入到iframe中
 * @param allowedAncestors 允许的祖先域名列表
 * @returns 检测结果
 */
function checkIframeEmbedding(allowedAncestors: string[]): { 
  isEmbedded: boolean; 
  isAllowed: boolean;
  ancestorOrigin?: string;
} {
  // 检查是否在iframe中
  const isEmbedded = window.self !== window.top;
  
  if (!isEmbedded) {
    return { isEmbedded: false, isAllowed: true };
  }
  
  // 尝试获取父页面来源
  let ancestorOrigin = '';
  try {
    ancestorOrigin = window.top?.location?.origin || document.referrer || '';
  } catch {
    // 跨域访问被阻止，说明来自不同域
    return { isEmbedded: true, isAllowed: false, ancestorOrigin: 'cross-origin' };
  }
  
  // 检查是否在允许列表中
  const isAllowed = allowedAncestors.some(domain => 
    ancestorOrigin.includes(domain) || window.location.hostname.includes(domain)
  );
  
  return { isEmbedded: true, isAllowed, ancestorOrigin };
}

/**
 * iframe逃逸处理
 * 如果页面被嵌入到未授权的iframe中，强制跳转到顶层
 */
function escapeIframe(): void {
  try {
    if (window.top && window.self !== window.top) {
      window.top.location.href = window.self.location.href;
    }
  } catch (error) {
    // 跨域情况下无法直接跳转，尝试其他方式
    console.warn('[防劫持] 无法直接逃逸iframe，尝试替代方案');
    
    // 显示警告遮罩
    const overlay = document.createElement('div');
    overlay.id = 'hijacking-warning-overlay';
    overlay.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.95);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-family: system-ui, -apple-system, sans-serif;
        text-align: center;
        padding: 20px;
      ">
        <h1 style="color: #ff4444; margin-bottom: 20px;">⚠️ 安全警告</h1>
        <p style="font-size: 18px; margin-bottom: 15px;">检测到页面被嵌入到未授权的第三方网站中</p>
        <p style="font-size: 14px; color: #ccc; margin-bottom: 30px;">
          这可能是钓鱼攻击或恶意劫持，建议直接访问官方网站
        </p>
        <a href="${window.location.href}" target="_top" style="
          background: #66ccff;
          color: #000;
          padding: 12px 30px;
          border-radius: 6px;
          text-decoration: none;
          font-weight: bold;
          font-size: 16px;
        ">访问官方网站</a>
      </div>
    `;
    document.body.appendChild(overlay);
  }
}

/**
 * 监控DOM变化，检测非法修改
 */
class DOMMonitor {
  private observer: MutationObserver | null = null;
  private config: HijackingConfig;
  private suspiciousElements: Set<Element> = new Set();
  
  constructor(config: HijackingConfig) {
    this.config = config;
  }
  
  /**
   * 启动DOM监控
   */
  start(): void {
    if (!window.MutationObserver) {
      console.warn('[DOM监控] 浏览器不支持MutationObserver');
      return;
    }
    
    this.observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });
    
    this.observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'href', 'onclick', 'onload', 'onerror'],
    });
    
    console.log('[DOM监控] 已启动');
  }
  
  /**
   * 停止DOM监控
   */
  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
  
  /**
   * 处理DOM变化
   */
  private handleMutations(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      // 检查新增的节点
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.checkElement(node as Element);
          }
        });
      }
      
      // 检查属性变化
      if (mutation.type === 'attributes' && mutation.target.nodeType === Node.ELEMENT_NODE) {
        this.checkElementAttributes(mutation.target as Element, mutation.attributeName);
      }
    }
  }
  
  /**
   * 检查元素是否可疑
   */
  private checkElement(element: Element): void {
    // 检查是否是脚本元素
    if (element.tagName === 'SCRIPT') {
      this.checkScriptElement(element as HTMLScriptElement);
    }
    
    // 检查是否是iframe
    if (element.tagName === 'IFRAME') {
      this.checkIframeElement(element as HTMLIFrameElement);
    }
    
    // 检查是否包含内联事件
    const eventAttrs = ['onclick', 'onload', 'onerror', 'onmouseover', 'onsubmit'];
    for (const attr of eventAttrs) {
      if (element.hasAttribute(attr)) {
        const value = element.getAttribute(attr) || '';
        if (this.isSuspiciousCode(value)) {
          this.reportSuspiciousElement(element, `可疑的内联事件: ${attr}`);
        }
      }
    }
    
    // 递归检查子元素
    element.querySelectorAll('script, iframe').forEach(child => {
      this.checkElement(child);
    });
  }
  
  /**
   * 检查脚本元素
   */
  private checkScriptElement(script: HTMLScriptElement): void {
    // 检查内联脚本内容
    if (!script.src && script.textContent) {
      if (this.isSuspiciousCode(script.textContent)) {
        this.reportSuspiciousElement(script, '可疑的内联脚本内容');
      }
    }
    
    // 检查外部脚本来源
    if (script.src) {
      const isAllowed = this.isAllowedScriptSource(script.src);
      if (!isAllowed) {
        this.reportSuspiciousElement(script, `未授权的外部脚本: ${script.src}`);
      }
    }
  }
  
  /**
   * 检查iframe元素
   */
  private checkIframeElement(iframe: HTMLIFrameElement): void {
    if (iframe.src) {
      const isAllowed = this.isAllowedIframeSource(iframe.src);
      if (!isAllowed) {
        this.reportSuspiciousElement(iframe, `未授权的iframe来源: ${iframe.src}`);
      }
    }
  }
  
  /**
   * 检查元素属性
   */
  private checkElementAttributes(element: Element, attributeName: string | null): void {
    if (!attributeName) return;
    
    const value = element.getAttribute(attributeName) || '';
    
    // 检查javascript:协议
    if (value.toLowerCase().startsWith('javascript:')) {
      this.reportSuspiciousElement(element, `可疑的javascript:协议: ${attributeName}`);
    }
    
    // 检查data:text/html
    if (value.toLowerCase().startsWith('data:text/html')) {
      this.reportSuspiciousElement(element, `可疑的data URI: ${attributeName}`);
    }
  }
  
  /**
   * 检查代码是否可疑
   */
  private isSuspiciousCode(code: string): boolean {
    return this.config.suspiciousScriptPatterns.some(pattern => {
      try {
        const regex = new RegExp(pattern, 'i');
        return regex.test(code);
      } catch {
        return false;
      }
    });
  }
  
  /**
   * 检查脚本来源是否允许
   */
  private isAllowedScriptSource(src: string): boolean {
    const allowedDomains = [
      'localhost',
      '127.0.0.1',
      window.location.hostname,
      'giscus.app',
      'v6.51.la',
      'sdk.51.la',
      'google-analytics.com',
      'googletagmanager.com',
    ];
    
    try {
      const url = new URL(src);
      return allowedDomains.some(domain => url.hostname.includes(domain));
    } catch {
      // 相对路径允许
      return src.startsWith('/') || src.startsWith('./');
    }
  }
  
  /**
   * 检查iframe来源是否允许
   */
  private isAllowedIframeSource(src: string): boolean {
    const allowedDomains = [
      'giscus.app',
      'github.com',
    ];
    
    try {
      const url = new URL(src);
      return allowedDomains.some(domain => url.hostname.includes(domain));
    } catch {
      return false;
    }
  }
  
  /**
   * 报告可疑元素
   */
  private reportSuspiciousElement(element: Element, reason: string): void {
    if (this.suspiciousElements.has(element)) {
      return; // 已报告过
    }
    
    this.suspiciousElements.add(element);
    
    this.config.onHijackingDetected('suspicious_element', {
      reason,
      tagName: element.tagName,
      outerHTML: element.outerHTML?.substring(0, 500),
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * 网络请求监控
 */
class NetworkMonitor {
  private config: HijackingConfig;
  private originalFetch: typeof fetch | null = null;
  private originalXHROpen: typeof XMLHttpRequest.prototype.open | null = null;
  private originalSendBeacon: typeof navigator.sendBeacon | null = null;
  
  constructor(config: HijackingConfig) {
    this.config = config;
  }
  
  /**
   * 启动网络监控
   */
  start(): void {
    this.monitorFetch();
    this.monitorXHR();
    this.monitorSendBeacon();
    console.log('[网络监控] 已启动');
  }
  
  /**
   * 停止网络监控
   */
  stop(): void {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
    if (this.originalXHROpen) {
      XMLHttpRequest.prototype.open = this.originalXHROpen;
    }
    if (this.originalSendBeacon) {
      navigator.sendBeacon = this.originalSendBeacon;
    }
  }
  
  /**
   * 监控fetch请求
   */
  private monitorFetch(): void {
    this.originalFetch = window.fetch;
    
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      
      // 检查是否是可疑请求
      if (this.isSuspiciousRequest(url)) {
        this.config.onHijackingDetected('suspicious_fetch', {
          url,
          init,
          timestamp: new Date().toISOString(),
        });
      }
      
      return this.originalFetch!(input, init);
    };
  }
  
  /**
   * 监控XHR请求
   */
  private monitorXHR(): void {
    this.originalXHROpen = XMLHttpRequest.prototype.open;
    
    XMLHttpRequest.prototype.open = function(
      method: string,
      url: string | URL,
      async?: boolean,
      username?: string | null,
      password?: string | null
    ): void {
      const urlString = url.toString();
      
      // 检查是否是可疑请求
      if ((this as unknown as { isSuspiciousRequest: (url: string) => boolean }).isSuspiciousRequest?.(urlString)) {
        (this as unknown as { config: HijackingConfig }).config?.onHijackingDetected('suspicious_xhr', {
          method,
          url: urlString,
          timestamp: new Date().toISOString(),
        });
      }
      
      return (this as unknown as { originalXHROpen: typeof XMLHttpRequest.prototype.open }).originalXHROpen!(method, url, async ?? true, username, password);
    };
  }
  
  /**
   * 监控sendBeacon
   */
  private monitorSendBeacon(): void {
    this.originalSendBeacon = navigator.sendBeacon;
    
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null): boolean => {
      const urlString = url.toString();
      
      if (this.isSuspiciousRequest(urlString)) {
        this.config.onHijackingDetected('suspicious_beacon', {
          url: urlString,
          data: data?.toString()?.substring(0, 500),
          timestamp: new Date().toISOString(),
        });
      }
      
      return this.originalSendBeacon!(url, data);
    };
  }
  
  /**
   * 检查请求是否可疑
   */
  private isSuspiciousRequest(url: string): boolean {
    const suspiciousPatterns = [
      // 已知的恶意域名模式
      /\.xyz\//,
      /\.tk\//,
      /\.ml\//,
      /\.ga\//,
      // 可疑的URL模式
      /eval\s*\(/,
      /script\s*:/,
      /data:text\/javascript/,
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(url));
  }
}

/**
 * 防劫持保护Hook
 * @param customConfig 自定义配置
 */
export function useHijackingProtection(customConfig?: Partial<HijackingConfig>): void {
  const configRef = useRef<HijackingConfig>({ ...defaultConfig, ...customConfig });
  const domMonitorRef = useRef<DOMMonitor | null>(null);
  const networkMonitorRef = useRef<NetworkMonitor | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const checkHijacking = useCallback(() => {
    const config = configRef.current;
    
    // 检查iframe嵌入
    if (config.enableIframeEscape) {
      const { isEmbedded, isAllowed } = checkIframeEmbedding(config.allowedAncestors);
      
      if (isEmbedded && !isAllowed) {
        config.onHijackingDetected('iframe_embedding', {
          message: '页面被嵌入到未授权的iframe中',
          location: window.location.href,
          timestamp: new Date().toISOString(),
        });
        
        // 执行逃逸
        escapeIframe();
      }
    }
  }, []);
  
  useEffect(() => {
    // 只在客户端执行
    if (typeof window === 'undefined') {
      return;
    }
    
    const config = configRef.current;
    
    // 立即执行一次检查
    checkHijacking();
    
    // 启动定期检查
    intervalRef.current = setInterval(checkHijacking, config.checkInterval);
    
    // 启动DOM监控
    if (config.enableDOMMonitoring) {
      domMonitorRef.current = new DOMMonitor(config);
      domMonitorRef.current.start();
    }
    
    // 启动网络监控
    if (config.enableNetworkMonitoring) {
      networkMonitorRef.current = new NetworkMonitor(config);
      networkMonitorRef.current.start();
    }
    
    // 监听页面可见性变化
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkHijacking();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 清理函数
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      domMonitorRef.current?.stop();
      networkMonitorRef.current?.stop();
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkHijacking]);
}

/**
 * 防劫持保护组件
 * 无UI组件，只在后台执行安全检测
 */
export default function HijackingProtector(): null {
  useHijackingProtection();
  return null;
}

// 导出工具函数供外部使用
export { checkIframeEmbedding, escapeIframe, DOMMonitor, NetworkMonitor };
export type { HijackingConfig };
