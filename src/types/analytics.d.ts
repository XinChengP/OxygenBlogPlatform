/**
 * 51la 网站统计 SDK 类型定义
 * 
 * 本文件定义了 51la 统计 SDK 的全局类型声明，用于 TypeScript 类型检查
 * 适用于 GitHub Pages 静态部署环境
 * 
 * @see https://www.51.la/ 51la 统计官网
 */

/**
 * 51la SDK 初始化配置选项
 */
interface LAInitOptions {
  /** 统计站点 ID */
  id: string;
  /** 统计站点 CK */
  ck: string;
  /** 
   * 是否启用 hash 模式
   * 在 GitHub Pages 静态部署环境下建议启用，以支持 SPA 路由变化追踪
   */
  hashMode?: boolean;
}

/**
 * 51la 自定义事件追踪选项
 */
interface LATrackOptions {
  /** 事件属性，支持字符串、数字、布尔值 */
  [key: string]: string | number | boolean;
}

/**
 * 51la 统计 SDK 全局命名空间
 */
declare namespace LA {
  /**
   * 初始化 51la 统计
   * @param options 初始化配置选项
   */
  function init(options: LAInitOptions): void;

  /**
   * 追踪自定义事件
   * @param event 事件名称
   * @param options 事件属性
   */
  function track(event: string, options?: LATrackOptions): void;

  /**
   * 手动发送统计数据
   * 通常 SDK 会自动发送，但在某些场景下可能需要手动触发
   */
  function send(): void;
}

/**
 * 扩展全局 Window 接口
 * 使 TypeScript 能够识别 window.LA 对象
 */
declare global {
  interface Window {
    /** 51la 统计 SDK 实例 */
    LA: typeof LA;
  }
}

// 确保这是一个模块文件
export {};
