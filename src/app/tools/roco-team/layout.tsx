import type { Metadata } from 'next';
import { siteUrl } from '@/utils/blogScanner';

/**
 * 洛克王国阵容搭配模拟器页面 SEO 元数据
 *
 * 页面本体是 client component，不能直接导出 metadata；
 * 这里用一层 server layout 覆盖父级「小工具」的标题与描述，
 * 避免多个工具页共用同一份元数据。
 */
export const metadata: Metadata = {
  alternates: {
    canonical: siteUrl('/tools/roco-team/'),
  },

  // 嵌套在 tools/layout 下时根模板不会继续追加站点名，用 absolute 保证完整标题
  title: {
    absolute: '洛克王国阵容搭配模拟器 | 心想事成的个人博客',
  },

  description:
    '洛克王国阵容搭配模拟器：按宠物属性、技能与克制关系模拟对战，测试队伍强度、调整配招与站位，帮助小洛克快速验证阵容思路，免费在线使用。',

  keywords: ['洛克王国', '阵容搭配', '队伍模拟器', '宠物对战', '配招', '在线工具'],

  openGraph: {
    title: '洛克王国阵容搭配模拟器 | 心想事成的个人博客',
    description: '按宠物属性、技能与克制关系模拟对战的洛克王国阵容搭配工具，免费在线使用。',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: '洛克王国阵容搭配模拟器 | 心想事成的个人博客',
    description: '按宠物属性、技能与克制关系模拟对战的洛克王国阵容搭配工具，免费在线使用。',
  },
};

export default function RocoTeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
