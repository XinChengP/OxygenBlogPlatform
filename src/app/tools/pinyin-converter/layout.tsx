import type { Metadata } from 'next';
import { siteUrl } from '@/utils/blogScanner';

/**
 * 拼音转换器页面 SEO 元数据
 *
 * 页面本体是 client component，不能直接导出 metadata；
 * 这里用一层 server layout 覆盖父级「小工具」的标题与描述。
 * 否则 /tools/ 下的多个工具会共用同一份 title/description，
 * 容易被搜索引擎当成重复页面而不收录。
 */
export const metadata: Metadata = {
  /*
    页面级 canonical：声明本页规范地址，
    避免带查询参数的访问形式被识别为重复页面。
  */
  alternates: {
    canonical: siteUrl('/tools/pinyin-converter/'),
  },

  // 嵌套在 tools/layout 下时根模板不会继续追加站点名，用 absolute 保证完整标题
  title: {
    absolute: '拼音转换器 | 心想事成的个人博客',
  },

  description:
    '在线中文转拼音工具：支持多音字识别、带声调/数字声调/无声调、首字母与全拼输出，可自定义分隔符、大小写和生僻字处理，复制即用，免费无需注册。',

  keywords: ['拼音转换', '中文转拼音', '多音字', '拼音工具', '首字母', '在线工具'],

  openGraph: {
    title: '拼音转换器 | 心想事成的个人博客',
    description: '支持多音字识别、声调与首字母输出的在线中文转拼音工具，免费无需注册。',
    type: 'website',
  },

  twitter: {
    card: 'summary',
    title: '拼音转换器 | 心想事成的个人博客',
    description: '支持多音字识别、声调与首字母输出的在线中文转拼音工具，免费无需注册。',
  },
};

export default function PinyinConverterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
