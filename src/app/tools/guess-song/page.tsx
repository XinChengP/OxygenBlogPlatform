'use client';

import dynamic from 'next/dynamic';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import PageHeader from '@/components/ui/PageHeader';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { trackToolView } from '@/components/Analytics';
import { MOTION_DISTANCE, MOTION_DURATION, MOTION_EASE } from '@/utils/motion';

/*
  游戏主体依赖浏览器音频 API，保持动态加载；
  页面标题、说明和 SEO 文案仍由本文件的静态部分输出，
  与 Markdown 编辑器页的处理一致。
*/
const GuessSongGame = dynamic(
  () => import('@/components/tools/GuessSongGame'),
  {
    ssr: false,
    loading: () => (
      <div className="glass-card-strong mx-auto flex w-full max-w-3xl flex-col items-center gap-3 rounded-3xl border p-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">天依正在翻歌本…</p>
      </div>
    ),
  }
);

export default function GuessSongPage() {
  const { containerStyle } = useBackgroundStyle('tools');

  useEffect(() => {
    const timer = setTimeout(() => {
      trackToolView('天依猜歌', '互动游戏');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main
      className={`min-h-screen transition-colors duration-300 ${containerStyle.className}`}
      style={containerStyle.style}
    >
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <PageHeader
          title="天依猜歌"
          description="听副歌、听前奏、看歌词，猜出天依的歌名"
          descriptionClassName="text-white/85 drop-shadow-[0_1px_4px_rgba(12,40,85,0.6)]"
          size="md"
          className="mb-6"
        />

        <motion.div
          initial={{ opacity: 0, y: MOTION_DISTANCE }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: MOTION_DURATION, ease: MOTION_EASE, delay: 0.15 }}
        >
          <GuessSongGame />
        </motion.div>
      </div>
    </main>
  );
}
