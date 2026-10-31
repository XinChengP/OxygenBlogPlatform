/**
 * 墨墨背单词数据接口 Worker
 *
 * 职责：
 *   1. GET /api/maimemo/stats：返回累计词数、今日进度、每日新学单词数
 *   2. 请求时现拉墨墨开放 API（open.maimemo.com）并做边缘缓存（10 分钟）
 *
 * 设计约定（与 src/utils/maimemoSync.ts、src/types/maimemo.ts 对应）：
 *   - 返回结构与前台 MaimemoStats 类型一致，前端直接用；
 *   - Token 只放 Worker Secret（env.MAIMEMO_API_TOKEN），不入仓库、不落日志；
 *   - 不落库：无 KV / D1 / Cron，部署后零维护；
 *   - 失败时返回非 2xx，前端静默回退到构建期数据。
 */

const MAIMEMO_API_BASE = 'https://open.maimemo.com/open/';
const RECORDS_LIMIT = 1000;
/** 边缘缓存时长（秒）；同时作为浏览器端 max-age 参考 */
const CACHE_TTL_SECONDS = 600;
/** 上游请求超时（毫秒） */
const UPSTREAM_TIMEOUT_MS = 15_000;

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

/** 本地日期 YYYY-MM-DD（Worker 运行在 UTC，按北京时间偏移 +8 计算） */
function beijingDate() {
  return new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
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
 * 取墨墨日期字段对应的学习日 YYYY-MM-DD
 *
 * 直接取字符串前 10 位，不做 +8 小时折算。
 *
 * 依据（「今日待学列表」接口实测）：
 * - 今天尚未学习的记录里，78 个词的 first/last/next_study_date 同为一天，
 *   且今日进度 finished=0；若再 +8 小时，会把这条记录算成「今天已学」，
 *   与 finished=0 自相矛盾，因此日期字段本身就是学习日；
 * - 该字段不能用 add_date 反推：add_date 是词书加入日期，词书迁移时会晚于首次学习；
 * - 未开始学的新词也会预置 first/last_study_date（计划日），
 *   必须用 last_response 区分（未学 = STUDY_RESPONSE_UNSPECIFIED）。
 *
 * 注意：本实现必须与 src/utils/maimemoSync.ts 的 dateOf 保持一致，
 * 否则本地同步快照与 Worker 代理返回的日期会相差一天。
 */
function dateOf(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(value);
  return match ? match[1] : null;
}

/**
 * 拉取并聚合成前端需要的结构
 * @param {string} token
 */
async function fetchMaimemoStats(token) {
  // 记录首个上游错误，全部失败时优先把它抛出去（例如 401 比「无数据」更有指导意义）
  let firstError = null;
  const rememberError = error => {
    if (!firstError) firstError = error;
    console.warn('[maimemo] 上游请求失败:', error instanceof Error ? error.message : error);
  };

  // 记录原始响应，便于排查「接口成功但无数据」的情况（响应体不含 Token）
  const rawShapes = { progress: null, count: null, records: null };

  // 今日进度（失败时不阻断整体返回）
  let today = null;
  try {
    const progressRes = await postMaimemo('api/v1/memo/study/get_study_progress', token, {});
    rawShapes.progress = progressRes;
    if (progressRes.progress) {
      today = {
        date: beijingDate(),
        finished: Number(progressRes.progress.finished) || 0,
        total: Number(progressRes.progress.total) || 0,
        // 实测该字段是账号累计学习时长（毫秒），非当日；统一转成秒
        studyTimeSeconds: Math.round((Number(progressRes.progress.study_time) || 0) / 1000),
      };
    }
  } catch (error) {
    rememberError(error);
  }

  // 累计词数
  let totalWords = 0;
  try {
    const countRes = await postMaimemo('api/v1/memo/study/query_study_records', token, {
      voc_ids: [],
      spellings: [],
      as_count: true,
      limit: 1,
    });
    rawShapes.count = countRes;
    totalWords = Number(countRes.count) || 0;
  } catch (error) {
    rememberError(error);
  }

  // 每日新学单词数（按单词记录的首次学习日期聚合），同时统计今日新学/待复习/顽固词/最近单词
  const dailyNewWords = {};
  /** 每日复习量：当天学习但不是首次学习（首次学习日 < 最近学习日）的词数 */
  const dailyReviews = {};
  const todayBeijing = beijingDate();
  let todayNewWords = 0;
  let dueReviews = 0;
  let stickingWords = 0;
  const recentCandidates = [];

  try {
    const recordsRes = await postMaimemo('api/v1/memo/study/query_study_records', token, {
      voc_ids: [],
      spellings: [],
      as_count: false,
      limit: RECORDS_LIMIT,
    });
    rawShapes.records = recordsRes;
    const records = Array.isArray(recordsRes.records) ? recordsRes.records : [];
    let studiedCount = 0;
    records.forEach(record => {
      /*
        关键：未开始学的新词也会带上 first/last_study_date（预置为计划日的零点），
        唯一可靠的区分依据是 last_response —— 未学过的词固定为 STUDY_RESPONSE_UNSPECIFIED。
        只有真正作答过的词才计入「新学 / 最近学习 / 累计已背」。
      */
      const studied =
        Boolean(record.last_response) && record.last_response !== 'STUDY_RESPONSE_UNSPECIFIED';
      if (studied) studiedCount += 1;

      if (studied && record.first_study_date) {
        const firstDate = dateOf(record.first_study_date);
        if (firstDate) {
          dailyNewWords[firstDate] = (dailyNewWords[firstDate] || 0) + 1;
          if (firstDate === todayBeijing) todayNewWords += 1;
        }
      }

      if (record.next_study_date) {
        const nextDate = dateOf(record.next_study_date);
        if (nextDate && nextDate <= todayBeijing) dueReviews += 1;
      }

      if (Array.isArray(record.tags) && record.tags.includes('STICKING')) {
        stickingWords += 1;
      }

      if (studied && record.last_study_date && record.voc_spelling) {
        const lastDate = dateOf(record.last_study_date);
        const firstDate = record.first_study_date ? dateOf(record.first_study_date) : null;
        if (lastDate) {
          // 最近学习日不等于首次学习日 → 当天是复习
          if (firstDate && firstDate !== lastDate) {
            dailyReviews[lastDate] = (dailyReviews[lastDate] || 0) + 1;
          }
          recentCandidates.push({
            spelling: record.voc_spelling,
            lastStudyDate: lastDate,
            time: new Date(record.last_study_date).getTime() || 0,
          });
        }
      }
    });

    // 累计已背 = 真正学过的词数（排除仅加入计划、尚未学习的词）
    if (studiedCount > 0) {
      totalWords = studiedCount;
    } else if (!totalWords) {
      totalWords = records.length;
    }
  } catch (error) {
    rememberError(error);
  }

  // 最近学习的 5 个单词（按最近学习时间倒序）
  const recentWords = recentCandidates
    .sort((a, b) => b.time - a.time)
    .slice(0, 5)
    .map(({ spelling, lastStudyDate }) => ({ spelling, lastStudyDate }));

  if (!today && totalWords === 0 && Object.keys(dailyNewWords).length === 0) {
    // 排查线索只写日志，不放进公开响应
    console.warn('[maimemo] 接口成功但无数据:', JSON.stringify(rawShapes).slice(0, 800));
    throw firstError instanceof UpstreamError
      ? firstError
      : new UpstreamError(502, 'no_data', '墨墨接口未返回任何数据');
  }

  return {
    updatedAt: new Date().toISOString(),
    totalWords,
    today,
    dailyNewWords,
    todayNewWords,
    dueReviews,
    stickingWords,
    recentWords,
    dailyReviews,
  };
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
      const cacheKey = new Request('https://cache.invalid/maimemo-stats-v7');
      if (cache) {
        const cached = await cache.match(cacheKey);
        if (cached) {
          return withCors(request, new Response(cached.body, {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
            },
          }));
        }
      }

      const stats = await fetchMaimemoStats(token, request.url);
      const cacheable = new Response(JSON.stringify(stats), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': `public, max-age=${CACHE_TTL_SECONDS}`,
        },
      });
      if (cache) {
        ctx.waitUntil(cache.put(cacheKey, cacheable.clone()));
      }

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
