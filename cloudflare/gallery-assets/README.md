# 画廊图床 Worker（gallery-assets / gallery-thumbs / gallery-large）

把洛天依图床图片托管到 Cloudflare Workers 静态资产，走边缘网络以自有域
`img.xinchengp.cn` 提供，替代已失效的 jsDelivr（图床仓库约 2.6GB，远超其
50MB 服务上限）。

> 为什么不是 R2：R2 首次激活强制绑定境外银行卡，无法开通。
> Workers Static Assets 免费档即可承载：静态资产请求免费不限量、单文件上限
> 25 MiB。唯一的约束是**每个 Worker 版本最多 20,000 个文件**，所以按资产类型
> 拆成三个 Worker，各自拥有 20,000 额度。

## 拓扑

```
GitHub 图床仓库 (Eiheir/Luo_Tianyi_Image)
   │ push LTYpicture/** 触发 GitHub Action（排除 manager/ 等代码）
   │  1. build-manifest.mjs 生成 thumbs/、large/、manifest.json
   │  2. split-assets.mjs 按变体拆到 shards/{main,thumbs,large}
   │  3. 依次 wrangler deploy：thumbs → large → main
   ▼
img.xinchengp.cn（同一 hostname，按路径分流）
   ├─ /thumbs/**   → gallery-thumbs   （Route，优先于 Custom Domain）
   ├─ /large/**    → gallery-large    （Route，优先于 Custom Domain）
   ├─ /manifest.json → gallery-assets （Custom Domain 主 Worker）
   └─ /LTYpicture/** → gallery-assets （原图直出）
   ▼
画廊页面：浏览器端拉 /manifest.json 刷新；失败静默回退 GitHub Trees API（testingcf 镜像）
```

| Worker | 资产 | 对外路径 | 上限 |
| --- | --- | --- | ---: |
| `gallery-assets` | `LTYpicture/**` + `manifest.json` + `_headers` | `/LTYpicture/**`、`/manifest.json` | 20,000 文件/版本 |
| `gallery-thumbs` | `thumbs/**` + `_headers` | `/thumbs/**` | 20,000 文件/版本 |
| `gallery-large` | `large/**` + `_headers` | `/large/**` | 20,000 文件/版本 |

Cloudflare 路由按“更具体优先”匹配：同 hostname 上 `/thumbs/*`、`/large/*`
先于 `gallery-assets` 的 Custom Domain 命中分片 Worker，所以 **URL、manifest
相对路径、前端 `R2_IMAGE_BASE` 拼接逻辑全部不用改**。

## 为什么按变体拆，而不是按图片分类

- 每张图固定产生原图 + thumb + large 三份资产，且分居三个顶层目录，按目录拆最自然
- 分类目录增长不均（heng 660、shu 556、emoticon 182、avatar 122），最大的分片会先满
- `wallpapers&illustration` 带 `&`，路由模式要带特殊字符，没必要冒风险
- 按变体拆后三个 Worker 的增长比例一致，容量可预测；路由只有 `/thumbs/*`、`/large/*` 两条

## 目录结构

```
gallery-assets/
├── wrangler.toml          # 主 Worker：LTYpicture/** + manifest.json + _headers
├── wrangler.thumbs.toml   # 缩略图 Worker：thumbs/**（Route /thumbs/*）
├── wrangler.large.toml    # 高清预览 Worker：large/**（Route /large/*）
├── split-assets.mjs       # 按变体拆分，硬链接落盘，并校验文件数/20k 上限
├── build-manifest.mjs     # 缩略图 + 清单生成（本机脚本与 CI 共用，单一事实来源）
├── assets/                # 构建产物（gitignore）
│   ├── manifest.json
│   ├── thumbs/            # thumbs/LTYpicture/**.webp
│   ├── large/             # large/LTYpicture/**.webp（动图不生成）
│   └── LTYpicture/...
├── shards/                # split-assets.mjs 产物（gitignore）
│   ├── main/              # LTYpicture/** + manifest.json + _headers
│   ├── thumbs/            # thumbs/** + _headers
│   └── large/             # large/** + _headers
├── compress-oversized.mjs # 一次性压缩超限原图
├── overridden.json        # 本地压缩覆盖记录
└── deploy-local.mjs       # 本机手动部署脚本（同步 → 构建 → 拆分 → 三次 deploy）
```

