# Gitalk 代理服务器部署指南

本指南提供了几种部署 Gitalk 代理服务器的方法，解决跨域问题。

## 方法 1: Vercel 部署（推荐）

Vercel 提供免费的无服务器函数部署，是最简单的方法。

### 步骤：

1. 将项目推送到 GitHub

2. 在 [Vercel](https://vercel.com) 上导入项目

3. 部署完成后，获取你的 Vercel 应用 URL（例如：`https://your-app-name.vercel.app`）

4. 更新 `src/components/GitalkComments.tsx` 中的代理 URL：
   ```typescript
   proxy: proxy || 'https://your-app-name.vercel.app/proxy/login/oauth/access_token'
   ```

## 方法 2: GitHub Actions + GitHub Pages

使用 GitHub Actions 自动部署代理服务器到 GitHub Pages。

### 步骤：

1. 确保仓库启用了 GitHub Pages（在仓库设置中）

2. 推送代码后，GitHub Actions 会自动构建和部署

3. 获取 GitHub Pages URL（例如：`https://yourusername.github.io/yourrepo`）

4. 注意：GitHub Pages 只能托管静态文件，这种方法需要额外的服务器来运行代理

## 方法 3: 自建服务器

如果你有自己的服务器，可以使用 Node.js 运行代理服务器。

### 步骤：

1. 安装依赖：
   ```bash
   npm install express http-proxy-middleware cors
   ```

2. 运行代理服务器：
   ```bash
   node gitalk-github-proxy.js
   ```

3. 更新 `src/components/GitalkComments.tsx` 中的代理 URL：
   ```typescript
   proxy: proxy || 'http://your-server.com:3000/github/oauth'
   ```

## 方法 4: 使用公共代理服务

如果你不想自己部署，可以使用一些公共的 CORS 代理服务。

### 示例：

```typescript
proxy: proxy || 'https://cors-anywhere.herokuapp.com/https://github.com/login/oauth/access_token'
```

注意：公共代理服务可能不稳定，不建议在生产环境中使用。

## 测试

部署完成后，访问你的博客页面，检查 Gitalk 评论功能是否正常工作。

如果遇到问题，请检查浏览器控制台的错误信息，并确保代理服务器配置正确。