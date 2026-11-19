'use client';

import { Fragment, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Globe, Plus } from 'lucide-react';
import {
  friendsLinks,
  friendCategoryLabels,
  type FriendLink,
  type FriendLinkCategory
} from '@/setting/AboutSetting';
import { getAssetPath } from '@/utils/assetUtils';
import { isElectron } from '@/utils/isElectron';

/* ================================================================== */
/* 巡检数据结构（public/friends-status.json，由 scripts/check-friends.ts 生成） */
/* ================================================================== */

interface FriendStatusEntry {
  url: string;
  online: boolean;
  status: number | null;
  responseTimeMs: number | null;
}

interface FriendsStatusFile {
  checkedAt: string | null;
  friends: FriendStatusEntry[];
}

/** 巡检数据里的 url 统一带尾斜杠，这里做同口径归一化 */
function normalizeFriendUrl(url: string): string {
  return `${url.replace(/\/+$/, '')}/`;
}

/** 展示用域名：去掉协议与 www，保留路径（过长交给 CSS 截断） */
function getDisplayHost(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '') + parsed.pathname.replace(/\/$/, '');
  } catch {
    // 配置里的地址偶尔可能不是合法 URL，退回原文展示，避免整页渲染中断
    return url;
  }
}

/* ================================================================== */
/* 卡片内小组件                                                        */
/* ================================================================== */

/**
 * 巡检读数
 * 用「小圆点 + 等宽小字」表达在线状态，不做成彩色胶囊角标：
 * 名片本身信息已经很多，胶囊会再抢一层注意力
 */