## 部署

### 本机手动部署（首次 / 补同步）

```bash
# 前置：npx wrangler login 已登录 Cloudflare（本账号 Workers 可用，无需绑卡）
node deploy-local.mjs --large-width 1600
# 从本机克隆同步图片（不联网）
node deploy-local.mjs --local "W:\Web\洛佬の美图" --large-width 1600
# 图片已就位，只重建变体/清单/分片再部署
node deploy-local.mjs --manifest-only --large-width 1600
# 只生成清单、缩略图与分片，不部署
node deploy-local.mjs --dry-run --large-width 1600

# 单独拆分与校验（不部署）
node split-assets.mjs assets shards
node build-manifest.mjs --large-width 1600
```

部署顺序固定为 **thumbs → large → 主 Worker**：主 Worker 最后上，manifest 才
不会指向尚未部署的变体。

### 图床自动同步（日常）

图床仓库的 GitHub Action（`deploy-gallery.yml`）在 push `LTYpicture/**` 时自动执行：

1. checkout 图床 → 拉取博客仓库的 Worker 骨架
2. `worker/build-manifest.mjs --large-width 1600` 生成缩略图、高清预览图与清单
3. `worker/split-assets.mjs worker/assets worker/shards` 拆分并校验文件数
4. 依次 `wrangler deploy -c wrangler.thumbs.toml`、`wrangler.large.toml`、`wrangler.toml`

`worker/assets/_headers` 随骨架部署；图床仓库另有 `scripts/gallery-assets/`
CI 副本，骨架版本缺少 `--large-width`/`_headers`/`split-assets.mjs` 时兜底。
需要图床仓库配置两个 Secrets：

- `CLOUDFLARE_API_TOKEN`：Cloudflare API Token，权限模板
  "Edit Cloudflare Workers"（含 Workers Scripts:Edit、Workers Routes:Edit、
  Zone:Read），建议限定 zone 资源为 xinchengp.cn 和账号资源为本账号
- `CLOUDFLARE_ACCOUNT_ID`：账号 ID（仪表盘右栏可见）

> CI 中需先 `npm install --no-save sharp`（缩略图生成依赖），把 `LTYpicture/`
> 平铺进 `worker/assets/`，再执行
> `node worker/build-manifest.mjs --root worker/assets --out worker/assets --large-width 1600`，
> 最后 `node worker/split-assets.mjs worker/assets worker/shards`。

## 容量与上限

Workers 免费档每个 Worker 版本最多 20,000 个文件。拆分后（2026-11 数据，1,518 张图）：

| 分片 | 当前文件数 | 约可容纳图片 | 单独跑满时间（按 ~12.4 张/天净增） |
| --- | ---: | ---: | ---: |
| main（原图） | 1,520 | ~19,998 张 | ~4.1 年 |
| thumbs | 1,519 | ~19,999 张 | ~4.1 年 |
| large | 1,351 | ~22,490 张（动图不生成） | ~4.6 年 |

瓶颈是原图/缩略图，整体约 **20,000 张图**，比单 Worker 的约 6,900 张提升约 2.9 倍。
`split-assets.mjs` 在任一分片达到 19,000 时告警、达到 20,000 时直接报错，避免
部署到一半才撞上限。继续扩有三种方式：

- 把某个变体再按二级目录拆（注意 `wallpapers&illustration` 的 `&`，优先按 `heng`/`shu` 拆）
- 升级 Workers Paid（$5/月）：单 Worker 100,000 文件/版本，wrangler ≥ 4.34
- 迁移 R2：无单版本文件数限制，但需要绑卡并改上传流程

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
- 三个 Worker 不是同一个原子版本：部署窗口内，**新增图**不受影响；同一次部署里
  被替换/删除的图，旧 thumb/large 可能在最长约 2 分钟（manifest 缓存）内 404。
  在意原子性可升级 Paid 用单 Worker，或保留上一版变体一个部署周期。
