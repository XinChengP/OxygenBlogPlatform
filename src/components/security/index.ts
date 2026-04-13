/**
 * 安全组件库入口文件
 * 统一导出所有安全相关的组件和工具
 * 
 * @author 歆橙
 * @version 1.0.0
 */

// 导出防劫持保护组件
export { default as HijackingProtector, useHijackingProtection } from './HijackingProtector';
export type { HijackingConfig } from './HijackingProtector';

// 导出安全提供者组件
export { default as SecurityProvider, SecurityWrapper, CSPMetaTag, IntegrityCheckLoader, SecurityMonitor } from './SecurityProvider';

// 重新导出工具函数
export * from '@/utils/cspConfig';
export * from '@/utils/securityHeaders';
