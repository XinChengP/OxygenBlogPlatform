/**
 * 墨墨背单词数据接口 Worker
 *
 * 职责：
 *   1. GET /api/maimemo/stats：返回累计词数、今日进度、每日新学/复习数等
 *   2. 请求时现拉墨墨开放 API（open.maimemo.com），结果写入 D1 持久化
 *
 * 设计约定（与 src/utils/maimemoSync.ts、src/types/maimemo.ts 对应）：
 *   - 返回结构与前台 MaimemoStats 类型一致，前端直接用；
 *   - Token 只放 Worker Secret（env.MAIMEMO_API_TOKEN），不入仓库、不落日志；
 *   - D1 存两份数据：每日新学/复习（maimemo_daily）与最新快照（maimemo_meta），
 *     墨墨接口失败时用快照兜底，页面不会突然空掉；
 *   - D1 未绑定时自动降级为「无持久化」模式，逻辑与旧版一致，方便本地调试；
 *   - 失败时返回非 2xx，前端静默回退到构建期快照。
 *
 * 墨墨接口用法（对照官方 OpenAPI：https://open.maimemo.com/api_bundle.yaml）：
 *   - get_study_progress：今日进度与学习时长
 *   - get_today_items：今日学习单词，支持 is_new 过滤（比全量记录推算更准）
 *   - query_study_records：支持 tags 过滤 + as_count 精确计数（顽固词、待复习）
 */

const MAIMEMO_API_BASE = 'https://open.maimemo.com/open/';
/** 单次查询记录的最大条数（官方上限 1000，且没有 offset，只能按时间窗分页） */
const RECORDS_LIMIT = 1000;
/** 边缘缓存时长（秒） */
const CACHE_TTL_SECONDS = 600;
/** 上游请求超时（毫秒） */
const UPSTREAM_TIMEOUT_MS = 15_000;
/** D1 快照新鲜度：10 分钟内直接复用，避免频繁消耗墨墨额度 */
const SNAPSHOT_TTL_MS = 10 * 60 * 1000;
/** 历史全量回填间隔：24 小时最多一次（分页请求较多） */
const BACKFILL_INTERVAL_MS = 24 * 60 * 60 * 1000;
/** 北京时区相对 UTC 的偏移（毫秒） */
const BEIJING_OFFSET_MS = 8 * 60 * 60 * 1000;
/** 全量回填的时间窗：最近 5 年到未来 2 年（next_study_date 可能排到未来） */
const BACKFILL_START_DAYS = 5 * 365;
const BACKFILL_END_DAYS = 2 * 365;
/** 日常刷新只拉最近 30 天记录，用于最近学习单词与今日新学兜底 */
const RECENT_WINDOW_DAYS = 30;
/** 时间窗二分最大深度，避免请求数失控 */
const MAX_SPLIT_DEPTH = 3;

/** 允许携带 Origin 头访问的来源；无 Origin（curl/服务端）直接放行 */
const ALLOWED_ORIGINS = new Set([
  'https://blog.xinchengp.cn',
  'http://localhost:7120',
  'http://127.0.0.1:7120',
]);

class UpstreamError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  });
}

