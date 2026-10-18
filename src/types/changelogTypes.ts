/**
 * 开发日志类型定义和纯函数
 * 此文件不包含任何 Node.js 模块依赖，可安全在客户端使用
 */

// 重新导出 front matter 解析函数
export { parseFrontMatter } from '@/utils/frontMatterUtils';

/**
 * 开发日志类型定义
 * - feature: 新功能
 * - optimize: 优化
 * - fix: 修复
 * - docs: 文档
 * - style: 样式
 * - refactor: 重构
 */
export type ChangelogType = 'feature' | 'optimize' | 'fix' | 'docs' | 'style' | 'refactor';

/**
 * 成就类型定义
 *
 * 单篇维度（由 calculateAchievements 判定）：
 * - tired: 略感疲惫 - 关联提交数量 >= 10 且 < 20
 * - exhausted: 肝爆了 - 关联提交数量 >= 20
 * - smallButComplete: 麻雀虽小五脏俱全 - 关联提交 = 1 且 日志行数 > 55
 * - lively: 人声鼎沸 - 日志行数 >= 100（超长篇，不论提交数量）
 * - brief: 一笔带过 - 日志行数 < 18（那天只随手记了一笔）
 * - bugSquasher: 除虫日 - 当天所有提交都是修复（fix）
 * - allRounder: 面面俱到 - 提交覆盖 >= 4 种类型前缀
 * - verbose: 洋洋洒洒 - 正文中文字数 >= 2500
 *
 * 跨篇维度（由 changelogUtils 在读取全部日志后统一计算）：
 * - streak: 连更不辍 - 连续 7 天以上每天都有日志（授予该连续段的最后一天）
 * - monthlyGrind: 月度劳模 - 单月日志 >= 15 篇（授予当月第 15 篇；已授予不回收）
 */
export type ChangelogAchievement =
  | 'tired'
  | 'exhausted'
  | 'smallButComplete'
  | 'lively'
  | 'brief'
  | 'bugSquasher'
  | 'allRounder'
  | 'verbose'
  | 'streak'
  | 'monthlyGrind';

/**
 * 自定义荣誉接口
 * 用户可以在后台手动设置的荣誉标签
 */
export interface CustomHonor {
  name: string;      // 荣誉名称
  color: string;     // 荣誉颜色（CSS颜色值或渐变色）
}

/**
 * 开发日志接口定义
 */
export interface Changelog {
  id: string;                         // 文件名作为ID
  date: string;                       // 日期 YYYY-MM-DD
  title: string;                      // 日志标题
  type: ChangelogType;                // 日志类型
  commits: string[];                  // 关联的Git提交
  content: string;                    // 日志正文内容
  filePath: string;                   // 文件路径
  achievements: ChangelogAchievement[]; // 获得的自动成就标签
  honors?: CustomHonor[];             // 自定义荣誉标签（后台手动设置）
}

/**
 * 获取开发日志类型对应的颜色值（十六进制）
 * 配色方案：天依蓝、紫色、粉色、橙色、黄绿色、绿色
 * @param type 开发日志类型
 * @returns 十六进制颜色值
 */
export function getChangelogTypeColor(type: ChangelogType): string {
  const colorMap: Record<ChangelogType, string> = {
    feature: '#66ccff',   // 新功能 - 天依蓝
    optimize: '#9966ff',  // 优化 - 紫色
    fix: '#ff66cc',       // 修复 - 粉色
    docs: '#ff9966',      // 文档 - 橙色
    style: '#ccff66',     // 样式 - 黄绿色
    refactor: '#66ff99',  // 重构 - 绿色
  };

  return colorMap[type] || colorMap.docs;
}

/**
 * 获取开发日志类型的中文标签
 * @param type 开发日志类型
 * @returns 中文标签
 */
export function getChangelogTypeLabel(type: ChangelogType): string {
  const labelMap: Record<ChangelogType, string> = {
    feature: '新功能',
    optimize: '优化',
    fix: '修复',
    docs: '文档',
    style: '样式',
    refactor: '重构',
  };

  return labelMap[type] || type;
}

/**
 * 按年月分组统计日志数量
 * @param changelogs 开发日志数组
 * @returns 按年月分组的统计数组，按时间升序排序
 */
