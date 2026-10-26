/**
 * 学习打卡数据工具模块
 *
 * getServerStudyLogs：服务器端（构建期）读取 src/content/study-log/ 下的打卡记录
 * computeStudyStats：纯函数统计（连续天数、科目汇总等）
 *
 * 注意：本文件顶层引入了 fs/path，只能被服务器组件导入；
 * 客户端组件需要的工具（如时长格式化）请放到组件文件内。
 */

import fs from 'fs';
import path from 'path';
import { parseFrontMatter } from './frontMatterUtils';
import type { StudyLog, StudyStats, StudySubject, StudySubjectTotal } from '@/types/studyLog';

/** 心情的合法取值，frontmatter 里出现其他值时按未设置处理 */
const VALID_MOODS = ['great', 'good', 'normal', 'hard'];

/**
 * 归一化 frontmatter 中的科目数据
 *
 * 支持两种写法：
 * 1. subjects: [{ name: "CAD", minutes: 60 }, ...]（推荐，一天多科目）
 * 2. subject: "CAD" + minutes: 90（单科目简写）
 */
function normalizeSubjects(metadata: Record<string, unknown>): StudySubject[] {
  const rawSubjects = metadata.subjects;

  if (Array.isArray(rawSubjects)) {
    const subjects = rawSubjects
      .map((item): StudySubject | null => {
        if (!item || typeof item !== 'object') return null;
        const record = item as Record<string, unknown>;
        const name = typeof record.name === 'string' ? record.name.trim() : '';
        const minutes = Number(record.minutes);
        if (!name || !Number.isFinite(minutes) || minutes < 0) return null;
        return { name, minutes: Math.round(minutes) };
      })
      .filter((item): item is StudySubject => item !== null);

    if (subjects.length > 0) {
      // 同名科目合并时长
      const merged = new Map<string, number>();
      subjects.forEach(({ name, minutes }) => {
        merged.set(name, (merged.get(name) || 0) + minutes);
      });
      return Array.from(merged.entries()).map(([name, minutes]) => ({ name, minutes }));
    }
  }

  // 单科目简写：subject + minutes
  const singleName = typeof metadata.subject === 'string' ? metadata.subject.trim() : '';
  const singleMinutes = Number(metadata.minutes);
  if (singleName && Number.isFinite(singleMinutes) && singleMinutes >= 0) {
    return [{ name: singleName, minutes: Math.round(singleMinutes) }];
  }

  return [];
}

/**
 * 服务器端：读取所有学习打卡记录
 *
 * 每天一个文件（YYYY-MM-DD.md），date 缺省时取文件名。
 * 支持 frontmatter 中的 hidden: true 隐藏单条记录（与动态模块一致）。
 *
 * @returns 记录数组，按日期倒序排序
 */
export function getServerStudyLogs(): StudyLog[] {
  let logs: StudyLog[] = [];

  try {
    const logDir = path.join(process.cwd(), 'src', 'content', 'study-log');

    if (!fs.existsSync(logDir) || !fs.statSync(logDir).isDirectory()) {
      return [];
    }

    const files = fs.readdirSync(logDir).filter(file => file.endsWith('.md'));

    logs = files.map(file => {
      const filePath = path.join(logDir, file);
      const raw = fs.readFileSync(filePath, 'utf8');
      const { metadata, content: body } = parseFrontMatter(raw);

      const date =
        typeof metadata.date === 'string' && metadata.date.trim() !== ''
          ? metadata.date.trim()
          : file.replace('.md', '');

      const mood =
        typeof metadata.mood === 'string' && VALID_MOODS.includes(metadata.mood)
          ? (metadata.mood as StudyLog['mood'])
          : undefined;

      const tags = Array.isArray(metadata.tags)
        ? metadata.tags.filter((tag): tag is string => typeof tag === 'string' && tag.trim() !== '')
        : [];

      return {
        date,
        subjects: normalizeSubjects(metadata),
        mood,
        tags,
        content: body,
        // hidden: true 的记录不展示（构建期过滤，静态部署不会带出去）
        ...(metadata.hidden === true || metadata.hidden === 'true' ? { hidden: true } : {}),
      } as StudyLog & { hidden?: boolean };
    });

    // 过滤隐藏记录
    logs = logs.filter(log => !(log as StudyLog & { hidden?: boolean }).hidden);
  } catch (error) {
    console.warn('读取学习打卡记录失败，返回空列表:', error);
    return [];
  }

  // 按日期倒序
  return logs.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/**
 * 把 YYYY-MM-DD 转成当天的 UTC 天数序号，避免时区影响连续天数计算
 */
function toDayNumber(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [, y, m, d] = match;
  const day = Date.UTC(Number(y), Number(m) - 1, Number(d)) / 86400000;
  return Number.isFinite(day) ? day : null;
}

/**
 * 基于打卡记录计算统计数据（纯函数，服务端与客户端通用）
 *
 * @param logs 已按日期倒序排序的记录数组
 */
export function computeStudyStats(logs: StudyLog[]): StudyStats {
  const subjectTotalsMap = new Map<string, StudySubjectTotal>();
  const dayMinutes: Record<string, number> = {};
  let totalMinutes = 0;

  logs.forEach(log => {
    let dayTotal = 0;
    log.subjects.forEach(({ name, minutes }) => {
      dayTotal += minutes;
      const total = subjectTotalsMap.get(name) || { name, minutes: 0, days: 0 };
      total.minutes += minutes;
      total.days += 1;
      subjectTotalsMap.set(name, total);
    });

    dayMinutes[log.date] = dayTotal;
    totalMinutes += dayTotal;
  });

  // 连续天数：把所有打卡日期转成天序号排序后数连续段
  const dayNumbers = logs
    .map(log => toDayNumber(log.date))
    .filter((day): day is number => day !== null)
    .sort((a, b) => a - b);

  let longestStreak = 0;
  let currentStreak = 0;
  let runLength = 0;
  let prevDay: number | null = null;

  dayNumbers.forEach(day => {
    runLength = prevDay !== null && day === prevDay + 1 ? runLength + 1 : 1;
    longestStreak = Math.max(longestStreak, runLength);
    prevDay = day;
  });

  // 当前连续天数：从最近一次打卡往前数连续段
  if (dayNumbers.length > 0) {
    currentStreak = 1;
    for (let i = dayNumbers.length - 1; i > 0; i -= 1) {
      if (dayNumbers[i] === dayNumbers[i - 1] + 1) {
        currentStreak += 1;
      } else {
        break;
      }
    }
  }

  // 科目按累计时长降序
  const subjectTotals = Array.from(subjectTotalsMap.values()).sort((a, b) => b.minutes - a.minutes);

  return {
    totalDays: logs.length,
    totalMinutes,
    currentStreak,
    longestStreak,
    subjectTotals,
    dayMinutes,
  };
}
