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

/*
  safeMarked 刻意不在此处 re-export：它连带 marked 与 DOMPurify 两个较重的库，
  经 barrel 导出后会被 webpack 与 assetUtils 等常用模块切进同一个共享 chunk，
  导致仅需 assetUtils 的页面（如首页）被迫一并下载 marked（约 60KB）。
  MarkdownEditor 等使用方请直接从 '@/utils/safeMarked' 导入。
*/

/*
  音乐播放器相关的 howlerPlayerManager / musicPlayerPreloader
  刻意不在此处 re-export：它们只应被 MusicPlayer（dynamic chunk）引用，
  若经 barrel 导出，任何 `import { xxx } from '@/utils'` 的模块
  都可能把它们连带 howler 一起拖进全站首载包。
  需要时请直接从各自模块路径导入。
*/

// Live2D事件发射器
export * from './live2dEventEmitter';

// Live2D消息管理器
export * from './live2dMessageManager';

// 脚本加载工具
export * from './loadScript';

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
