# OxygenBlogPlatform 项目规则文档

## 项目概述
OxygenBlogPlatform 是一个基于 Next.js 15.3.4 的现代化个人博客平台，支持 GitHub Pages 静态部署，具有响应式设计和主题切换功能。

## 技术栈规范

### 核心框架
- **Next.js 15.3.4** - 使用 Turbopack 进行快速开发
- **React 19.0.0** - 最新版本的 React
- **TypeScript** - 类型安全的 JavaScript

### 样式系统
- **Tailwind CSS 4** - 原子化 CSS 框架
- **@tailwindcss/typography** - 文章排版样式
- **CSS Variables** - 动态主题色系统

### 功能组件
- **Framer Motion** - 动画和过渡效果
- **Next Themes** - 主题切换管理
- **Heroicons & Lucide React** - 图标库

### 内容处理
- **React Markdown** - Markdown 渲染
- **Remark & Rehype** - Markdown 处理插件
- **Highlight.js** - 代码语法高亮
- **KaTeX** - 数学公式渲染

## 项目架构规范

### 目录结构
```
src/
├── app/           # Next.js App Router 页面
├── components/     # 可复用组件
├── utils/         # 工具函数
├── setting/       # 配置设置
├── types/         # TypeScript 类型定义
└── assets/        # 静态资源
```

### 文件命名规范
- **组件文件**: PascalCase (如 `Navigation.tsx`)
- **工具函数**: camelCase (如 `assetUtils.ts`)
- **配置文件**: camelCase (如 `WebSetting.ts`)
- **页面文件**: 使用 Next.js App Router 约定

### 代码规范
- **ESLint**: 使用 Next.js 推荐的配置
- **TypeScript**: 严格模式启用
- **路径别名**: 使用 `@/*` 指向 `src/*`

## 开发环境配置

### 环境变量
- **开发环境** (`.env.local`): 
  - `NODE_ENV=development`
  - `NEXT_PUBLIC_BASE_PATH=` (空值)
  - `NEXT_PRIVATE_STATIC_EXPORT=false`

- **生产环境** (`.env`):
  - `NEXT_PUBLIC_GITHUB_REPO_NAME=OxygenBlogPlatform`
  - `NEXT_PUBLIC_BASE_PATH=/OxygenBlogPlatform`

### 开发命令
```bash
npm run dev          # 开发服务器 (Turbopack)
npm run build        # 生产构建
npm run sync-theme   # 同步主题颜色
npm run lint         # 代码检查
```

## 静态资源处理规范

### 资源路径管理
- 使用 `src/utils/assetUtils.ts` 中的工具函数处理路径
- 开发环境: 直接使用相对路径
- 生产环境: 自动添加 GitHub Pages basePath

### 图片优化
- 静态导出模式下禁用图片优化 (`unoptimized: true`)
- 使用 `OptimizedImage` 组件进行图片加载

### 音乐文件
- 音乐文件存储在 `public/music/` 目录
- 使用 APlayer 进行音乐播放管理

## 主题系统规范

### 主题色配置
- 在 `src/setting/WebSetting.ts` 中配置主题色
- 支持 10 种预设主题色方案
- 当前使用蓝色主题 (`themePresets.blue`)

### 主题切换
- 支持亮色/暗色/系统主题
- 使用 `next-themes` 进行主题管理
- 主题状态存储在 localStorage

### CSS 变量系统
- 使用 CSS 自定义属性定义颜色变量
- 动态调整颜色亮度和对比度

## 组件开发规范

### 组件结构
```tsx
// 1. 导入依赖
import { useState, useEffect } from 'react';

// 2. 类型定义
interface ComponentProps {
  // 属性定义
}

// 3. 组件实现
export default function Component({}: ComponentProps) {
  // 状态管理
  const [state, setState] = useState();
  
  // 副作用处理
  useEffect(() => {
    // 逻辑处理
  }, []);
  
  // 渲染逻辑
  return (
    // JSX 结构
  );
}
```

### 动画规范
- 使用 Framer Motion 进行动画处理
- 遵循 Material Design 动画原则
- 确保动画性能优化

## 部署配置规范

### GitHub Pages 部署
- 使用 GitHub Actions 自动部署
- 静态导出模式 (`output: "export"`)
- 自动设置 basePath 和 assetPrefix

### 构建配置
```typescript
// next.config.ts
const isStaticExport = process.env.NODE_ENV === 'production';
const repoName = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || 'OxygenBlogPlatform';

const nextConfig = {
  output: "export",
  basePath: `/${repoName}`,
  assetPrefix: `/${repoName}`,
  images: { unoptimized: true },
};
```

### 部署流程
1. 推送到 main 分支触发构建
2. GitHub Actions 执行构建和部署
3. 自动设置环境变量和路径配置

## 性能优化规范

### 代码分割
- 使用 Next.js 自动代码分割
- 动态导入大型组件
- 优化包大小和加载时间

### 图片优化
- 使用 WebP 格式图片
- 实现懒加载和占位符
- 优化图片尺寸和质量

### 缓存策略
- 合理设置 HTTP 缓存头
- 使用 Service Worker 进行离线缓存
- 优化资源加载顺序

## 测试规范

### 单元测试
- 为工具函数编写单元测试
- 测试组件渲染和交互
- 使用 Jest 和 React Testing Library

### 集成测试
- 测试页面路由和导航
- 验证主题切换功能
- 检查响应式设计

## 安全规范

### 内容安全
- 使用 TypeScript 进行类型检查
- 验证用户输入和外部数据
- 防止 XSS 和 CSRF 攻击

### 依赖安全
- 定期更新依赖包
- 使用安全审计工具
- 遵循最小权限原则

## 文档规范

### 代码注释
- 为复杂逻辑添加注释
- 使用 JSDoc 格式注释函数
- 说明组件用途和用法

### README 文档
- 提供项目概述和快速开始
- 说明部署和配置步骤
- 包含故障排除指南

## 版本控制规范

### 提交信息
- 使用约定式提交格式
- 描述功能修改和修复
- 关联 Issue 和 PR

### 分支管理
- main 分支用于生产部署
- feature 分支用于功能开发
- hotfix 分支用于紧急修复

---

*最后更新: 2025年*  
*维护者: 歆橙*