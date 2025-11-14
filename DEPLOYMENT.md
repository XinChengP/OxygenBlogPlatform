# GitHub Pages 部署指南

本指南将帮助您将OxygenBlogPlatform项目正确部署到GitHub Pages。

## 前置要求

1. 确保您的GitHub仓库名称与项目中配置的一致
2. 在GitHub仓库设置中启用GitHub Pages
3. 将源代码推送到GitHub

## 配置说明

### 1. 环境变量配置

项目使用环境变量来配置GitHub Pages路径：

- `NEXT_PUBLIC_GITHUB_REPO_NAME`: 您的GitHub仓库名称

在 `.env.production` 文件中：
```env
NEXT_PUBLIC_GITHUB_REPO_NAME=您的仓库名
```

### 2. GitHub Actions自动部署

项目包含 `.github/workflows/deploy.yml`，配置为：
- 推送到main分支时自动触发
- 自动设置仓库名称环境变量
- 构建静态文件并部署到GitHub Pages

### 3. Next.js配置

`next.config.ts` 中的重要配置：
- `basePath`: 设为 `/${repoName}`
- `assetPrefix`: 设为 `/${repoName}`
- `output: "export"`: 启用静态导出
- `trailingSlash: true`: 启用尾随斜杠

## 部署步骤

### 方法一：自动部署（推荐）

1. **推送代码到main分支**：
   ```bash
   git add .
   git commit -m "部署到GitHub Pages"
   git push origin main
   ```

2. **检查GitHub Actions**：
   - 前往您的GitHub仓库
   - 点击 "Actions" 标签
   - 等待构建和部署完成

3. **启用GitHub Pages**：
   - 前往仓库设置 → Pages
   - Source选择 "GitHub Actions"
   - 等待部署完成

### 方法二：手动构建

1. **安装依赖**：
   ```bash
   npm install
   ```

2. **构建项目**：
   ```bash
   npm run build
   ```

3. **将out目录内容部署**：
   - 将 `out` 目录中的所有文件上传到您的网站根目录

## 验证部署

部署完成后，您的网站应该可以在以下地址访问：
```
https://您的用户名.github.io/您的仓库名/
```

### 常见问题

1. **资源加载失败**：
   - 检查环境变量配置是否正确
   - 确认basePath和assetPrefix设置

2. **404错误**：
   - 确保GitHub Pages设置为使用GitHub Actions
   - 检查仓库名称是否与配置一致

3. **样式丢失**：
   - 检查生成的HTML文件中的资源路径
   - 确认assetPrefix配置正确

## 本地预览

在部署前，您可以在本地预览生成的静态文件：

```bash
# 构建项目
npm run build

# 使用任何静态文件服务器预览out目录
# 例如使用Python
cd out
python -m http.server 3000

# 或使用Node.js
npx serve out -p 3000
```

然后访问 `http://localhost:3000` 查看效果。

## 自定义配置

### 修改仓库名

如果您的仓库名称不是 `OxygenBlogPlatform`，请：

1. 修改 `.env.production` 文件：
   ```env
   NEXT_PUBLIC_GITHUB_REPO_NAME=您的实际仓库名
   ```

2. 重新构建项目：
   ```bash
   npm run build
   ```

### 禁用特定功能

如果需要禁用某些功能，可以修改对应的环境变量或在 `next.config.ts` 中调整配置。

---

**注意**：首次部署可能需要几分钟时间，请耐心等待GitHub Actions完成。