function StatusReadout({ status }: { status: FriendStatusEntry }) {
  const label = status.online
    ? `在线${status.responseTimeMs !== null ? ` · ${status.responseTimeMs}ms` : ''}`
    : '离线';
  const tone = status.online
    ? 'text-emerald-600 dark:text-emerald-400'
    : 'text-red-500 dark:text-red-400';
  const dot = status.online ? 'bg-emerald-500' : 'bg-red-400';

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 font-mono text-[10px] tabular-nums ${tone}`}
      title={label}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * 友链名片
 *
 * 版式来自纸质名片：左侧方形头像当「证件照」，右侧姓名，姓名下方一条
 * 横向细线收口，线下面才是描述与域名。
 * 整张卡不发光、不加渐变，只靠 1px 边框和那条横线区分层次。
 */
function FriendCard({
  link,
  index,
  status
}: {
  link: FriendLink;
  index: number;
  status?: FriendStatusEntry;
}) {
  // 头像加载失败时退回地球图标（部分友站头像会防盗链）
  const [avatarError, setAvatarError] = useState(false);

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        // 延迟单帧 0.04s、上限 0.3s，与 /links 卡片的入场节奏完全一致
        delay: Math.min(index * 0.04, 0.3),
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      /* 悬停位移 -3 与全站卡片统一；CSS 过渡只负责阴影与边框，位移交给 Framer Motion */
      whileHover={{ y: -3, transition: { duration: 0.3, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98 }}
      className="group flex flex-col rounded-xl border border-border bg-card/95 p-5
                 shadow-card hover:shadow-card-hover hover:border-primary/30
                 transition-[box-shadow,border-color] duration-300
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                 focus-visible:ring-offset-2 focus-visible:ring-offset-card
                 sm:p-6"
    >
      {/* 名片上半部：方形头像 + 姓名 + 外链箭头 */}
      <div className="flex items-start gap-4">
        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
          {link.avatar && !avatarError ? (
            /*
              用普通 img 而非 next/image：友链头像域名由对方任意指定，
              next/image 的 remotePatterns 无法穷举；静态导出下本就是 unoptimized，
              只剩域名校验的负担。
            */
            <img
              src={getAssetPath(link.avatar)}
              alt=""
              width={56}
              height={56}
              loading="lazy"
              className="h-full w-full object-cover"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center">
              <Globe className="h-5 w-5 text-muted-foreground/45" aria-hidden="true" />
            </span>
          )}
        </span>

        <div className="flex min-w-0 flex-1 items-start gap-2">
          <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary">
            {link.name}
          </h3>
          <ArrowUpRight
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200
                       group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
          />
        </div>
      </div>

      {/* 名片横线：从名字下方横贯整卡，是这张卡唯一的装饰性线条 */}
      <div className="mt-4 border-t border-border/70 pt-3">
        {/* 描述固定预留两行高度：短描述与长描述的名片同高，网格才不会一行高一行矮 */}
        <p className="line-clamp-2 min-h-[2.6rem] text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
          {link.description}
        </p>
      </div>

      {/* 底部信息行：mt-auto 把它压到卡片底边，保证同一行两张名片底部对齐 */}
      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground/65">
          {getDisplayHost(link.url)}
        </span>
        {status && <StatusReadout status={status} />}
      </div>
    </motion.a>
  );
}

/**
 * 「空席位」名片
 * 与友链名片同尺寸同结构，用虚线边框表示未占用；
 * 点击平滑滚动到页面下方的交换说明区
 */
function VacantCard({ index }: { index: number }) {
  const handleScrollToExchange = (event: React.MouseEvent<HTMLAnchorElement>) => {
    // 拦截锚点默认跳转，改用 scrollIntoView 获得平滑滚动
    event.preventDefault();
    const target = document.getElementById('exchange');
    if (!target) return;
    const prefersReducedMotion =
      !isElectron() && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start'
    });
  };

  return (
    <motion.a
      href="#exchange"
      onClick={handleScrollToExchange}
      aria-label="申请交换友链，查看申请方式"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay: Math.min(index * 0.04, 0.3),
        ease: [0.25, 0.46, 0.45, 0.94]
      }}
      /* 动效与友链名片保持一致：悬停抬起 -3、按压 0.98，避免「邀请位」手感不同 */
      whileHover={{ y: -3, transition: { duration: 0.3, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98 }}
      className="group flex flex-col rounded-xl border border-dashed border-primary/45
                 bg-card/90 p-5
                 shadow-card hover:shadow-card-hover hover:border-primary/70
                 transition-[box-shadow,border-color] duration-300
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50
                 focus-visible:ring-offset-2 focus-visible:ring-offset-card
                 sm:p-6"
    >
      <div className="flex items-start gap-4">
        {/* 头像位换成虚线方框 + 加号，与「空席位」语义一致 */}
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/40 text-primary">
          <Plus className="h-5 w-5" aria-hidden="true" />
        </span>

        <div className="flex min-w-0 flex-1 items-start gap-2">
          <h3 className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">
            这个位置还空着
          </h3>
          <ArrowDown
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-primary transition-transform duration-200 group-hover:translate-y-0.5"
          />
        </div>
      </div>

      {/* 与友链名片同一条横线，这里改成主题色虚线，保持虚实区分 */}
      <div className="mt-4 border-t border-dashed border-primary/25 pt-3">
        {/* 同样预留两行高度，保证与并排的友链名片等高 */}
        <p className="min-h-[2.6rem] text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
          欢迎交换友链，把你的小站放到这里
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-3">
        <span className="font-mono text-[11px] text-muted-foreground/65">空缺席位</span>
        <span className="text-[11px] font-medium text-primary">查看方式</span>
      </div>
    </motion.a>
  );
}

/* ================================================================== */
/* 主组件                                                              */
/* ================================================================== */

/**
 * 友情链接名片夹
 * 2026-11 改版：三列等高卡片 → 横向名片网格（桌面三列 / 平板两列 / 手机一列）
 * 1. 名片是横向比例：左侧方形头像 + 右侧姓名，姓名下方一条横线，线下是描述与域名
 * 2. 卡片不发光、不加渐变、不加阴影，只留 1px 边框与那条横线
 * 3. 桌面三列下名片更紧凑，空席位排在网格末尾的下一行首格
 */
export default function FriendsLink() {
  const [mounted, setMounted] = useState(false);
  // 巡检数据缺失或未生成时保持 null，状态读数整体不渲染
  const [statusData, setStatusData] = useState<FriendsStatusFile | null>(null);

  useEffect(() => {
    setMounted(true);

    let cancelled = false;
    fetch(getAssetPath('/friends-status.json'), { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data && Array.isArray(data.friends) && data.friends.length > 0) {
          setStatusData(data as FriendsStatusFile);
        }
      })
      .catch(() => {
        // 占位文件 / 本地未巡检：静默忽略
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // 按归一化 url 建索引，供名片快速查状态
  const statusByUrl = useMemo(
    () => new Map((statusData?.friends ?? []).map((entry) => [entry.url, entry])),
    [statusData]
  );

  /**
   * 按数据出现顺序归类
   * 仅在存在 2 个及以上分类时才渲染分组标题：
   * 当前友链全部属于「博客」一类，单独压一个分类标题反而多余
   */
  const groups = useMemo(() => {
    const order: Array<FriendLinkCategory | null> = [];
    const bucket = new Map<FriendLinkCategory | null, FriendLink[]>();

    for (const link of friendsLinks) {
      const key = link.category ?? null;
      const list = bucket.get(key);
      if (list) {
        list.push(link);
      } else {
        bucket.set(key, [link]);
        order.push(key);
      }
    }

    return order.map((key) => ({ key, items: bucket.get(key)! }));
  }, []);

  const showGroupHeadings = groups.length > 1;

  // 骨架：与正式名片同尺寸节奏（桌面三列 / 平板两列 / 手机一列）
  if (!mounted) {
    return (
      <div className="grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[172px] rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {friendsLinks.length === 0 ? (
        // 空名录：只保留一句话，不放插画与光晕
        <div className="rounded-xl border border-border bg-card/95 px-6 py-12 text-center">
          <p className="text-sm text-foreground/80">名录还是空的</p>
          <p className="mt-1 text-xs text-muted-foreground">欢迎成为第一位邻居</p>
        </div>
      ) : (
        /*
          所有名片放在同一个网格里：空席位作为网格的最后一个格子，
          桌面三列时 3 张友链恰好占满第一行，空席位落在第二行首格；
          分组标题用 col-span-full 独占一行，不打断网格
        */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3">
          {groups.map((group) => (
            <Fragment key={group.key ?? 'uncategorized'}>
              {/* 分组标题只在多分类时出现：跨两列的一行小字，不用图标色块 */}
              {showGroupHeadings && (
                <div className="col-span-full flex items-baseline gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {group.key ? friendCategoryLabels[group.key] : '其他'}
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                    {group.items.length}
                  </span>
                  <span className="flex-1 border-b border-border/50" />
                </div>
              )}

              {group.items.map((link) => (
                <FriendCard
                  key={link.name}
                  link={link}
                  index={friendsLinks.indexOf(link)}
                  status={statusByUrl.get(normalizeFriendUrl(link.url))}
                />
              ))}
            </Fragment>
          ))}

          {/* 空席位：网格最后一格，桌面三列时位于第二行首格 */}
          <VacantCard index={friendsLinks.length} />
        </div>
      )}
    </div>
  );
}
