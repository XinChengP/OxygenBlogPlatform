/**
 * 工具函数统一出口文件
 * 按功能模块组织工具函数，提高可维护性和使用便利性
 */

// 资源路径处理
export * from './assetUtils';

// 类名合并
export { cn } from './cn';

// 浏览器兼容性检测
export * from './browserCompatibility';

// 安全的Markdown处理
export * from './safeMarked';

// 全局音乐播放器管理
export { default as GlobalMusicPlayerManager } from './globalMusicPlayerManager';

// Live2D事件发射器
export * from './live2dEventEmitter';

// Live2D消息管理器
export * from './live2dMessageManager';

// 脚本加载工具
export * from './loadScript';

// 音乐播放器预加载
export { default as MusicPlayerPreloader } from './musicPlayerPreloader';

// 音乐播放器可见性管理
export * from './musicPlayerVisibility';

// 平滑滚动管理
export * from './scrollManager';

// 字数统计工具
export * from './wordCountUtils';

// 博客工具函数
export { formatBlogDate, calculateReadingTime } from '../lib/utils';

// 导出所有工具函数的类型
export type { BrowserCompatibility } from './browserCompatibility';
