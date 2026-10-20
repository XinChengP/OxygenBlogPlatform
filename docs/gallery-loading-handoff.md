# 画廊加载问题对接文档

> 生成时间：2026-10-20  
> 范围：`/gallery` 页面、`img.xinchengp.cn` 图床、`Eiheir/Luo_Tianyi_Image` 图床仓库及其部署链路  
> 目的：把「现在是什么样、为什么慢、前端已经改了什么、图床侧需要做什么、怎么验收」一次说清楚，供博客前端与图床/画廊维护方对接。

---

## 0. 一页结论

- 前端页面本身不慢：静态产物约 **0.5 秒**渲染出首批卡片；点击回调 **100ms 内**就能打开灯箱。
- 主要瓶颈在 **`img.xinchengp.cn` 的访问链路**：默认 DNS 下 12KB 缩略图会 **30 秒超时**，38KB 缩略图要 **10 秒**；同一张图用优选 IP `162.159.138.116` 只要 **1.03 秒**。
- 第二瓶颈是 **原图过大**：732 张原图中位数 **1.34MB**，最大 **21.96MB**，24 张超过 10MB。灯箱现在先用缩略图立即出图，再后台加载 `large`（1600 宽 WebP）；工具栏提供“下载原图”入口，需要最高清晰度时可直接下载原图。
- 前端已做兜底：网格只加载缩略图、绝不回退原图；灯箱 thumb → large（缺失时回退原图）；图库刷新改为手动；首批只渲染 24 张。
- 图床侧当前最需要做的是 **排查 `img.xinchengp.cn` 的边缘 IP/DNS 选择**（本机实测为到 104.21/172.67 边缘的链路问题，不是 Worker 本身）。`large/` 已部署且重新被灯箱使用。
- 截至 2026-10-20：732 张图 **全部已有 640 缩略图**（约 **31MB**）；`large/` 已生成并部署（1600 宽 WebP，**90.8MB**），详见 9.5 节；灯箱使用 `large`，并新增“下载原图”，见 9.6。

---

## 1. 当前架构

```text
GitHub 图床仓库 Eiheir/Luo_Tianyi_Image (LTYpicture/**)
        │ push 触发 sync-to-r2.yml
        ▼
build-manifest.mjs
  ├─ 读取原图宽高
  ├─ 生成 thumbs/**（640 WebP）
  └─ 生成 manifest.json
        │ wrangler deploy
        ▼
Cloudflare Workers Static Assets
  ├─ https://img.xinchengp.cn/manifest.json
  ├─ https://img.xinchengp.cn/thumbs/**
  └─ https://img.xinchengp.cn/LTYpicture/**   （原图）
        │
        ▼
博客 /gallery 页面（Next.js 静态导出）
  ├─ 构建期拉 manifest，生成首屏快照
  ├─ 浏览器端手动“刷新图库”时再拉 manifest
  └─ 卡片只加载 thumbs；灯箱先 thumbs、再 large（或原图），并提供“下载原图”
```

关键路径：

- 前端图床常量：`src/utils/galleryShared.ts` → `R2_IMAGE_BASE = 'https://img.xinchengp.cn'`
- 图床构建：`cloudflare/gallery-assets/build-manifest.mjs`
- 图床部署：`cloudflare/gallery-assets/deploy-local.mjs`
- 缓存头：`cloudflare/gallery-assets/assets/_headers`
- 部署配置：`cloudflare/gallery-assets/wrangler.toml`
- 前端画廊：`src/app/gallery/GalleryClient.tsx`
- 卡片：`src/app/gallery/components/ImageCard.tsx`
- 灯箱：`src/app/gallery/components/ImagePreview.tsx`

---

## 2. 实测数据（2026-10-20）

### 2.1 图床访问延迟

| 请求 | 默认 DNS | 指定优选 IP `162.159.138.116` |
|---|---:|---:|
| `thumbs/.../0001.webp`（12KB） | **30 秒超时（HTTP 000）** | — |
| `thumbs/.../0001.webp`（48KB） | — | **1.03 秒** |
| 另一张 38KB 缩略图 | **10.06 秒** | — |
| `manifest.json`（116KB） | 浏览器约 **20 秒**完成 | — |
| 15.86MB 原图（jsDelivr 对照） | 6.1 秒 | — |

结论：**不是 Worker 服务本身不能返回，而是当前网络下域名解析到的边缘 IP/链路有问题**。优选 IP 能把同一张缩略图从 30 秒降到 1 秒。

### 2.2 原图体积

732 张原图统计：

