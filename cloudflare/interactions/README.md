# 博客互动服务（blog-interactions）

Cloudflare Worker + D1，为博客提供三组能力：

| 能力 | 接口 | 说明 |
| --- | --- | --- |
| 浏览量 | `POST /view`、`GET /stats` | 按「路径 + 天 + 访客哈希」去重，不存原始 IP |
| 邮件订阅 | `POST /subscribe`、`GET /confirm`、`GET /unsubscribe`、`POST /notify` | Resend 双重确认，`sent_post` 幂等群发 |

## 接入方式

生产环境走**同源路由**：

```toml
[[routes]]
pattern = "blog.xinchengp.cn/api/interactions/*"
zone_name = "xinchengp.cn"
```

静态站点本身仍在 GitHub Pages 上，只有 `/api/interactions/*` 被 Worker 接管。
前端不需要 CORS、不需要往 `src/utils/cspSources.ts` 加域名。
前提：`blog.xinchengp.cn` 的 DNS 记录在 Cloudflare 上是**已代理**（橙色云）状态。

本地开发：博客 `next.config.ts` 已把 `/api/interactions/*` rewrite 到 `http://127.0.0.1:8787`，
配合本目录 `npm run dev` 即可联调，前端代码零改动。

## 首次部署

```bash
cd cloudflare/interactions
npm install

# 1. 创建 D1（区域选 apac，与 twikoo 同理：主区域决定延迟，创建后不可改）
npx wrangler d1 create blog-interactions --location apac

# 2. 把返回的 database_id 填进 wrangler.toml 的 [[d1_databases]]

# 3. 建表（本地 + 远程各一次）
npm run db:local
npm run db:remote

# 4. 配置 secrets
npx wrangler secret put VISITOR_SALT           # 随机长字符串，访客哈希的盐
npx wrangler secret put RESEND_API_KEY         # Resend API Key（邮件订阅用）
npx wrangler secret put NEWSLETTER_ADMIN_TOKEN # /notify 的鉴权 Bearer Token

# 5. 部署
npm run deploy
```

wrangler.toml 里还有两个 `[vars]` 可按需改：

- `PUBLIC_SITE_URL` — 确认/退订邮件跳转链接的站点前缀
- `RESEND_FROM` — 发件人，需先在 Resend 控制台完成 `xinchengp.cn` 域名验证（添加 SPF/DKIM 记录）

## 邮件订阅上线清单

1. Resend 控制台添加域名 `xinchengp.cn`，按提示在 Cloudflare DNS 加记录并等待验证通过。
2. 创建 API Key，`wrangler secret put RESEND_API_KEY`。
3. 博客构建环境设置 `NEXT_PUBLIC_NEWSLETTER_ENABLED=true`（`.env` / `deploy.yml`），
   `/subscribe` 页面才会显示邮箱表单。
4. GitHub Actions（`notify.yml`）配置 secrets：
   - `NEWSLETTER_API_URL` = `https://blog.xinchengp.cn/api/interactions`
   - `NEWSLETTER_ADMIN_TOKEN` = 与 Worker secret 相同的值

未配置时 `/subscribe` 仍展示 RSS 与 Telegram 入口，只是隐藏邮箱表单。

## 本地验证

```bash
npm run dev          # wrangler dev，http://127.0.0.1:8787

# 健康检查
curl http://127.0.0.1:8787/api/interactions/health

# 浏览量：同一终端当天重复调用，counted 只在第一次为 true
curl -X POST http://127.0.0.1:8787/api/interactions/view \
  -H 'Content-Type: application/json' -d '{"path":"/blogs/test/"}'

# 统计
curl 'http://127.0.0.1:8787/api/interactions/stats?path=/blogs/test/'
curl 'http://127.0.0.1:8787/api/interactions/stats?paths=/blogs/test/,/blogs/own-Email-address/'

# 邮件（需 .dev.vars 里配置 RESEND_API_KEY）
curl -X POST http://127.0.0.1:8787/api/interactions/subscribe \
  -H 'Content-Type: application/json' -d '{"email":"me@example.com","website":""}'
```

本地 secret 放在 `.dev.vars`（已 gitignore）：

```ini
VISITOR_SALT=dev-insecure-salt
RESEND_API_KEY=re_xxx
NEWSLETTER_ADMIN_TOKEN=dev-token
```

## 数据与隐私

- 不存原始 IP：访客身份是 `SHA-256(IP + UA + VISITOR_SALT)`，盐在 secret 里。
- 浏览去重明细 `page_view` 只保留 90 天，Worker 每日 04:00 UTC cron 自动清理。
- 订阅者只存邮箱、确认 token 与状态；退订保留行仅为防止被他人重复订阅骚扰。
- 群发邮件带 `List-Unsubscribe` 头与正文退订链接，按 `slug` 幂等，绝不重复发送同一篇。

## 与博客前端的契约

- 路径 key 与 Twikoo 评论一致：`/blogs/<slug>/`（带尾斜杠），见 `src/setting/CommentSetting.ts`。
- 前端统一封装在 `src/utils/interactionsApi.ts`，所有请求 5 秒超时、失败静默。
- 博客构建环境变量：`NEXT_PUBLIC_NEWSLETTER_ENABLED`、`NEXT_PUBLIC_TELEGRAM_CHANNEL_URL`。
