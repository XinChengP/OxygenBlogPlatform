'use server';

/**
 * 管理后台仪表盘数据统计（服务端专用）
 * 该文件包含读取文件系统的逻辑，仅在服务端执行，避免客户端打包时引入 fs 模块
 */

import { parseFrontMatter } from '../frontMatterUtils';

/**
 * 时间统计项接口
 */
export interface TimeStatItem {
  label: string;
  count: number;
}

/**
 * 仪表盘统计数据接口
 */
export interface DashboardStats {
  /** 文章总数 */
  blogCount: number;
  /** 动态总数 */
  momentCount: number;
  /** 图片总数 */
  imageCount: number;
  /** 本月新增文章数 */
  monthlyBlogCount: number;
  /** 更新日志总数 */
  changelogCount: number;
  /** 待办事项总数 */
  todoCount: number;
  /** 待办事项完成数 */
  todoCompletedCount: number;
  /** 分类统计 */
  categoryStats: { name: string; count: number }[];
  /** 预设分类总数（用于仪表盘显示） */
  categoryCount: number;
  /** 标签统计（截断前10个，用于标签云展示） */
  tagStats: { name: string; count: number }[];
  /** 标签总数（实际所有不同标签的数量） */
  totalTagCount: number;
  /** 更新日志列表（用于统计图） */
  changelogs: { date: string; type: string; title: string }[];
  /** 文章总字数 */
  blogWordCount: number;
  /** 动态总字数 */
  momentWordCount: number;
  /** 日志总字数 */
  changelogWordCount: number;
  /** 文章时间统计（月/季/年） */
  blogTimeStats: {
    month: TimeStatItem[];
    quarter: TimeStatItem[];
    year: TimeStatItem[];
  };
  /** 动态时间统计（月/季/年） */
  momentTimeStats: {
    month: TimeStatItem[];
    quarter: TimeStatItem[];
    year: TimeStatItem[];
  };
}

/**
 * 高级字数统计函数
 * 支持中英文混合文本的精确字数统计
 * @param text 待统计文本
 * @returns 总词数对象
 */
function advancedWordCount(text: string): { totalWords: number } {
  if (!text || text.trim().length === 0) {
    return { totalWords: 0 };
  }

  // 清理文本：移除 Markdown 标记和 HTML 标签
  const cleanedText = text
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/^[\s]*[-*+]\s+/gm, '')
    .replace(/^[\s]*>\s+/gm, '')
    .replace(/\|/g, '')
    .replace(/^[\s]*-+[\s|-]*$/gm, '')
    .replace(/\*\*|__|~~|\*|_/g, '');

  let chineseChars = 0;
  let englishWords = 0;
  let numbers = 0;

  /**
   * 判断字符是否属于 CJK 字符范围
   * @param charCode 字符 Unicode 编码
   * @returns 是否为 CJK 字符
   */
  const isCJK = (charCode: number): boolean => {
    return (
      (charCode >= 0x4e00 && charCode <= 0x9fff) ||
      (charCode >= 0x3400 && charCode <= 0x4dbf) ||
      (charCode >= 0x20000 && charCode <= 0x2a6df) ||
      (charCode >= 0x2a700 && charCode <= 0x2b73f) ||
      (charCode >= 0x2b740 && charCode <= 0x2b81f) ||
      (charCode >= 0x2b820 && charCode <= 0x2ceaf) ||
      (charCode >= 0x2ceb0 && charCode <= 0x2ebef) ||
      (charCode >= 0x3000 && charCode <= 0x303f) ||
      (charCode >= 0x3040 && charCode <= 0x309f) ||
      (charCode >= 0x30a0 && charCode <= 0x30ff) ||
      (charCode >= 0x31f0 && charCode <= 0x31ff) ||
      (charCode >= 0xff00 && charCode <= 0xffef) ||
      (charCode >= 0xf900 && charCode <= 0xfaff)
    );
  };

  /**
   * 判断字符是否为数字
   * @param charCode 字符 Unicode 编码
   * @returns 是否为数字
   */
  const isNumber = (charCode: number): boolean => {
    return (charCode >= 0x30 && charCode <= 0x39) || (charCode >= 0xff10 && charCode <= 0xff19);
  };

  let currentWord = '';
  let inEnglishWord = false;

  for (let i = 0; i < cleanedText.length; i++) {
    const char = cleanedText[i];
    const charCode = char.codePointAt(0) || 0;

    // 跳过空格和制表符
    if (char === ' ' || char === '\t') {
      if (inEnglishWord && currentWord) {
        englishWords++;
        currentWord = '';
        inEnglishWord = false;
      }
      continue;
    }

    // 统计中文字符
    if (isCJK(charCode)) {
      chineseChars++;
      if (inEnglishWord && currentWord) {
        englishWords++;
        currentWord = '';
        inEnglishWord = false;
      }
      continue;
    }

    // 统计数字
    if (isNumber(charCode)) {
      numbers++;
      if (inEnglishWord && currentWord) {
        englishWords++;
        currentWord = '';
        inEnglishWord = false;
      }
      continue;
    }

    // 处理英文字符
    if ((charCode >= 0x41 && charCode <= 0x5a) || (charCode >= 0x61 && charCode <= 0x7a)) {
      currentWord += char;
      inEnglishWord = true;
      continue;
    }

    // 处理其他情况，结束当前英文单词
    if (inEnglishWord && currentWord) {
      englishWords++;
      currentWord = '';
      inEnglishWord = false;
    }
  }

  // 处理最后一个单词
  if (inEnglishWord && currentWord) {
    englishWords++;
  }

  // 总词数 = 中文字符 + 英文单词 + 数字
  const totalWords = chineseChars + englishWords + numbers;

  return { totalWords };
}