| 指标 | 数值 |
|---|---:|
| 总大小 | **1.67GB** |
| 平均 | **2.34MB** |
| 中位数 | **1.34MB** |
| 最大 | **21.96MB** |
| >5MB | **82 张** |
| >10MB | **24 张** |
| 本次点开的样例 | **15.86MB / 3600×2025** |

### 2.3 缩略图

| 指标 | 数值 |
|---|---:|
| 数量 | 732（全覆盖） |
| 宽度 | 640 WebP |
| 总大小 | 约 **31MB** |
| 平均 | 约 **43KB** |
| 缓存 | `Cache-Control: public, max-age=604800`（7 天） |
| CORS | `Access-Control-Allow-Origin: *` |

### 2.4 manifest

- 路径：`https://img.xinchengp.cn/manifest.json`
- 当前大小约 **116KB**，`generatedAt=2026-10-18`，`count=732`
- 缓存：`Cache-Control: public, max-age=120`（2 分钟）
- CORS：`Access-Control-Allow-Origin: *`
- 当前字段（2026-10-20 19:30 起）：`path, size, width, height, thumb, large`（732/732 完整）

---

## 3. 慢在哪里：四个具体原因

### 原因 A：图床域名在当前网络下解析到慢边缘

- 默认 DNS 下小文件也会 10–30 秒，说明问题在连接/TTFB，不是图片大小。
- 指定优选 IP 后 48KB 只要 1.03 秒。
- 本机 `hosts` 第 34 行目前是：

```text
162.159.138.116 blog.xinchengp.cn twikoo.xinchengp.cn rocotnt.xinchengp.cn
```

**没有 `img.xinchengp.cn`**。

### 原因 B：网格卡片会回退原图

旧逻辑：

```text
thumbnail(R2 640) → src(R2 原图) → fallbackSrc(jsDelivr 原图)
```

缩略图一旦挂住/失败，卡片就会去拉 2–20MB 原图，进一步占满连接。实际观察到卡片 `currentSrc` 变成了 jsDelivr 的 15.86MB 原图。

### 原因 C：灯箱直接加载原图

`ImagePreview` 主图以前直接使用 `currentImage.src`（原图），没有缩略图占位。点击后灯箱虽然打开，但主图区空白，直到 15MB 原图下完。

### 原因 D：首访自动刷新 manifest

旧逻辑在画廊挂载时自动拉 116KB manifest；当前网络约 20 秒。完成后替换图片列表，卡片重新挂载，出现第二轮加载。开发环境 StrictMode 还会请求两次。

---

## 4. 前端已完成的改动（图床侧需要知道的行为）

### 4.1 网格卡片

- **只请求缩略图 `thumb`，不再回退 `src`/`fallbackSrc` 原图。**
- 缩略图 8 秒超时，显示“缩略图加载超时 + 重新加载”。
- 没有 `thumb` 且原图体积 >512KB 时显示“暂无可用缩略图”，不会偷偷下载原图。
- 首批只渲染 **24 张**，前 **8 张**为 `fetchPriority=high`，其余懒加载。

### 4.2 灯箱

- 打开即显示 `thumb`（640 WebP），同时后台加载 `large`；没有 `large` 时回退 `src`（原图）。
- 高清加载中显示“高清加载中…”；20 秒未完成显示“高清加载较慢，当前为缩略图”。
- 切换上一张/下一张时在绘制前重置为新缩略图，不会闪旧图。
- 高清加载失败时保留缩略图并提示。
- 工具栏新增“下载原图”入口：始终指向 `currentImage.src`（原图），不受预览使用 `large` 影响；按钮提示里显示原图大小。

### 4.3 manifest 刷新

- **不再在页面挂载时自动刷新。**
- 分类胶囊上方新增“刷新图库”按钮；只有用户点击才请求 manifest。
- 数据与当前一致时跳过 `setState`，避免整树重渲染。

### 4.4 网络提示

- layout 增加：

```html
<link rel="preconnect" href="https://img.xinchengp.cn" />
<link rel="dns-prefetch" href="https://img.xinchengp.cn" />
```

### 4.5 前端对图床的兼容策略

| 图床提供情况 | 前端行为 |
|---|---|
| 只有 `thumb`，没有 `large` | 网格正常；灯箱先显示 thumb，再加载原图 |
| `thumb` + `large` | 网格 thumb；灯箱先 thumb，再加载 `large`（推荐） |
| 缺少 `thumb`，原图 >512KB | 网格显示“暂无可用缩略图”（不会拉原图） |
| 缺少 `thumb`，原图 ≤512KB | 网格直接使用原图 |
| manifest 请求失败 | 使用构建期快照；手动刷新显示错误提示 |
| `large` 请求失败 | 保留缩略图并提示“高清加载失败，当前为缩略图” |
| 用户点击“下载原图” | 始终打开/下载 `src` 原图，与 `large` 无关 |