function withCors(request, response) {
  const origin = request.headers.get('Origin');
  if (!origin) return response;

  const headers = new Headers(response.headers);
  if (ALLOWED_ORIGINS.has(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }
  return new Response(response.body, { status: response.status, headers });
}

/** 当前北京日期 YYYY-MM-DD（Worker 运行在 UTC） */
function beijingDate(ms = Date.now()) {
  return new Date(ms + BEIJING_OFFSET_MS).toISOString().slice(0, 10);
}

/** 北京日期加减天数，返回 YYYY-MM-DD */
function shiftDays(date, days) {
  return beijingDate(Date.parse(`${date}T00:00:00+08:00`) + days * 86_400_000);
}

/** 某天 00:00:00（北京时间）的 ISO 字符串，用于 next_study_date 筛选 */
function dayStartIso(date) {
  return `${date}T00:00:00+08:00`;
}

/** 某天 23:59:59（北京时间）的 ISO 字符串 */
function dayEndIso(date) {
  return `${date}T23:59:59+08:00`;
}

/** 取墨墨日期字段对应的学习日 YYYY-MM-DD（字符串前 10 位即北京日期，见 README 口径说明） */
function dateOf(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : null;
}

/**
 * 判断记录是否带某个标签
 *
 * 官方 OpenAPI 把 StudyRecord.tags 标注为 string（enum STICKING / WELL_FAMILIAR），
 * 但实际接口返回的是字符串数组。这里两种形态都兼容，避免接口纠正类型后顽固词静默归零。
 */
function hasRecordTag(record, tag) {
  const tags = record.tags;
  if (Array.isArray(tags)) return tags.includes(tag);
  return tags === tag;
}

/**
 * 调用墨墨开放 API
 * @param {string} path 接口路径（相对 /open/）
 * @param {string} token API Token
 * @param {object} body 请求体
 */
async function postMaimemo(path, token, body) {
  let response;
  try {
    response = await fetch(new URL(path, MAIMEMO_API_BASE), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    throw new UpstreamError(504, 'upstream_timeout', `墨墨接口请求失败：${error instanceof Error ? error.message : error}`);
  }

  if (!response.ok) {
    if (response.status === 401) {
      throw new UpstreamError(502, 'upstream_auth', '墨墨 Token 无效或已过期');
    }
    if (response.status === 429) {
      throw new UpstreamError(502, 'upstream_rate_limited', '墨墨接口触发频控，请稍后重试');
    }
    throw new UpstreamError(502, 'upstream_error', `墨墨接口返回 ${response.status}`);
  }

  const data = await response.json();

  // 失败信封：HTTP 200 + { success: false, errors: [...] }
  if (data && data.success === false) {
    const first = Array.isArray(data.errors) ? data.errors[0] : null;
    throw new UpstreamError(
      502,
      'upstream_api',
      `${first?.code || 'api_error'}: ${first?.msg || '墨墨接口返回失败'}`
    );
  }

  // 墨墨开放 API 把业务数据包在 data 字段里（官方 CLI 内部会拆包）
  return data && data.data !== undefined ? data.data : data;
}

/**
 * 按 next_study_date 时间窗拉取记录
 *
 * 墨墨的 query_study_records 只有 limit（上限 1000）没有 offset，
 * 因此超过 1000 条的时间窗要二分递归，直到每个子窗口都能一次取完。
 *
 * @param {string} token
 * @param {string} startIso 窗口起点（含）
 * @param {string} endIso 窗口终点（含）
 * @param {number} depth 当前递归深度
 * @returns {Promise<object[]>} 记录数组
 */
async function queryRecordsWindow(token, startIso, endIso, depth = 0) {
  const filter = { next_study_date: { start: startIso, end: endIso } };

  // 先查数量，避免无谓地拉全量
  const countRes = await postMaimemo('api/v1/memo/study/query_study_records', token, {
    ...filter,
    as_count: true,
    limit: 1,
  });
  const count = Number(countRes.count) || 0;
  if (count === 0) return [];

  // 数量在单页上限内，或已达最大递归深度：直接取一页（超限时只能接受截断）
  if (count <= RECORDS_LIMIT || depth >= MAX_SPLIT_DEPTH) {
    const res = await postMaimemo('api/v1/memo/study/query_study_records', token, {
      ...filter,
      as_count: false,
      limit: RECORDS_LIMIT,
    });
    return Array.isArray(res.records) ? res.records : [];
  }

  // 窗口太大：对半切开分别拉取
  const midIso = new Date((Date.parse(startIso) + Date.parse(endIso)) / 2).toISOString();
  const left = await queryRecordsWindow(token, startIso, midIso, depth + 1);
  const right = await queryRecordsWindow(token, midIso, endIso, depth + 1);
  return left.concat(right);
}

/** 记录聚合累加器 */
function createAggregate() {
  return {
    /** 每天新学单词数 */
    dailyNewWords: {},
    /** 每天复习单词数 */
    dailyReviews: {},
    /** 真正作答过的词数（排除仅加入计划、尚未学习的词） */
    studiedCount: 0,
    /** 最近学习的词（排序后取前 5） */
    recentCandidates: [],
    /** 今日新学（记录口径，接口不可用时兜底） */
    todayNewWords: 0,
    /** 待复习（记录口径，接口不可用时兜底） */
    dueReviews: 0,
    /** 顽固词（记录口径，接口不可用时兜底） */
    stickingWords: 0,
  };
}

/**
 * 把一批记录累加进聚合结果
 *
 * 关键：未开始学的新词也会带上 first/last_study_date（预置为计划日零点），
 * 唯一可靠的区分依据是 last_response —— 未学过的词固定为 STUDY_RESPONSE_UNSPECIFIED。
 * 只有真正作答过的词才计入「新学 / 最近学习 / 累计已背」。
 *
 * @param {object[]} records 学习记录
 * @param {ReturnType<typeof createAggregate>} acc 累加器
 * @param {string} todayDate 北京日期
 */
function addRecords(records, acc, todayDate) {
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

/** 模块级标记：同一 Worker 实例内只初始化一次表结构 */
let schemaReady = false;

/**
 * 确保 D1 表存在
 *
 * 运行时建表是为了「部署完即可用」，同时 schema.sql 也保留一份，
 * 方便在 Cloudflare 控制台或 wrangler d1 execute 手动初始化。
 */
async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(
      `CREATE TABLE IF NOT EXISTS maimemo_daily (
         date TEXT PRIMARY KEY,
         new_words INTEGER NOT NULL DEFAULT 0,
         reviews INTEGER NOT NULL DEFAULT 0,
         updated_at TEXT NOT NULL
       )`
    ),
    db.prepare(
      `CREATE TABLE IF NOT EXISTS maimemo_meta (
         id INTEGER PRIMARY KEY CHECK (id = 1),
         payload TEXT NOT NULL,
         updated_at TEXT NOT NULL,
         last_backfill_at TEXT
       )`
    ),
  ]);
  schemaReady = true;
}

