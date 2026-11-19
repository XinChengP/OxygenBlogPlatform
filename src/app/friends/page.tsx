/**
 * 友情链接独立页面
 *
 * 布局说明（2026-11 改版）：
 * 1. 主结构从「等高三列卡片墙」改为「横向名片网格（桌面三列 / 平板两列 / 手机一列）」，
 *    页头仍用全站 PageHeader（主副标题样式与其他页面完全一致），
 *    差异只体现在正文版式，和 /links（等高三列卡片 + 域名底栏）不再撞脸
 * 2. 交换说明不再占三张带图标的小卡，退化为名录下方的文档式三栏：
 *    我的信息 / 申请信息 / 联系方式，用定义列表与编号排版承载
 * 3. 视觉令牌全部沿用全站：glass-card-strong、border-border、primary 天依蓝；
 *    去掉的是渐变扫光、径向光晕、旋转图标块、大引号与星星分隔线等模板化装饰
 */
'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import PageHeader from '@/components/ui/PageHeader';
import FriendsLink from '@/components/FriendsLink';

/** 本站友链信息：申请者可直接复制 */
const MY_FRIEND_INFO = {
  name: '心想事成 的 Blog',
  url: 'https://blog.xinchengp.cn',
  description: '一个记录日常的小窝',
  avatar: 'https://avatars.githubusercontent.com/u/107662142?v=4'
};

/** 申请时需提供的信息（沿用原页面文案，只改变呈现方式） */
const APPLY_ITEMS = ['网站名称和描述', '网站链接', '头像链接（可选）'];

/** 联系入口：邮箱走 mailto，留言板为站内页面 */
const CONTACT_ITEMS = [
  { label: '邮箱', value: 'blog@xinchengp.cn', href: 'mailto:blog@xinchengp.cn', external: false },
  {
    label: '留言板',
    value: 'blog.xinchengp.cn/guestbook',
    href: 'https://blog.xinchengp.cn/guestbook',
    external: true
  }
];

/**
 * 小节标题
 * 序号是排版语言（与名录里的 01/02 呼应），不用图标色块做标题前缀
 */
function SectionLabel({ index, children }: { index: string; children: React.ReactNode }) {
  return (
    <h3 className="mb-3 flex items-baseline gap-2 text-sm font-semibold text-foreground">
      <span className="font-mono text-[11px] tabular-nums text-primary/80">{index}</span>
      {children}
    </h3>
  );
}

/**
 * 交换友链说明
 * 三个信息块并列展示，靠间距与编号区分，不使用卡片边框、渐变图标与阴影
 */