---

## 5. 图床/画廊侧待办

> 以下是需要“负责画廊/图床”的一方执行或确认的事项。前端代码已经准备好，不需要等前端再次发版。

### P0-1 排查 `img.xinchengp.cn` 的边缘 IP/链路

**目标**：让默认 DNS 下的缩略图请求从 10–30 秒降到 1–2 秒。

请依次检查：

1. 在问题网络下直接测：

```bash
curl -sL --max-time 30 -o /dev/null \
  -w "http=%{http_code} size=%{size_download} time=%{time_total}\n" \
  "https://img.xinchengp.cn/thumbs/LTYpicture/wallpapers%26illustration/heng/0001.webp"
```

2. 指定优选 IP 对照：

```bash
curl -sL --max-time 15 --resolve "img.xinchengp.cn:443:162.159.138.116" \
  -o /dev/null \
  -w "http=%{http_code} size=%{size_download} time=%{time_total}\n" \
  "https://img.xinchengp.cn/thumbs/LTYpicture/wallpapers%26illustration/heng/0001.webp"
```

3. 检查 DNS、Cloudflare 自定义域、`cf-cache-status`、TTFB：

```bash
curl -s -D - -o /dev/null \
  "https://img.xinchengp.cn/thumbs/LTYpicture/wallpapers%26illustration/heng/0001.webp" \
  | grep -iE "HTTP/|cf-cache-status|cache-control|content-type|server-timing"
```

4. 确认 Worker 是否为纯静态资产、是否存在冷启动/路由回源；检查该自定义域是否走的普通免费边缘、是否需要调整线路或增加第二个自定义域。

**本机临时验证**（不是最终方案）：把 hosts 第 34 行改成：

```text
162.159.138.116 blog.xinchengp.cn twikoo.xinchengp.cn rocotnt.xinchengp.cn img.xinchengp.cn
```

这只修一台机器；要让访客都受益，仍需图床侧解决域名/线路选择。

**验收**：默认 DNS 下 48KB 缩略图 ≤2 秒，`cf-cache-status: HIT`（或稳定 MISS 但 TTFB <500ms）。

---

### P0-2 生成并部署 `large/` 高清预览图

**目标**：灯箱不再直接加载 2–20MB 原图，改用 1280/1600 宽的 WebP。

图床构建脚本已支持 `--large-width`（博客仓库 `cloudflare/gallery-assets/build-manifest.mjs`）：

```bash
# 在 cloudflare/gallery-assets 目录下执行
cd cloudflare/gallery-assets

# 本机全量部署（图片已在 assets/ 时）
node deploy-local.mjs --manifest-only --large-width 1600

# 或只重建资产、不部署，先看体积
node build-manifest.mjs --root assets --out assets --large-width 1600
```

产物约定：

```text
assets/large/LTYpicture/.../0001.webp
manifest.json:
{
  "path": "LTYpicture/.../0001.png",
  "size": 16628390,
  "width": 3600,
  "height": 2025,
  "thumb": "thumbs/LTYpicture/.../0001.webp",
  "large": "large/LTYpicture/.../0001.webp"
}
```

注意事项：

- 当前 732 张原图 + 732 张缩略图；加 `large` 后文件数约 **2196**，仍低于 Workers 每版本 **20,000** 文件限制。
- `large` 总体积需实测；732 张 1600 宽 WebP 预计约 **100–250MB**。部署前确认账号/Worker 资产总量和上传时间限制。
- 需要确认 `_headers` 中的 `/large/*` 规则随图床部署同步过去（见 P0-3；博客仓库已加入）。
- 图床仓库的 GitHub Action（`sync-to-r2.yml`）目前调用 `build-manifest.mjs` 时没有传 `--large-width`；要长期生效，需要在该 Action 中加上 `--large-width 1600`，或让 Action 调用支持该参数的部署脚本。

**验收**：

1. `https://img.xinchengp.cn/manifest.json` 中每条包含 `large`。
2. 随机抽 10 条，`large` URL 返回 200、Content-Type 为 `image/webp`、大小明显小于原图。
3. 博客灯箱打开后先显示缩略图，随后切换到 `large`，不再请求十几 MB 原图。

---

### P0-3 确认 `/large/*` 响应头（仓库已加入）

博客仓库 `cloudflare/gallery-assets/assets/_headers` 已加入以下规则，图床部署时确认该文件同步生效：

