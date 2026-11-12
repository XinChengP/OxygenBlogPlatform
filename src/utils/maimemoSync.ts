/**
 * 墨墨背单词数据同步核心逻辑
 *
 * 通过墨墨官方开放 API（open.maimemo.com）拉取学习数据：
 * - get_study_progress：今日学习进度（已完成/计划总数）
 * - get_today_items：今日学习单词（is_new 过滤出今日新学，比全量记录推算更准）
 * - query_study_records：学习记录；支持 tags 过滤与 as_count 精确计数
 *
 * Token 从环境变量 MAIMEMO_API_TOKEN 读取（App 内：我的 → 更多设置 → 实验功能 → 开放 API）。
 * 结果写入 src/data/maimemo-stats.json，供 /study 页面构建时读取。
 *
 * 关于 1000 条上限：
 * query_study_records 单次最多返回 1000 条且没有 offset，只能按 next_study_date 时间窗分页。
 * 这里用「时间窗 + 数量探测 + 二分递归」的方式尽量拉全，避免词量增长后统计失真。
 * Worker 侧还有 D1 持久化兜底（见 cloudflare/maimemo-stats/README.md）。
 *
 * 注意：本文件被 server action 与 CLI 脚本共用，
 * 只使用相对路径导入（tsx 脚本不走 tsconfig 路径别名）。
 */

import type { MaimemoStats, MaimemoSyncResult, MaimemoToday } from '../types/maimemo';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import path from 'path';

/** 墨墨开放 API 基础地址（来源：官方 OpenAPI 规范） */
const MAIMEMO_API_BASE = 'https://open.maimemo.com/open/';

/** 输出文件路径 */
const STATS_FILE_PATH = () => path.join(process.cwd(), 'src', 'data', 'maimemo-stats.json');

/** DPAPI 加密 Token 文件（密文由 npm run maimemo -- --set-token 生成，仅当前 Windows 用户可解密） */
const TOKEN_FILE = () => path.join(process.cwd(), '.maimemo-token.enc');

/** 单次查询单词记录的最大条数（官方上限 1000） */
const RECORDS_LIMIT = 1000;

/** 北京时间相对 UTC 的偏移（毫秒） */
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;

/** 全量回填时间窗：最近 5 年到未来 2 年（next_study_date 可能排到未来） */
const BACKFILL_START_DAYS = 5 * 365;
const BACKFILL_END_DAYS = 2 * 365;

/** 时间窗二分最大深度，避免请求数失控 */
const MAX_SPLIT_DEPTH = 3;

/**
 * 解密 DPAPI 加密的本地 Token
 *
 * 密文文件由 --set-token 通过 PowerShell ConvertFrom-SecureString 生成，
 * 绑定当前 Windows 用户，明文只在解密瞬间存在于内存，不落盘、不打印。
 * 非 Windows 平台或文件不存在时返回 null。
 */
function readDpapiToken(): Promise<string | null> {
  if (process.platform !== 'win32') return Promise.resolve(null);

  return fs
    .readFile(TOKEN_FILE(), 'utf8')
    .then(cipherText => {
      const cipher = cipherText.trim();
      if (!cipher) return null;

      // 单引号内的路径需要把单引号翻倍转义；密文文件可能有换行尾，需 Trim
      const quotedPath = `'${TOKEN_FILE().replace(/'/g, "''")}'`;
      const command =
        `$s = ConvertTo-SecureString -String (Get-Content -Raw ${quotedPath}).Trim(); ` +
        `$b = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($s); ` +
        `[Console]::Out.Write([System.Runtime.InteropServices.Marshal]::PtrToStringAuto($b))`;

      return new Promise<string | null>(resolve => {
        execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { timeout: 15_000 }, (error, stdout) => {
          if (error || !stdout) {
            console.warn('[maimemo] 读取加密 Token 失败:', error instanceof Error ? error.message : error);
            resolve(null);
            return;
          }
          resolve(stdout.trim() || null);
        });
      });
    })
    .catch(() => null);
}

/**
 * 解析墨墨 Token，优先级：
 * 1. 环境变量 MAIMEMO_API_TOKEN（GitHub Actions 用 Secret 注入，本地也可临时指定）
 * 2. Windows DPAPI 加密文件 .maimemo-token.enc（本地推荐，不落明文）
 *
 * @returns Token 与来源；来源为 none 时调用方给出配置指引
 */
