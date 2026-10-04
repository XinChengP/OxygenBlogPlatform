import { enableBackground, backgroundImage } from '@/setting/WebSetting';

/**
 * 路由级加载骨架
 *
 * 此前全站约 20 个路由段没有任何 loading.tsx：客户端导航时页面短暂空白，
 * 构建期渲染异常则直接穿透到整页白屏的 global-error。
 * 各路由的 loading.tsx 薄引用本组件，保持骨架风格统一。
 *
 * 容器背景策略与页面级 useBackgroundStyle 保持一致：
 * 站点背景图启用时容器必须透明，否则骨架屏的不透明 bg-background
 * 会在导航瞬间盖住 BackgroundLayer 的整屏背景图，
 * 形成详情页「刚点进去一大片白色」的闪白；
 * 仅在背景功能关闭时才回退到 bg-background 纯色。
 */
export default function RouteSkeleton({
  variant = 'list',
}: {
  /** list = 列表页骨架；article = 文章详情骨架（含正文占位段落） */
  variant?: 'list' | 'article';
}) {
  const hasBackground = enableBackground && !!backgroundImage;

  return (
    <div className={`min-h-screen py-8 pt-20 ${hasBackground ? '' : 'bg-background'}`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 animate-pulse" aria-busy="true" aria-label="内容加载中">
        {/* 页头占位 */}
        <div className="h-8 w-48 bg-muted/70 rounded-xl mb-8" />

        {variant === 'article' ? (
          <>
            {/* 标题与元信息占位 */}
            <div className="h-10 w-3/4 bg-muted/70 rounded-xl mb-4" />
            <div className="h-4 w-1/2 bg-muted/50 rounded mb-10" />
            {/* 正文卡片占位 */}
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl shadow-lg p-6 md:p-10 space-y-4">
              <div className="h-4 bg-muted/60 rounded w-full" />
              <div className="h-4 bg-muted/60 rounded w-11/12" />
              <div className="h-4 bg-muted/50 rounded w-4/5" />
              <div className="h-40 bg-muted/40 rounded-xl my-6" />
              <div className="h-4 bg-muted/60 rounded w-full" />
              <div className="h-4 bg-muted/50 rounded w-5/6" />
            </div>
          </>
        ) : (
          <>
            {/* 筛选条占位 */}
            <div className="flex gap-2 mb-8">
              {[16, 12, 14, 10].map((w, i) => (
                <div key={i} className="h-8 bg-muted/60 rounded-full" style={{ width: `${w}rem` }} />
              ))}
            </div>
            {/* 卡片列表占位 */}
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/40 p-6 space-y-3">
                  <div className="h-5 bg-muted/60 rounded w-2/3" />
                  <div className="h-4 bg-muted/40 rounded w-full" />
                  <div className="h-4 bg-muted/30 rounded w-4/5" />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