/** 读取 D1 快照 */
async function readMeta(db) {
  const row = await db
    .prepare('SELECT payload, updated_at, last_backfill_at FROM maimemo_meta WHERE id = 1')
    .first();
  return row || null;
}

/**
 * 写入每日统计
 *
 * 用 MAX(旧值, 新值) 更新：首次学习日期、当天复习数都只会因数据补全而增加，
 * 不会因为某次只拉到了部分记录而把历史数字覆盖小。
 */
async function writeDailyRows(db, daily, updatedAt) {
  const entries = Object.entries(daily);
  // 分块写入，避免单次 batch 语句过多
  for (let i = 0; i < entries.length; i += 50) {
    const chunk = entries.slice(i, i + 50);
    await db.batch(
      chunk.map(([date, item]) =>
        db
          .prepare(
            `INSERT INTO maimemo_daily (date, new_words, reviews, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(date) DO UPDATE SET
               new_words = MAX(maimemo_daily.new_words, excluded.new_words),
               reviews = MAX(maimemo_daily.reviews, excluded.reviews),
               updated_at = excluded.updated_at`
          )
          .bind(date, item.newWords || 0, item.reviews || 0, updatedAt)
      )
    );
  }
}

/** 读取 D1 中的全部每日统计 */
async function readDailyRows(db) {
  const { results } = await db
    .prepare('SELECT date, new_words, reviews FROM maimemo_daily ORDER BY date')
    .all();
  const dailyNewWords = {};
  const dailyReviews = {};
  (results || []).forEach(row => {
    if (row.new_words > 0) dailyNewWords[row.date] = row.new_words;
    if (row.reviews > 0) dailyReviews[row.date] = row.reviews;
  });
  return { dailyNewWords, dailyReviews };
}

/** 写入 D1 快照 */
async function writeMeta(db, stats, lastBackfillAt) {
  await db
    .prepare(
      `INSERT INTO maimemo_meta (id, payload, updated_at, last_backfill_at)
       VALUES (1, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         payload = excluded.payload,
         updated_at = excluded.updated_at,
         last_backfill_at = excluded.last_backfill_at`
    )
    .bind(JSON.stringify(stats), stats.updatedAt, lastBackfillAt || null)
    .run();
}

/**
 * 拉取并组装统计数据
 *
 * @param {string} token 墨墨 Token
 * @param {object} env Worker 环境变量（可能含 D1 绑定 DB）
 * @param {string} today 北京日期
 */
