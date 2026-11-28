import type { Metadata } from 'next';
import { siteUrl } from '@/utils/blogScanner';

/**
 * 天依猜歌页面 SEO 元数据
 *
 * 页面本体是 client component，不能直接导出 metadata；
 * 这里用一层 server layout 覆盖父级「小工具」的标题与描述。
 */
export const metadata: Metadata = {
  alternates: {
    canonical: siteUrl('/tools/guess-song/'),
  },
  // 嵌套在 tools/layout 下时根模板不会继续追加站点名，这里用 absolute 保证完整标题
  title: {
    absolute: '天依猜歌 | 心想事成的个人博客',
  },
  description:
    '四种玩法：听副歌、听前奏、看歌词、综合挑战（随机混合音频与歌词题）。从 4 个选项中猜出洛天依的歌名，10 题一局，不限时；曲库来自站内音乐播放器，离线时自动切换到本地曲库。',
  keywords: [
    '洛天依',
    '猜歌',
    '猜歌游戏',
    '天依猜歌',
    '歌词猜歌',
    '前奏挑战',
    'VOCALOID',
    '小游戏',
    '心想事成',
  ],
  openGraph: {
    title: '天依猜歌 | 心想事成的个人博客',
    description:
      '听副歌、听前奏、看歌词，猜出洛天依的歌名。四种玩法，10 题一局，不限时。',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: '天依猜歌 | 心想事成的个人博客',
    description:
      '听副歌、听前奏、看歌词，猜出洛天依的歌名。四种玩法，10 题一局，不限时。',
  },
};

export default function GuessSongLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
