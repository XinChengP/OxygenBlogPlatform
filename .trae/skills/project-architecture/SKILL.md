---
name: "project-architecture"
description: "项目架构和开发规范指南。Invoke when user needs to understand project structure, naming conventions, code standards, or development best practices."
---

# 项目架构技能

## 概述

本技能用于帮助用户理解洛天依主题博客的项目架构、目录结构、命名规范和开发规范。

## 目录结构规范

```
src/
├── app/                    # Next.js App Router
│   ├── about/             # 关于页面
│   ├── archive/           # 文章归档
│   ├── blogs/             # 博客文章动态路由
│   ├── changelogs/        # 更新日志页面
│   ├── gallery/           # 画廊页面
│   ├── guestbook/         # 留言板
│   ├── moments/           # 个人动态
│   ├── settings/          # 设置页面
│   ├── tools/             # 工具页面
│   │   ├── pinyin-converter/     # 拼音转换器
│   │   └── markdown-editor/      # Markdown编辑器
│   └── api/               # API路由
├── components/            # 可复用组件
│   ├── ui/               # 基础UI组件
│   ├── magicui/          # 特效UI组件
│   ├── archive/          # 归档专用组件
│   ├── tools/            # 工具专用组件
│   ├── moments/          # 个人动态组件
│   ├── admin/            # 后台管理组件
│   ├── changelogs/       # 更新日志组件
│   ├── core/             # 核心组件
│   └── widgets/          # 功能组件
├── content/               # 内容文件
│   ├── blogs/            # Markdown博客文章
│   ├── moments/          # Markdown个人动态
│   ├── changelogs/       # 更新日志
│   └── todo.json         # 待办事项数据
├── utils/                 # 工具函数
├── setting/               # 配置文件
├── types/                 # TypeScript类型
├── contexts/              # React上下文
├── hooks/                 # 自定义Hooks
├── services/              # 服务文件
├── lib/                   # 库文件
└── assets/                # 内部资源

public/
├── luotianyi-live2d-master/   # Live2D资源
├── music/                 # 音乐文件
├── tools/                 # 工具相关静态资源
├── assets/               # 静态资源
├── LTY_Picture/          # 洛天依图片资源
├── Blogabout/            # 博客文章图片
├── Momentsabout/         # 个人动态图片
├── friendlink/           # 友链相关
├── js/                   # JavaScript文件
├── api/                  # API相关
└── 404/                  # 404页面
```

## 命名规范

- **组件**: PascalCase (`Navigation.tsx`)
- **工具函数**: camelCase (`assetUtils.ts`)
- **配置文件**: camelCase (`WebSetting.ts`)
- **页面文件**: Next.js约定 (`page.tsx`, `layout.tsx`)

## 代码规范

### TypeScript规范
- 严格模式，接口定义Props
- 禁用any类型
- 函数组件优先
- 明确'use client'标记

### 状态管理
- 局部使用useState/useReducer
- 全局使用React Context或自定义Hooks
- 禁止直接修改状态

### 导入顺序
React → 第三方 → 内部组件 → 工具 → 类型 → 样式

### 事件处理
- 使用camelCase命名: `onClick={handleClick}`
- 列表渲染必须提供稳定key属性

## 样式规范

- **Tailwind优先**: 避免自定义CSS
- **响应式设计**: 使用Tailwind响应式前缀
- **状态样式**: 使用Tailwind状态变体
- **动画**: Framer Motion优先

## 资源管理

### 路径处理
- **核心工具**: `src/utils/assetUtils.ts`
- **关键函数**: `getAssetPath()`, `getBasePath()`, `formatAudioUrl()`

### 图片优化
- **组件**: `OptimizedImage` - 统一图片加载
- **格式**: WebP/AVIF优先
- **懒加载**: 内置支持

## 性能优化

- **代码分割**: Next.js自动分割 + 动态导入
- **包大小**: 定期分析，移除未使用依赖
- **图片格式**: WebP/AVIF优先
- **加载优化**: 懒加载 + 渐进式占位符
- **缓存策略**: 合理设置Cache-Control，关键资源preload
- **编译优化**: 生产环境移除console日志和React属性

## 安全规范

- **前端安全**: TypeScript严格检查，输入验证，XSS防护，CSRF保护，CSP策略
- **依赖安全**: `npm audit`定期检查，Dependabot自动补丁，最小权限原则

## 版本控制

- **提交策略**: 完整功能开发测试后提交，每个提交对应单一逻辑变更
- **分支管理**: main（主分支），feature（功能开发分支）

## 响应式设计规范

- **断点设置**: 移动端(< 640px)、平板端(640px - 1024px)、桌面端(> 1024px)、大屏(> 1280px 可选)
- **适配原则**: 桌面优先，弹性布局，图片响应，字体大小使用rem单位

## 可访问性规范

- **WCAG 2.1 标准**: 颜色对比≥4.5:1，键盘导航支持，屏幕阅读器支持，清晰的焦点指示
- **图片可访问性**: 所有图片提供有意义的alt属性

## 开发环境要求

- **Node.js**: 20.9+ 或更高版本（Next.js 16 要求）
- **npm**: 9.x 或更高版本
- **Git**: 2.x 或更高版本
