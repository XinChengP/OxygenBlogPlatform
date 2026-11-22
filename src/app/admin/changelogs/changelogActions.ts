'use server';

/**
 * 更新日志管理相关的Server Actions
 * 提供增删改查功能
 */

import { promises as fs } from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { Changelog, ChangelogType, parseFrontMatter, calculateAchievements, countPlainChars } from '@/types/changelogTypes';

// 日志文件存储目录
const CHANGELOGS_DIR = path.join(process.cwd(), 'src', 'content', 'changelogs');

/**
 * 从文件名提取日期
 * @param filename 文件名（如 2026-04-11.md）
 * @returns 日期字符串（如 2026-04-11）
 */
function extractDateFromFilename(filename: string): string {
  return filename.replace('.md', '');
}

/**
 * 验证日期格式
 * @param date 日期字符串
 * @returns 是否有效
 */
function isValidDate(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * 读取单个日志文件
 * @param filePath 文件路径
 * @returns Changelog对象
 */
async function readChangelogFile(filePath: string): Promise<Changelog | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const { metadata, content: body } = parseFrontMatter(content);
    const filename = path.basename(filePath);
    const date = extractDateFromFilename(filename);

    // 验证并获取日志类型，默认为 'docs'
    // 支持的有效类型：feature, optimize, fix, docs, style, refactor
    // 旧类型映射：perf -> optimize, chore -> docs
    const typeValue = metadata.type as string;
    const validTypes: ChangelogType[] = ['feature', 'optimize', 'fix', 'docs', 'style', 'refactor'];

    let logType: ChangelogType;
    if (validTypes.includes(typeValue as ChangelogType)) {
      logType = typeValue as ChangelogType;
    } else if (typeValue === 'perf') {
      logType = 'optimize'; // 旧类型映射
    } else if (typeValue === 'chore') {
      logType = 'docs'; // 旧类型映射
    } else {
      logType = 'docs'; // 默认类型
    }

    // 计算日志内容行数（使用原始内容，不计算 trim 后的内容）
    // 找到 frontmatter 结束位置，计算 body 原始行数
    const lines = content.split('\n');
    let frontmatterEnd = -1;
    let dashCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === '---') {
        dashCount++;
        if (dashCount === 2) {
          frontmatterEnd = i;
          break;
        }
      }
    }
    // body 行数 = 总文件行数 - frontmatter 结束行号 - 1
    const contentLineCount = frontmatterEnd !== -1 ? lines.length - frontmatterEnd - 1 : lines.length;

    // 统计正文纯文本字数（剔除代码块与 markdown 符号），用于「洋洋洒洒」判定
    const charCount = countPlainChars(body);

    // 计算单篇成就
    const commits = (metadata.commits as string[]) || [];
    const achievements = calculateAchievements({ commits, contentLineCount, charCount });

    // 读取自定义荣誉
    const honors = (metadata.honors as { name: string; color: string }[]) || [];

    return {
      id: filename,
      date,
      title: (metadata.title as string) || '',
      type: logType,
      commits: commits,
      content: body,
      filePath,
      achievements: achievements,
      honors: honors,
    };
  } catch (error) {
    console.error(`读取日志文件失败: ${filePath}`, error);
    return null;
  }
}

/**
 * 生成更新日志的 frontmatter 字符串
 * @param data 日志数据
 * @param existingData 原始 frontmatter 数据（更新模式时传入，用于保留未知字段）
 * @returns frontmatter 字符串
 */
