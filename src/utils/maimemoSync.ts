/**
 * 墨墨背单词数据同步核心逻辑
 *
 * 通过墨墨官方开放 API（open.maimemo.com）拉取学习数据：
 * - get_study_progress：今日学习进度（已完成/计划总数）
 * - query_study_records：单词学习记录，按「首次学习日期」聚合出历史每天的新学单词数
 *
 * Token 从环境变量 MAIMEMO_API_TOKEN 读取（App 内：我的 → 更多设置 → 实验功能 → 开放 API）。
 * 结果写入 src/data/maimemo-stats.json，供 /study 页面构建时读取。
 *
 * 注意：本文件被 server action 与 CLI 脚本共用，
 * 只使用相对路径导入（tsx 脚本不走 tsconfig 路径别名）。
 */

import type { MaimemoStats, MaimemoSyncResult, MaimemoToday } from '../types/maimemo';
import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import path from 'path';

/** 墨墨开放 API 基础地址（来源：官方 CLI @maimemo/memo-api） */
const MAIMEMO_API_BASE = 'https://open.maimemo.com/open/';

/** 输出文件路径 */
const STATS_FILE_PATH = () => path.join(process.cwd(), 'src', 'data', 'maimemo-stats.json');

/** DPAPI 加密 Token 文件（密文由 npm run maimemo -- --set-token 生成，仅当前 Windows 用户可解密） */
const TOKEN_FILE = () => path.join(process.cwd(), '.maimemo-token.enc');

/** 单次查询单词记录的最大条数（API 侧分页上限未知，取一个稳妥值） */
const RECORDS_LIMIT = 1000;

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

/** 本地日期 YYYY-MM-DD */
function localDate(date = new Date()): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
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
 * 墨墨返回的日期是北京时区日期对应的 UTC 时刻（如北京 4/11 存为 4/10T16:00Z），
 * 统一转成北京时间日期 YYYY-MM-DD
 */
function beijingDateOf(value: string): string | null {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return new Date(time + 8 * 3_600_000).toISOString().slice(0, 10);
}

interface StudyProgressResponse {
  progress?: { finished?: number; total?: number; study_time?: number };
}

interface StudyRecordItem {
  voc_id: string;
  voc_spelling: string;
  add_date?: string;
  first_study_date?: string;
  last_study_date?: string;
  next_study_date?: string;
  /** 记录标签，如 STICKING（顽固词） */
  tags?: string[];
  study_count: number;
}

interface StudyRecordsResponse {
  records?: StudyRecordItem[];
  count?: number;
}

/**
 * 执行同步：拉取墨墨数据并写入 src/data/maimemo-stats.json
 *
 * 两个接口分别容错：任一失败不影响另一部分数据落盘。
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

  const today: MaimemoToday | null = await (async () => {
    try {
      const res = await postApi<StudyProgressResponse>(
        'api/v1/memo/study/get_study_progress',
        token,
        {}
      );
      if (res.progress) {
        return {
          date: localDate(),
          finished: Number(res.progress.finished) || 0,
          total: Number(res.progress.total) || 0,
          // 实测该字段是账号累计学习时长（毫秒），非当日；统一转成秒
          studyTimeSeconds: Math.round((Number(res.progress.study_time) || 0) / 1000),
        };
      }
      return null;
    } catch (error) {
      console.warn('[maimemo] 获取今日进度失败:', error instanceof Error ? error.message : error);
      return null;
    }
  })();

  // 单词记录：聚合每日新学数量，同时统计今日新学/待复习/顽固词/最近单词
  let totalWords = 0;
  let dailyNewWords: Record<string, number> = {};
  let todayNewWords = 0;
  let dueReviews = 0;
  let stickingWords = 0;
  let recentWords: MaimemoStats['recentWords'] = [];
  let recordsError: string | null = null;
  const todayBeijing = localDate();

  try {
    const countRes = await postApi<StudyRecordsResponse>(
      'api/v1/memo/study/query_study_records',
      token,
      { voc_ids: [], spellings: [], as_count: true, limit: 1 }
    );
    totalWords = Number(countRes.count) || 0;
  } catch (error) {
    recordsError = error instanceof Error ? error.message : String(error);
    console.warn('[maimemo] 查询单词总数失败:', recordsError);
  }

  try {
    const recordsRes = await postApi<StudyRecordsResponse>(
      'api/v1/memo/study/query_study_records',
      token,
      { voc_ids: [], spellings: [], as_count: false, limit: RECORDS_LIMIT }
    );
    const records = recordsRes.records || [];
    if (records.length > 0) {
      const aggregated: Record<string, number> = {};
      const recentCandidates: Array<{ spelling: string; lastStudyDate: string; time: number }> = [];

      records.forEach(record => {
        if (record.first_study_date) {
          const firstDate = beijingDateOf(record.first_study_date);
          if (firstDate) {
            aggregated[firstDate] = (aggregated[firstDate] || 0) + 1;
            if (firstDate === todayBeijing) todayNewWords += 1;
          }
        }

        if (record.next_study_date) {
          const nextDate = beijingDateOf(record.next_study_date);
          if (nextDate && nextDate <= todayBeijing) dueReviews += 1;
        }

        if (Array.isArray(record.tags) && record.tags.includes('STICKING')) {
          stickingWords += 1;
        }

        if (record.last_study_date && record.voc_spelling) {
          const lastDate = beijingDateOf(record.last_study_date);
          if (lastDate) {
            recentCandidates.push({
              spelling: record.voc_spelling,
              lastStudyDate: lastDate,
              time: new Date(record.last_study_date).getTime() || 0,
            });
          }
        }
      });

      dailyNewWords = aggregated;
      recentWords = recentCandidates
        .sort((a, b) => b.time - a.time)
        .slice(0, 5)
        .map(({ spelling, lastStudyDate }) => ({ spelling, lastStudyDate }));
    }
    // 接口没给 count 时退化为记录条数
    if (!totalWords) {
      totalWords = records.length;
    }
  } catch (error) {
    recordsError = recordsError || (error instanceof Error ? error.message : String(error));
    console.warn('[maimemo] 查询单词记录失败:', recordsError);
  }

  if (!today && totalWords === 0 && Object.keys(dailyNewWords).length === 0) {
    return {
      success: false,
      message: `墨墨数据拉取失败${recordsError ? `：${recordsError}` : '，接口未返回任何数据'}`,
    };
  }

  const stats: MaimemoStats = {
    updatedAt: new Date().toISOString(),
    totalWords,
    today,
    dailyNewWords,
    todayNewWords,
    dueReviews,
    stickingWords,
    recentWords,
  };

  await fs.mkdir(path.dirname(STATS_FILE_PATH()), { recursive: true });
  await fs.writeFile(STATS_FILE_PATH(), JSON.stringify(stats, null, 2), 'utf8');

  const parts: string[] = [];
  if (today) parts.push(`今日 ${today.finished}/${today.total}`);
  if (totalWords) parts.push(`累计 ${totalWords} 词`);
  parts.push(`覆盖 ${Object.keys(dailyNewWords).length} 天记录`);

  return {
    success: true,
    message: `墨墨数据已同步：${parts.join('，')}${recordsError ? '（部分数据拉取失败，已跳过）' : ''}`,
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
