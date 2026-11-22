import type { Metadata } from 'next';

/**
 * 外链跳转提醒页的 SEO 元数据
 *
 * 该页面的主体内容依赖 ?url= 查询参数在客户端渲染，
 * 每个参数值都会生成一份内容几乎相同的页面。
 * 如果允许收录，搜索引擎会得到大量重复且无价值的参数页结果，
 * 同时白白消耗抓取配额（Bing 站长准则第 6、10、21 条）。
 *
 * 因此这里显式声明 NOINDEX；
 * follow 保持开启，让爬虫仍能沿页面内的正常链接继续抓取。
 */
export const metadata: Metadata = {
  title: '外部链接提醒',
  robots: {
    index: false,
    follow: true,
  },
};

export default function RedirectLayout({ children }: { children: React.ReactNode }) {
  return children;
}