function generateChangelogFrontMatter(
  data: {
    date: string;
    title: string;
    type: string;
    commits: string[];
    honors: { name: string; color: string }[];
  },
  existingData?: Record<string, unknown>
): string {
  const lines = ['---'];

  lines.push(`date: "${data.date}"`);
  lines.push(`title: "${data.title}"`);
  lines.push(`type: ${data.type}`);

  if (data.commits && data.commits.length > 0) {
    lines.push('commits:');
    data.commits.forEach((commit) => {
      lines.push(`  - "${commit}"`);
    });
  }

  if (data.honors && data.honors.length > 0) {
    lines.push('honors:');
    data.honors.forEach((honor) => {
      lines.push(`  - name: "${honor.name}"`);
      lines.push(`    color: "${honor.color}"`);
    });
  }

  // 保留原始 frontmatter 中的未知字段
  if (existingData) {
    const knownKeys = new Set(['date', 'title', 'type', 'commits', 'honors']);
    for (const [key, value] of Object.entries(existingData)) {
      if (knownKeys.has(key)) continue;

      if (typeof value === 'string') {
        lines.push(`${key}: "${value}"`);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`${key}: ${value}`);
      } else if (Array.isArray(value)) {
        lines.push(`${key}:`);
        value.forEach((item) => {
          if (typeof item === 'string') {
            lines.push(`  - "${item}"`);
          } else if (item && typeof item === 'object') {
            Object.entries(item).forEach(([k, v]) => {
              lines.push(`  - ${k}: "${v}"`);
            });
          }
        });
      } else {
        lines.push(`${key}: ${JSON.stringify(value)}`);
      }
    }
  }

  lines.push('---');

  return lines.join('\n');
}

/**
 * 写入更新日志文件
 * @param filePath 文件路径
 * @param data 日志数据
 * @param existingContent 原始文件内容（更新模式时传入，用于保留未知字段）
 */
async function writeChangelogFile(
  filePath: string,
  data: {
    date: string;
    title: string;
    type: string;
    commits: string[];
    honors: { name: string; color: string }[];
    content: string;
  },
  existingContent?: string
): Promise<void> {
  let existingData: Record<string, unknown> | undefined;
  if (existingContent) {
    const parsed = matter(existingContent);
    existingData = parsed.data as Record<string, unknown>;
  }

  const frontmatter = generateChangelogFrontMatter(data, existingData);
  const fileContent = `${frontmatter}\n\n${data.content.trim()}`;
  await fs.writeFile(filePath, fileContent, 'utf-8');
}

/**
 * 获取所有更新日志列表
 * @returns Changelog数组，按日期降序排序
 */
export async function getChangelogs(): Promise<Changelog[]> {
  try {
    // 确保目录存在
    await fs.mkdir(CHANGELOGS_DIR, { recursive: true });

    const files = await fs.readdir(CHANGELOGS_DIR);
    const mdFiles = files.filter(file => file.endsWith('.md'));

    const changelogs: Changelog[] = [];

    for (const file of mdFiles) {
      const filePath = path.join(CHANGELOGS_DIR, file);
      const changelog = await readChangelogFile(filePath);
      if (changelog) {
        changelogs.push(changelog);
      }
    }

    // 按日期降序排序
    return changelogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    console.error('获取日志列表失败:', error);
    return [];
  }
}

/**
 * 根据日期获取单条日志
 * @param date 日期（YYYY-MM-DD）
 * @returns Changelog对象或null
 */
export async function getChangelogByDate(date: string): Promise<Changelog | null> {
  try {
    if (!isValidDate(date)) {
      throw new Error('无效的日期格式');
    }

    const filePath = path.join(CHANGELOGS_DIR, `${date}.md`);

    // 检查文件是否存在
    await fs.access(filePath);

    return await readChangelogFile(filePath);
  } catch (error) {
    console.error(`获取日志失败: ${date}`, error);
    return null;
  }
}

/**
 * 检查日志是否已存在
 * @param date 日期（YYYY-MM-DD）
 * @returns 是否存在
 */