```text
# 高清预览图：灯箱使用，内容随原图变化，可长缓存
/large/*
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=604800
```

同时确认现有规则：

```text
/manifest.json        Cache-Control: public, max-age=120
/LTYpicture/*         Cache-Control: public, max-age=86400
/thumbs/*             Cache-Control: public, max-age=604800
```

如果图床侧希望 manifest 更快生效，可保持 120 秒；如果希望减少请求，可提高到 300–600 秒，但新图可见会变慢。

---

### P1-1 确保每张图都有 `thumb`

当前 732 张全部有 `thumb`。后续新增图片请保持：

- 宽度 640 WebP；
- 命名 `thumbs/<原路径去扩展名>.webp`；
- manifest 写入 `thumb`；
- 允许长缓存。

没有 `thumb` 的图片在网格里会显示“暂无可用缩略图”，不会回退原图。

---

### P1-2 缩略图/高清图第二来源（可选，但建议）

如果短期无法解决 `img.xinchengp.cn` 的默认链路，可增加一个备用图片域名/来源，前端可以按字段接入：

- 方案 A：把 `thumbs/**` 同步到 GitHub 图床仓库，使用 `testingcf.jsdelivr.net`（注意仓库大小和 jsDelivr 50MB 限制）。
- 方案 B：增加第二个自定义域/Worker 部署，manifest 增加 `thumbFallback`/`largeFallback` 字段（需要前端再配合一个发版）。
- 方案 C：使用其他图片 CDN（需确认大陆访问、CORS、缓存和成本）。

> 当前前端只读取 `thumb`/`large`/`src`，没有第二缩略图字段；如果要做，请先和图床侧约定字段名，再安排前端小版本。

---

### P1-3 监控与缓存确认

建议图床侧定期抽查：

```bash
# 缩略图缓存命中
curl -s -D - -o /dev/null \
  "https://img.xinchengp.cn/thumbs/LTYpicture/wallpapers%26illustration/heng/0001.webp" \
  | grep -iE "HTTP/|cf-cache-status|cache-control|content-type"

# manifest
curl -s -D - -o /dev/null https://img.xinchengp.cn/manifest.json \
  | grep -iE "HTTP/|cf-cache-status|cache-control|content-type|content-length"
```

重点看：

- `cf-cache-status` 是否稳定 HIT；
- `content-type` 是否为 `image/webp` / `application/json`；
- 同一个小文件连续请求是否仍在 1 秒以上；
- manifest `count` 与实际图片数是否一致。

---

## 6. 接口契约（前端依赖）

### 6.1 manifest

`GET https://img.xinchengp.cn/manifest.json`

```json
{
  "generatedAt": "2026-10-20T00:00:00.000Z",
  "count": 732,
  "images": [
    {
      "path": "LTYpicture/wallpapers&illustration/heng/0001.png",
      "size": 16628390,
      "width": 3600,
      "height": 2025,
      "thumb": "thumbs/LTYpicture/wallpapers&illustration/heng/0001.webp",
      "large": "large/LTYpicture/wallpapers&illustration/heng/0001.webp"
    }
  ]
}
```

字段说明：

| 字段 | 必填 | 说明 |
|---|---|---|
| `path` | 是 | 原图相对路径，前端用它生成原图 URL 和 `id` |
| `size` | 建议 | 原图字节数；前端在没有 thumb 时据此决定是否允许小图 |
| `width/height` | 是 | 原图宽高；前端首帧算比例，避免瀑布流重排 |
| `thumb` | **是** | 640 WebP 缩略图相对路径；网格只认这个 |
| `large` | 可选 | 1280/1600 WebP 高清预览图；灯箱优先使用 |

- 所有路径使用 `/` 分隔；中文和 `&` 等字符按段 URL 编码。
- manifest 必须带 CORS `Access-Control-Allow-Origin: *`（前端 fetch）。
- 图片本身可以不带 CORS（`<img>` 展示型请求不需要）。

### 6.2 URL 规则

- 原图：`https://img.xinchengp.cn/<path>`
- 缩略图：`https://img.xinchengp.cn/<thumb>`
- 高清预览：`https://img.xinchengp.cn/<large>`
- manifest：`https://img.xinchengp.cn/manifest.json`

---

## 7. 验收清单

### 7.1 图床侧

