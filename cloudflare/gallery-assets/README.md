# 画廊图床 Worker（gallery-assets，Workers Static Assets 托管）

把洛天依图床图片托管到 Cloudflare Workers 静态资产，走边缘网络以自有域
`img.xinchengp.cn` 提供，替代已失效的 jsDelivr（图床仓库 1.5GB，远超其
50MB 服务上限）。

> 为什么不是 R2：R2 首次激活强制绑定境外银行卡，无法开通。
> Workers Static Assets 免费档即可承载：静态资产请求免费不限量、
> 每版本 20,000 文件（559 张图）、单文件上限 25 MiB（最大 GIF 4.5MB）。

```
GitHub 图床仓库 (Eiheir/Luo_Tianyi_Image)
   │ push LTYpicture/** 触发 GitHub Action（排除 manager/ 等代码）
   │  1. build-manifest.mjs 生成缩略图 + manifest.json（含宽高）
   │  2. wrangler deploy（增量上传资产 + 部署 Worker）
   ▼
Worker gallery-assets  @ img.xinchengp.cn
   ├─ /manifest.json   图片清单（含 width/height/thumb，画廊浏览器端刷新数据源）
   ├─ /thumbs/**       缩略图（宽 640 WebP，画廊卡片使用，避免下载解码原图）
   └─ /LTYpicture/**   原图直出（边缘缓存，预览大图使用）
   ▼
画廊页面：浏览器端拉 /manifest.json 刷新；失败静默回退 GitHub Trees API（testingcf 镜像）
```

## 目录结构

```
gallery-assets/
├── wrangler.toml      # Worker 配置（assets 目录、自定义域）
├── build-manifest.mjs # 缩略图 + 清单生成（本机脚本与 CI 共用，单一事实来源）
├── assets/            # 部署时生成的图片资产（gitignore，不入库）
│   ├── manifest.json
│   ├── thumbs/        # 缩略图：thumbs/LTYpicture/**.webp
│   └── LTYpicture/...
├── compress-oversized.mjs # 一次性压缩超限原图
└── deploy-local.mjs   # 本机手动部署脚本（拉取图床 → 生成缩略图/清单 → wrangler deploy）
```

## 部署

### 本机手动部署（首次 / 补同步）

```bash
# 前置：npx wrangler login 已登录 Cloudflare（本账号 Workers 可用，无需绑卡）
node deploy-local.mjs            # 全量：拉取图床全部图片到 assets/、生成缩略图与清单并部署
node deploy-local.mjs --manifest-only   # 图片已就位时：只重建缩略图与清单再部署
node build-manifest.mjs          # 仅本机生成缩略图与清单（不部署，用于校验）

# 可选：同时生成灯箱用的高清预览图（large/，建议 1280 或 1600 宽）
# 会让 Worker 资产数量/体积增加约一倍，部署前确认未超过 Workers 限额
node deploy-local.mjs --large-width 1600
node build-manifest.mjs --large-width 1600
```

### 图床自动同步（日常）

图床仓库的 GitHub Action（`sync-to-r2.yml`，名称沿用）在 push `LTYpicture/**`
时自动执行：checkout 图床 → 拉取博客仓库的 Worker 骨架 → 调用
`worker/build-manifest.mjs --large-width 1600` 生成缩略图、高清预览图与清单 →
wrangler deploy。`worker/assets/_headers` 随骨架部署；图床仓库另有
`scripts/gallery-assets/` CI 副本，骨架版本缺少 `--large-width`/`_headers` 时兜底。
需要图床仓库配置两个 Secrets：

- `CLOUDFLARE_API_TOKEN`：Cloudflare API Token，权限模板
  "Edit Cloudflare Workers"（含 Workers Scripts:Edit、Zone:Read），建议限定
  zone 资源为 xinchengp.cn 和账号资源为本账号
- `CLOUDFLARE_ACCOUNT_ID`：账号 ID（仪表盘右栏可见）

> CI 中需先 `npm install --no-save sharp`（缩略图生成依赖），把 `LTYpicture/`
> 平铺进 `worker/assets/`，再执行
> `node worker/build-manifest.mjs --root worker/assets --out worker/assets --large-width 1600`

## 画廊侧约定

- 清单接口：`GET /manifest.json` → `{ generatedAt, count, images: [{ path, size, width, height, hash, thumb, large?, animated? }] }`
  - `thumb` 为缩略图相对路径（如 `thumbs/LTYpicture/xx/001-<hash>.webp`），缺失时前端自动回退原图
  - 多帧源（GIF/APNG/动态 WebP）的 `thumb` 是**动态 WebP**，文件名带 `-anim`（如 `001-<hash>-anim.webp`），网格里保留动画
  - `large` 为可选高清预览图（如 `large/LTYpicture/xx/001-<hash>.webp`），灯箱优先使用；缺失时回退原图
  - 动图源不生成 `large`，灯箱直接回退原始 GIF/APNG，避免再生成一份体积不可控的动态大图；`animated: true` 便于排查
  - **变体文件名包含源图内容哈希**：图库管理器重排/去重导致同一序号换图时，thumb/large 会自动换 URL，
    不会出现“网格还是旧图、灯箱已是新图”的错位，也不会命中 7 天 CDN 缓存
  - 动图缩略图使用独立文件名，旧的静态首帧缩略图会被构建脚本作为孤儿清理
- 图片 URL：`GET /{path}`，path 同 GitHub 仓库相对路径（`LTYpicture/...`）
- 缩略图 URL：`GET /{thumb}`
- 高清预览图 URL：`GET /{large}`
- 画廊代码（`src/utils/galleryShared.ts` 的 `R2_IMAGE_BASE` 常量，沿用原名）指向
  `https://img.xinchengp.cn`，不可用时自动回退 testingcf 镜像
