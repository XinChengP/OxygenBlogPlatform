# Cloudflare 网络优化配置指南

本文件对应「部分设备加载博客很慢」问题的 Cloudflare 侧配置。代码侧的优化已在仓库内完成
（见 git diff），本文档涵盖需要在 Cloudflare 控制台与 GitHub Secrets 中完成的部分。

## 0. 现状实测

- HTML：Cloudflare 代理，命中缓存时 TTFB ~250ms（HKG 边缘），MISS 回源 GitHub Pages（japaneast）约 600ms。
- **全站统一 `Cache-Control: max-age=14400`**（4 小时），包括带内容哈希的 `/_next/static/*` 与图片。
- JS 返回 `gzip`，CSS 返回 `br`；图片未开边缘格式转换（`Accept: image/webp` 下 PNG 仍原样返回）。
- 域名同时存在 A / AAAA 记录（IT 之家测得 IPv6 指向 Cloudflare）。

## 1. Cache Rules（缓存分层，最重要）

**Caching → Cache Rules**，新增以下规则（**注意规则顺序，自上而下执行，后面的规则优先级更高**）：

### 规则 1：不可变静态资产（期限最长）

- **When**: `http.request.uri.path matches "^/_next/static/"`
- **Cache eligibility**: Eligible for cache
- **Edge TTL**: Ignore origin Cache-Control → 1 year
- **Browser TTL**: Override origin Cache-Control → 1 year

`_next/static` 下的 JS/CSS 文件名带内容哈希，内容变化文件名就换，可以安全地永久缓存。

### 规则 2：图片与大媒体目录

- **When**: `http.request.uri.path matches "^/(_responsive|Blogabout|Momentsabout|aboutme|LTY_Picture|music|friendlink|assets|roco-icons)/"`
- **Edge TTL**: 1 month
- **Browser TTL**: 30 days

### 规则 3：`sw.js` 例外（反而不能长缓存）

- **When**: `http.request.uri.path equals "/sw.js"`
- **Cache eligibility**: Eligible
- **Edge TTL**: 5 minutes；**Browser TTL**: 尊重源站（GitHub Pages 默认 600s）

Service Worker 文件如果被浏览器强缓存 4 小时，SW 版本更新会延迟最多 4 小时才被发现。

### 规则 4：HTML 页面（保持现状或略降）

- **When**: `http.request.uri.path matches "^/"`（兜底，放在最后）
- **Edge TTL**: 4 hours
- **Browser TTL**: 4 hours（内容更新敏感可降到 1 hour；部署后已有自动 purge，4 小时也可接受）

> 注意 HTML 浏览缓存与部署频率的取舍：4-hour 缓存的访客在部署后最多继续看旧页面 4 小时。

## 2. Response Header Transform Rule（加 immutable）

**Rules → Transform Rules → Modify Response Header**：

- **When**: `http.request.uri.path matches "^/_next/static/"`
- **Then**: Set static
  - Header name: `Cache-Control`
  - Value: `public, max-age=31536000, immutable`

`immutable` 可阻止浏览器在刷新页面对带 hash 资产做条件重验证（304 往返全免）。

## 3. Speed 开关

**Speed → Optimization**：

| 开关 | 建议 | 说明 |
|------|------|------|
| Brotli | 开 | 若开启后 JS 仍是 gzip，检查是否有 Cache Rule 设了 Respect origin |
| HTTP/3 | 开 | 已观测到 `alt-svc: h3`，确认启用 |
| Early Hints | 开 | 103 提前下发 CSS/JS 提示，降低高 RTT 下的首批耗时 |
| 0-RTT Connection Resumption | 开 | TLS 会话复用 |
| Polish | Pro 计划可选 | 自动 WebP/AVIF 转换；本项目已用构建期 sharp 替代，非必需 |
| Rocket Loader | **不要开** | 会延迟真实脚本执行，与 Next 水合不兼容 |

## 4. 部署后自动 purge HTML

工作流已在 `.github/workflows/deploy.yml` 的 deploy job 末尾添加 `Purge Cloudflare HTML cache` 步骤。
需要到仓库 **Settings → Secrets and variables → Actions → New repository secret** 添加：

