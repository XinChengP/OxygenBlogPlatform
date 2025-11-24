'use client';

/**
 * 音乐播放器显示状态管理器
 * 提供全局的音乐播放器显示/隐藏控制
 */

const STORAGE_KEY = 'music-player-visibility';

/**
 * 获取音乐播放器的显示状态
 * @returns boolean - 是否显示音乐播放器
 */
export function getMusicPlayerVisibility(): boolean {
  if (typeof window === 'undefined') {
    return true; // 服务器端默认显示
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : true; // 默认显示
  } catch (error) {
    console.warn('Failed to get music player visibility:', error);
    return true;
  }
}

/**
 * 设置音乐播放器的显示状态
 * @param visible - 是否显示音乐播放器
 */
export function setMusicPlayerVisibility(visible: boolean): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visible));
    
    // 触发自定义事件，通知其他组件状态变更
    window.dispatchEvent(new CustomEvent('musicPlayerVisibilityChange', {
      detail: { visible }
    }));
  } catch (error) {
    console.warn('Failed to set music player visibility:', error);
  }
}

/**
 * 监听音乐播放器显示状态变化
 * @param callback - 状态变化回调函数
 * @returns 清理函数
 */
export function onMusicPlayerVisibilityChange(
  callback: (visible: boolean) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  
  const handleVisibilityChange = (event: CustomEvent) => {
    callback(event.detail.visible);
  };
  
  window.addEventListener('musicPlayerVisibilityChange', handleVisibilityChange as EventListener);
  
  // 返回清理函数
  return () => {
    window.removeEventListener('musicPlayerVisibilityChange', handleVisibilityChange as EventListener);
  };
}

/**
 * 切换音乐播放器显示状态
 * @returns 新的显示状态
 */
export function toggleMusicPlayerVisibility(): boolean {
  const current = getMusicPlayerVisibility();
  const newVisibility = !current;
  setMusicPlayerVisibility(newVisibility);
  return newVisibility;
}