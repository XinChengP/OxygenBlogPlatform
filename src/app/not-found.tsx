import type { Metadata } from 'next';
import NotFoundClient from './not-found-client';

/**
 * 404 页面（服务端壳）
 *
 * 页面本体是客户端组件（需要使用 useEffect 控制视频与主题色），
 * 但 metadata 只能在服务端组件里导出，因此拆成「服务端 not-found.tsx +
 * 客户端 not-found-client.tsx」两层。
 *
 * 这里显式声明 noindex：
 * - Next 会为 404 自动加一条 `<meta name="robots" content="noindex">`；
 * - 根布局 layout.tsx 又配置了全局 `robots: index, follow`，
 *   两者叠加会输出互相矛盾的 robots 标签。
 * - 在 not-found 层覆盖为 noindex 后，404 页只保留“不索引”的语义。
 */
export const metadata: Metadata = {
  title: '页面不存在',
  description: '请求的页面不存在或已被移动。',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return <NotFoundClient />;
}