- [ ] 默认 DNS 下 48KB 缩略图 ≤2 秒（目标 ≤1 秒）。
- [ ] `manifest.json` 可跨域 fetch，`count` 与实际图片数一致。
- [ ] 732 条都有 `thumb`，抽查 10 条返回 200 / `image/webp`。
- [ ] 每条都有 `large`（如果已部署），抽查 10 条返回 200 / `image/webp`，大小 < 原图。
- [ ] `_headers` 已包含 `/large/*`，CORS 和 7 天缓存生效。
- [ ] 图床仓库 Action 已带 `--large-width 1600`（如果启用 large）。
- [ ] 部署后 manifest `generatedAt` 更新，新图能被手动“刷新图库”发现。

### 7.2 前端侧（已实现，可在浏览器复核）

- [ ] `/gallery` 首屏只有 24 张卡片，所有 `img` 的 `currentSrc` 都在 `/thumbs/`。
- [ ] 打开 10 秒内不自动请求 `manifest.json`。
- [ ] 点击卡片灯箱立即出现，主图先是缩略图，并显示“高清加载中…”。
- [ ] 高清完成后主图切到 `large`（有 large 时）或原图。
- [ ] 工具栏“下载原图”指向 `currentImage.src`，提示含原图大小，点击不会关闭灯箱。
- [ ] “加载更多作品”每次增加 24 张。
- [ ] “刷新图库”按钮点击后显示“刷新中…”，完成后新图出现或提示失败。

### 7.3 快速抽样脚本

```bash
# manifest 字段完整性
node -e "
fetch('https://img.xinchengp.cn/manifest.json')
  .then(r => r.json())
  .then(m => {
    const noThumb = m.images.filter(x => !x.thumb).length;
    const noLarge = m.images.filter(x => !x.large).length;
    console.log({ count: m.count, noThumb, noLarge });
  });
"
```

```bash
# 抽查一张缩略图和一张 large
for u in \
  "https://img.xinchengp.cn/thumbs/LTYpicture/wallpapers%26illustration/heng/0001.webp" \
  "https://img.xinchengp.cn/large/LTYpicture/wallpapers%26illustration/heng/0001.webp"; do
  echo "$u"
  curl -sL --max-time 15 -o /dev/null \
    -w "http=%{http_code} size=%{size_download} time=%{time_total} type=%{content_type}\n" "$u"
done
```

---

## 8. 建议的对接顺序

1. **先修链路**（P0-1）：确认默认 DNS 下的边缘 IP；图床侧排查自定义域/线路，用户本机可先加 hosts。
2. **再做 large**（P0-2/P0-3）：生成 1600 WebP + 补 `_headers` + 更新 Action + 部署。
3. **确认缩略图全覆盖**（P1-1）和缓存命中（P1-3）。
4. **可选第二来源**（P1-2）：如果链路问题短期无法根治，再讨论备用域名/字段和前端配合。

---

## 9. 需要图床侧回复的问题

1. `img.xinchengp.cn` 当前默认解析到哪些 Cloudflare 边缘 IP？为什么小文件会 10–30 秒？是否稳定复现？
2. 该自定义域是否走免费边缘？能否通过调整 DNS/线路、增加自定义域或更换接入方式改善大陆访问？
3. `large/` 是否同意生成 1600 宽 WebP？部署后总资产体积预计多少，是否在账号限额内？
4. 图床仓库的 `sync-to-r2.yml` 是否方便加 `--large-width 1600`？`_headers` 是否由博客仓库同步过去？
5. 是否愿意增加第二缩略图来源（GitHub/jsDelivr 或其他 CDN）？如果愿意，字段名和 URL 规则需要先约定。

---

## 9.5 图床侧回复与处理结果（2026-10-20 19:30）

> 图床/画廊维护侧补充，回应第 9 节问题并记录当天实际执行结果。

### 已完成

1. **`large/` 已生成并部署（P0-2）**
   - 732 张全部生成 1600 宽 WebP（不放大），合计 **90.8MB**，平均 127KB，中位数 108KB，90 分位 244KB，最大 0.86MB。
   - manifest 已更新：`count=732`，缺 `thumb` 0 条、缺 `large` 0 条、缺宽高 0 条；文件约 160KB。
   - Worker 新版本 `ce1745bc-e88a-4e7e-939b-5a76ca0940f8` 已上线。
   - 抽查 10 条 `large`：全部 200 / `image/webp`，优选 IP 下 0.67–1.32 秒，大小 17–327KB；示例原图 16,628,390B → `large` 257,508B（约 1/65）。
2. **`_headers` 已生效（P0-3）**
   - `/large/*`：`Access-Control-Allow-Origin: *`、`Cache-Control: public, max-age=604800`。
   - 抽查 `large` 首次 MISS、再次 HIT；`thumbs` 抽查为 HIT；原图仍为 1 天缓存。
