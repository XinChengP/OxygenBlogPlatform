/**
 * 安全提供者组件
 * 整合所有安全功能，为应用提供全面的安全防护
 * 
 * 功能特性：
 * 1. 注入CSP安全策略
 * 2. 启动防劫持监控
 * 3. 加载完整性检测脚本
 * 4. 提供安全上下文
 * 
 * @author 歆橙
 * @version 1.0.0
 */

'use client';

import React, { useEffect, ReactNode } from 'react';
import { generateCSPString, getCurrentCSP } from '@/utils/cspConfig';
import { useHijackingProtection } from './HijackingProtector';

/**
 * 安全提供者组件属性
 */
interface SecurityProviderProps {
  children: ReactNode;
  // 是否启用CSP
  enableCSP?: boolean;
  // 是否启用防劫持
  enableHijackingProtection?: boolean;
  // 是否启用完整性检测
  enableIntegrityCheck?: boolean;
  // 自定义CSP配置
  customCSP?: string;
}

/**
 * CSP Meta标签组件
 * 动态注入内容安全策略
 */
function CSPMetaTag({ cspContent }: { cspContent: string }): null {
  useEffect(() => {
    // 检查是否已存在CSP meta标签
    let metaTag = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement;
    
    if (!metaTag) {
      // 创建新的meta标签
      metaTag = document.createElement('meta');
      metaTag.httpEquiv = 'Content-Security-Policy';
      
      // 插入到head的最前面，确保尽早生效
      const head = document.head;
      if (head.firstChild) {
        head.insertBefore(metaTag, head.firstChild);
      } else {
        head.appendChild(metaTag);
      }
    }
    
    // 设置CSP内容
    metaTag.content = cspContent;
    
    return () => {
      // 清理：组件卸载时移除meta标签
      // 注意：通常不需要移除，这里保留逻辑以备特殊需求
    };
  }, [cspContent]);
  
  return null;
}

/**
 * 完整性检测脚本加载器
 * 动态加载页面完整性检测脚本
 */
function IntegrityCheckLoader(): null {
  useEffect(() => {
    // 检查脚本是否已加载
    const existingScript = document.querySelector('script[data-integrity-check]');
    if (existingScript) {
      return;
    }
    
    // 创建脚本元素
    const script = document.createElement('script');
    script.src = '/js/integrity-check.js';
    script.async = true;
    script.setAttribute('data-integrity-check', 'true');
    
    // 错误处理
    script.onerror = () => {
      console.error('[安全] 完整性检测脚本加载失败');
    };
    
    // 添加到文档
    document.head.appendChild(script);
    
    return () => {
      // 清理脚本
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);
  
  return null;
}

/**
 * 安全状态监控组件
 * 监控安全相关状态变化
 */
function SecurityMonitor(): null {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 监听安全策略违规事件
    const handleSecurityPolicyViolation = (event: SecurityPolicyViolationEvent) => {
      console.warn('[CSP违规]', {
        violatedDirective: event.violatedDirective,
        blockedURI: event.blockedURI,
        documentURI: event.documentURI,
        originalPolicy: event.originalPolicy,
      });
      
      // 可以在这里添加上报逻辑
    };
    
    document.addEventListener('securitypolicyviolation', handleSecurityPolicyViolation);
    
    return () => {
      document.removeEventListener('securitypolicyviolation', handleSecurityPolicyViolation);
    };
  }, []);
  
  return null;
}

/**
 * 检测是否在开发环境
 */
function isDevelopment(): boolean {
  if (typeof window === 'undefined') return false;
  
  const hostname = window.location.hostname;
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname === '::1' ||
         hostname.endsWith('.localhost');
}

/**
 * 安全提供者组件
 * 整合所有安全功能
 */
export default function SecurityProvider({
  children,
  enableCSP = true,
  enableHijackingProtection = true,
  enableIntegrityCheck = true,
  customCSP,
}: SecurityProviderProps): React.ReactElement {
  // 获取CSP内容
  const cspContent = customCSP || generateCSPString(getCurrentCSP());

  // 判断是否在开发环境
  const isDev = isDevelopment();

  // 启动防劫持保护（开发环境下降低监控频率）
  useHijackingProtection({
    enableIframeEscape: true,
    enableDOMMonitoring: !isDev, // 开发环境禁用DOM监控
    enableScriptMonitoring: !isDev, // 开发环境禁用脚本监控
    enableNetworkMonitoring: true,
    checkInterval: isDev ? 30000 : 5000, // 开发环境降低检查频率
    onHijackingDetected: (type, details) => {
      // 开发环境下只记录日志，不显示错误
      if (isDev) {
        console.log(`[安全] 检测到潜在问题: ${type}`, details);
        return;
      }

      console.error(`[安全] 检测到劫持行为: ${type}`, details);
    },
  });
  
  return (
    <>
      {/* CSP策略注入 */}
      {enableCSP && <CSPMetaTag cspContent={cspContent} />}
      
      {/* 完整性检测 - 生产环境才启用 */}
      {enableIntegrityCheck && !isDev && <IntegrityCheckLoader />}
      
      {/* 安全监控 */}
      <SecurityMonitor />
      
      {/* 渲染子组件 */}
      {children}
    </>
  );
}

/**
 * 简化的安全包装组件
 * 用于快速启用基础安全功能
 */
export function SecurityWrapper({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <SecurityProvider
      enableCSP={true}
      enableHijackingProtection={true}
      enableIntegrityCheck={true}
    >
      {children}
    </SecurityProvider>
  );
}

// 导出子组件和工具
export { CSPMetaTag, IntegrityCheckLoader, SecurityMonitor };
