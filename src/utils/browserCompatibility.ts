/**
 * Live2D 浏览器兼容性检测工具
 * 用于检测主流浏览器对 Live2D 功能的支持情况
 */

import { useState, useEffect } from 'react';

export interface BrowserCompatibility {
  browser: string;
  version: string;
  isSupported: boolean;
  webglSupport: boolean;
  localStorageSupport: boolean;
  performanceSupport: boolean;
  issues: string[];
  recommendations: string[];
}

export class Live2DBrowserCompatibility {
  private static instance: Live2DBrowserCompatibility;
  private compatibilityCache: BrowserCompatibility | null = null;
  
  private constructor() {}
  
  static getInstance(): Live2DBrowserCompatibility {
    if (!this.instance) {
      this.instance = new Live2DBrowserCompatibility();
    }
    return this.instance;
  }
  
  /**
   * 检测浏览器兼容性
   */
  detectCompatibility(): BrowserCompatibility {
    if (this.compatibilityCache) {
      return this.compatibilityCache;
    }
    
    const userAgent = navigator.userAgent;
    const browserInfo = this.parseUserAgent(userAgent);
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // WebGL 支持检测
    const webglSupport = this.checkWebGLSupport();
    if (!webglSupport) {
      issues.push('WebGL 不支持');
      recommendations.push('请启用 WebGL 或使用支持的浏览器');
    }
    
    // LocalStorage 支持检测
    const localStorageSupport = this.checkLocalStorageSupport();
    if (!localStorageSupport) {
      issues.push('LocalStorage 不支持');
      recommendations.push('请启用 Cookie 和本地存储');
    }
    
    // 性能 API 支持检测
    const performanceSupport = this.checkPerformanceSupport();
    if (!performanceSupport) {
      issues.push('性能 API 不支持');
      recommendations.push('部分性能监控功能可能不可用');
    }
    
    // 浏览器特定检测
    this.checkBrowserSpecific(browserInfo, issues, recommendations);
    
    const compatibility: BrowserCompatibility = {
      ...browserInfo,
      webglSupport,
      localStorageSupport,
      performanceSupport,
      isSupported: webglSupport && localStorageSupport && browserInfo.browser !== 'IE',
      issues,
      recommendations
    };
    
    this.compatibilityCache = compatibility;
    return compatibility;
  }
  
  /**
   * 解析用户代理字符串
   */
  private parseUserAgent(userAgent: string): { browser: string; version: string } {
    // IE 11 检测
    if (userAgent.includes('Trident') && userAgent.includes('rv:11')) {
      return {
        browser: 'IE',
        version: '11.0'
      };
    }
    
    const browsers = [
      { name: 'Chrome', regex: /Chrome\/(\d+\.\d+)/ },
      { name: 'Firefox', regex: /Firefox\/(\d+\.\d+)/ },
      { name: 'Safari', regex: /Version\/(\d+\.\d+).*Safari/ },
      { name: 'Edge', regex: /Edge\/(\d+\.\d+)/ },
      { name: 'Opera', regex: /OPR\/(\d+\.\d+)/ },
      { name: 'IE', regex: /MSIE (\d+\.\d+)/ }
    ];
    
    for (const browser of browsers) {
      const match = userAgent.match(browser.regex);
      if (match) {
        return {
          browser: browser.name,
          version: match[1]
        };
      }
    }
    
    return {
      browser: 'Unknown',
      version: '0'
    };
  }
  
  /**
   * 检测 WebGL 支持
   */
  private checkWebGLSupport(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * 检测 LocalStorage 支持
   */
  private checkLocalStorageSupport(): boolean {
    try {
      const test = '__localStorage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * 检测性能 API 支持
   */
  private checkPerformanceSupport(): boolean {
    return !!(window.performance && window.performance.now);
  }
  
  /**
   * 浏览器特定检测
   */
  private checkBrowserSpecific(browserInfo: { browser: string; version: string }, issues: string[], recommendations: string[]) {
    const version = parseFloat(browserInfo.version);
    
    switch (browserInfo.browser) {
      case 'Chrome':
        if (version < 60) {
          issues.push('Chrome 版本过低');
          recommendations.push('请升级到 Chrome 60 或更高版本');
        }
        break;
        
      case 'Firefox':
        if (version < 55) {
          issues.push('Firefox 版本过低');
          recommendations.push('请升级到 Firefox 55 或更高版本');
        }
        break;
        
      case 'Safari':
        if (version < 11) {
          issues.push('Safari 版本过低');
          recommendations.push('请升级到 Safari 11 或更高版本');
        }
        break;
        
      case 'Edge':
        if (version < 79) {
          issues.push('Edge 版本过低');
          recommendations.push('请升级到 Edge 79 或更高版本');
        }
        break;
        
      case 'IE':
        issues.push('IE 浏览器不支持 Live2D');
        recommendations.push('请使用 Chrome、Firefox、Safari 或 Edge 浏览器');
        break;
    }
  }
  
  /**
   * 获取兼容性报告
   */
  getCompatibilityReport(): string {
    const compatibility = this.detectCompatibility();
    const lines = [
      `浏览器: ${compatibility.browser} ${compatibility.version}`,
      `支持状态: ${compatibility.isSupported ? '✅ 支持' : '❌ 不支持'}`,
      `WebGL: ${compatibility.webglSupport ? '✅ 支持' : '❌ 不支持'}`,
      `LocalStorage: ${compatibility.localStorageSupport ? '✅ 支持' : '❌ 不支持'}`,
      `性能API: ${compatibility.performanceSupport ? '✅ 支持' : '❌ 不支持'}`
    ];
    
    if (compatibility.issues.length > 0) {
      lines.push('问题:');
      compatibility.issues.forEach(issue => lines.push(`  - ${issue}`));
    }
    
    if (compatibility.recommendations.length > 0) {
      lines.push('建议:');
      compatibility.recommendations.forEach(rec => lines.push(`  - ${rec}`));
    }
    
    return lines.join('\n');
  }
  
  /**
   * 检查是否需要显示兼容性警告
   */
  shouldShowWarning(): boolean {
    const compatibility = this.detectCompatibility();
    return !compatibility.isSupported || compatibility.issues.length > 0;
  }
  
  /**
   * 清理缓存
   */
  clearCache(): void {
    this.compatibilityCache = null;
  }
}

/**
 * 兼容性检测 Hook
 */
export function useLive2DBrowserCompatibility() {
  const [compatibility, setCompatibility] = useState<BrowserCompatibility | null>(null);
  
  useEffect(() => {
    const detector = Live2DBrowserCompatibility.getInstance();
    const result = detector.detectCompatibility();
    setCompatibility(result);
  }, []);
  
  return {
    compatibility,
    isSupported: compatibility?.isSupported ?? false,
    shouldShowWarning: compatibility ? !compatibility.isSupported || compatibility.issues.length > 0 : false
  };
}

// 导出单例实例
export const live2DBrowserCompatibility = Live2DBrowserCompatibility.getInstance();