3. **`thumb` 全覆盖（P1-1）**：732/732。
4. **修复图床仓库 Action 的两个隐患（P0-2 附带）**
   - 原 `sync-to-r2.yml` 实际**没有调用** `build-manifest.mjs`，而是内联生成只有 `path/size` 的清单；同时 `_headers` 位于被 gitignore 的 `assets/`，CI 检出永远拿不到。只要下一次 push 图片，画廊的 `thumb`、宽高、`large` 会被整体“降级”掉。
   - 新 workflow：安装 sharp → 原图平铺进 Worker assets → `build-manifest.mjs --large-width 1600` → 校验每条都有 `thumb`/`large`/宽高 → 部署；`_headers` 和构建脚本在 `scripts/gallery-assets/` 放了 CI 副本，并优先使用博客仓库骨架（骨架支持 `--large-width` 时自动切换）。
   - 该改动目前只在图床仓库本地工作区，**尚未 commit/push**；推送后 GitHub Actions 才会按新流程构建。
   - 博客仓库 `cloudflare/gallery-assets/.gitignore` 已改为允许提交 `assets/_headers`（此前该文件被忽略，无法作为 CI 的单一口径）。

### 第 9 节问题回复

1. **解析到的边缘 IP**：`img.xinchengp.cn` 默认解析到 `104.21.68.252`、`172.67.200.136` 及两个 IPv6 地址。在本机问题网络下实测：
   - `172.67.200.136` TCP 连接直接超时；
   - `104.21.68.252` 能建连（0.29s）但 TTFB 约 11.2s，78KB 的 manifest 20s 仍未下完；
   - IPv6 地址不可达；
   - `162.159.138.116` 同一张 48KB 缩略图 **0.29–0.33 秒**。
   可稳定复现。`blog.xinchengp.cn` 解析到同一组 IP，本机之所以正常，是因为 hosts 第 34 行指向了 `162.159.138.116`。
2. **是否 Worker/边缘配置问题**：不是。Worker 本身能在 0.3 秒返回；自定义域走 Cloudflare 免费边缘，具体 anycast IP 由 Cloudflare 分配，源站/Worker 侧无法指定访客走哪个 IP。免费方案内可做的是受影响网络加 hosts/优选 IP；全局改善需要第二来源/其他 CDN，或 Argo/中国网络等付费线路。
3. **`large/` 是否同意 1600 宽 WebP**：已生成并部署，实际总计 90.8MB（低于预估 100–250MB）；资产总数 2198（732×3 + manifest + `_headers`），低于 20,000 文件限制。
4. **Action 是否加 `--large-width 1600`、`_headers` 是否同步**：已改（本地待推送）；`_headers` 由新增的 CI 副本保证。博客仓库的 `_headers` 现在也允许提交了，提交后 CI 会自动优先使用博客仓库版本。
5. **第二来源**：可以讨论，但 jsDelivr 对本仓库不可行（仓库约 1.8GB，远超 50MB 限制），GitHub Raw 在大陆也不稳定。更现实的是：① 受影响网络用 hosts/优选 IP；② 灯箱改用 `large` 后，弱网体验已大幅改善（90MB 总量、单图百 KB 级）；③ 若要求全访客可用，再评估第二 CDN/自建反代，字段建议 `thumbFallback`/`largeFallback`，需要前端小版本配合。

### 本机临时方案

当前执行环境没有管理员权限，未修改 hosts。要在本机让画廊走优选 IP，请用管理员权限把 hosts 第 34 行改成：

```text
162.159.138.116 blog.xinchengp.cn twikoo.xinchengp.cn rocotnt.xinchengp.cn img.xinchengp.cn
```

然后执行 `ipconfig /flushdns`。这只影响本机，不是全站方案。

### 对照 7.1 验收清单

- [x] manifest 可跨域 fetch，`count=732` 与实际一致。
- [x] 732 条都有 `thumb`，抽查 10 条 200 / `image/webp`。
- [x] 732 条都有 `large`，抽查 10 条 200 / `image/webp`，均远小于原图。
- [x] `_headers` 包含 `/large/*`，CORS 与 7 天缓存生效。
- [x] 部署后 `generatedAt` 更新为 `2026-10-20T11:11:40.180Z`。
- [ ] 默认 DNS 下 48KB 缩略图 ≤2 秒：**未达成**，受本机网络到 104.21/172.67 边缘的链路影响（优选 IP 达标 0.29s）。
- [ ] Action 带 `--large-width 1600`：代码已改，待图床仓库 commit/push 后在 Actions 生效。

## 9.6 博客前端侧跟进（2026-10-20 19:50）

