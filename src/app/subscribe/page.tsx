'use client';

/**
 * 订阅更新页
 *
 * 三种渠道的聚合入口：
 *   - RSS：链接到站内 /rss.xml
 *   - Telegram：NEXT_PUBLIC_TELEGRAM_CHANNEL_URL 配置的频道
 *   - 邮件：cloudflare/interactions 的 /subscribe 系列接口（双重确认）
 *
 * Worker 的 confirm / unsubscribe 会 302 回本页并带 ?status= 参数，
 * 这里据此展示对应状态提示。
 * 邮件表单仅在 NEXT_PUBLIC_NEWSLETTER_ENABLED=true 时展示；
 * 未开启时页面退化为 RSS + Telegram 的说明页。
 */

import { useEffect, useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Mail, Rss, Send, CheckCircle2, Info, AlertTriangle, Loader2, ShieldCheck } from 'lucide-react';

import PageHeader from '@/components/ui/PageHeader';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { INTERACTIONS_API_URL } from '@/setting/InteractionSetting';
import {
  TELEGRAM_CHANNEL_URL,
  isTelegramConfigured,
  isNewsletterEnabled,
} from '@/setting/SubscriptionSetting';

/** confirm/unsubscribe 302 回跳时携带的状态参数 */
type StatusParam = 'confirmed' | 'unsubscribed' | 'invalid' | null;

const STATUS_BANNERS: Record<
  Exclude<StatusParam, null>,
  { icon: typeof Info; className: string; text: string }
> = {
  confirmed: {
    icon: CheckCircle2,
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    text: '订阅确认成功！新文章发布时会第一时间通知你。',
  },
  unsubscribed: {
    icon: Info,
    className: 'border-border/50 bg-muted/60 text-muted-foreground',
    text: '已为你退订，之后不会再收到邮件通知。随时欢迎回来订阅～',
  },
  invalid: {
    icon: AlertTriangle,
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    text: '链接无效或已使用过。如需订阅请重新提交邮箱获取新的确认邮件。',
  },
};

export default function SubscribePage() {
  const { containerStyle } = useBackgroundStyle('home');

  const [statusParam, setStatusParam] = useState<StatusParam>(null);
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  // 读取回跳状态参数（仅客户端）
  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get('status');
    if (status === 'confirmed' || status === 'unsubscribed' || status === 'invalid') {
      setStatusParam(status);
    }
  }, []);

  const handleSubscribe = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const trimmed = email.trim();
    if (!trimmed) {
      setFeedback({ ok: false, text: '请填写邮箱地址' });
      return;
    }
    if (!agreed) {
      setFeedback({ ok: false, text: '请先确认同意仅用于接收更新通知' });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`${INTERACTIONS_API_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed, website: honeypot }),
        signal: AbortSignal.timeout(8000),
      });
      const data = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };

      if (response.ok) {
        setEmail('');
        setFeedback({
          ok: true,
          text: data.message || '确认邮件已发送，请查收（注意垃圾箱）',
        });
      } else if (response.status === 503) {
        setFeedback({ ok: false, text: '邮件订阅暂未开放，可以先使用 RSS 或 Telegram 订阅' });
      } else {
        setFeedback({
          ok: false,
          text:
            data.message ||
            (data.error === 'rate_limited'
              ? '提交太频繁了，请稍后再试'
              : data.error === 'invalid_email'
                ? '邮箱格式看起来不太对'
                : '提交失败，请稍后再试'),
        });
      }
    } catch {
      setFeedback({ ok: false, text: '网络异常，请稍后再试' });
    } finally {
      setSubmitting(false);
    }
  };

  const banner = statusParam ? STATUS_BANNERS[statusParam] : null;

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <PageHeader
          title="订阅更新"
          description="新文章发布时第一时间通知你，随时可以退订"
          size="md"
          className="mb-10"
        />

        {/* 回跳状态横幅 */}
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${banner.className}`}
            role="status"
          >
            <banner.icon className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>{banner.text}</span>
          </motion.div>
        )}

        <div className="space-y-4">
          {/* 邮件订阅 */}
          <section
            className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-6"
            aria-label="邮件订阅"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <Mail className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-foreground">邮件订阅</h2>
              <span className="text-xs text-muted-foreground">每篇新文章一封邮件</span>
            </div>

            {isNewsletterEnabled ? (
              <>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  提交后会先收到一封确认邮件，点击确认后才会正式订阅。
                </p>
                <form onSubmit={handleSubscribe} className="space-y-3" noValidate>
                  {/* 蜜罐字段：对人隐藏，爬虫填了会被服务端静默丢弃 */}
                  <input
                    type="text"
                    name="website"
                    value={honeypot}
                    onChange={(event) => setHoneypot(event.target.value)}
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden"
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label htmlFor="subscribe-email" className="sr-only">
                      邮箱地址
                    </label>
                    <input
                      id="subscribe-email"
                      type="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 rounded-xl border border-border/60 bg-background/70 px-4 py-2.5 text-sm text-foreground
                                 placeholder:text-muted-foreground/60
                                 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40"
                    />
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium
                                 text-primary-foreground transition-colors hover:bg-primary/90
                                 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Mail className="h-4 w-4" aria-hidden="true" />
                      )}
                      {submitting ? '提交中…' : '订阅'}
                    </button>
                  </div>

                  <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(event) => setAgreed(event.target.checked)}
                      className="mt-0.5 accent-[var(--primary)]"
                    />
                    <span>
                      我同意仅将此邮箱用于接收本站新文章通知（双重确认，随时可一键退订，不做其他用途）
                    </span>
                  </label>

                  {feedback && (
                    <p
                      className={`text-sm ${feedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}
                      role="status"
                    >
                      {feedback.text}
                    </p>
                  )}

                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground/80 pt-1">
                    <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    本站不记录原始 IP，退订链接一次性生效
                  </p>
                </form>
              </>
            ) : (
              <p className="text-sm text-muted-foreground leading-relaxed">
                邮件订阅正在筹备中，暂时可以先用 RSS 或 Telegram 订阅，开通后会在这里公布。
              </p>
            )}
          </section>

          {/* Telegram 频道 */}
          {isTelegramConfigured && (
            <a
              href={TELEGRAM_CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-6
                         hover:border-primary/40 transition-colors group"
              aria-label="打开 Telegram 频道"
            >
              <div className="flex items-center gap-2.5 mb-1">
                <Send className="w-5 h-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-semibold text-foreground">Telegram 频道</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                新文章自动推送到频道，无需注册邮箱。
                <span className="ml-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  前往频道 →
                </span>
              </p>
            </a>
          )}

          {/* RSS */}
          <a
            href="/rss.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 shadow-sm p-6
                       hover:border-primary/40 transition-colors group"
            aria-label="订阅 RSS 源"
          >
            <div className="flex items-center gap-2.5 mb-1">
              <Rss className="w-5 h-5 text-primary" aria-hidden="true" />
              <h2 className="text-lg font-semibold text-foreground">RSS 订阅</h2>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed break-all">
              把 https://blog.xinchengp.cn/rss.xml 添加到你的阅读器即可。
              <span className="ml-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                打开订阅源 →
              </span>
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