export function getMonthStats(changelogs: Changelog[]): { label: string; count: number }[] {
  const stats: Record<string, number> = {};

  changelogs.forEach(changelog => {
    const date = new Date(changelog.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const label = `${year}年${month}月`;
    stats[label] = (stats[label] || 0) + 1;
  });

  return Object.entries(stats)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      // 从 label 中提取年份和月份
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
 * 按季度分组统计日志数量
 * 使用更合理的季节划分：
 * - 春：3-5月
 * - 夏：6-8月
 * - 秋：9-11月
 * - 冬：12-2月
 * @param changelogs 开发日志数组
 * @returns 按季度分组的统计数组，按时间升序排序
 */
export function getQuarterStats(changelogs: Changelog[]): { label: string; count: number }[] {
  const stats: Record<string, number> = {};

  changelogs.forEach(changelog => {
    const date = new Date(changelog.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-12月
    
    let season: string;
    let seasonYear = year;
    
    if (month >= 3 && month <= 5) {
      season = '春';
    } else if (month >= 6 && month <= 8) {
      season = '夏';
    } else if (month >= 9 && month <= 11) {
      season = '秋';
    } else {
      // 12月、1月、2月都属于冬季
      season = '冬';
      // 12月、1月、2月同属于12月那一年的冬季
      // 例如：2025年12月、2026年1月、2026年2月都属于2025年冬
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
      // 从 label 中提取年份和季节
      const yearMatchA = a.label.match(/(\d{4})年/);
      const seasonMatchA = a.label.match(/年(春|夏|秋|冬)/);
      const yearMatchB = b.label.match(/(\d{4})年/);
      const seasonMatchB = b.label.match(/年(春|夏|秋|冬)/);
      
      const yearA = yearMatchA ? parseInt(yearMatchA[1]) : 0;
      const yearB = yearMatchB ? parseInt(yearMatchB[1]) : 0;
      
      if (yearA !== yearB) {
        return yearA - yearB;
      }
      
      // 季节排序：春(1) → 夏(2) → 秋(3) → 冬(4)
      const seasonOrder: Record<string, number> = {
        '春': 1,
        '夏': 2,
        '秋': 3,
        '冬': 4,
      };
      
      const seasonA = seasonMatchA ? seasonOrder[seasonMatchA[1]] || 0 : 0;
      const seasonB = seasonMatchB ? seasonOrder[seasonMatchB[1]] || 0 : 0;
      
      return seasonA - seasonB;
    });
}

/**
 * 按年度分组统计日志数量
 * @param changelogs 开发日志数组
 * @returns 按年度分组的统计数组，按时间升序排序
 */
export function getYearStats(changelogs: Changelog[]): { label: string; count: number }[] {
  const stats: Record<string, number> = {};

  changelogs.forEach(changelog => {
    const date = new Date(changelog.date);
    const year = date.getFullYear();
    const label = `${year}年`;
    stats[label] = (stats[label] || 0) + 1;
  });

  return Object.entries(stats)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      // 从 label 中提取年份
      const yearMatchA = a.label.match(/(\d{4})年/);
      const yearMatchB = b.label.match(/(\d{4})年/);
      
      const yearA = yearMatchA ? parseInt(yearMatchA[1]) : 0;
      const yearB = yearMatchB ? parseInt(yearMatchB[1]) : 0;
      
      return yearA - yearB;
    });
}

/**
 * 按早中晚时间段统计日志数量
 * @param changelogs 开发日志数组
 * @returns 按时间段分组的统计数组，按数量降序排序
 */
export function getDayPartStats(changelogs: Changelog[]): { label: string; count: number }[] {
  const stats: Record<string, number> = {};

  changelogs.forEach(changelog => {
    const date = new Date(changelog.date);
    const hour = date.getHours();
    let label: string;

    if (hour >= 6 && hour <= 8) {
      label = '早晨6-8点';
    } else if (hour >= 9 && hour <= 12) {
      label = '上午9-12点';
    } else if (hour >= 13 && hour <= 17) {
      label = '下午13-17点';
    } else if (hour >= 18 && hour <= 21) {
      label = '晚上18-21点';
    } else {
      label = '深夜22-5点';
    }

    stats[label] = (stats[label] || 0) + 1;
  });

  return Object.entries(stats)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 按类型分组统计日志数量
 * @param changelogs 开发日志数组
 * @returns 按类型分组的统计数组，按数量降序排序
 */
export function getTypeStats(changelogs: Changelog[]): { type: ChangelogType; label: string; count: number }[] {
  const stats: Record<ChangelogType, number> = {} as Record<ChangelogType, number>;

  changelogs.forEach(changelog => {
    stats[changelog.type] = (stats[changelog.type] || 0) + 1;
  });

  return Object.entries(stats)
    .map(([type, count]) => ({
      type: type as ChangelogType,
      label: getChangelogTypeLabel(type as ChangelogType),
      count
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * 成就分组
 * 用于「成就说明」弹窗的分节排版：
 * - commitCount: 按当天关联提交数量判定
 * - length: 按日志正文篇幅判定
 * - commitType: 按当天提交的类型分布判定
 * - global: 需要全部日志上下文，跨篇统计得出
 */
export type AchievementGroup = 'commitCount' | 'length' | 'commitType' | 'global';

/** 分组展示顺序（弹窗内自上而下） */
export const ACHIEVEMENT_GROUP_ORDER: AchievementGroup[] = [
  'commitCount',
  'length',
  'commitType',
  'global',
];

/** 分组标题映射 */
const achievementGroupLabels: Record<AchievementGroup, string> = {
  commitCount: '提交数量',
  length: '篇幅长短',
  commitType: '提交类型',
  global: '跨篇统计',
};

/**
 * 获取成就分组的标题
 * @param group 分组键
 * @returns 中文标题
 */
export function getAchievementGroupLabel(group: AchievementGroup): string {
  return achievementGroupLabels[group] || group;
}

const achievementConfig: Record<
  ChangelogAchievement,
  {
    label: string;
    color: string;
    priority: number;
    condition: string;
    scope: 'single' | 'global';
    group: AchievementGroup;
  }
> = {
  tired: { label: '略感疲惫', color: '#7366ff', priority: 1, condition: '关联提交数量 10 ~ 19 条', scope: 'single', group: 'commitCount' },
  exhausted: { label: '肝爆了', color: '#e566ff', priority: 2, condition: '关联提交数量 20 条及以上', scope: 'single', group: 'commitCount' },
  smallButComplete: { label: '麻雀虽小五脏俱全', color: '#ff66a6', priority: 3, condition: '仅 1 条提交，正文超过 55 行', scope: 'single', group: 'length' },
  lively: { label: '人声鼎沸', color: '#ff9966', priority: 4, condition: '正文 100 行及以上', scope: 'single', group: 'length' },
  brief: { label: '一笔带过', color: '#66ffbf', priority: 5, condition: '正文不足 18 行', scope: 'single', group: 'length' },
  monthlyGrind: { label: '月度劳模', color: '#80ff66', priority: 6, condition: '单月日志达到 15 篇', scope: 'global', group: 'global' },
  streak: { label: '连更不辍', color: '#f2ff66', priority: 7, condition: '连续 7 天每天都有日志（授予该段最后一天）', scope: 'global', group: 'global' },
  allRounder: { label: '面面俱到', color: '#9966ff', priority: 8, condition: '当天提交覆盖 4 种及以上类型', scope: 'single', group: 'commitType' },
  bugSquasher: { label: '除虫日', color: '#ff66cc', priority: 9, condition: '当天所有提交都是修复（fix）', scope: 'single', group: 'commitType' },
  verbose: { label: '洋洋洒洒', color: '#66ccff', priority: 10, condition: '正文中文字数 2500 及以上', scope: 'single', group: 'length' },
};

/**
 * 预留颜色（用于后续拓展）
 * #cc99ff, #99ffcc
 */

/**
 * 成就说明条目
 * 供「成就说明」弹窗展示，内容取自 achievementConfig，保证单一数据源
 */
export interface AchievementDescription {
  /** 成就类型键名 */
  key: ChangelogAchievement;
  /** 中文名称 */
  label: string;
  /** 标签颜色 */
  color: string;
  /** 触发条件的文字说明 */
  condition: string;
  /** 判定范围：single 单篇判定 / global 跨篇统计 */
  scope: 'single' | 'global';
  /** 所属分组（弹窗排版用） */
  group: AchievementGroup;
  /** 展示排序（数值越小越靠前） */
  priority: number;
}

/**
 * 获取按展示优先级排列的成就说明列表
 * @returns 成就说明数组（priority 升序）
 */
export function getAchievementDescriptions(): AchievementDescription[] {
  return (Object.keys(achievementConfig) as ChangelogAchievement[])
    .map((key) => ({ key, ...achievementConfig[key] }))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * 提取提交信息的类型前缀
 *
 * 提交信息遵循 conventional commits 风格（如 "feat(blog): xxx"、"fix: xxx"），
 * 取前缀用于判断当天提交的类型分布；没有前缀（如 "更新日志"）返回 null。
 *
 * @param commit 单条提交信息
 * @returns 小写前缀，或 null
 */
export function getCommitPrefix(commit: string): string | null {
  const matched = commit.match(/^([a-zA-Z]+)(\(|:|!)/);
  return matched ? matched[1].toLowerCase() : null;
}

/**
 * 统计正文的纯文本字数
 *
 * 先剔除代码块（代码不算「写作篇幅」），再去掉常见 markdown 符号，
 * 最后统计非空白字符数。与行数口径互补：表格多的日志行数高、字数未必多，
 * 因此「洋洋洒洒」用字数判定，而「人声鼎沸」用行数判定。
 *
 * 纯字符串处理，无任何环境依赖，服务端与客户端均可调用。
 *
 * @param body 日志正文（不含 frontmatter）
 * @returns 纯文本字符数
 */
export function countPlainChars(body: string): number {
  return body
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[#*>`|\[\]()!~-]/g, '')
    .replace(/\s/g, '').length;
}

/**
 * 单篇成就判定的输入数据
 */
export interface AchievementInput {
  /** 关联的提交信息数组 */
  commits: string[];
  /** 日志正文行数（原始行数，不 trim） */
  contentLineCount: number;
  /** 日志正文的中文字数（已剔除 markdown 符号与代码块） */
  charCount: number;
}

/**
 * 计算单篇日志获得的成就
 *
 * 判定维度：提交数量、日志行数、提交类型分布、正文中文字数。
 * 多数日志的提交数量集中在 1~5 条，因此提交数相关的成就门槛刻意设高保持稀有；
 * 篇幅相关的成就（人声鼎沸 / 洋洋洒洒 / 一笔带过）覆盖长短两端。
 * 跨篇成就（连更不辍 / 月度劳模）不在此处判定。
 *
 * @param input 判定所需数据
 * @returns 成就类型数组
 */
export function calculateAchievements(input: AchievementInput): ChangelogAchievement[] {
  const { commits, contentLineCount, charCount } = input;
  const achievements: ChangelogAchievement[] = [];

  // 略感疲惫: 关联提交数量 >= 10 且 < 20
  if (commits.length >= 10 && commits.length < 20) {
    achievements.push('tired');
  }

  // 肝爆了: 关联提交数量 >= 20
  if (commits.length >= 20) {
    achievements.push('exhausted');
  }

  // 麻雀虽小五脏俱全: 关联提交 = 1 且 日志行数 > 55
  if (commits.length === 1 && contentLineCount > 55) {
    achievements.push('smallButComplete');
  }

  // 人声鼎沸: 日志行数 >= 100，篇幅极长的长篇记录
  // 与提交数量无关，单篇深耕同样可以获得
  if (contentLineCount >= 100) {
    achievements.push('lively');
  }

  // 一笔带过: 日志行数 < 18，那天只随手记了一笔
  // 门槛由 20 收紧到 18（实测命中从 10 篇降至 4 篇），避免短日志普遍拿标签
  if (contentLineCount < 18) {
    achievements.push('brief');
  }

  // 除虫日: 当天所有提交都是修复（fix），且至少有一条提交
  const prefixes = commits.map(getCommitPrefix);
  if (commits.length > 0 && prefixes.every((prefix) => prefix === 'fix')) {
    achievements.push('bugSquasher');
  }

  // 面面俱到: 提交覆盖 >= 4 种类型前缀（无前缀的提交不计入种类）
  const uniquePrefixes = new Set(prefixes.filter((prefix): prefix is string => prefix !== null));
  if (uniquePrefixes.size >= 4) {
    achievements.push('allRounder');
  }

  // 洋洋洒洒: 正文中文字数 >= 2500
  // 与「人声鼎沸」按行数判定不同：表格多的日志行数高但字数未必多
  if (charCount >= 2500) {
    achievements.push('verbose');
  }

  return achievements;
}

/**
 * 获取成就的中文名称
 * @param achievement 成就类型
 * @returns 中文名称
 */
export function getAchievementLabel(achievement: ChangelogAchievement): string {
  return achievementConfig[achievement]?.label || achievement;
}

/**
 * 获取成就的颜色值
 * @param achievement 成就类型
 * @returns 十六进制颜色值
 */
export function getAchievementColor(achievement: ChangelogAchievement): string {
  return achievementConfig[achievement]?.color || '#7366ff';
}

/**
 * 按优先级排序成就
 * @param achievements 成就类型数组
 * @returns 按优先级排序后的成就数组
 */
export function sortAchievementsByPriority(achievements: ChangelogAchievement[]): ChangelogAchievement[] {
  return [...achievements].sort((a, b) => {
    const priorityA = achievementConfig[a]?.priority || 0;
    const priorityB = achievementConfig[b]?.priority || 0;
    return priorityA - priorityB;
  });
}