图床侧部署 `large` 后，博客静态首屏快照仍是旧数据（构建期 manifest 请求在问题网络下超时，回退到了没有 `thumb`/`large` 的 GitHub Trees）。已处理：

1. **构建期 manifest 拉取加固**
   - 新增服务端专用请求：默认 DNS 8 秒 → Cloudflare 优选 IP `162.159.138.116` / `162.159.154.208` 各 12 秒。
   - 实测：默认 DNS 8 秒超时后，优选 IP 成功返回 732 条，`thumb=732`、`large=732`。
   - 浏览器端手动“刷新图库”的超时从 10 秒放宽到 25 秒，减少误回退。
2. **静态快照已重建**
   - `out/gallery/index.html` 已包含 732 条 `thumbnail` 和 732 条 `large`。
   - 浏览器实测：首批 24 张全部只请求 `/thumbs/`；点击卡片后主图先显示缩略图，随后切换到 `/large/...webp`。
3. **`_headers` 已补充 `/large/*`**
   - 规则已写入博客仓库 `cloudflare/gallery-assets/assets/_headers`，图床部署时随 `assets/` 同步。
4. **灯箱策略最终版（2026-10-20 晚）**
   - 曾短暂改为“灯箱只加载原图、不展示压缩 WebP”，随后按产品要求撤回：恢复 thumb 先出、后台加载 `large`。
   - 新增工具栏“下载原图”：始终指向 `currentImage.src`，并在提示中显示原图大小；预览继续使用 `large` 以保证打开速度。
   - `large/` 继续被前端使用，不需要回滚。

### 仍待完成（2026-10-20 20:00 更新）

- [x] 博客仓库：`_headers`、`build-manifest.mjs`、`deploy-local.mjs`、`docs/` 等已提交并推送（`969c4bc`）。
- [x] 图床仓库：`sync-to-r2.yml`、`WORKERS_DEPLOY_SETUP.md`、`scripts/gallery-assets/` 已提交并推送（`9f02537`）。
- [x] 补齐 60 张新增图片：图床仓库实际 **792 张**，此前线上仅 732 张；已用本机部署同步并生成 `thumb`/`large`，manifest `count=792`，Worker 版本 `584881dd-9c0d-48db-8bd6-8a81cb7ff555`；博客线上快照已重建为 792 条。
- [ ] **图床仓库 Actions Secrets 为空**：历史 Action 全部因 `CLOUDFLARE_API_TOKEN` 为空失败（日志：`In a non-interactive environment ...`）。需在仓库 Settings → Secrets and variables → Actions 配置：
  - `CLOUDFLARE_API_TOKEN`：Cloudflare 仪表盘创建 "Edit Cloudflare Workers" Token
  - `CLOUDFLARE_ACCOUNT_ID`：`0418adb034c3403123a31edf40244986`
  未配置前，后续 push 图片不会自动部署，只能继续本机 `deploy-local.mjs`。
- [ ] 本机：hosts 第 34 行补 `img.xinchengp.cn` 并 `ipconfig /flushdns`（管理员权限）；默认 DNS 慢的问题仍存在，优选 IP 下缩略图 48KB 约 0.3–1 秒。
- [ ] 全访客：默认 DNS 的慢边缘仍需图床侧从域名/线路层面解决；`large` 已把灯箱流量从十几 MB 降到百 KB 级，但网格缩略图仍依赖图床链路。

> 20:00 复核：线上画廊静态快照已是 792 条 `thumbnail` / 792 条 `large`，新增的 `heng/0297` 等图片可见。

---

## 10. 预览图与原图错位：根因与修复（2026-10-20 追加）

### 现象

画廊网格里点开某张图，灯箱显示的原图有时与卡片缩略图不是同一张；图库管理器做“编号规整/查重清理”后更容易出现。

### 根因

1. **管理器会重排原图序号**
   - `manager/core/organize.js` 的 `renumberDirectory` 会把删除留下的空洞压缩为 1..N，例如 `0050.png → 0049.png`、`0051.jpg → 0050.jpg`。
   - 图床仓库提交历史中可看到大量这类 rename（2026-10-18 的 470 项变更）。
2. **缩略图按固定路径复用**
   - `build-manifest.mjs` 旧逻辑：`thumbs/<原路径>.webp` 已存在且 mtime 不早于源图时跳过。
   - rename 会保留源文件 mtime，目标序号上的旧缩略图往往“看起来更新”，于是继续被复用；但该序号对应的原图已经换成另一张。
3. **CDN/浏览器长缓存**
   - `_headers` 给 `thumbs/*` 7 天缓存；即使重新生成并覆盖同名文件，旧缓存仍可能继续展示旧缩略图。
