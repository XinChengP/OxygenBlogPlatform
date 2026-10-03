import type { Metadata } from 'next';

/*
  settings 页面本体是客户端组件（'use client'）无法导出 metadata，
  通过嵌套 layout 提供（同 links/about 等页面的既有模式）。
*/
export const metadata: Metadata = {
  title: '站点设置',
  description: '调整博客的个性化显示设置，例如音乐播放器的显示与隐藏。',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
