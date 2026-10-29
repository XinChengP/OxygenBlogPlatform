-- 博客互动服务 D1 表结构
-- 执行方式：
--   本地：npm run db:local
--   线上：npm run db:remote

-- 每个路径的总浏览量（聚合一行的热数据）
CREATE TABLE IF NOT EXISTS page_total (
  path    TEXT PRIMARY KEY,
  views   INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL
);

-- 浏览去重明细：同一访客同一天对同一路径只计一次。
-- visitor 是 SHA-256(IP + UA + 盐) 的十六进制串，绝不存原始 IP。
-- 明细保留 90 天，由 Worker 的每日 cron 清理。
CREATE TABLE IF NOT EXISTS page_view (
  path    TEXT NOT NULL,
  day     TEXT NOT NULL,
  visitor TEXT NOT NULL,
  created INTEGER NOT NULL,
  PRIMARY KEY (path, day, visitor)
);

CREATE INDEX IF NOT EXISTS idx_page_view_created ON page_view (created);

-- 写接口的固定窗口限流桶（内存 isolate 会随冷启动重置，D1 版才是真限流）。
CREATE TABLE IF NOT EXISTS rate_limit (
  bucket  TEXT PRIMARY KEY,
  count   INTEGER NOT NULL,
  expires INTEGER NOT NULL
);

-- ===== 邮件订阅（双重确认） =====

-- 订阅者：只存邮箱、确认令牌和状态，不做任何画像。
-- unsubscribed 保留行是为了让「退订后重复提交」仍走确认流程，防误订阅。
CREATE TABLE IF NOT EXISTS subscriber (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  email        TEXT    NOT NULL UNIQUE,
  token        TEXT    NOT NULL UNIQUE,
  confirmed    INTEGER NOT NULL DEFAULT 0,
  unsubscribed INTEGER NOT NULL DEFAULT 0,
  created      INTEGER NOT NULL,
  confirmed_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_subscriber_confirmed ON subscriber (confirmed, unsubscribed);

-- 已群发文章的幂等记录：slug 已存在则跳过，避免同篇文章重复发信。
CREATE TABLE IF NOT EXISTS sent_post (
  slug    TEXT PRIMARY KEY,
  sent_at INTEGER NOT NULL
);

-- ===== 天依 AI 问答 =====

-- Vectorize 已索引向量 id 登记表：重置索引时按它 deleteByIds
-- （当前 Vectorize 绑定没有 deleteAll 方法），每次 upsert 后由 Worker 写入。
CREATE TABLE IF NOT EXISTS vector_ids (
  id TEXT PRIMARY KEY
);