function ExchangeNotes() {
  return (
    <div>
      {/* 区块标题：与名录页眉同一套小字语言 */}
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">exchange</p>
          <h2 className="mt-1.5 text-lg font-bold text-foreground">交换友链</h2>
        </div>
        <p className="text-xs text-muted-foreground">信息齐全的话，我看到就会加上</p>
      </div>

      <div className="grid gap-x-10 gap-y-8 pt-6 md:grid-cols-3">
        {/* 01 我的信息 */}
        <div>
          <SectionLabel index="01">我的信息</SectionLabel>
          <dl className="space-y-2 text-sm">
            <div className="flex items-baseline gap-3">
              <dt className="w-14 shrink-0 text-muted-foreground">名称</dt>
              <dd className="flex min-w-0 items-center gap-2 text-foreground">
                {/* 头像缩成 24px 的方形小图，贴着名称当注脚，不做独立展示块 */}
                <img
                  src={MY_FRIEND_INFO.avatar}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 shrink-0 rounded-md border border-border object-cover"
                />
                <span className="truncate">{MY_FRIEND_INFO.name}</span>
              </dd>
            </div>
            <div className="flex items-baseline gap-3">
              <dt className="w-14 shrink-0 text-muted-foreground">地址</dt>
              <dd className="min-w-0 break-all">
                <a
                  href={MY_FRIEND_INFO.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {MY_FRIEND_INFO.url}
                </a>
              </dd>
            </div>
            <div className="flex items-baseline gap-3">
              <dt className="w-14 shrink-0 text-muted-foreground">描述</dt>
              <dd className="text-muted-foreground">{MY_FRIEND_INFO.description}</dd>
            </div>
            <div className="flex items-baseline gap-3">
              <dt className="w-14 shrink-0 text-muted-foreground">头像</dt>
              <dd className="min-w-0 break-all">
                <a
                  href={MY_FRIEND_INFO.avatar}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {MY_FRIEND_INFO.avatar}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        {/* 02 申请信息 */}
        <div>
          <SectionLabel index="02">申请信息</SectionLabel>
          <ol className="space-y-2 text-sm">
            {APPLY_ITEMS.map((item, i) => (
              <li key={item} className="flex items-baseline gap-3">
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground/50">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-muted-foreground">{item}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* 03 联系方式 */}
        <div>
          <SectionLabel index="03">联系方式</SectionLabel>
          <dl className="space-y-2 text-sm">
            {CONTACT_ITEMS.map((item) => (
              <div key={item.label} className="flex items-baseline gap-3">
                <dt className="w-14 shrink-0 text-muted-foreground">{item.label}</dt>
                <dd className="min-w-0">
                  {/* 链接用下划线表达可点，悬停时下划线与图标一起转天依蓝 */}
                  <a
                    href={item.href}
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="group inline-flex items-baseline gap-1.5 text-foreground transition-colors hover:text-primary"
                  >
                    <span className="truncate border-b border-border transition-colors group-hover:border-primary">
                      {item.value}
                    </span>
                    <ArrowUpRight
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-primary"
                    />
                  </a>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

/**
 * 友链页面
 */
export default function FriendsPage() {
  const { containerStyle } = useBackgroundStyle('friends');
  const [mounted, setMounted] = useState(false);

  // 挂载后才渲染正文，避免客户端首帧与静态 HTML 出现差异
  useEffect(() => {
    setMounted(true);
  }, []);

  // 骨架：保留页头位置的大标题占位，下方与名录面板同高，切换时不跳动
  if (!mounted) {
    return (
      <div className={containerStyle.className} style={containerStyle.style}>
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-6">
            {/* 页头占位走居中块，与 PageHeader 的实际排布一致 */}
            <div className="mx-auto h-10 w-52 rounded bg-muted" />
            <div className="mx-auto h-5 w-64 rounded bg-muted" />
            <div className="h-64 rounded-xl bg-muted" />
            <div className="h-40 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={containerStyle.className} style={containerStyle.style}>
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {/* 页面主副标题：沿用全站统一的 PageHeader，尺寸、渐变与分隔线与其他页面一致 */}
        <PageHeader
          title="友情链接"
          description="群伞在雨幕中盛开，哪朵伞下有你徘徊"
          size="lg"
          className="mb-12"
          gradientStyle="primary"
          showDivider
        />

        <motion.main
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-12"
        >
          {/* 名片夹：名片本身已是卡片，外层不再套面板，避免「卡片套卡片」 */}
          <section>
            <FriendsLink />
          </section>

          {/* 交换说明：空席位名片的锚点目标；
              scroll-mt 预留顶部固定导航高度，避免定位后标题被遮挡；
              整块套玻璃面板——说明区全是小字，直接压在背景插画上会看不清，
              也容易被右下角 Live2D 人物挡住 */}
          <section
            id="exchange"
            className="scroll-mt-24 rounded-xl border border-border/60 glass-card-strong p-5 sm:p-8"
          >
            <ExchangeNotes />

            {/* 引语收在面板底部：只留文字，去掉大引号与星星装饰线 */}
            <footer className="mt-8 border-t border-border/60 pt-6 text-center">
              <p className="text-sm italic text-foreground/70 sm:text-base">
                海内存知己，天涯若比邻
              </p>
              <p className="mt-1.5 text-[11px] text-muted-foreground/70">
                王勃《送杜少府之任蜀州》
              </p>
            </footer>
          </section>
        </motion.main>
      </div>
    </div>
  );
}
