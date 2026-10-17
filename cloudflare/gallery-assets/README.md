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
   │  1. 生成 manifest.json（图片清单）
   │  2. wrangler deploy（增量上传资产 + 部署 Worker）
   ▼
Worker gallery-assets  @ img.xinchengp.cn
   ├─ /list            脚本读 manifest.json 返回清单（缓存 2 分钟）
   └─ /LTYpicture/**   静态资产直出（边缘缓存）
   ▼
画廊页面：浏览器端拉 /list 刷新；失败静默回退 GitHub Trees API（testingcf 镜像）
```

## 目录结构

```
gallery-assets/
├── wrangler.toml      # Worker 配置（assets 目录、/list 拦截、自定义域）
├── src/index.js       # 仅处理 /list；图片由静态资产直出不经过脚本
├── assets/            # 部署时生成的图片资产（gitignore，不入库）
│   ├── manifest.json
│   └── LTYpicture/...
└── deploy-local.mjs   # 本机手动部署脚本（拉取图床 → 生成清单 → wrangler deploy）
```

## 部署

### 本机手动部署（首次 / 补同步）

```bash
# 前置：npx wrangler login 已登录 Cloudflare（本账号 Workers 可用，无需绑卡）
node deploy-local.mjs            # 全量：拉取图床全部图片到 assets/ 并部署
node deploy-local.mjs --manifest-only   # 只重新生成清单并部署（图片已就位时）
```

### 图床自动同步（日常）

图床仓库的 GitHub Action（`sync-to-r2.yml`，名称沿用）在 push `LTYpicture/**`
时自动执行与上面相同的流程：checkout 图床 → 生成 manifest → wrangler deploy。
需要图床仓库配置两个 Secrets：

- `CLOUDFLARE_API_TOKEN`：Cloudflare API Token，权限模板
  "Edit Cloudflare Workers"（含 Workers Scripts:Edit、Zone:Read），建议限定
  zone 资源为 xinchengp.cn 和账号资源为本账号
- `CLOUDFLARE_ACCOUNT_ID`：账号 ID（仪表盘右栏可见）

## 画廊侧约定

- 清单接口：`GET /list` → `{ generatedAt, count, images: [{path,size,lastModified}] }`
- 图片 URL：`GET /{path}`，path 同 GitHub 仓库相对路径（`LTYpicture/...`）
- 画廊代码（`src/utils/galleryShared.ts` 的 `R2_IMAGE_BASE` 常量，沿用原名）指向
  `https://img.xinchengp.cn`，R2 不可用时自动回退 testingcf 镜像
