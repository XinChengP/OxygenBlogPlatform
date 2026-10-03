import { defaultSchema } from 'hast-util-sanitize';

/**
 * 博客内容的 rehype-sanitize 白名单
 *
 * 使用场景：rehype-raw 会把 Markdown 中的原始 HTML 原样注入 hast 树，
 * 是存储型 XSS 的注入点；本 schema 在 rehypeRaw 之后清洗注入内容。
 * 插件顺序必须为 [.., rehypeRaw, rehypeSanitize, rehypeKatex, ..]：
 * KaTeX 的 MathML 输出是库自身生成的可信标记，sanitize 必须发生在它之前，
 * 否则需要把整族 MathML 标签加进白名单。
 *
 * 白名单覆盖范围来自对 src/content 全部文章的实际扫描：
 * - div/span/small/p/del/br/img：正文排版与图片
 * - span[id|style|data-password]：密码复制功能（ClientBlogDetail 事件委托依赖）
 * - input[type=checkbox]：GFM 任务列表的复选框
 * - math：remark-math 产出的公式节点（随后由 rehype-katex 渲染）
 * - iframe/video/source/details/summary/figure：作者可用的富媒体与折叠块
 *
 * 新增文章用到被清洗的标签时，在对应清单中追加即可。
 */
export const blogSanitizeSchema = {
  ...defaultSchema,
  /*
    保留作者手写的原始 id（如密码 span 的 password-1122）。
    默认的 user-content- 前缀是防 DOM clobbering 的加固项；
    本站 Markdown 仅作者本地可写，clobber 风险远小于锚点失效的困扰。
  */
  clobberPrefix: '',
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'div',
    'span',
    'br',
    'small',
    'del',
    'ins',
    'mark',
    'figure',
    'figcaption',
    'video',
    'source',
    'iframe',
    'details',
    'summary',
    'input',
    'style',
    'math',
  ],
  attributes: {
    ...defaultSchema.attributes,
    // data* 允许 data-password 等自定义数据属性
    '*': [
      ...(defaultSchema.attributes?.['*'] ?? []),
      'style',
      'className',
      'data*',
      'loading',
      'decoding',
      'allow',
      'allowFullScreen',
      'frameBorder',
      'scrolling',
      'playsInline',
      'poster',
      'controls',
      'preload',
      'open',
      'disabled',
      'checked',
      'dir',
      'align',
    ],
    a: [...(defaultSchema.attributes?.a ?? []), 'download', 'target'],
    img: [...(defaultSchema.attributes?.img ?? []), 'loading', 'decoding', 'srcset', 'srcSet'],
    iframe: ['src', 'width', 'height', 'title', 'style'],
    input: ['type', 'checked', 'disabled'],
    math: ['xmlns', 'display'],
  },
};
