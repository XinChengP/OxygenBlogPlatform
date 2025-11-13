# GitHub Pages部署配置检查清单

## 项目配置检查

### 1. GitHub Actions工作流配置
- 确保 `.github/workflows/deploy.yml` 文件存在并正确配置
- 工作流应包含：
  - 代码检出（actions/checkout@v4）
  - Node.js环境设置（actions/setup-node@v4）
  - 依赖安装（npm install）
  - 项目构建（npm run build）
  - 上传到GitHub Pages（actions/upload-pages-artifact@v3）
  - 部署到GitHub Pages（actions/deploy-pages@v4）

### 2. Next.js配置
- 确保 `next.config.ts` 包含正确的静态导出配置：
  ```typescript
  const nextConfig = {
    // 只在生产模式下启用静态导出和GitHub Pages配置
    ...(process.env.NODE_ENV === "production" && {
      // GitHub Pages静态导出配置
      output: "export",
      // 使用out目录作为输出目录
      distDir: 'out',
      trailingSlash: true,
      
      // 静态导出时的资源前缀配置
      basePath: (() => {
        if (!process.env.GITHUB_ACTIONS) return "";
        
        const repoName = process.env.REPO_NAME || 
                        process.env.GITHUB_REPOSITORY?.split("/")[1] || 
                        "blog-platform";
        
        // 如果仓库名以 .github.io 结尾，说明是用户主页仓库，不需要 basePath
        if (repoName.endsWith(".github.io")) {
          return "";
        }
        
        return `/${repoName}`;
      })(),
      
      // 图片配置（仅在静态导出模式下需要）
      images: {
        // 静态导出时必须禁用图片优化
        unoptimized: true,
      },
    }),
    
    // 环境变量配置，供客户端组件使用
    env: {
      NEXT_PUBLIC_BASE_PATH: (() => {
        if (!process.env.GITHUB_ACTIONS) return "";
        
        const repoName = process.env.REPO_NAME || 
                        process.env.GITHUB_REPOSITORY?.split("/")[1] || 
                        "blog-platform";
        
        // 如果仓库名以 .github.io 结尾，说明是用户主页仓库，不需要 basePath
        if (repoName.endsWith(".github.io")) {
          return "";
        }
        
        return `/${repoName}`;
      })()
    },
  };
  ```

### 3. 路径处理
- 确保所有组件中的资源路径都正确处理了basePath
- 对于静态资源（如图片、音乐文件），确保路径以"/"开头
- 在开发环境（localhost）不使用basePath
- 在生产环境使用正确的basePath

### 4. 构建脚本
- 确保 `package.json` 中的构建脚本正确：
  ```json
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "npm run sync-theme && next build",
    "start": "next start",
    "lint": "next lint",
    "sync-theme": "node scripts/sync-theme-colors.js"
  }
  ```

## 部署流程

### 1. 创建GitHub仓库
- 创建一个新的GitHub仓库
- 设置仓库名称（重要：名称将用作basePath）

### 2. 启用GitHub Pages
- 在仓库设置中启用GitHub Pages
- 源设置为"GitHub Actions"

### 3. 推送代码
- 提交所有代码到GitHub仓库
- 推送到main分支（默认分支）

### 4. 监控Actions
- 查看GitHub Actions标签页的构建进度
- 确保所有步骤都成功完成

### 5. 验证部署
- 访问部署的网站URL：https://{username}.github.io/{repository-name}
- 检查所有页面和功能是否正常工作

## 常见问题与解决方案

### 问题1：静态资源404错误
**解决方案**：
- 确保静态资源路径以"/"开头
- 检查basePath是否正确设置
- 确保资源文件在public目录中

### 问题2：页面路由404错误
**解决方案**：
- 确保 `trailingSlash: true` 在Next.js配置中
- 确保所有内部链接都添加了尾随斜杠
- 检查静态导出的链接处理

### 问题3：404.html未找到
**解决方案**：
- 确保在 `public` 目录中添加了 `404.html` 文件
- 这个文件在GitHub Pages的自定义404页面中起关键作用

## 备注

- 对于用户主页（username.github.io），basePath应为空字符串
- 对于项目主页（username.github.io/project-name），basePath应为"/project-name"
- 部署完成后，可能需要清除浏览器缓存以查看最新更改
- 对于大文件（如视频），考虑使用Git LFS来管理