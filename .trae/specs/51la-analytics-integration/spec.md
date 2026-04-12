# 51la 网站统计接入规范

## 目的

为博客平台接入 51la 网站统计服务，实现对访客量、文章浏览量以及小工具使用量的全面追踪与分析。

## 需求背景

当前博客平台部署在 GitHub Pages 上，使用自定义域名 `blog.xinchengp.cn`。由于缺乏访问统计分析功能，无法了解用户的访问行为。通过接入 51la 统计服务，可以获取以下关键数据：

- **访客统计**：独立访客数（UV）、页面访问量（PV）、访问来源等
- **文章浏览统计**：追踪用户对各篇文章的访问情况
- **小工具浏览统计**：追踪用户对小工具页面的访问情况

## 部署环境说明

本项目部署在 **GitHub Pages** 上，使用自定义域名：**blog.xinchengp.cn**

**关键考虑点**：
- GitHub Pages 为静态托管，无服务端能力
- 统计完全依赖客户端 JavaScript 实现
- 需要确保 51la SDK 在静态导出模式下正常工作
- 域名配置需要在 51la 后台正确设置

## 接入方案设计

### 1. 全局统计脚本

在全局布局文件 `src/app/layout.tsx` 中引入 51la 统计 SDK，确保所有页面都能被追踪。

```html
<!-- 51la统计SDK -->
<script charset="UTF-8" id="LA_COLLECT" src="//sdk.51.la/js-sdk-pro.min.js"></script>
<script>LA.init({id:"3PaiTXyPhK9fHSW3",ck:"3PaiTXyPhK9fHSW3",hashMode:true})</script>
```

**GitHub Pages 特殊配置**：
- 启用 `hashMode: true` 以支持静态路由的页面追踪
- 使用 Next.js 的 Script 组件实现异步加载，避免阻塞页面渲染
- 配置 `strategy="afterInteractive"` 或 `strategy="lazyOnload"` 以优化性能
- 仅在客户端渲染时加载，避免 SSR 期间执行报错
- 确保在 `next.config.js` 中配置了正确的 `assetPrefix` 和 `basePath`

### 2. 文章浏览统计

在文章详情页面 `src/app/blogs/[slug]/ClientBlogDetail.tsx` 中，通过 51la 的 `LA.init()` 完成初始化后，调用统计方法记录文章访问。

```typescript
// 记录文章浏览
LA.track('文章浏览', {
  title: articleTitle,
  slug: articleSlug,
  category: articleCategory
});
```

**追踪时机**：
- 文章详情页组件挂载后自动触发
- 仅记录一次有效浏览（防止重复计数）

### 3. 小工具浏览统计

在小工具页面 `src/app/tools/page.tsx` 中，通过 URL 路径识别小工具访问并上报。

```typescript
// 记录小工具浏览
LA.track('小工具浏览', {
  path: router.pathname,
  category: selectedCategory
});
```

**追踪场景**：
- 小工具首页访问
- 各子工具页面访问（如 `/tools/pinyin-converter`）

## 影响范围

### 受影响的文件

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `src/app/layout.tsx` | 新增 | 引入 51la SDK 全局脚本 |
| `src/components/Analytics.tsx` | 新增 | 封装 51la 统计逻辑的组件 |
| `src/app/blogs/[slug]/ClientBlogDetail.tsx` | 修改 | 添加文章浏览统计追踪 |
| `src/app/tools/page.tsx` | 修改 | 添加小工具浏览统计追踪 |
| `src/setting/WebSetting.ts` | 修改 | 添加 51la 配置项（可选） |

### 非影响范围

