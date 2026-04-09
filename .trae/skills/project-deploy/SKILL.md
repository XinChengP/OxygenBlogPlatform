---
name: "project-deploy"
description: "部署博客到GitHub Pages或本地预览。Invoke when user wants to deploy the blog, configure deployment settings, or preview the production build locally."
---

# 项目部署技能

## 概述

本技能用于帮助用户将洛天依主题博客部署到 GitHub Pages 或本地预览构建结果。

## 部署方式

### 1. GitHub Pages 自动部署（推荐）

项目已配置 GitHub Actions 工作流，推送到 `main` 分支会自动触发部署。

#### 配置文件

`.github/workflows/deploy.yml`

#### 自动部署流程

1. 推送代码到 `main` 分支
2. GitHub Actions 自动触发构建
3. 构建完成后自动部署到 GitHub Pages
4. 访问 `https://你的用户名.github.io/仓库名` 查看

### 2. 手动部署

#### 构建命令

```bash
# 标准构建（自动同步主题）
npm run build

# GitHub Pages 专用构建
npm run build:pages
```

#### 本地预览构建结果

```bash
# 构建后启动本地服务器预览
npm run serve

# 或直接使用 next start（非静态导出模式）
npm start
```

## 环境配置

### 开发环境 (.env.local)

```bash
NODE_ENV=development
NEXT_PUBLIC_BASE_PATH=              # 空值，本地开发
NEXT_PRIVATE_STATIC_EXPORT=false
```

### 生产环境 - GitHub Pages 默认域名 (.env)

```bash
NODE_ENV=production
NEXT_PUBLIC_GITHUB_REPO_NAME=你的仓库名
NEXT_PUBLIC_BASE_PATH=/你的仓库名  # GitHub Pages路径前缀
```

### 生产环境 - 自定义域名 (.env)

```bash
NODE_ENV=production
NEXT_PUBLIC_GITHUB_REPO_NAME=你的仓库名
NEXT_PUBLIC_BASE_PATH=             # 空值，自定义域名不需要仓库名前缀
NEXT_PUBLIC_SITE_URL=https://your-domain.com
CUSTOM_DOMAIN=true
```

## 构建配置

### Next.js 配置 (next.config.ts)

```typescript
const nextConfig = {
  // 静态导出配置
  output: "export",
  distDir: 'out',
  trailingSlash: true,

  // 根据环境变量自动设置 basePath 和 assetPrefix
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',

  // 图片配置（静态导出时必须禁用优化）
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};
```

### 关键环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `NODE_ENV` | 环境模式 | `production` / `development` |
| `NEXT_PUBLIC_BASE_PATH` | 基础路径 | `/repo-name` 或空字符串 |
| `NEXT_PUBLIC_GITHUB_REPO_NAME` | GitHub 仓库名 | `OxygenBlogPlatform` |
| `NEXT_PUBLIC_SITE_URL` | 网站 URL | `https://blog.xinchengp.cn` |
| `CUSTOM_DOMAIN` | 是否使用自定义域名 | `true` / `false` |

## 部署步骤

### 首次部署到 GitHub Pages

1. **创建 GitHub 仓库**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/用户名/仓库名.git
   git push -u origin main
   ```

2. **启用 GitHub Pages**
   - 进入仓库 Settings > Pages
   - Source 选择 "GitHub Actions"

3. **等待自动部署**
   - 推送代码后，Actions 会自动构建部署
   - 在 Actions 标签页查看构建状态

4. **访问网站**
   - 默认域名：`https://用户名.github.io/仓库名`
   - 自定义域名：在 Settings > Pages 中配置

### 配置自定义域名

1. **添加 DNS 记录**
   - 类型：`CNAME`
   - 名称：`blog`（子域名）或 `@`（根域名）
   - 值：`用户名.github.io`

2. **创建 CNAME 文件**
   - 在 `public/` 目录创建 `CNAME` 文件
   - 内容：`your-domain.com`

3. **修改环境变量**
   ```bash
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   CUSTOM_DOMAIN=true
   NEXT_PUBLIC_BASE_PATH=
   ```

4. **更新 GitHub Actions**
   ```yaml
   - name: Build project
     run: |
       export CUSTOM_DOMAIN="true"
       export NEXT_PUBLIC_SITE_URL="https://your-domain.com"
       export NEXT_PUBLIC_BASE_PATH=""
       npm run build:pages
   ```

## 构建命令详解

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器（Turbopack） |
| `npm run build` | 生产环境构建（自动同步主题） |
| `npm run build:pages` | GitHub Pages 专用构建 |
| `npm run export` | 静态导出（同 build） |
| `npm run serve` | 本地预览构建结果 |
| `npm run lint` | 代码检查 |
| `npm run sync-theme` | 同步主题配置 |

## 部署前检查清单

- [ ] 代码已提交到 Git
- [ ] 运行 `npm run lint` 无错误
- [ ] 本地构建成功 `npm run build`
- [ ] 本地预览正常 `npm run serve`
- [ ] 环境变量配置正确
- [ ] 图片资源已放入 `public/` 目录
- [ ] 文章文件格式正确

## 常见问题

### 资源 404 错误

检查 `NEXT_PUBLIC_BASE_PATH` 配置：
- 默认域名：设置为 `/仓库名`
- 自定义域名：设置为空字符串

### 图片不显示

- 静态导出时图片优化已禁用
- 确保图片路径以 `/` 开头
- 检查图片是否在 `public/` 目录

### 构建失败

1. 检查 Node.js 版本（需 20.9+）
2. 删除 `node_modules` 和 `package-lock.json` 重新安装
3. 检查是否有语法错误：`npm run lint`

### 部署后样式丢失

- 检查 `basePath` 和 `assetPrefix` 配置
- 确保 CSS 文件正确生成在 `out/` 目录

## 性能优化

### 构建优化

- 启用代码分割
- 图片懒加载
- 资源压缩
- Tree Shaking

### 缓存策略

- 静态资源：长期缓存（1年）
- HTML 文件：不缓存
- API 路由：不缓存

## 注意事项

- GitHub Pages 免费版有 1GB 存储限制
- 构建时间限制为 6 小时
- 自定义域名需要正确配置 DNS
- 静态导出不支持 API 路由的服务端功能
- 每次推送 `main` 分支都会触发重新部署
