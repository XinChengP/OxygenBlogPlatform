/**
 * 管理后台路由级加载骨架
 *
 * 后台此前没有任何 loading.tsx：从仪表盘点进二级页时，
 * 内容区会短暂空白，与全站「各主要路由均有骨架屏」的规范不一致。
 * 这里只画内容区骨架，侧栏与顶栏由 AdminLayout 提供。
 */
export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="页面加载中">
      {/* 页面标题占位 */}
      <div className="space-y-2">
        <div className="h-8 w-40 bg-muted/60 rounded-lg" />
        <div className="h-4 w-64 bg-muted/40 rounded" />
      </div>

      {/* 统计卡片占位 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(index => (
          <div
            key={index}
            className="h-24 bg-card/70 border border-border rounded-xl"
          />
        ))}
      </div>

      {/* 主内容占位 */}
      <div className="h-80 bg-card/70 border border-border rounded-xl" />
    </div>
  );
}
