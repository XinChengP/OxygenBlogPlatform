import type { Metadata } from 'next';

/**
 * 订阅页 SEO 元数据
 */
export const metadata: Metadata = {
  title: '订阅更新',
  description:
    '订阅心想事成的博客更新：RSS、邮件与 Telegram 频道，新文章第一时间送达。邮件订阅随时可一键退订。',
  keywords: ['订阅', 'RSS', '邮件订阅', 'Telegram', '博客更新'],
  openGraph: {
    title: '订阅更新 | 心想事成的个人博客',
    description: '通过 RSS、邮件或 Telegram 订阅博客新文章。',
    type: 'website',
  },
};

export default function SubscribeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
