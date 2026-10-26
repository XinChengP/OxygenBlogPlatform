/**
 * 学习打卡相关类型定义
 *
 * 数据源：src/content/study-log/ 目录，每天一个 Markdown 文件（YYYY-MM-DD.md），
 * frontmatter 声明当天学习的科目与时长，正文为当天的学习笔记。
 */

import type { ReactNode } from 'react';

/**
 * 单个科目的学习时长（分钟）
 */
export interface StudySubject {
  /** 科目名称，如 CAD、SolidWorks */
  name: string;
  /** 学习时长（分钟） */
  minutes: number;
}

/**
 * 心情标记（可选），对应页面上展示的表情
 */
export type StudyMood = 'great' | 'good' | 'normal' | 'hard';

/**
 * 一天的学习打卡记录
 */
export interface StudyLog {
  /** 记录日期，格式 YYYY-MM-DD（与文件名一致） */
  date: string;
  /** 当天学习的科目与时长列表 */
  subjects: StudySubject[];
  /** 心情（可选） */
  mood?: StudyMood;
  /** 标签 */
  tags: string[];
  /** Markdown 正文 */
  content: string;
  /** 构建期由服务端渲染好的正文 ReactNode，客户端直接展示 */
  renderedContent?: ReactNode;
}

/**
 * 科目汇总统计
 */
export interface StudySubjectTotal {
  name: string;
  /** 累计时长（分钟） */
  minutes: number;
  /** 学习过的天数 */
  days: number;
}

/**
 * 打卡统计总览
 */
export interface StudyStats {
  /** 累计打卡天数 */
  totalDays: number;
  /** 累计学习时长（分钟） */
  totalMinutes: number;
  /** 当前连续打卡天数（截至最近一条记录） */
  currentStreak: number;
  /** 历史最长连续打卡天数 */
  longestStreak: number;
  /** 各科目累计 */
  subjectTotals: StudySubjectTotal[];
  /** 每天的学习分钟数（date -> minutes），用于热力图与趋势图 */
  dayMinutes: Record<string, number>;
}

/**
 * 后台打卡表单数据
 *
 * 一次提交记录一个科目的时长；同一天多次提交时，
 * 服务端会把同名科目时长累加、笔记追加到正文。
 */
export interface StudyLogFormData {
  /** 记录日期，格式 YYYY-MM-DD */
  date: string;
  /** 科目名称，如 CAD、SolidWorks */
  subject: string;
  /** 本次学习时长（分钟） */
  minutes: number;
  /** 心情（可选） */
  mood?: StudyMood;
  /** 标签（可选） */
  tags?: string[];
  /** 打卡笔记（可选） */
  note?: string;
}

/**
 * 后台管理用的记录列表数据（不含构建期渲染的正文节点）
 */
export interface StudyLogManageData {
  logs: StudyLog[];
  stats: StudyStats;
}

/**
 * 通用操作结果
 */
export interface StudyLogActionResult<T = null> {
  success: boolean;
  message: string;
  data?: T;
}