async function buildStats(token, env, today) {
  const db = env.DB || null;
  const errors = [];
  /** 统一容错：单个接口失败不影响其他部分 */
  const attempt = async (label, fn) => {
    try {
      return await fn();
    } catch (error) {
      errors.push(`${label}: ${error instanceof Error ? error.message : error}`);
      return null;
    }
  };

  // 1. 今日进度
  const progress = await attempt('progress', async () => {
    const res = await postMaimemo('api/v1/memo/study/get_study_progress', token, {});
    if (!res.progress) return null;
    return {
      date: today,
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
  const todayNewWordsFromApi = await attempt('today_items', async () => {
    const res = await postMaimemo('api/v1/memo/study/get_today_items', token, {
      is_new: true,
      limit: RECORDS_LIMIT,
    });
    const items = Array.isArray(res.today_items) ? res.today_items : [];
    return items.filter(item => item.is_finished === true).length;
  });

  // 3. 顽固词：tags 过滤 + as_count 精确计数
  const stickingFromApi = await attempt('sticking', async () => {
    const res = await postMaimemo('api/v1/memo/study/query_study_records', token, {
      tags: 'STICKING',
      as_count: true,
      limit: 1,
    });
    return Number(res.count) || 0;
  });

  // 4. 待复习：下次学习日期 <= 今天，用官方推荐的 as_count 精确计数
  const dueFromApi = await attempt('due', async () => {
    const res = await postMaimemo('api/v1/memo/study/query_study_records', token, {
      next_study_date: { end: dayEndIso(today) },
      as_count: true,
      limit: 1,
    });
    return Number(res.count) || 0;
  });

  // 5. 规划总量（含尚未学习的词），作为累计已背的兜底
  const totalRecords = await attempt('count', async () => {
    const res = await postMaimemo('api/v1/memo/study/query_study_records', token, {
      as_count: true,
      limit: 1,
    });
    return Number(res.count) || 0;
  });

  // 6. 读取 D1 快照，决定是否需要做历史全量回填
  let meta = null;
  if (db) {
    await ensureSchema(db);
    meta = await readMeta(db);
  }
  const now = Date.now();
  const needBackfill =
    !meta?.last_backfill_at || now - Date.parse(meta.last_backfill_at) > BACKFILL_INTERVAL_MS;

  // 7. 拉记录并聚合：回填日拉全量窗口，日常只拉最近 30 天
  const aggregate = createAggregate();
  let recordsOk = false;
  const records = await attempt(
    'records',
    async () =>
      needBackfill
        ? queryRecordsWindow(
            token,
            dayStartIso(shiftDays(today, -BACKFILL_START_DAYS)),
            dayEndIso(shiftDays(today, BACKFILL_END_DAYS)),
            0
          )
        : queryRecordsWindow(
            token,
            dayStartIso(shiftDays(today, -RECENT_WINDOW_DAYS)),
            dayEndIso(shiftDays(today, 7)),
            0
          )
  );
  if (records) {
    recordsOk = true;
    addRecords(records, aggregate, today);
  }

  // 8. 写入 D1，并用持久化数据补全历史（超出 1000 条上限的部分靠每天累积）
  let persisted = null;
  if (db) {
    const dailyForDb = {};
    Object.entries(aggregate.dailyNewWords).forEach(([date, count]) => {
      dailyForDb[date] = dailyForDb[date] || { newWords: 0, reviews: 0 };
      dailyForDb[date].newWords = count;
    });
    Object.entries(aggregate.dailyReviews).forEach(([date, count]) => {
      dailyForDb[date] = dailyForDb[date] || { newWords: 0, reviews: 0 };
      dailyForDb[date].reviews = count;
    });
    if (Object.keys(dailyForDb).length > 0) {
      await writeDailyRows(db, dailyForDb, new Date(now).toISOString());
    }
    persisted = await readDailyRows(db);
  }

  // 9. 最近学习的 5 个单词（按最近学习时间倒序）
  const recentWords = aggregate.recentCandidates
    .sort((a, b) => b.time - a.time)
    .slice(0, 5)
    .map(({ spelling, lastStudyDate }) => ({ spelling, lastStudyDate }));

  // 10. 组装最终结果
  // 快照可能因手工改动或早期版本写入损坏，解析失败就当作没有旧数据
  let previous = null;
  if (meta?.payload) {
    try {
      previous = JSON.parse(meta.payload);
    } catch {
      previous = null;
    }
  }

  // 累计已背：回填日以「真正作答题数」为准；日常刷新沿用上次快照，避免只拉 30 天导致数字变小
  let totalWords = 0;
  if (needBackfill && recordsOk && aggregate.studiedCount > 0) {
    totalWords = aggregate.studiedCount;
  } else if (previous && typeof previous.totalWords === 'number') {
    totalWords = previous.totalWords;
  }
  if (!totalWords) {
    totalWords = totalRecords || 0;
  }

  const dailyNewWords = persisted ? persisted.dailyNewWords : aggregate.dailyNewWords;
  const dailyReviews = persisted ? persisted.dailyReviews : aggregate.dailyReviews;

  const stats = {
    updatedAt: new Date(now).toISOString(),
    totalWords,
    today: progress || previous?.today || null,
    dailyNewWords,
    todayNewWords:
      todayNewWordsFromApi !== null ? todayNewWordsFromApi : aggregate.todayNewWords,
    dueReviews: dueFromApi !== null ? dueFromApi : aggregate.dueReviews,
    stickingWords: stickingFromApi !== null ? stickingFromApi : aggregate.stickingWords,
    recentWords: recentWords.length > 0 ? recentWords : previous?.recentWords || [],
    dailyReviews,
  };

  // 11. 写快照；回填成功才更新 last_backfill_at，失败时下一轮还会重试
  if (db) {
    const nextBackfillAt = needBackfill && recordsOk ? stats.updatedAt : meta?.last_backfill_at || null;
    await writeMeta(db, stats, nextBackfillAt);
  }

  // 全部接口失败且 D1 有旧快照时，直接返回旧数据（标记 stale，前端可忽略该字段）
  const allFailed =
    !progress &&
    todayNewWordsFromApi === null &&
    stickingFromApi === null &&
    dueFromApi === null &&
    !recordsOk;
  if (allFailed && previous) {
    return { stats: previous, stale: true, errors };
  }

  return { stats, stale: false, errors };
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // 只提供数据接口，其他路径 404
      if (url.pathname !== '/api/maimemo/stats') {
        return withCors(request, jsonResponse({ error: 'not_found' }, 404));
      }
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        return withCors(request, jsonResponse({ error: 'method_not_allowed' }, 405));
      }

      const token = env.MAIMEMO_API_TOKEN;
      if (!token) {
        return withCors(
          request,
          jsonResponse({ error: 'not_configured', message: '未配置 MAIMEMO_API_TOKEN，请执行 wrangler secret put' }, 503)
        );
      }

      // 边缘缓存：10 分钟内复用，避免每次访问都请求墨墨接口
      // key 带版本号，接口返回结构变化时升级即可让旧缓存自然失效
      const cache = typeof caches !== 'undefined' ? caches.default : null;
      const cacheKey = new Request('https://cache.invalid/maimemo-stats-v8');
      if (cache) {
        const cached = await cache.match(cacheKey);
        if (cached) {
          return withCors(
            request,
            new Response(cached.body, {
              status: 200,
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
              },
            })
          );
        }
      }

      // D1 快照足够新时直接返回，省掉墨墨接口调用
      const db = env.DB || null;
      if (db) {
        await ensureSchema(db);
        const meta = await readMeta(db);
        if (meta && Date.now() - Date.parse(meta.updated_at) < SNAPSHOT_TTL_MS) {
          try {
            const stats = JSON.parse(meta.payload);
            const fresh = new Response(JSON.stringify(stats), {
              headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
              },
            });
            if (cache) ctx.waitUntil(cache.put(cacheKey, fresh.clone()));
            return withCors(request, fresh);
          } catch {
            // 快照损坏：忽略并继续向上游拉取
            console.warn('[maimemo] D1 快照解析失败，改为重新拉取');
          }
        }
      }

      const { stats, stale, errors } = await buildStats(token, env, beijingDate());
      // 部分接口失败不阻断整体返回，仅记录日志便于排查
      if (errors.length > 0) {
        console.warn('[maimemo] 部分接口失败:', errors.join(' | '));
      }

      if (stale) {
        // 上游全挂：返回旧快照并短缓存，避免每个访客都重新打到墨墨接口
        return withCors(
          request,
          jsonResponse(
            { ...stats, stale: true },
            200,
            { 'Cache-Control': 'public, max-age=60' }
          )
        );
      }

      const cacheable = new Response(JSON.stringify(stats), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      });
      if (cache) ctx.waitUntil(cache.put(cacheKey, cacheable.clone()));

      return withCors(request, cacheable);
    } catch (error) {
      if (error instanceof UpstreamError) {
        return withCors(request, jsonResponse({ error: error.code, message: error.message }, error.status));
      }
      console.error('[maimemo] unhandled error:', error);
      return withCors(request, jsonResponse({ error: 'internal_error' }, 500));
    }
  },
};
