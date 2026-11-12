# 墨墨背单词数据接口（Cloudflare Worker）

给前台 `/study` 页面的「英语背单词」卡片提供数据：

- `GET /api/maimemo/stats` — 返回累计词数、今日进度、每日新学/复习数、待复习、顽固词等
- 请求时现拉墨墨开放 API（open.maimemo.com），启用 D1 后结果会持久化
- 边缘缓存 10 分钟 + D1 快照 10 分钟内直接复用，避免频繁消耗墨墨额度
- 墨墨接口全部失败时用 D1 快照兜底返回，页面不会突然空掉（未启用 D1 时退回旧行为）
- Token 只存 Worker Secret，不入仓库

## 为什么需要 D1

墨墨的 `query_study_records` 单次最多返回 1000 条，且**没有 offset 参数**，只能按
`next_study_date` 时间窗分页。用户词量超过 1000 后，单次请求会截断，历史统计就会失真。

Worker 的处理方式：

1. 每天最多做一次「历史全量回填」：按时间窗二分递归拉取全部记录（见 `queryRecordsWindow`）；
2. 把每天的新学/复习数写入 D1 的 `maimemo_daily`，写入用 `MAX(旧值, 新值)`，
   只会因数据补全而变大，不会因为某次只拉到部分记录而变小；
3. 返回给前端的 `dailyNewWords` / `dailyReviews` 直接从 D1 读取，
   已经采集过的历史不会丢；
4. 最新一次结果额外写一份 JSON 快照到 `maimemo_meta`，用于上游故障兜底。

日常刷新只拉最近 30 天记录（用于「最近学习单词」等），只有距离上次回填超过 24 小时
才会走一次全量分页，因此不会频繁触发墨墨的频控。

## 部署（一次性）

前置：`blog.xinchengp.cn` 在 Cloudflare 上已开启代理（橙色云），与
`cloudflare/interactions` 相同。

```powershell
cd cloudflare/maimemo-stats
npm install

# 1. 创建 D1（区域必须选 apac，创建后不可更改）
npx wrangler d1 create blog-maimemo --location apac

# 2. 把上一步输出的 database_id 填进 wrangler.toml，并取消 [[d1_databases]] 整段注释
#    （不启用 D1 也能部署，只是没有持久化与快照兜底）

# 3. 写入墨墨 Token（App：我的 → 更多设置 → 实验功能 → 开放 API）
#    Windows 上也可以直接双击本目录的 set-secret.bat，按提示粘贴 Token
npx wrangler secret put MAIMEMO_API_TOKEN

# 4. 部署
npx wrangler deploy
```

表结构不需要手动建：Worker 首次请求会自动执行 `CREATE TABLE IF NOT EXISTS`。
想手动初始化也可以：

```powershell
npx wrangler d1 execute blog-maimemo --remote --file=./schema.sql
```

部署完成后访问 `https://blog.xinchengp.cn/api/maimemo/stats`，
能看到 JSON 数据即成功。前台页面会在加载时自动读取，不需要重新构建或推送。

## 本地调试

```powershell
cd cloudflare/maimemo-stats
"MAIMEMO_API_TOKEN=你的Token" | Out-File -Encoding utf8 .dev.vars   # 已被 .gitignore 忽略
npm run dev
# 访问 http://localhost:8788/api/maimemo/stats
```

本地 `wrangler dev` 默认使用本地模拟的 D1，数据落在 `.wrangler/state` 下。
如果 wrangler.toml 里的 `[[d1_databases]]` 仍处于注释状态，Worker 会自动降级为
无持久化模式，接口仍能正常返回数据。

## 更新 Token

墨墨 App 里重新生成 Token 后，再执行一次：

```powershell
npx wrangler secret put MAIMEMO_API_TOKEN
```

## 返回结构

与 `src/types/maimemo.ts` 的 `MaimemoStats` 一致：

```json
{
  "updatedAt": "2026-10-27T15:50:00.000Z",
  "totalWords": 153,
  "today": { "date": "2026-10-27", "finished": 0, "total": 50, "studyTimeSeconds": 2383 },
  "dailyNewWords": { "2026-10-01": 32, "2026-10-02": 28 },
  "dailyReviews": { "2026-10-02": 15 },
  "todayNewWords": 34,
  "dueReviews": 118,
  "stickingWords": 20,
  "recentWords": [{ "spelling": "extra", "lastStudyDate": "2026-10-27" }]
}
```

字段说明：

- `today.finished / total`：今日计划完成数 / 计划总数
- `today.studyTimeSeconds`：今日学习秒数（接口返回毫秒；实测今天未学习时为 0，
  可确认是当日时长而非账号累计，前台暂未展示）
- `dailyNewWords`：每天新学单词数（按单词记录的首次学习日期聚合，日期为北京时间；
  有 D1 时来自持久化表，不重不漏）
- `dailyReviews`：每天复习单词数（当天学过且不是首次学习）
- `todayNewWords`：今日新学词数，来自 `get_today_items`（`is_new: true` 且已完成），
  接口不可用时回退到记录聚合
- `dueReviews`：待复习词数，用 `query_study_records` 的 `as_count` + `next_study_date`
  精确计数（不再是「最近 1000 条估算」）
- `stickingWords`：顽固词数量，用 `tags: "STICKING"` + `as_count` 精确计数
- `recentWords`：最近学习的 5 个单词

失败时返回非 2xx（`not_configured` / `upstream_auth` / `upstream_timeout` /
`upstream_rate_limited` 等），前端静默回退到构建期快照
（`src/data/maimemo-stats.json`，若存在）。若只是部分接口失败，其余数据照常返回。

## D1 表结构

见 [schema.sql](./schema.sql)：

- `maimemo_daily(date, new_words, reviews, updated_at)`：每天一行
- `maimemo_meta(id=1, payload, updated_at, last_backfill_at)`：最新快照 + 回填时间

## 限流与额度

单次刷新最多约 25 个上游请求（回填日），日常约 7~9 个；叠加 10 分钟边缘缓存与
10 分钟 D1 快照复用，正常访问量下远低于墨墨的频控（10 秒 20 次 / 60 秒 40 次 /
5 小时 2000 次）。
