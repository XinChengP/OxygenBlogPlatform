/**
 * 英语背单词数据类型（墨墨背单词开放 API）
 *
 * 数据由 scripts/fetch-maimemo.ts 或后台「同步墨墨数据」按钮拉取，
 * 写入 src/data/maimemo-stats.json，前台 /study 页面构建时读取展示。
 */

/** 今日学习进度 */
export interface MaimemoToday {
  /** 快照日期 YYYY-MM-DD（北京时间） */
  date: string;
  /** 今日已完成单词数 */
  finished: number;
  /** 今日计划总单词数 */
  total: number;
  /** 账号累计学习时长（秒；接口字段实为累计值而非当日，单位毫秒已换算） */
  studyTimeSeconds?: number;
}

/** 最近学习的单词 */
export interface MaimemoRecentWord {
  spelling: string;
  /** 最近学习日期 YYYY-MM-DD（北京时间） */
  lastStudyDate: string;
}

/**
 * 墨墨数据快照（src/data/maimemo-stats.json 的结构，也是 /api/maimemo/stats 的返回体）
 */
export interface MaimemoStats {
  /** 最近一次同步时间（ISO 字符串） */
  updatedAt: string;
  /** 累计已背单词数 */
  totalWords: number;
  /** 今日进度（拉取失败时为 null） */
  today: MaimemoToday | null;
  /** 每天新学单词数（date -> count，由单词记录的首次学习日期聚合） */
  dailyNewWords: Record<string, number>;
  /** 今日新学的单词数（first_study_date 为今天的词） */
  todayNewWords?: number;
  /** 今日到期待复习的单词数（基于最近拉取的单词记录估算） */
  dueReviews?: number;
  /** 顽固词数量（tags 含 STICKING） */
  stickingWords?: number;
  /** 最近学习的几个单词 */
  recentWords?: MaimemoRecentWord[];
}

/** 同步结果 */
export interface MaimemoSyncResult {
  success: boolean;
  message: string;
  data?: MaimemoStats;
}

/** Token 配置状态（不包含 Token 本身） */
export interface MaimemoTokenStatus {
  configured: boolean;
  /** env：环境变量 / GitHub Secrets；dpapi：本机加密文件；none：未配置 */
  source: 'env' | 'dpapi' | 'none';
}
