/**
 * 开发日志服务器端工具函数
 * 仅用于服务器端，包含文件系统操作
 * 客户端请使用 changelogTypes.ts 中的类型和函数
 */

import {
  Changelog,
  ChangelogType,
  calculateAchievements,
  countPlainChars,
} from '@/types/changelogTypes';
import { parseFrontMatter } from '@/utils/frontMatterUtils';

// 重新导出类型和纯函数，方便其他模块使用
export type { Changelog, ChangelogType } from '@/types/changelogTypes';
export {
  getChangelogTypeColor,
  getChangelogTypeLabel,
  getMonthStats,
  getQuarterStats,
  getYearStats,
  getDayPartStats,
  getTypeStats,
  calculateAchievements,
  getAchievementLabel,
  getAchievementColor,
  sortAchievementsByPriority,
} from '@/types/changelogTypes';

// 重新导出 parseFrontMatter，保持向后兼容
export { parseFrontMatter } from '@/utils/frontMatterUtils';

/**
 * 服务器端：读取所有开发日志文件
 * @returns 开发日志数组，按日期倒序排序
 */
export function getServerChangelogs(): Changelog[] {
  let changelogs: Changelog[] = [];

  try {
    // 动态导入fs和path模块（仅在服务器端可用）
    const fs = require('fs');
    const path = require('path');

    // 构建changelogs目录路径
    const changelogsDir = path.join(process.cwd(), 'src', 'content', 'changelogs');

    // 检查目录是否存在
    if (!fs.existsSync(changelogsDir) || !fs.statSync(changelogsDir).isDirectory()) {
      return [];
    }

    // 读取目录中的所有文件
    const files = fs.readdirSync(changelogsDir);

    // 过滤出markdown文件
    const mdFiles = files.filter((file: string) => file.endsWith('.md'));

    // 读取和解析每个文件
    changelogs = mdFiles.map((file: string) => {
      const filePath = path.join(changelogsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      const { metadata, content: body } = parseFrontMatter(content);

      // 验证并获取日志类型，默认为 'docs'
      // 支持的有效类型：feature, optimize, fix, docs, style, refactor
      // 旧类型映射：perf -> optimize, chore -> docs
      const typeValue = metadata.type as string;
      const validTypes: ChangelogType[] = ['feature', 'optimize', 'fix', 'docs', 'style', 'refactor'];

      let type: ChangelogType;
      if (validTypes.includes(typeValue as ChangelogType)) {
        type = typeValue as ChangelogType;
      } else if (typeValue === 'perf') {
        type = 'optimize'; // 旧类型映射
      } else if (typeValue === 'chore') {
        type = 'docs'; // 旧类型映射
      } else {
        type = 'docs'; // 默认类型
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
        id: file.replace('.md', ''),
        date: (metadata.date as string) || '',
        title: (metadata.title as string) || '无标题',
        type: type,
        commits: commits,
        content: body,
        filePath: file,
        achievements: achievements,
        honors: honors
      };
    });

    // 按日期倒序排序
    changelogs.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    // 追加跨篇成就（连更不辍 / 月度劳模）：依赖全部日志的上下文，无法在单篇判定中得出
    applyGlobalAchievements(changelogs);
  } catch (error) {
    console.error('读取开发日志文件失败:', error);
  }

  return changelogs;
}

/**
 * 客户端：获取空的开发日志数组（客户端不读取文件系统）
 * @returns 空数组
 */
export function getClientChangelogs(): Changelog[] {
  return [];
}

/**
 * 根据环境返回相应的开发日志获取函数
 * @returns 开发日志数组
 */
export function getChangelogs(): Changelog[] {
  // 检查是否在浏览器环境
  if (typeof window !== 'undefined') {
    return getClientChangelogs();
  }
  return getServerChangelogs();
}

/**
 * 根据ID获取单个开发日志
 * @param id 开发日志ID
 * @returns 开发日志对象或undefined
 */
export function getChangelogById(id: string): Changelog | undefined {
  const changelogs = getChangelogs();
  return changelogs.find(changelog => changelog.id === id);
}

/**
 * 检查开发日志目录是否存在
 * @returns 是否存在
 */
export function changelogsDirExists(): boolean {
  // 客户端无法访问文件系统
  if (typeof window !== 'undefined') {
    return false;
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const changelogsDir = path.join(process.cwd(), 'src', 'content', 'changelogs');
    return fs.existsSync(changelogsDir) && fs.statSync(changelogsDir).isDirectory();
  } catch {
    return false;
  }
}

/** 「连更不辍」所需的连续更新天数 */
const STREAK_DAYS = 7;

/** 「月度劳模」所需的单月日志篇数 */
const MONTHLY_GRIND_COUNT = 15;

/**
 * 把 YYYY-MM-DD 转换成「距 1970-01-01 的天数」
 *
 * 用 UTC 解析避免本地时区带来的日期偏移；只用于判断两天是否相邻，
 * 非法日期返回 0（该篇不会参与连续段判定）。
 *
 * @param date 标准格式日期字符串
 * @returns 天数序号
 */
function toDayNumber(date: string): number {
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isNaN(timestamp) ? 0 : Math.floor(timestamp / 86400000);
}

/**
 * 计算并追加跨篇成就
 *
 * 这两类成就依赖全部日志的上下文，无法在单篇判定中得出：
 * - 连更不辍：日志按日期升序排列后，找出相邻日期恰好相差 1 天的连续段；
 *   段长达到 7 天及以上时，授予该连续段的**最后一天**（连续更新收官那天）——
 *   段中途就给标签会被后续日志「接续」而显得语义不完整，
 *   授予收官那天才代表「这一段连续更新正式完成」；
 * - 月度劳模：按月份累计篇数，达到 15 篇时授予当月第 15 篇（达标那一刻）。
 *   注意该成就一旦授予不会因后续日志删除而回收，历史记录保持稳定。
 *
 * @param changelogs 全部日志（会就地修改各篇的 achievements 字段）
 */
function applyGlobalAchievements(changelogs: Changelog[]): void {
  if (changelogs.length === 0) return;

  // 独立排序，避免依赖调用方传入的顺序
  const asc = [...changelogs].sort((a, b) => toDayNumber(a.date) - toDayNumber(b.date));

  // ---- 连更不辍：扫描连续段，授予该段最后一天 ----
  let segmentStart = 0;
  for (let i = 1; i <= asc.length; i++) {
    const stillContiguous =
      i < asc.length && toDayNumber(asc[i].date) - toDayNumber(asc[i - 1].date) === 1;

    if (!stillContiguous) {
      const segmentLength = i - segmentStart;
      if (segmentLength >= STREAK_DAYS) {
        // i - 1 即该连续段的最后一天
        const milestone = asc[i - 1];
        // 防御性去重：同一篇只授予一次
        if (!milestone.achievements.includes('streak')) {
          milestone.achievements.push('streak');
        }
      }
      segmentStart = i;
    }
  }

  // ---- 月度劳模：按月累计，第 15 篇达标 ----
  const monthCounter = new Map<string, number>();
  for (const changelog of asc) {
    const monthKey = changelog.date.slice(0, 7); // YYYY-MM
    const count = (monthCounter.get(monthKey) || 0) + 1;
    monthCounter.set(monthKey, count);

    if (count === MONTHLY_GRIND_COUNT && !changelog.achievements.includes('monthlyGrind')) {
      changelog.achievements.push('monthlyGrind');
    }
  }
}