/**
 * 根据日期数组生成月份统计
 * @param dates 日期字符串数组
 * @returns 月份统计数组
 */
function getMonthStatsFromDates(dates: string[]): TimeStatItem[] {
  const stats: Record<string, number> = {};

  dates.forEach((dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const label = `${year}年${month}月`;
    stats[label] = (stats[label] || 0) + 1;
  });

  return Object.entries(stats)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      const yearMatchA = a.label.match(/(\d{4})年/);
      const monthMatchA = a.label.match(/年(\d+)月/);
      const yearMatchB = b.label.match(/(\d{4})年/);
      const monthMatchB = b.label.match(/年(\d+)月/);

      const yearA = yearMatchA ? parseInt(yearMatchA[1]) : 0;
      const monthA = monthMatchA ? parseInt(monthMatchA[1]) : 0;
      const yearB = yearMatchB ? parseInt(yearMatchB[1]) : 0;
      const monthB = monthMatchB ? parseInt(monthMatchB[1]) : 0;

      if (yearA !== yearB) {
        return yearA - yearB;
      }
      return monthA - monthB;
    });
}

/**
 * 根据日期数组生成季度统计（春夏秋冬）
 * @param dates 日期字符串数组
 * @returns 季度统计数组
 */
function getQuarterStatsFromDates(dates: string[]): TimeStatItem[] {
  const stats: Record<string, number> = {};

  dates.forEach((dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    let season: string;
    let seasonYear = year;

    if (month >= 3 && month <= 5) {
      season = '春';
    } else if (month >= 6 && month <= 8) {
      season = '夏';
    } else if (month >= 9 && month <= 11) {
      season = '秋';
    } else {
      season = '冬';
      if (month === 1 || month === 2) {
        seasonYear = year - 1;
      }
    }

    const label = `${seasonYear}年${season}`;
    stats[label] = (stats[label] || 0) + 1;
  });

  return Object.entries(stats)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      const yearMatchA = a.label.match(/(\d{4})年/);
      const yearMatchB = b.label.match(/(\d{4})年/);

      const yearA = yearMatchA ? parseInt(yearMatchA[1]) : 0;
      const yearB = yearMatchB ? parseInt(yearMatchB[1]) : 0;

      if (yearA !== yearB) {
        return yearA - yearB;
      }

      const seasonOrder: Record<string, number> = { '春': 1, '夏': 2, '秋': 3, '冬': 4 };
      const seasonA = a.label.slice(-1);
      const seasonB = b.label.slice(-1);

      return (seasonOrder[seasonA] || 0) - (seasonOrder[seasonB] || 0);
    });
}

/**
 * 根据日期数组生成年度统计
 * @param dates 日期字符串数组
 * @returns 年度统计数组
 */
function getYearStatsFromDates(dates: string[]): TimeStatItem[] {
  const stats: Record<string, number> = {};

  dates.forEach((dateStr) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return;

    const year = date.getFullYear();
    const label = `${year}年`;
    stats[label] = (stats[label] || 0) + 1;
  });

  return Object.entries(stats)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      const yearMatchA = a.label.match(/(\d{4})年/);
      const yearMatchB = b.label.match(/(\d{4})年/);

      const yearA = yearMatchA ? parseInt(yearMatchA[1]) : 0;
      const yearB = yearMatchB ? parseInt(yearMatchB[1]) : 0;

      return yearA - yearB;
    });
}

