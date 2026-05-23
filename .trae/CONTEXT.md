# OxygenBlogPlatform 领域词汇表

本文档定义了项目中的核心领域概念和术语，用于统一沟通语言。

## 核心概念

### 博客文章 (Blog Post / Article)
已发布的博客内容，对公众可见。存储在 `src/content/blogs/` 目录下，使用 Markdown 格式。

**属性：**
- title: 文章标题
- date: 发布日期
- category: 分类
- tags: 标签列表
- excerpt: 摘要
- hidden: 是否隐藏

### 草稿 (Draft)
未发布的文章内容。在项目中，草稿通过 `hidden: true` 标记的文章来实现。

### 个人动态 (Moment)
简短的个人状态更新，类似微博。存储在 `src/content/moments/` 目录下。

**属性：**
- id: 唯一标识
- time: 发布时间
- pinned: 是否置顶
- hidden: 是否隐藏
- tags: 标签
- images: 图片列表

### 画廊 (Gallery)
图片管理和展示系统，支持分类筛选、预览、递归扫描和目录树导航。

### 更新日志 (Changelog)
开发日志记录，包含类型标记（feature/optimize/fix/docs/style/refactor）。

**类型说明：**
- feature: 新功能
- optimize: 性能优化
- fix: Bug 修复
- docs: 文档更新
- style: 样式调整
- refactor: 代码重构

### 待办事项 (Todo)
任务管理，支持优先级（high/medium/low）和完成状态。

### Live2D 看板娘
洛天依互动系统，支持音乐/主题/页面联动、彩蛋消息功能。

## 技术术语

### Server Actions
Next.js 的服务端函数，用于处理表单提交和数据变更。

### 静态导出 (Static Export)
Next.js 的 `output: 'export'` 模式，生成静态 HTML 文件用于 GitHub Pages 部署。

### 深度模块 (Deep Module)
小接口、深实现的模块设计原则。接口简单，内部封装复杂逻辑。

## 命名约定

### 组件命名
- PascalCase: `Navigation.tsx`, `BlogCard.tsx`

### 工具函数命名
- camelCase: `assetUtils.ts`, `formatDate.ts`

### 页面文件命名
- Next.js 约定: `page.tsx`, `layout.tsx`

## 相关文档

- ADR 记录: `.trae/docs/adr/`
- 技能文档: `.trae/skills/`
