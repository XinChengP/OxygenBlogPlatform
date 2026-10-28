'use client';

/**
 * Live2D 看板娘显示状态管理器
 *
 * 提供全局的 Live2D 显示/隐藏控制，与音乐播放器管理器同构：
 * - localStorage 持久化用户偏好，刷新后保持上次选择
 * - CustomEvent 跨组件广播状态变更，右下角悬浮按钮与看板娘自身双向同步
 *
 * 与音乐播放器的区别：Live2D 默认显示（首次访问不进 localStorage），
 * 音乐播放器默认隐藏。其余 API 完全对称。
 */

/** localStorage 存储键 */
const STORAGE_KEY = 'live2d-visibility';

/** 状态变更事件名 */
const EVENT_NAME = 'live2dVisibilityChange';

/**
 * 获取 Live2D 的显示状态
 * @returns true 表示显示，false 表示隐藏；未设置过（首次访问）默认显示
 */
export function getLive2DVisibility(): boolean {
  if (typeof window === 'undefined') {
    return true; // 服务端默认显示（与客户端初始值一致）
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // null 表示用户从未主动切换过，默认显示
    return stored === null ? true : JSON.parse(stored);
  } catch (error) {
    console.warn('读取 Live2D 显隐状态失败:', error);
    return true;
  }
}

/**
 * 设置 Live2D 的显示状态并广播变更
 * @param visible - true 显示，false 隐藏
 */
export function setLive2DVisibility(visible: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));

    // 触发自定义事件，通知所有订阅组件
    window.dispatchEvent(new CustomEvent(EVENT_NAME, {
      detail: { visible }
    }));
  } catch (error) {
    console.warn('保存 Live2D 显隐状态失败:', error);
  }
}

/**
 * 订阅 Live2D 显示状态变化
 * @param callback - 状态变化回调，参数为新的可见性
 * @returns 清理函数（调用后取消订阅）
 */
export function onLive2DVisibilityChange(
  callback: (visible: boolean) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<{ visible: boolean }>;
    callback(customEvent.detail.visible);
  };

  window.addEventListener(EVENT_NAME, handler);

  return () => {
    window.removeEventListener(EVENT_NAME, handler);
  };
}

/**
 * 切换 Live2D 显示状态
 * @returns 切换后的新状态
 */
export function toggleLive2DVisibility(): boolean {
  const current = getLive2DVisibility();
  const newVisibility = !current;
  setLive2DVisibility(newVisibility);
  return newVisibility;
}