- 静态页面（about、archive、moments 等）：通过全局脚本自动追踪
- 后台管理页面（/admin/*）：暂不接入统计

## 技术实现细节

### GitHub Pages 部署配置

在 `next.config.js` 中确保以下配置正确：

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  // 如果使用自定义域名，不需要设置 basePath
  // basePath: '',
  // assetPrefix 用于确保资源路径正确
  assetPrefix: process.env.NODE_ENV === 'production' ? '.' : '',
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
```

### 脚本加载策略

采用 Next.js Script 组件的 `afterInteractive` 策略，适配静态导出：

```tsx
import Script from 'next/script';

<Script
  src="//sdk.51.la/js-sdk-pro.min.js"
  id="LA_COLLECT"
  strategy="afterInteractive"
  onLoad={() => {
    // SDK 加载完成后的初始化逻辑
    // 在 GitHub Pages 静态部署环境下使用 hashMode
    window.LA.init({
      id: "3PaiTXyPhK9fHSW3",
      ck: "3PaiTXyPhK9fHSW3",
      hashMode: true  // 启用 hash 模式以支持静态路由
    });
  }}
/>
```

### 类型安全

为 51la SDK 添加 TypeScript 类型定义，确保类型安全：

```typescript
// src/types/analytics.d.ts
declare namespace LA {
  interface InitOptions {
    id: string;
    ck: string;
    hashMode?: boolean;
  }

  interface TrackOptions {
    [key: string]: string | number | boolean;
  }

  function init(options: InitOptions): void;
  function track(event: string, options?: TrackOptions): void;
  function send(): void;
}
```

### 全局类型声明

扩展 Window 接口以支持 TypeScript 识别 `window.LA` 对象。

## 配置管理

### 开发环境

在 `.env.development` 中添加配置项：

```env
NEXT_PUBLIC_51LA_ID=3PaiTXyPhK9fHSW3
NEXT_PUBLIC_51LA_CK=3PaiTXyPhK9fHSW3
```

### 生产环境

在 `.env.production` 中配置生产环境的统计 ID（如果有独立的统计项目）。

### WebSetting 配置

在 `src/setting/WebSetting.ts` 中添加可选的配置接口：

```typescript
export interface AnalyticsConfig {
  enabled: boolean;
  id?: string;
  ck?: string;
}
```

## 性能考虑

- **异步加载**：SDK 以异步方式加载，不影响页面首屏渲染
- **延迟初始化**：在 `afterInteractive` 策略下，SDK 仅在页面交互后加载
- **最小化追踪**：仅追踪关键页面（文章、小工具），避免过多无意义的追踪事件

## 验证方式

### 本地开发验证
1. **本地验证**：访问博客首页、文章页、小工具页面，检查 51la 后台是否有数据上报
2. **网络请求**：使用浏览器开发者工具的 Network 面板，确认统计请求已发送
3. **控制台日志**：在 SDK 加载时添加日志，确认初始化成功

### GitHub Pages 部署验证
1. **域名配置确认**：
   - 在 51la 后台确认已添加域名 `blog.xinchengp.cn`
   - 检查域名状态是否正常

2. **部署后验证**：
   - 访问 `https://blog.xinchengp.cn`，打开浏览器开发者工具
   - 在 Network 面板中搜索 `51.la`，确认统计请求正常发送
   - 检查 Console 面板无 51la 相关报错

3. **数据上报验证**：
   - 在 51la 后台查看实时访客数据
   - 确认页面浏览量（PV）和独立访客（UV）正常统计
   - 测试文章详情页和小工具页面的自定义事件上报

## GitHub Pages 部署注意事项

### 1. 域名配置
在 51la 后台添加网站时，需要填写：
- **网站域名**：`blog.xinchengp.cn`
- **网站类型**：选择适合的分类
- **页面编码**：UTF-8

### 2. 静态导出兼容性
- 51la SDK 完全兼容静态 HTML 页面
- 使用 `hashMode: true` 确保 SPA 路由变化也能被正确追踪
- 无需服务端支持，纯客户端实现

### 3. 构建流程
```bash
# 1. 构建静态站点
npm run build

# 2. 检查 dist 目录中的 index.html 是否包含 51la 脚本

# 3. 部署到 GitHub Pages
# 使用 gh-pages 分支或 GitHub Actions 自动部署
```

### 4. 常见问题排查
- **统计不生效**：检查域名是否在 51la 后台正确配置
- **数据延迟**：51la 数据通常有几分钟延迟，非实时显示
- **跨域问题**：确保 `sdk.51.la` 域名未被浏览器插件拦截

## 后续扩展

- **自定义事件**：可扩展更多追踪场景（如评论区互动、文件下载等）
- **数据看板**：可考虑在后台管理页面添加统计数据的可视化展示
- **隐私合规**：确保符合 GDPR 等隐私法规，提供 Cookie 同意机制（可选）

---

*规范版本：v1.1*
*更新日期：2026-04-12*
*适用部署环境：GitHub Pages + 自定义域名 blog.xinchengp.cn*