export async function resolveMaimemoToken(): Promise<{
  token: string | null;
  source: 'env' | 'dpapi' | 'none';
}> {
  const envToken = process.env.MAIMEMO_API_TOKEN?.trim();
  if (envToken) {
    return { token: envToken, source: 'env' };
  }

  const dpapiToken = await readDpapiToken();
  if (dpapiToken) {
    return { token: dpapiToken, source: 'dpapi' };
  }

  return { token: null, source: 'none' };
}

/** 本地日期 YYYY-MM-DD（按北京时间，避免 CI 在 UTC 时区把日期算错） */
function localDate(date = new Date()): string {
  const shifted = new Date(date.getTime() + BEIJING_OFFSET_MS);
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${m}-${d}`;
}

/** 北京日期加减天数 */
function shiftDays(date: string, days: number): string {
  return localDate(new Date(Date.parse(`${date}T00:00:00+08:00`) + days * 86_400_000));
}

/** 某天 00:00:00（北京时间）的 ISO 字符串，用于 next_study_date 筛选 */
function dayStartIso(date: string): string {
  return `${date}T00:00:00+08:00`;
}

/** 某天 23:59:59（北京时间）的 ISO 字符串 */
function dayEndIso(date: string): string {
  return `${date}T23:59:59+08:00`;
}

/** 带超时与错误信息提取的 POST 请求 */
async function postApi<T>(path: string, token: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(new URL(path, MAIMEMO_API_BASE), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const hint =
        response.status === 401
          ? 'Token 无效或已过期，请到墨墨 App 的「开放 API」页面重新生成'
          : response.status === 429
            ? '墨墨接口触发频控，请稍后重试'
            : `墨墨接口返回 ${response.status}`;
      throw new Error(`${hint}${text ? `：${text.slice(0, 120)}` : ''}`);
    }

    const payload = (await response.json()) as {
      success?: boolean;
      errors?: Array<{ code?: string; msg?: string }>;
      data?: unknown;
    };

    // 失败信封：HTTP 200 + { success: false, errors: [...] }
    if (payload && payload.success === false) {
      const first = Array.isArray(payload.errors) ? payload.errors[0] : null;
      throw new Error(
        `墨墨接口返回失败：${first?.code || 'api_error'}${first?.msg ? `（${first.msg}）` : ''}`
      );
    }

    // 开放 API 把业务数据包在 data 字段里（官方 CLI 内部会拆包）
    const unwrapped = payload && payload.data !== undefined ? payload.data : payload;
    return unwrapped as T;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('请求墨墨接口超时（30 秒），请检查网络后重试');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 取墨墨日期字段的「北京日期」YYYY-MM-DD
 *
 * 墨墨的日期字段形如 2026-10-28T16:00:00.000Z，直接取前 10 位即为真实学习日期。
 *
 * 该口径经「今日待学列表」接口验证：今天尚未学习的记录中，78 个词的
 * first_study_date / last_study_date / next_study_date 是同一个值且今日进度 finished=0，
 * 只有「直接取日期」能自洽（若 +8 小时会算成"今天已学但还没学"的矛盾）。
 * 注意不要用 add_date 反推：该字段是词书加入日期，词书迁移等场景下会晚于首次学习。
 */
function dateOf(value: string): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : null;
}

/**
 * 判断记录是否带某个标签
 *
 * 官方 OpenAPI 把 StudyRecord.tags 标注为 string（enum STICKING / WELL_FAMILIAR），
 * 但线上实际返回字符串数组。两种形态都兼容，避免接口纠正类型后顽固词静默归零。
 */
function hasRecordTag(record: StudyRecordItem, tag: string): boolean {
  const tags = record.tags as unknown;
  if (Array.isArray(tags)) return tags.includes(tag);
  return tags === tag;
}

interface StudyProgressResponse {
  progress?: { finished?: number; total?: number; study_time?: number };
}

interface StudyTodayItem {
  voc_id: string;
  voc_spelling: string;
  order?: number;
  is_new?: boolean;
  is_finished?: boolean;
}

interface StudyTodayItemsResponse {
  today_items?: StudyTodayItem[];
}

interface StudyRecordItem {
  voc_id: string;
  voc_spelling: string;
  add_date?: string;
  first_study_date?: string;
  last_study_date?: string;
  next_study_date?: string;
  /** 上次作答；未学过的词为 STUDY_RESPONSE_UNSPECIFIED */
  last_response?: string;
  /** 记录标签，如 STICKING（文档标注为 string，实际为数组） */
  tags?: string[] | string;
  study_count: number;
}

interface StudyRecordsResponse {
  records?: StudyRecordItem[];
  count?: number;
}

/** 记录聚合结果 */
interface RecordAggregate {
  /** 每天新学单词数 */
  dailyNewWords: Record<string, number>;
  /** 每天复习单词数 */
  dailyReviews: Record<string, number>;
  /** 真正作答过的词数（排除仅加入计划、尚未学习的词） */
  studiedCount: number;
  /** 最近学习的词（排序后取前 5） */
  recentCandidates: Array<{ spelling: string; lastStudyDate: string; time: number }>;
  /** 今日新学（记录口径，接口不可用时兜底） */
  todayNewWords: number;
  /** 待复习（记录口径，接口不可用时兜底） */
  dueReviews: number;
  /** 顽固词（记录口径，接口不可用时兜底） */
  stickingWords: number;
}

/** 创建空聚合器 */
function createAggregate(): RecordAggregate {
  return {
    dailyNewWords: {},
    dailyReviews: {},
    studiedCount: 0,
    recentCandidates: [],
    todayNewWords: 0,
    dueReviews: 0,
    stickingWords: 0,
  };
}

/**
 * 把一批记录累加进聚合结果
 *
 * 未开始学的新词也会预置 first/last_study_date（计划日零点），
 * 唯一可靠的区分依据是 last_response：未学过固定为 STUDY_RESPONSE_UNSPECIFIED。
 * 只有真正作答过的词才计入「新学 / 最近学习 / 累计已背」。
 */
function addRecords(records: StudyRecordItem[], acc: RecordAggregate, todayDate: string): void {
  records.forEach(record => {
    const studied =
      Boolean(record.last_response) && record.last_response !== 'STUDY_RESPONSE_UNSPECIFIED';
    if (studied) acc.studiedCount += 1;

    // 每日新学：按首次学习日期聚合
    if (studied && record.first_study_date) {
      const firstDate = dateOf(record.first_study_date);
      if (firstDate) {
        acc.dailyNewWords[firstDate] = (acc.dailyNewWords[firstDate] || 0) + 1;
        if (firstDate === todayDate) acc.todayNewWords += 1;
      }
    }

    // 待复习兜底：下次学习日期已到
    if (record.next_study_date) {
      const nextDate = dateOf(record.next_study_date);
      if (nextDate && nextDate <= todayDate) acc.dueReviews += 1;
    }

    // 顽固词兜底
    if (hasRecordTag(record, 'STICKING')) acc.stickingWords += 1;

    // 每日复习：当天学习且不是首次学习
    if (studied && record.last_study_date && record.voc_spelling) {
      const lastDate = dateOf(record.last_study_date);
      const firstDate = record.first_study_date ? dateOf(record.first_study_date) : null;
      if (lastDate) {
        if (firstDate && firstDate !== lastDate) {
          acc.dailyReviews[lastDate] = (acc.dailyReviews[lastDate] || 0) + 1;
        }
        acc.recentCandidates.push({
          spelling: record.voc_spelling,
          lastStudyDate: lastDate,
          time: new Date(record.last_study_date).getTime() || 0,
        });
      }
    }
  });
}

/**
 * 按 next_study_date 时间窗拉取记录
 *
 * query_study_records 只有 limit（上限 1000）没有 offset，
 * 超过 1000 条的时间窗要二分递归，直到每个子窗口都能一次取完。
 */
async function queryRecordsWindow(
  token: string,
  startIso: string,
  endIso: string,
  depth = 0
): Promise<StudyRecordItem[]> {
  const filter = { next_study_date: { start: startIso, end: endIso } };

  // 先探测数量，避免无谓地拉全量
  const countRes = await postApi<StudyRecordsResponse>(
    'api/v1/memo/study/query_study_records',
    token,
    { ...filter, as_count: true, limit: 1 }
  );
  const count = Number(countRes.count) || 0;
  if (count === 0) return [];

  // 数量在单页上限内，或已达最大递归深度：直接取一页（超限时只能接受截断）
  if (count <= RECORDS_LIMIT || depth >= MAX_SPLIT_DEPTH) {
    const res = await postApi<StudyRecordsResponse>(
      'api/v1/memo/study/query_study_records',
      token,
      { ...filter, as_count: false, limit: RECORDS_LIMIT }
    );
    return res.records || [];
  }

  // 窗口太大：对半切开分别拉取
  const midIso = new Date((Date.parse(startIso) + Date.parse(endIso)) / 2).toISOString();
  const left = await queryRecordsWindow(token, startIso, midIso, depth + 1);
  const right = await queryRecordsWindow(token, midIso, endIso, depth + 1);
  return left.concat(right);
}

/**
 * 执行同步：拉取墨墨数据并写入 src/data/maimemo-stats.json
 *
 * 各接口分别容错：任一失败不影响其他部分数据落盘。
 */
export async function syncMaimemoStats(): Promise<MaimemoSyncResult> {
  const { token } = await resolveMaimemoToken();
  if (!token) {
    return {
      success: false,
      message:
        '未配置墨墨 Token：运行 npm run maimemo -- --set-token 按提示加密保存（推荐，不落明文）；CI 环境则把 Token 配置为 GitHub Secrets 的 MAIMEMO_API_TOKEN。Token 在墨墨 App「我的 → 更多设置 → 实验功能 → 开放 API」获取',
    };
  }

  const todayBeijing = localDate();
  const errors: string[] = [];

  /** 统一容错：记录首个错误信息用于最终提示 */
  const attempt = async <T>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message);
      console.warn('[maimemo] 接口请求失败:', message);
      return null;
    }
  };

  // 1. 今日进度
  const today: MaimemoToday | null = await attempt(async () => {
    const res = await postApi<StudyProgressResponse>(
      'api/v1/memo/study/get_study_progress',
      token,
      {}
    );
    if (!res.progress) return null;
    return {
      date: todayBeijing,
      finished: Number(res.progress.finished) || 0,
      total: Number(res.progress.total) || 0,
      /*
        官方文档写的是「今日学习时长（毫秒）」，换算成秒保存。
        实测今天未学习时接口返回 0，可确认它就是当日时长而非账号累计。
        前台暂未展示该字段。
      */
      studyTimeSeconds: Math.round((Number(res.progress.study_time) || 0) / 1000),
    };
  });

  // 2. 今日新学：官方专用接口，只统计已完成当日学习的词
  const todayNewWordsFromApi = await attempt(async () => {
    const res = await postApi<StudyTodayItemsResponse>(
      'api/v1/memo/study/get_today_items',
      token,
      { is_new: true, limit: RECORDS_LIMIT }
    );
    const items = res.today_items || [];
    return items.filter(item => item.is_finished === true).length;
  });

  // 3. 顽固词：tags 过滤 + as_count 精确计数
  const stickingFromApi = await attempt(async () => {
    const res = await postApi<StudyRecordsResponse>(
      'api/v1/memo/study/query_study_records',
      token,
      { tags: 'STICKING', as_count: true, limit: 1 }
    );
    return Number(res.count) || 0;
  });

  // 4. 待复习：下次学习日期 <= 今天，官方推荐的 as_count 精确计数
  const dueFromApi = await attempt(async () => {
    const res = await postApi<StudyRecordsResponse>(
      'api/v1/memo/study/query_study_records',
      token,
      { next_study_date: { end: dayEndIso(todayBeijing) }, as_count: true, limit: 1 }
    );
    return Number(res.count) || 0;
  });

  // 5. 规划总量（含尚未学习的词），作为累计已背的兜底
  const totalRecords = await attempt(async () => {
    const res = await postApi<StudyRecordsResponse>(
      'api/v1/memo/study/query_study_records',
      token,
      { as_count: true, limit: 1 }
    );
    return Number(res.count) || 0;
  });

  // 6. 全量记录分页拉取并聚合
  const aggregate = createAggregate();
  const records = await attempt(() =>
    queryRecordsWindow(
      token,
      dayStartIso(shiftDays(todayBeijing, -BACKFILL_START_DAYS)),
      dayEndIso(shiftDays(todayBeijing, BACKFILL_END_DAYS)),
      0
    )
  );
  if (records) {
    addRecords(records, aggregate, todayBeijing);
  }

  // 7. 最近学习的 5 个单词（按最近学习时间倒序）
  const recentWords = aggregate.recentCandidates
    .sort((a, b) => b.time - a.time)
    .slice(0, 5)
    .map(({ spelling, lastStudyDate }) => ({ spelling, lastStudyDate }));

  // 全部关键接口都失败时直接报错，避免写出空数据覆盖旧快照
  if (!today && records === null) {
    return {
      success: false,
      message: `墨墨数据拉取失败${errors[0] ? `：${errors[0]}` : '，接口未返回任何数据'}`,
    };
  }

  const stats: MaimemoStats = {
    updatedAt: new Date().toISOString(),
    // 累计已背优先用「真正作答题数」，接口失败时退回规划总量
    totalWords: aggregate.studiedCount > 0 ? aggregate.studiedCount : totalRecords || 0,
    today,
    dailyNewWords: aggregate.dailyNewWords,
    todayNewWords: todayNewWordsFromApi !== null ? todayNewWordsFromApi : aggregate.todayNewWords,
    dueReviews: dueFromApi !== null ? dueFromApi : aggregate.dueReviews,
    stickingWords: stickingFromApi !== null ? stickingFromApi : aggregate.stickingWords,
    recentWords,
    dailyReviews: aggregate.dailyReviews,
  };

  await fs.mkdir(path.dirname(STATS_FILE_PATH()), { recursive: true });
  await fs.writeFile(STATS_FILE_PATH(), JSON.stringify(stats, null, 2), 'utf8');

  const parts: string[] = [];
  if (today) parts.push(`今日 ${today.finished}/${today.total}`);
  if (stats.totalWords) parts.push(`累计 ${stats.totalWords} 词`);
  parts.push(`覆盖 ${Object.keys(stats.dailyNewWords).length} 天记录`);

  return {
    success: true,
    message: `墨墨数据已同步：${parts.join('，')}${errors.length > 0 ? `（${errors.length} 个接口失败，已跳过）` : ''}`,
    data: stats,
  };
}

/**
 * 把 Token 用 Windows DPAPI 加密后写入 .maimemo-token.enc
 *
 * 明文通过子进程环境变量传入（不进命令行参数、不落盘、不打印），
 * ConvertFrom-SecureString 用当前 Windows 用户的 DPAPI 密钥加密。
 */
export function encryptAndSaveToken(token: string): Promise<{ success: boolean; message: string }> {
  if (process.platform !== 'win32') {
    return Promise.resolve({
      success: false,
      message: '当前系统不支持本机加密保存，请改用环境变量 MAIMEMO_API_TOKEN（CI 用 GitHub Secrets）',
    });
  }

  const quotedPath = `'${TOKEN_FILE().replace(/'/g, "''")}'`;
  const command =
    `$s = ConvertTo-SecureString -String $env:MAIMEMO_TOKEN_FOR_SAVE -AsPlainText -Force; ` +
    `ConvertFrom-SecureString -SecureString $s | Set-Content -Path ${quotedPath} -Encoding UTF8; ` +
    `Write-Output 'SAVED'`;

  return new Promise(resolve => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', command],
      { timeout: 15_000, env: { ...process.env, MAIMEMO_TOKEN_FOR_SAVE: token } },
      (error, stdout) => {
        if (error || !stdout.includes('SAVED')) {
          resolve({
            success: false,
            message: `加密保存失败：${error instanceof Error ? error.message : '未知错误'}`,
          });
          return;
        }
        resolve({ success: true, message: 'Token 已加密保存' });
      }
    );
  });
}

/**
 * 删除本机加密保存的 Token 文件（不存在时静默成功）
 */
export async function clearEncryptedToken(): Promise<void> {
  try {
    await fs.rm(TOKEN_FILE(), { force: true });
  } catch {
    // 删除失败不阻断流程，下次保存会覆盖
  }
}

/**
 * 服务器端（构建期）读取已同步的墨墨数据快照
 * 文件不存在或损坏时返回 null，前台不展示卡片
 */
export async function getServerMaimemoStats(): Promise<MaimemoStats | null> {
  try {
    const raw = await fs.readFile(STATS_FILE_PATH(), 'utf8');
    const stats = JSON.parse(raw) as MaimemoStats;
    if (typeof stats.totalWords !== 'number' || typeof stats.dailyNewWords !== 'object') {
      return null;
    }
    return stats;
  } catch {
    return null;
  }
}
