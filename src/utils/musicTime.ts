/**
 * 音乐播放器时间格式化工具
 */

/**
 * 格式化时间为 mm:ss
 * @param seconds 秒数
 * @returns 格式化后的时间字符串
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
