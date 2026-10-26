/**
 * 学习打卡管理相关的 Server Actions
 * 提供打卡记录的查询、新增（合并）与删除功能
 * 数据以 Markdown + frontmatter 形式存储在 src/content/study-log/ 目录
 *
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式：由 prepare-static-export.js 替换为 index.static.ts 中的空实现
 */

'use server';

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

import type {
  StudyLog,
  StudyLogActionResult,
  StudyLogFormData,
  StudyLogManageData,
  StudyMood,
  StudySubject,
} from '@/types/studyLog';
import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { revalidatePath } from 'next/cache';
import { getServerStudyLogs, computeStudyStats } from '@/utils/studyLogUtils';

/** 打卡记录目录 */
const STUDY_LOG_DIR = path.join(process.cwd(), 'src', 'content', 'study-log');

/** 心情的合法取值 */
const VALID_MOODS: StudyMood[] = ['great', 'good', 'normal', 'hard'];

/** YYYY-MM-DD 格式校验 */
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function todayLocalDate(): string {
  const now = new Date();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

function nowTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * 归一化 frontmatter 中的科目数组，容忍脏数据
 */
function normalizeSubjectRecords(raw: unknown): StudySubject[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<string, number>();
  raw.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const record = item as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const minutes = Number(record.minutes);
    if (!name || !Number.isFinite(minutes) || minutes < 0) return;
    merged.set(name, (merged.get(name) || 0) + Math.round(minutes));
  });
  return Array.from(merged.entries()).map(([name, minutes]) => ({ name, minutes }));
}

/**
 * 获取打卡记录列表与统计（供后台管理页使用）
 *
 * 返回的记录不包含构建期渲染的 ReactNode（不可序列化）
 */
export async function getStudyLogList(): Promise<StudyLogActionResult<StudyLogManageData>> {
  if (isStaticExport) {
    return { success: false, message: '静态导出模式不支持此功能' };
  }

  try {
    const logs = getServerStudyLogs().map(log => {
      const { renderedContent: _renderedContent, ...rest } = log;
      return rest;
    });
    const stats = computeStudyStats(logs);
    return { success: true, message: 'Success', data: { logs, stats } };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 保存一条打卡记录
 *
 * 当天记录不存在时新建；已存在时把科目时长合并（同名累加）、
 * 标签合并、笔记按时间追加到正文，与 scripts/add-study-log.ts 行为一致。
 */
export async function saveStudyLogEntry(
  data: StudyLogFormData
): Promise<StudyLogActionResult<StudyLog>> {
  if (isStaticExport) {
    return { success: false, message: '静态导出模式不支持此功能' };
  }

  try {
    const date = data.date?.trim() || todayLocalDate();
    if (!DATE_PATTERN.test(date)) {
      return { success: false, message: '日期格式不正确，需要 YYYY-MM-DD' };
    }

    const subject = data.subject?.trim() || '';
    if (!subject) {
      return { success: false, message: '请填写科目名称' };
    }

    const minutes = Number(data.minutes);
    if (!Number.isInteger(minutes) || minutes < 0) {
      return { success: false, message: '学习时长必须是大于等于 0 的整数（分钟）' };
    }

    const mood =
      data.mood && VALID_MOODS.includes(data.mood as StudyMood)
        ? (data.mood as StudyMood)
        : undefined;
    const tags = (data.tags || []).map(tag => tag.trim()).filter(Boolean);
    const note = data.note?.trim() || '';

    await fs.mkdir(STUDY_LOG_DIR, { recursive: true });
    const filePath = path.join(STUDY_LOG_DIR, `${date}.md`);
    const isNewFile = !(await fileExists(filePath));

    let frontmatter: Record<string, unknown>;
    let body = '';

    if (!isNewFile) {
      const parsed = matter(await fs.readFile(filePath, 'utf8'));
      frontmatter = parsed.data || {};
      body = parsed.content.trimEnd();

      // 合并科目：同名累加，否则新增
      const subjects = normalizeSubjectRecords(frontmatter.subjects);
      const existing = subjects.find(item => item.name === subject);
      if (existing) {
        existing.minutes += minutes;
      } else {
        subjects.push({ name: subject, minutes });
      }
      frontmatter.subjects = subjects;

      // 心情与标签：显式提供时覆盖/合并
      if (mood) frontmatter.mood = mood;
      if (tags.length > 0) {
        const mergedTags = new Set<string>(
          Array.isArray(frontmatter.tags) ? (frontmatter.tags as string[]) : []
        );
        tags.forEach(tag => mergedTags.add(tag));
        frontmatter.tags = Array.from(mergedTags);
      }

      // 笔记追加到正文：上一条是列表项时单行续写，保持 Markdown 列表紧凑
      if (note) {
        const lastLine = body.split('\n').pop()?.trim() || '';
        const isListItem = lastLine.startsWith('- ');
        body += `${isListItem ? '\n' : body ? '\n\n' : ''}- **${nowTime()}** ${note}`;
      }
    } else {
      frontmatter = { date, subjects: [{ name: subject, minutes }] };
      if (mood) frontmatter.mood = mood;
      if (tags.length > 0) frontmatter.tags = tags;
      body = note;
    }

    await fs.writeFile(filePath, matter.stringify(body, frontmatter), 'utf8');

    revalidatePath('/admin/study');
    revalidatePath('/study');

    const subjects = normalizeSubjectRecords(frontmatter.subjects);
    return {
      success: true,
      message: isNewFile ? `已新建 ${date} 的打卡记录` : `已更新 ${date} 的打卡记录`,
      data: { date, subjects, mood, tags, content: body },
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 删除某一天的打卡记录文件
 */
export async function deleteStudyLog(date: string): Promise<StudyLogActionResult> {
  if (isStaticExport) {
    return { success: false, message: '静态导出模式不支持此功能' };
  }

  try {
    if (!DATE_PATTERN.test(date)) {
      return { success: false, message: '日期格式不正确，需要 YYYY-MM-DD' };
    }

    const filePath = path.join(STUDY_LOG_DIR, `${date}.md`);
    try {
      await fs.access(filePath);
    } catch {
      return { success: false, message: `${date} 的打卡记录不存在` };
    }

    await fs.rm(filePath);

    revalidatePath('/admin/study');
    revalidatePath('/study');

    return { success: true, message: `已删除 ${date} 的打卡记录` };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/** 异步检查文件是否存在 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
