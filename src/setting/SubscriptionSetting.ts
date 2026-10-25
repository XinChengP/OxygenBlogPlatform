/**
 * 订阅渠道配置
 *
 * 两种订阅渠道的开关集中在这里：
 *   - Telegram 频道：新文章由 GitHub Actions（notify.yml）自动推送，
 *     这里只配置频道入口链接，供 /subscribe 页展示。
 *   - 邮件订阅：后端是 cloudflare/interactions 的 /subscribe 系列接口
 *     （Resend 双重确认）。构建期通过 NEXT_PUBLIC_NEWSLETTER_ENABLED 控制
 *     前端是否展示邮箱表单 —— 未配置 RESEND_API_KEY 时必须保持 false，
 *     否则用户提交会得到 503。
 *
 * 均为 NEXT_PUBLIC_ 变量，构建时内联，改动后需要重新构建部署。
 */

/** Telegram 频道入口（如 https://t.me/xxx），空串表示未配置 */
export const TELEGRAM_CHANNEL_URL = (
  process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || ''
).trim();

export const isTelegramConfigured = TELEGRAM_CHANNEL_URL !== '';

/** 邮件订阅是否开放（默认关闭，等 Resend 配置完成后再打开） */
export const isNewsletterEnabled =
  String(process.env.NEXT_PUBLIC_NEWSLETTER_ENABLED || 'false').toLowerCase() === 'true';
