/**
 * 开发日志服务器端工具函数
 * 仅用于服务器端，包含文件系统操作
 * 客户端请使用 changelogTypes.ts 中的类型和函数
 */

import {
  Changelog,
  ChangelogType,
  parseFrontMatter,
} from '@/types/changelogTypes';

// 重新导出类型和纯函数，方便其他模块使用
export type { Changelog, ChangelogType } from '@/types/changelogTypes';
export {
  parseFrontMatter,
  getChangelogTypeColor,
  getChangelogTypeLabel,
  getMonthStats,
  getQuarterStats,
  getYearStats,
  getDayPartStats,
  getTypeStats,
} from '@/types/changelogTypes';

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

      return {
        id: file.replace('.md', ''),
        date: (metadata.date as string) || '',
        title: (metadata.title as string) || '无标题',
        type: type,
        commits: (metadata.commits as string[]) || [],
        content: body,
        filePath: file
      };
    });

    // 按日期倒序排序
    changelogs.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });
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