/**
 * 获取仪表盘统计数据
 * 读取本地 content 目录下的博客、动态、日志、待办等数据并统计
 * @returns 仪表盘统计数据对象
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  // 默认统计数据
  const defaultStats: DashboardStats = {
    blogCount: 0,
    momentCount: 0,
    imageCount: 0,
    monthlyBlogCount: 0,
    changelogCount: 0,
    todoCount: 0,
    todoCompletedCount: 0,
    categoryStats: [],
    categoryCount: 0,
    tagStats: [],
    totalTagCount: 0,
    changelogs: [],
    blogWordCount: 0,
    momentWordCount: 0,
    changelogWordCount: 0,
    blogTimeStats: { month: [], quarter: [], year: [] },
    momentTimeStats: { month: [], quarter: [], year: [] },
  };

  try {
    const fs = require('fs');
    const path = require('path');

    // 获取文章总数和分类统计
    const blogsDir = path.join(process.cwd(), 'src', 'content', 'blogs');
    let blogCount = 0;
    let monthlyBlogCount = 0;
    let blogWordCount = 0;
    const categoryMap = new Map<string, number>();
    const tagMap = new Map<string, number>();
    const blogDates: string[] = [];

    if (fs.existsSync(blogsDir) && fs.statSync(blogsDir).isDirectory()) {
      const blogFiles = fs.readdirSync(blogsDir).filter((file: string) => file.endsWith('.md'));
      blogCount = blogFiles.length + 1; // 显示数量 = 实际文件数量 + 1

      // 计算本月新增文章数和分类统计
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();

      blogFiles.forEach((file: string) => {
        const filePath = path.join(blogsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // 统一使用 parseFrontMatter 解析 frontmatter，避免正则和解析器结果不一致
        const { metadata, content: body } = parseFrontMatter(content);

        // 统计文章字数
        const wordCount = advancedWordCount(body);
        blogWordCount += wordCount.totalWords;

        // 从解析后的 metadata 中提取日期
        let date = '';
        if (metadata.date) {
          const dateStr = String(metadata.date);
          const dateMatch = dateStr.match(/(\d{4}-\d{2}-\d{2})/);
          date = dateMatch ? dateMatch[1] : dateStr;
        }

        if (date) {
          const dateObj = new Date(date);
          if (dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear) {
            monthlyBlogCount++;
          }
          // 收集文章日期
          blogDates.push(date);
        }

        // 提取分类 —— 统一使用 parseFrontMatter 的 metadata
        if (metadata.category && typeof metadata.category === 'string') {
          const category = metadata.category.trim();
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        }

        // 提取标签 —— 使用 parseFrontMatter 的 metadata
        if (metadata.tags && Array.isArray(metadata.tags)) {
          metadata.tags.forEach((tag: string) => {
            if (tag && typeof tag === 'string') {
              tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
            }
          });
        }
      });
    }

    // 获取动态总数和字数统计
    const momentsDir = path.join(process.cwd(), 'src', 'content', 'moments');
    let momentCount = 0;
    let momentWordCount = 0;
    const momentDates: string[] = [];

    if (fs.existsSync(momentsDir) && fs.statSync(momentsDir).isDirectory()) {
      const momentFiles = fs.readdirSync(momentsDir).filter((file: string) => file.endsWith('.md'));
      momentCount = momentFiles.length + 1; // 显示数量 = 实际文件数量 + 1

      // 统计动态字数
      momentFiles.forEach((file: string) => {
        const filePath = path.join(momentsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // 解析 front matter 获取正文内容
        const { content: body } = parseFrontMatter(content);

        // 统计动态字数
        const wordCount = advancedWordCount(body);
        momentWordCount += wordCount.totalWords;

        // 提取时间和内容
        const timeMatch = content.match(/time:\s*["']?([^"'\n]+)/);
        let time = timeMatch ? timeMatch[1] : '';
        // 移除时间末尾的引号
        time = time.replace(/["']$/, '');

        if (time) {
          // 收集动态日期（只取日期部分 YYYY-MM-DD）
          const dateMatch = time.match(/(\d{4}-\d{2}-\d{2})/);
          if (dateMatch) {
            momentDates.push(dateMatch[1]);
          }
        }
      });
    }

    // 获取更新日志数据和字数统计
    const changelogsDir = path.join(process.cwd(), 'src', 'content', 'changelogs');
    let changelogCount = 0;
    let changelogWordCount = 0;
    const changelogs: { date: string; type: string; title: string }[] = [];

    if (fs.existsSync(changelogsDir) && fs.statSync(changelogsDir).isDirectory()) {
      const changelogFiles = fs.readdirSync(changelogsDir).filter((file: string) => file.endsWith('.md'));
      changelogCount = changelogFiles.length + 1; // 显示数量 = 实际文件数量 + 1

      // 遍历所有日志文件
      changelogFiles.forEach((file: string) => {
        const filePath = path.join(changelogsDir, file);
        const content = fs.readFileSync(filePath, 'utf8');

        // 解析 front matter 获取正文内容
        const { content: body } = parseFrontMatter(content);

        // 统计日志字数
        const wordCount = advancedWordCount(body);
        changelogWordCount += wordCount.totalWords;

        // 提取日期（从文件名）
        const dateFromFile = file.replace('.md', '');

        // 提取类型和标题（从文件内容）
        const typeMatch = content.match(/type:\s*["']?([^"'\n]+)/);
        const type = typeMatch ? typeMatch[1].trim() : 'feature';

        const titleMatch = content.match(/title:\s*["']?([^"'\n]+)/);
        const title = titleMatch ? titleMatch[1].trim() : dateFromFile;

        // 直接添加，不管 date 是否存在
        changelogs.push({ date: dateFromFile, type, title });
      });
    }

    // 获取待办事项统计
    const todoPath = path.join(process.cwd(), 'src', 'content', 'todo.json');
    let todoCount = 0;
    let todoCompletedCount = 0;

    if (fs.existsSync(todoPath)) {
      try {
        const todoContent = fs.readFileSync(todoPath, 'utf8');
        const todoData = JSON.parse(todoContent);
        if (todoData.items && Array.isArray(todoData.items)) {
          todoCount = todoData.items.length;
          todoCompletedCount = todoData.items.filter((item: { completed?: boolean }) => item.completed).length;
        }
      } catch (e) {
        console.error('解析待办事项数据失败:', e);
      }
    }

    // 获取图片总数（从 public 目录统计）
    const publicDir = path.join(process.cwd(), 'public');
    let imageCount = 0;

    if (fs.existsSync(publicDir) && fs.statSync(publicDir).isDirectory()) {
      // 支持的图片格式
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];

      // 递归统计图片数量
      const countImages = (dir: string): number => {
        let count = 0;
        try {
          const items = fs.readdirSync(dir);

          items.forEach((item: string) => {
            const itemPath = path.join(dir, item);
            const stat = fs.statSync(itemPath);

            if (stat.isDirectory()) {
              count += countImages(itemPath);
            } else if (stat.isFile()) {
              const ext = path.extname(item).toLowerCase();
              if (imageExtensions.includes(ext)) {
                count++;
              }
            }
          });
        } catch (e) {
          // 忽略无法访问的目录
        }

        return count;
      };

      imageCount = countImages(publicDir);
    }

    // 转换分类统计为数组并排序（不再截断，显示全部分类）
    const categoryStats = Array.from(categoryMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // 转换标签统计为数组并排序（截断前10个用于标签云展示）
    const tagStats = Array.from(tagMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // 只取前10个用于标签云展示

    // 计算文章和动态的时间统计
    const blogTimeStats = {
      month: getMonthStatsFromDates(blogDates),
      quarter: getQuarterStatsFromDates(blogDates),
      year: getYearStatsFromDates(blogDates),
    };

    const momentTimeStats = {
      month: getMonthStatsFromDates(momentDates),
      quarter: getQuarterStatsFromDates(momentDates),
      year: getYearStatsFromDates(momentDates),
    };

    const result = {
      blogCount,
      momentCount,
      imageCount,
      monthlyBlogCount,
      changelogCount,
      todoCount,
      todoCompletedCount,
      categoryStats,
      categoryCount: categoryMap.size + 1,
      tagStats,
      totalTagCount: tagMap.size,
      changelogs,
      blogWordCount,
      momentWordCount,
      changelogWordCount,
      blogTimeStats,
      momentTimeStats,
    };

    return result;
  } catch (error) {
    console.error('获取仪表盘统计数据失败:', error);
    return defaultStats;
  }
}
