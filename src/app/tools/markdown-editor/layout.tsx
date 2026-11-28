import type { Metadata } from 'next';
import { siteUrl } from '@/utils/blogScanner';

/**
 * Markdown 编辑器页面 SEO 元数据
 *
 * 页面本体是 client component，不能直接导出 metadata；
 * 这里用一层 server layout 覆盖父级「小工具」的标题与描述，
 * 避免多个工具页共用同一份元数据。
 */
export const metadata: Metadata = {
  alternates: {
    canonical: siteUrl('/tools/markdown-editor/'),
  },

  // 嵌套在 tools/layout 下时根模板不会继续追加站点名，用 absolute 保证完整标题
  title: {
    absolute: 'Markdown 编辑器 | 心想事成的个人博客',
  },

  description:
    '在线 Markdown 编辑器：实时预览、语法高亮、代码块语言标签、一键复制与深色/浅色主题适配，打开浏览器即可写文档，免费无需注册。',

  keywords: ['Markdown编辑器', 'Markdown', '在线编辑器', '实时预览', '代码高亮'],

  openGraph: {
    title: 'Markdown 编辑器 | 心想事成的个人博客',
    description: '支持实时预览、语法高亮与代码块标签的在线 Markdown 编辑器，免费无需注册。',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: 'Markdown 编辑器 | 心想事成的个人博客',
    description: '支持实时预览、语法高亮与代码块标签的在线 Markdown 编辑器，免费无需注册。',
  },
};

export default function MarkdownEditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
