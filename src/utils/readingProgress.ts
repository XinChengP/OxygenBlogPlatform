/**
 * 阅读进度存取（localStorage）
 *
 * 文章页在滚动时把当前阅读百分比落盘，下次打开同一篇时
 * 「继续阅读」提示据此恢复位置。
 *
 * 设计口径：
 * - 只存百分比（0-100 的整数），不存正文偏移，滚动布局变化也能恢复到相近位置；
 * - 3% 以下等于刚打开、92% 以上基本读完，都不值得提示；
 * - 记录超过 30 天视为过期；
 * - 每个slug 一条记录，总量超过 MAX_ENTRIES 时按时间淘汰最旧的，
 *   避免长期使用后 localStorage 无限增长。
 */

const KEY_PREFIX = 'obp-reading:';
const MAX_ENTRIES = 50;
const FRESH_MS = 30 * 24 * 60 * 60 * 1000;

/** 值得记录/恢复的进度区间（百分比） */
export const READING_PROGRESS_MIN = 3;
export const READING_PROGRESS_MAX = 92;

interface ReadingRecord {
  /** 阅读百分比（0-100 整数） */
  p: number;
  /** 最近更新时间戳 */
  t: number;
}

function readAll(): Record<string, ReadingRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(KEY_PREFIX);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(records: Record<string, ReadingRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY_PREFIX, JSON.stringify(records));
  } catch {
    // 配额满 / 隐私模式：静默失败
  }
}

/** 保存阅读进度；超出值得记录的区间时忽略 */
export function saveReadingProgress(slug: string, percent: number): void {
  if (percent < READING_PROGRESS_MIN || percent > READING_PROGRESS_MAX) return;
  const records = readAll();
  records[slug] = { p: Math.round(percent), t: Date.now() };

  // 超量淘汰：按时间戳保留最近的 MAX_ENTRIES 条
  const keys = Object.keys(records);
  if (keys.length > MAX_ENTRIES) {
    keys
      .sort((a, b) => (records[a]?.t ?? 0) - (records[b]?.t ?? 0))
      .slice(0, keys.length - MAX_ENTRIES)
      .forEach((key) => delete records[key]);
  }
  writeAll(records);
}

/**
 * 读取可恢复的阅读进度；无记录、进度无意义或已过期时返回 null
 */
export function getReadingProgress(slug: string): number | null {
  const record = readAll()[slug];
  if (!record) return null;
  if (Date.now() - record.t > FRESH_MS) return null;
  if (record.p < READING_PROGRESS_MIN || record.p > READING_PROGRESS_MAX) return null;
  return record.p;
}

/** 清除某篇的阅读记录（例如读者明确表示重头再读） */
export function clearReadingProgress(slug: string): void {
  const records = readAll();
  delete records[slug];
  writeAll(records);
}