export async function checkChangelogExists(date: string): Promise<boolean> {
  try {
    const filePath = path.join(CHANGELOGS_DIR, `${date}.md`);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 创建新日志
 * @param data 日志数据
 * @returns 操作结果
 */
export async function createChangelog(data: {
  date: string;
  type: ChangelogType;
  content: string;
  title?: string;
  commits?: string[];
  honors?: { name: string; color: string }[];
}): Promise<{ success: boolean; message: string }> {
  try {
    // 验证必填字段
    if (!data.date || !data.type || !data.content) {
      return { success: false, message: '日期、类型和内容不能为空' };
    }

    // 验证日期格式
    if (!isValidDate(data.date)) {
      return { success: false, message: '日期格式无效，应为 YYYY-MM-DD' };
    }

    // 检查日期是否已存在
    const exists = await checkChangelogExists(data.date);
    if (exists) {
      return { success: false, message: '该日期的日志已存在' };
    }

    // 确保目录存在
    await fs.mkdir(CHANGELOGS_DIR, { recursive: true });

    // 构建文件内容
    const title = data.title || `${data.date} 更新日志`;
    const commits = data.commits || [];
    const honors = data.honors || [];

    // 写入文件
    const filePath = path.join(CHANGELOGS_DIR, `${data.date}.md`);
    await writeChangelogFile(filePath, {
      date: data.date,
      title,
      type: data.type,
      commits,
      honors,
      content: data.content,
    });

    return { success: true, message: '日志创建成功' };
  } catch (error) {
    console.error('创建日志失败:', error);
    return { success: false, message: '创建日志失败: ' + (error instanceof Error ? error.message : '未知错误') };
  }
}

/**
 * 更新日志
 * @param date 日期（YYYY-MM-DD）
 * @param data 更新的数据
 * @returns 操作结果
 */
export async function updateChangelog(
  date: string,
  data: {
    type?: ChangelogType;
    content?: string;
    title?: string;
    commits?: string[];
    honors?: { name: string; color: string }[];
  }
): Promise<{ success: boolean; message: string }> {
  try {
    // 验证日期
    if (!isValidDate(date)) {
      return { success: false, message: '日期格式无效' };
    }

    // 获取现有日志
    const existing = await getChangelogByDate(date);
    if (!existing) {
      return { success: false, message: '日志不存在' };
    }

    // 读取原始文件内容，用于保留 frontmatter 中的未知字段
    const filePath = path.join(CHANGELOGS_DIR, `${date}.md`);
    const existingContent = await fs.readFile(filePath, 'utf-8');

    // 合并数据
    const title = data.title !== undefined ? data.title : existing.title;
    const type = data.type !== undefined ? data.type : existing.type;
    const content = data.content !== undefined ? data.content : existing.content;
    const commits = data.commits !== undefined ? data.commits : existing.commits;
    const honors = (data.honors !== undefined ? data.honors : existing.honors) || [];

    // 写入文件，保留原始 frontmatter 中的未知字段
    await writeChangelogFile(filePath, {
      date,
      title,
      type,
      commits,
      honors,
      content,
    }, existingContent);

    return { success: true, message: '日志更新成功' };
  } catch (error) {
    console.error('更新日志失败:', error);
    return { success: false, message: '更新日志失败: ' + (error instanceof Error ? error.message : '未知错误') };
  }
}

/**
 * 删除日志
 * @param date 日期（YYYY-MM-DD）
 * @returns 操作结果
 */
export async function deleteChangelog(date: string): Promise<{ success: boolean; message: string }> {
  try {
    // 验证日期
    if (!isValidDate(date)) {
      return { success: false, message: '日期格式无效' };
    }

    const filePath = path.join(CHANGELOGS_DIR, `${date}.md`);

    // 检查文件是否存在
    const exists = await checkChangelogExists(date);
    if (!exists) {
      return { success: false, message: '日志不存在' };
    }

    // 删除文件
    await fs.unlink(filePath);

    return { success: true, message: '日志删除成功' };
  } catch (error) {
    console.error('删除日志失败:', error);
    return { success: false, message: '删除日志失败: ' + (error instanceof Error ? error.message : '未知错误') };
  }
}
