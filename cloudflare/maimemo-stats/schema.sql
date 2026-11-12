-- 墨墨背单词数据接口的 D1 表结构
--
-- 用途：把每天的新学/复习词数持久化在 Worker 侧，
-- 这样即使墨墨 query_study_records 单次最多只能取 1000 条，
-- 已经采集过的历史数据也不会因为后来的请求截断而丢失。
--
-- 初始化方式（二选一）：
--   1. 直接部署：Worker 首次请求时会自动执行同样的 CREATE TABLE IF NOT EXISTS；
--   2. 手动初始化：
--      npx wrangler d1 execute blog-maimemo --remote --file=./schema.sql

-- 每日学习明细：一天一行
CREATE TABLE IF NOT EXISTS maimemo_daily (
  -- 北京日期 YYYY-MM-DD
  date TEXT PRIMARY KEY,
  -- 当天首次学习的单词数
  new_words INTEGER NOT NULL DEFAULT 0,
  -- 当天复习的单词数（当天学过且不是首次学习）
  reviews INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

-- 最新快照：只保留一行（id 固定为 1）
-- 墨墨接口全部失败时用它兜底返回，页面不会突然空掉
CREATE TABLE IF NOT EXISTS maimemo_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  -- MaimemoStats 的 JSON 序列化结果
  payload TEXT NOT NULL,
  -- 快照写入时间（ISO 字符串）
  updated_at TEXT NOT NULL,
  -- 上次历史全量回填时间；为空表示还没回填过，下次请求会做全量回填
  last_backfill_at TEXT
);
