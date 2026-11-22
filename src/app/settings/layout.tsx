import type { Metadata } from 'next';

/*
  settings 页面本体是客户端组件（'use client'）无法导出 metadata，
  通过嵌套 layout 提供（同 links/about 等页面的既有模式）。
*/
export const metadata: Metadata = {
  title: '站点设置',
  description: '调整博客的个性化显示设置，例如音乐播放器的显示与隐藏。',
  /*
    设置页是纯客户端偏好面板，正文内容全部来自 localStorage，
    静态 HTML 里只有空壳。仅从 sitemap 移除不足以阻止收录：
    爬虫通过页脚等站内链接依然能发现它，并把它当作低价值页面消耗抓取配额。
    因此显式声明 NOINDEX（Bing 站长准则第 10、21 条）。
  */
  robots: {
    index: false,
    follow: true,
  },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
