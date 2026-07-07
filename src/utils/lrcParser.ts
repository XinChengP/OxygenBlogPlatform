/**
 * LRC 歌词格式解析器
 * 支持标准 LRC 格式：[mm:ss.xx]歌词文本
 * 也支持多时间戳：[mm:ss.xx][mm:ss.xx]歌词文本
 * 解析后返回按时间排序的歌词行数组
 */

/**
 * 单行歌词的接口定义
 */
export interface LrcLine {
  /** 该行歌词开始的时间戳，单位为秒 */
  time: number;
  /** 歌词文本内容（已去除首尾空白） */
  text: string;
}

/**
 * 解析 LRC 格式歌词文本
 * @param lrcText 原始 LRC 文本内容
 * @returns 按时间升序排列的歌词行数组
 */
export function parseLrc(lrcText: string): LrcLine[] {
  if (!lrcText || typeof lrcText !== 'string') {
    return [];
  }

  const lines: LrcLine[] = [];

  // 按行拆分（兼容 \n 和 \r\n）
  const rawLines = lrcText.split(/\r?\n/);

  // 单行时间戳匹配：[mm:ss.xx] 或 [mm:ss]
  // mm：分钟（0-99），ss：秒（0-59），xx：毫秒（0-999）
  const timestampRegex = /\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    if (!line) continue;

    // 重置正则 lastIndex
    timestampRegex.lastIndex = 0;

    const timestamps: number[] = [];
    let match: RegExpExecArray | null;

    // 提取该行所有时间戳（支持多时间戳）
    while ((match = timestampRegex.exec(line)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      // 毫秒部分：如果是 2 位（xx）当作 10ms 单位（0.01s 精度），
      // 如果是 3 位（xxx）当作 1ms 单位（0.001s 精度），兼容两种常见格式
      let milliseconds = 0;
      if (match[3]) {
        const msStr = match[3];
        if (msStr.length === 2) {
          milliseconds = parseInt(msStr, 10) * 10;
        } else if (msStr.length === 3) {
          milliseconds = parseInt(msStr, 10);
        } else {
          // 1 位：当作 100ms
          milliseconds = parseInt(msStr, 10) * 100;
        }
      }
      const totalSeconds = minutes * 60 + seconds + milliseconds / 1000;
      timestamps.push(totalSeconds);
    }

    // 提取歌词正文：移除所有时间戳后剩余的内容
    const text = line.replace(timestampRegex, '').trim();

    // 跳过空歌词（如纯标签行或空行）
    if (timestamps.length === 0) continue;

    // 跳过元数据行：[ti:标题] [ar:艺术家] [al:专辑] [by:作者] [offset:偏移]
    if (/^\[(ti|ar|al|by|offset|length|kana|kuroma|chord|memo):/i.test(line)) {
      continue;
    }

    // 同一行可能对应多个时间戳（如重复副歌），每条都生成独立项
    for (const time of timestamps) {
      // 文本为空时也保留（用于纯音乐间奏，此时显示空行）
      lines.push({ time, text });
    }
  }

  // 按时间升序排序
  lines.sort((a, b) => a.time - b.time);

  return lines;
}

/**
 * 在歌词行数组中查找指定时间点对应的当前行索引
 * 使用二分查找（数组已按时间排序），O(log n) 复杂度
 * @param lines 已排序的歌词行数组
 * @param time 当前播放时间（秒）
 * @returns 当前行索引；如果 time 小于第一行时间则返回 -1
 */
export function findCurrentLineIndex(lines: LrcLine[], time: number): number {
  if (lines.length === 0 || time < lines[0].time) {
    return -1;
  }

  let left = 0;
  let right = lines.length - 1;
  let result = -1;

  while (left <= right) {
    const mid = (left + right) >> 1;
    if (lines[mid].time <= time) {
      result = mid;
      left = mid + 1;
    } else {
      right = mid - 1;
    }
  }

  return result;
}