| Secret | 获取方式 |
|--------|----------|
| `CLOUDFLARE_ZONE_ID` | Cloudflare 面板 → 站点 overview 页右侧 Zone ID |
| `CLOUDFLARE_API_TOKEN` | My Profile → API Tokens → Create Token → 模板 "Zone.Cache Purge"（资源：Zone，范围：本站） |

脚本（`scripts/purge-cloudflare-html.mjs`）会：

1. 部署完成后拉取 `https://blog.xinchengp.cn/sitemap.xml` 拿到全站页面清单
2. 分批（30 URL/次）调用 `purge_cache` API 只清 HTML——静态资源不受影响
3. 未配置 secret 时静默跳过，不影响部署

这样搭配第 1 节缓存规则：HTML 高收益缓存 + 部署即刷新。

## 5. IPv6 诊断（暂不改动）

Cloudflare 同时下发 A/AAAA。国内部分运营商/省份的 IPv6 到 Cloudflare 路径比 IPv4 明显差。
诊断方式（**先验证再动手**）：

1. 让慢的访客访问 `https://blog.xinchengp.cn/cdn-cgi/trace`，记录 `ip`（是否 v6）与 `colo`（是否 HKG/NRT）；
2. 与快的访客同指标对比；
3. 若慢访客清一色 IPv6 或 colo 落在 LAX/SJC：在 DNS 面板临时**删除 AAAA 记录**做 A/B 验证（纯 IPv6 用户会退回 IPv4，Cloudflare 的 Pseudo IPv4 保证 v4 客户端不受影响）；
4. 验证有效后决定是否长期关闭 AAAA。

## 6. 可选进阶（根治大陆访问）

站点有津 ICP 备案，可以直接上国内 CDN：

- **方案 A（推荐的事半功倍）**：腾讯云 EdgeOne / 阿里云 CDN，直接把 `blog.xinchengp.cn` 接入，源站回退到 GitHub Pages 或对象存储；大陆省份的各省边缘节点直连，对「部分设备慢」是根治级方案。
- **方案 B（拆分资产域名）**：`cdn.xinchengp.cn` 只托管 `_next/static` 与图片目录，页面 HTML 留在 Cloudflare。CI 里把这两类文件同步到 COS/OSS，HTML 里把静态资源改指向资产域名（需改 `assetPrefix`，工作量稍大）。

## 7. 观测（接通真实用户数据）

- **51la 页面性能事件**：已在 `src/components/Analytics.tsx` 内置，SDK 加载后自动上报 `页面性能` 事件
  （TTFB / DCL / Load / LCP / effectiveType / saveData），每页一次。
  在 51la 后台「自定义事件」里可以按事件维度看慢访问分布。关闭开关：`NEXT_PUBLIC_DISABLE_PERF_TRACKING=true`。
- **Cloudflare Web Analytics**（可选）：面板 → Web Analytics → 添加站点并把 beacon 注入。
  CSP 白名单中 `static.cloudflareinsights.com`/`cloudflareinsights.com` 已放行。

## 8. 验证清单

配置完成后逐条验证：

- [ ] `curl -sSI https://blog.xinchengp.cn/_next/static/chunks/<某个JS>.js` → `Cache-Control: public, max-age=31536000, immutable`，`cf-cache-status: HIT`
- [ ] `curl -sSI https://blog.xinchengp.cn/sw.js` → 浏览器缓存 ≤ 10 分钟
- [ ] `curl -sSI https://blog.xinchengp.cn/` → HTML 仍为 4 小时（或新设定值）
- [ ] 部署一次 → Actions 日志里 `[purge] ... purge 成功`
- [ ] DevTools → Network → 弱网 3G 回访任意页面 → 大部分请求来自 disk cache / Service Worker
- [ ] 慢设备访问 `/cdn-cgi/trace` 对比 colo / ip 字段

## 9. 已完成（无需再配置的代码侧优化备忘）

- 博客正文/About/瞬间/Moments 图片：构建期 sharp 生成 640/1280/1920 WebP 变体（GIF 出动图 WebP）
- 首页背景图按视口档位；非首页 `fetchPriority=low`
- `theme-init.js` 内联；51la 改 `lazyOnload`；搜索索引不再空闲预取
- 第三方 preconnect 按页面下发；视频 `preload="none"`
- Service Worker 运行时缓存（`public/sw.js`）：回访与弱网加速
