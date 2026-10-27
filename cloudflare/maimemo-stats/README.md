# 墨墨背单词数据接口（Cloudflare Worker）

给前台 `/study` 页面的「英语背单词」卡片提供数据：

- `GET /api/maimemo/stats` — 返回累计词数、今日进度、近每日新学单词数
- 请求时现拉墨墨开放 API（open.maimemo.com），边缘缓存 10 分钟
- 无 KV / D1 / Cron，部署后零维护
- Token 只存 Worker Secret，不入仓库

## 部署（一次性）

前置：`blog.xinchengp.cn` 在 Cloudflare 上已开启代理（橙色云），与
`cloudflare/interactions` 相同。

```bash
cd cloudflare/maimemo-stats
npm install

# 写入墨墨 Token（App：我的 → 更多设置 → 实验功能 → 开放 API）
# Windows 上也可以直接双击本目录的 set-secret.bat，按提示粘贴 Token
npx wrangler secret put MAIMEMO_API_TOKEN

# 部署
npx wrangler deploy
```

部署完成后访问 `https://blog.xinchengp.cn/api/maimemo/stats`，
能看到 JSON 数据即成功。前台页面会在加载时自动读取，不需要重新构建或推送。

## 本地调试

```bash
cd cloudflare/maimemo-stats
echo "MAIMEMO_API_TOKEN=你的Token" > .dev.vars   # 已被 .gitignore 忽略
npm run dev
# 访问 http://localhost:8788/api/maimemo/stats
```

## 更新 Token

墨墨 App 里重新生成 Token 后，再执行一次：

```bash
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
  "todayNewWords": 34,
  "dueReviews": 118,
  "stickingWords": 20,
  "recentWords": [{ "spelling": "extra", "lastStudyDate": "2026-10-27" }]
}
```

字段说明：

- `today.finished / total`：今日计划完成数 / 计划总数；`studyTimeSeconds` 为今日学习秒数
- `dailyNewWords`：每天新学单词数（按单词记录的首次学习日期聚合，日期为北京时间）
- `todayNewWords`：今日新学词数
- `dueReviews`：下次复习日期已到的单词数（基于最近 1000 条记录估算）
- `stickingWords`：顽固词数量（记录 tags 含 `STICKING`）
- `recentWords`：最近学习的 5 个单词

失败时返回非 2xx（`not_configured` / `upstream_auth` / `upstream_timeout` 等），
前端静默回退到构建期快照（`src/data/maimemo-stats.json`，若存在）。

## 限流说明

数据来自缓存（10 分钟），正常访问量下墨墨接口每分钟最多被调用三四次，
远低于个人使用场景的合理范围。若未来访问量明显增长，可增加
KV 存储与 Cron 预取，当前规模没有必要。
