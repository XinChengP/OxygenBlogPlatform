/**
 * 个人偏好 Top N 卡片
 * 合并展示：上半部分最喜欢的歌曲排行 + 下半部分语录墙
 * 视觉风格：与技能雷达卡、游戏库卡统一（天依蓝 + 毛玻璃 + p-6 内边距）
 * 放置位置：关于页面 → 技能雷达 + 旅行足迹行下方 → 整行宽卡片
 */
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Music, Quote, ExternalLink } from 'lucide-react';
import type { FavoriteSongItem, FavoriteQuoteItem } from '@/setting/AboutSetting';

/** 组件 Props */
interface TopFavoritesCardProps {
  /** 歌曲排行数据 */
  songs: FavoriteSongItem[];
  /** 语录数据 */
  quotes: FavoriteQuoteItem[];
  /** 可选：卡片根容器 className */
  className?: string;
}

/**
 * 单首歌曲排行项
 * - 大号 rank 序号（渐变/颜色根据排名）
 * - 中间歌名 + 歌手
 * - hover 时整行轻微左滑 + 序号高亮
 */
const SongRow = ({ song, index }: { song: FavoriteSongItem; index: number }) => {
  // 根据排名给序号不同颜色（1/2/3 名特别高亮，其余统一色）
  const rankStyles: Record<number, string> = {
    1: 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md',
    2: 'bg-gradient-to-br from-gray-300 to-gray-500 text-white shadow-md',
    3: 'bg-gradient-to-br from-orange-300 to-amber-600 text-white shadow-md',
  };
  const rankClass = rankStyles[song.rank] || 'bg-primary/15 text-primary';

  return (
    <motion.a
      href={song.url || undefined}
      target={song.url ? '_blank' : undefined}
      rel={song.url ? 'noopener noreferrer' : undefined}
      // 没有 url 就不可点击
      onClick={(e) => !song.url && e.preventDefault()}
      custom={index}
      initial={{ opacity: 0, x: -16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, delay: 0.15 * index + 0.4 }}
      whileHover={{ x: 4 }}
      className={`group flex items-center gap-4 py-2.5 px-3 rounded-xl transition-colors ${
        song.url ? 'cursor-pointer hover:bg-primary/8' : 'cursor-default'
      }`}
    >
      {/* 排名序号 */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center font-bold text-lg ${rankClass}`}
      >
        {song.rank}
      </div>

      {/* 歌名 + 歌手 + 推荐语 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground truncate">{song.name}</span>
          {song.artist && (
            <span className="text-xs text-muted-foreground truncate">· {song.artist}</span>
          )}
        </div>
        {song.description && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {song.description}
          </p>
        )}
      </div>

      {/* 外链图标（有 url 才显示） */}
      {song.url && (
        <ExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
      )}
    </motion.a>
  );
};

/**
 * 语录项 - 带天依蓝左边框 + 斜体（与技能雷达卡的 skillEvaluation 风格一致）
 */
const QuoteItem = ({ quote, index }: { quote: FavoriteQuoteItem; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-40px' }}
    transition={{ duration: 0.4, delay: 0.6 + index * 0.1 }}
    className="pl-3 py-1 border-l-2 border-primary/50"
  >
    <p className="text-sm text-muted-foreground leading-relaxed italic">
      {quote.text}
      {quote.source && (
        <span className="ml-2 not-italic text-xs text-muted-foreground/70">{quote.source}</span>
      )}
    </p>
  </motion.div>
);

/**
 * 个人偏好 Top N 卡片
 */
export default function TopFavoritesCard({ songs, quotes, className = '' }: TopFavoritesCardProps) {
  const hasSongs = songs.length > 0;
  const hasQuotes = quotes.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className={`relative rounded-2xl border overflow-hidden backdrop-blur-md bg-card/90 border-border shadow-lg supports-[backdrop-filter]:bg-card/75 p-6 ${className}`}
    >
      {/* ===== 上半部分：歌曲排行 ===== */}
      {hasSongs && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <motion.div
              animate={{ rotate: [0, 12, -12, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}
            >
              <Music className="w-5 h-5 text-primary" />
            </motion.div>
            <h3 className="text-xl font-semibold text-foreground">最喜欢的歌</h3>
          </div>

          <div className="flex flex-col gap-0.5">
            {songs.map((song, i) => (
              <SongRow key={song.rank} song={song} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* 分隔线（歌曲和语录都有时才显示） */}
      {hasSongs && hasQuotes && (
        <div className="my-4 h-px bg-border/60" />
      )}

      {/* ===== 下半部分：语录墙 ===== */}
      {hasQuotes && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Quote className="w-4 h-4 text-primary/70" />
            <span className="text-sm font-medium text-muted-foreground">喜欢的语录</span>
          </div>

          <div className="flex flex-col gap-2">
            {quotes.map((quote, i) => (
              <QuoteItem key={i} quote={quote} index={i} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