4. **实测抽样**
   - 对重排后的 `0049/0050/0059` 下载缩略图与原图做 dHash 对比：
     - `0049` 汉明距离 6（基本一致）
     - `0050` 汉明距离 31（不一致）
     - `0059` 汉明距离 28（不一致）

结论：不是前端灯箱取错索引，而是**缩略图文件内容与当前原图不对应**。网格用 thumb、灯箱用 large/原图，自然出现“预览图和实际对不上”。

### 已实施的修复

1. **缩略图/高清图改为内容寻址**
   - `build-manifest.mjs` 读取源图并计算 SHA-1 前 8 位，变体文件名改为：
     - `thumbs/<原路径去扩展名>-<hash>.webp`
     - `large/<原路径去扩展名>-<hash>.webp`
   - 同一序号换图时 hash 改变，URL 自动变化，既不会复用旧文件，也不会命中 7 天缓存。
   - manifest 条目增加 `hash` 字段；孤儿清理改为“删除没有被当前 manifest 引用的变体”。
   - 博客仓库 `cloudflare/gallery-assets/build-manifest.mjs` 与图床仓库 `scripts/gallery-assets/build-manifest.mjs` 已同步。
2. **管理器查重清理自动压缩序号**
   - 新增 `POST /api/duplicates/keep-best`：把组内非保留图移入回收站，然后把保留图改名为**同目录组内最小序号**。
   - 例：heng 组 `0003 / 0007 / 0011` 保留 `0007` → 其余移入回收站 → `0007` 自动改名为 `0003`。
   - 目标序号被同目录其他文件占用时**不覆盖**，保留原名并提示；部分移入回收站失败时也不改名。
   - “保留最高清”按钮对 MD5 完全重复组和 dHash 相似组都生效。
   - `图片命名规则.md` 和 manager README 已补充该约定。

### 上线还需要做

- [ ] 图床仓库：提交并推送 `scripts/gallery-assets/build-manifest.mjs`（已同步内容寻址逻辑），然后手动触发/等待 `sync-to-r2.yml` 重新生成 hashed thumbs/large。
- [ ] 博客仓库：提交 `cloudflare/gallery-assets/build-manifest.mjs`；下一次静态构建会用新 manifest，或用户点“刷新图库”立即拉取。
- [ ] 部署后抽查 manifest 的 `thumb`/`large` 是否带 `-<hash>`，并确认同一序号换图后 URL 变化。
- [ ] 老 Worker 资产由新版本部署覆盖/清理；旧 URL 仍可能被 CDN 缓存，但 manifest 不再引用它们。

### 验收

- 图库管理器：选择一组相似图 → “保留最高清” → 保留图序号变为组内最小；若目标被占用，界面提示“未改名”。
- 画廊：重排/去重后重新部署，网格缩略图与灯箱原图一致；DevTools 中 thumb/large URL 带内容哈希。
- `build-manifest.mjs` 本地可用 2–3 张图快速验证：改图内容前后 manifest 的 `hash`/`thumb` 必须变化。

---

## 11. 相关文件索引

| 文件 | 作用 |
|---|---|
| `src/app/gallery/GalleryClient.tsx` | 首批 24 张、手动刷新、分类、增量渲染 |
| `src/app/gallery/components/ImageCard.tsx` | 网格卡片；只加载 thumb，8 秒超时，不回退原图 |
| `src/app/gallery/components/ImagePreview.tsx` | 灯箱；缩略图先出、large 后台加载、下载原图 |
| `src/utils/galleryShared.ts` | manifest 解析、`R2_IMAGE_BASE`、`large` 字段 |
| `src/types/gallery.ts` | `thumbnail` / `large` / `ImageLoadStatus` 类型 |
| `src/app/layout.tsx` | `img.xinchengp.cn` preconnect |
| `cloudflare/gallery-assets/build-manifest.mjs` | 缩略图、manifest、`--large-width`、内容哈希命名 |
| `cloudflare/gallery-assets/deploy-local.mjs` | 本机部署，支持 `--large-width` |
| `cloudflare/gallery-assets/assets/_headers` | manifest/原图/缩略图/large 的 CORS 与缓存 |
| `cloudflare/gallery-assets/README.md` | 图床部署与画廊侧约定 |
| `洛佬の美图/manager/core/organize.js` | 编号规整；去重后 `compactKeptSequence` 压缩保留图序号 |
| `洛佬の美图/manager/server.js` | `/api/duplicates/keep-best`：移回收站 + 自动改最小序号 |
| `洛佬の美图/manager/public/app.js` | 查重面板“保留最高清”入口与结果提示 |
