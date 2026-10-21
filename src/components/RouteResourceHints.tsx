/**
 * 按页面的第三方连接提示（preconnect / dns-prefetch）。
 *
 * 背景：
 * 这些提示原先全量挂在根布局的 <head> 上——每篇页面都会为
 * twikoo、api.github.com、img.xinchengp.cn 提前做 DNS 解析和 TLS 握手，
 * 即使页面完全不会用到这些源，在弱网设备上会额外占用连接配额与电量。
 *
 * 现在改为按页面显式声明：
 * 真正用到某个外部源的页面，在自身 JSX 里渲染一次本组件即可；
 * React 会把这些 <link> 自动提升到 <head>（SSR 输出中同样生效），
 * 未引用的页面则完全零成本。
 *
 * 注意：
 * - 只在「该页面会向这些源发起请求」的页面使用，滥加 preconnect
 *   反而比不做更浪费资源（连接保持占用约 10s）；
 * - origins 中传入 undefined / 空串时自动跳过（如环境变量未配置时）。
 */
export default function RouteResourceHints({
  origins,
}: {
  origins: Array<string | undefined | null>;
}) {
  const list = origins.filter(
    (origin): origin is string => typeof origin === 'string' && origin.length > 0
  );

  if (list.length === 0) return null;

  return (
    <>
      {list.map((origin) => (
        <link key={origin} rel="preconnect" href={origin} crossOrigin="anonymous" />
      ))}
      {list.map((origin) => (
        <link key={`${origin}-dns`} rel="dns-prefetch" href={origin} />
      ))}
    </>
  );
}
