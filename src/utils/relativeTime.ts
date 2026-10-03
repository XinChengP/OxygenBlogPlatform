/**
 * 相对时间格式化（全站唯一实现）
 *
 * 此前 GuestbookBoard（formatDate）与 GitHubGuestbookBoard（formatTime）
 * 各有一份手写实现，且行为有细微差异：前者有「昨天」分支、
 * 时间数字与「分钟前」之间带空格，后者没有。
 * 现统一为本实现的格式（数字与单位间无空格，含「昨天」分支）。
 *
 * @param date - Date 对象或可被 Date 解析的字符串
 * @returns 相对时间文案；超过一周返回 zh-CN 本地化日期
 */
export function formatRelativeTime(date: Date | string): string {
  const parsed = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - parsed.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;

  return parsed.toLocaleDateString('zh-CN');
}
