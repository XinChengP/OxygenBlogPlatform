# 🚀 Oxygen Blog Platform

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-15.3.4-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0.0-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

一个基于 Next.js 15.3.4 的现代化个人博客平台，支持 GitHub Pages 静态部署，具有响应式设计和主题切换功能。项目集成了洛天依Live2D看板娘、音乐播放器、粒子动画等特色功能。

[快速开始](#-快速开始) • [功能特性](#-功能特性) • [部署指南](#-部署指南)

</div>

## 📋 目录

- [🚀 快速开始](#-快速开始)
- [✨ 功能特性](#-功能特性)
- [📝 博客管理](#-博客管理)
- [⚙️ 项目配置](#️-项目配置)
- [🎨 主题系统](#-主题系统)
- [🚀 部署指南](#-部署指南)
- [🛠️ 技术栈](#️-技术栈)
- [🤝 贡献指南](#-贡献指南)
- [📄 许可证](#-许可证)
- [📞 联系我们](#-联系我们)

## ✨ 功能特性

### 🎨 现代化设计
- **响应式设计** - 完美适配桌面、平板和移动设备
- **主题系统** - 支持10种精心设计的主题色方案，亮色/暗色/系统主题三模式切换
- **毛玻璃特效** - 卡片采用毛玻璃效果，在有背景图的情况下更美观
- **流畅动画** - 使用 Framer Motion 实现流畅的页面过渡和交互动画

### 📝 内容管理
- **Markdown 支持** - 完整的 Markdown 语法支持，包括代码高亮、数学公式、表格等
- **文章分类** - 支持分类和标签系统，便于内容组织
- **自动归档** - 博客文章按时间自动归档，历史记录一目了然
- **阅读时间** - 自动计算文章阅读时间，提升用户体验

### 🎵 特色功能
- **洛天依Live2D** - 集成看板娘互动系统
- **音乐播放器** - 内置 APlayer 音乐播放器，支持播放状态跨页面保持
- **粒子动画** - 动态粒子背景效果，增强视觉体验
- **评论系统** - 集成 Giscus 评论系统，基于 GitHub Discussions
- **拼音转换器** - 支持多音字识别、声调转换、只显示多音字模式
- **Markdown编辑器** - 实时预览、语法高亮、导出功能

### ⚡ 技术优势
- **Next.js 15.3.4** - 使用 Turbopack 进行快速开发，支持 App Router
- **TypeScript** - 严格模式启用的类型安全开发
- **Tailwind CSS 4** - 原子化 CSS 框架，支持深色模式
- **静态导出** - 支持 GitHub Pages 静态部署，无需服务器

## 🚀 快速开始

### 环境要求
- **Node.js**: >= 22.0.0
- **包管理器**: npm、yarn 或 pnpm

### 本地开发

1. **克隆项目**
```bash
git clone https://github.com/your-username/OxygenBlogPlatform.git
cd OxygenBlogPlatform
```

2. **安装依赖**
```bash
npm install
# 或使用其他包管理器
yarn install
pnpm install
```

3. **启动开发服务器**
```bash
npm run dev
# 或使用其他包管理器
yarn dev
pnpm dev
```

4. **访问应用**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 开发命令

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器（Turbopack加速） |
| `npm run build` | 生产构建（自动同步主题） |
| `npm run build:pages` | GitHub Pages专用构建 |
| `npm run sync-theme` | 同步主题颜色配置 |
| `npm run lint` | 代码质量检查 |
| `npm run export` | 静态导出构建 |

### 工具页面访问

| 工具 | 访问路径 |
|------|----------|
| **拼音转换器** | [http://localhost:3000/tools/pinyin-converter](http://localhost:3000/tools/pinyin-converter) |
| **Markdown编辑器** | [http://localhost:3000/tools/markdown-editor](http://localhost:3000/tools/markdown-editor) |
## 📝 博客管理

### 文章存放位置
博客文章存放在 `src/content/blogs` 文件夹中，支持深层嵌套目录结构。

### 工具页面
项目提供两个实用工具页面：

#### 拼音转换器
- **访问路径**: `/tools/pinyin-converter`
- **功能**: 汉字转拼音、多音字识别、声调转换
- **特色**: 支持只显示多音字模式，便于学习

#### Markdown编辑器
- **访问路径**: `/tools/markdown-editor`
- **功能**: 实时预览、语法高亮、导出功能
- **特色**: 支持代码高亮、数学公式、表格等扩展功能

### Markdown 元数据规范

每个 Markdown 文件需要包含以下元数据：

```yaml
---
title: "使用Reference对象数组的示例文章"  # 文章标题（可选，默认为文件名）
date: "2023-11-20"                          # 发布时间（必填）
category: "技术"                            # 文章分类（必填）
tags: ["React", "Next.js", "TypeScript"]    # 标签数组（可选）
readTime: 5                                # 阅读时间分钟数（可选，不填则自动计算）
excerpt: "这是一篇展示如何使用Reference对象数组格式的示例文章"  # 文章摘要（可选）
reference: [                               # 参考来源（可选）
  { description: "Next.js官方文档", link: "https://nextjs.org/docs" },
  { description: "React官方文档", link: "https://reactjs.org/docs/getting-started.html" },
  { description: "TypeScript官方文档", link: "https://www.typescriptlang.org/docs/" },
  { description: "Tailwind CSS文档", link: "https://tailwindcss.com/docs" },
  { description: "MDN Web文档", link: "https://developer.mozilla.org/zh-CN/" }
]
---
```

### 图片管理
- **本地图片**: 存放在 `public` 文件夹下，通过相对路径引用
- **外部图片**: 直接使用完整 URL
- **图片优化**: 自动支持 WebP/AVIF 格式，提供懒加载和占位符

### 代码高亮
支持多种编程语言的语法高亮：
- JavaScript/TypeScript
- Python
- CSS/HTML
- Markdown
- 以及其他常见编程语言

## ⚙️ 项目配置

### 配置文件位置
所有配置文件都位于 `src/setting/` 目录下，采用 TypeScript 类型安全配置。

### 核心配置文件

#### 1. WebSetting.ts - 网站全局配置
```typescript
export const WebSetting = {
  title: "OxygenBlogPlatform",
  description: "一个现代化的个人博客平台",
  author: "你的名字",
  email: "your-email@example.com",
  github: "https://github.com/your-username",
  keywords: ["博客", "技术", "前端", "React", "Next.js"],
  favicon: "/favicon.ico",
  // 主题配置
  theme: {
    current: "blue", // 当前主题色
    presets: themePresets // 10种预设主题
  }
};
```

#### 2. NavigationSetting.ts - 导航栏配置
```typescript
export const NavigationSetting = {
  title: "博客",
  logo: "/assets/logo.png",
  links: [
    { name: "首页", href: "/" },
    { name: "归档", href: "/archive" },
    { name: "关于", href: "/about" },
    { name: "留言板", href: "/guestbook" },
    { name: "工具", href: "/tools" },
    { name: "设置", href: "/settings" }
  ]
};
```

#### 3. AboutSetting.ts - 关于页面配置
```typescript
export const AboutSetting = {
  title: "关于我",
  description: "一个热爱技术的开发者",
  avatar: "/assets/avatar.png",
  socialLinks: [
    { name: "GitHub", url: "https://github.com/your-username", icon: "github" },
    { name: "Twitter", url: "https://twitter.com/your-username", icon: "twitter" },
    { name: "Email", url: "mailto:your-email@example.com", icon: "mail" },
  ],
  skills: ["React", "Next.js", "TypeScript", "Tailwind CSS"],
  bio: "这里可以写一段关于你的介绍..."
};
```

#### 4. FooterSetting.ts - 页脚配置
```typescript
export const FooterSetting = {
  copyright: "© 2024 你的名字. 保留所有权利.",
  links: [
    { name: "GitHub", href: "https://github.com/your-username" },
    { name: "Twitter", href: "https://twitter.com/your-username" },
    { name: "Email", href: "mailto:your-email@example.com" }
  ],
  icp: "京ICP备12345678号",
  gongan: "/gongan.png"
};
```

### 环境变量配置

#### 开发环境 (`.env.local`)
```bash
NODE_ENV=development
NEXT_PUBLIC_BASE_PATH=
NEXT_PRIVATE_STATIC_EXPORT=false
```

#### 生产环境 (`.env`)
```bash
NODE_ENV=production
NEXT_PUBLIC_GITHUB_REPO_NAME=OxygenBlogPlatform
NEXT_PUBLIC_BASE_PATH=/OxygenBlogPlatform
```

### 🎨 主题系统

#### 预设主题色方案
项目内置了 10 种精心设计的主题色方案：

| 主题色 | 名称 | 主色调 | 适用场景 |
|--------|------|--------|----------|
| `blue` | 蓝色主题 | `#3b82f6` | 技术博客、专业网站 |
| `green` | 绿色主题 | `#10b981` | 环保、健康类博客 |
| `purple` | 紫色主题 | `#8b5cf6` | 创意、设计类博客 |
| `pink` | 粉色主题 | `#ec4899` | 生活、时尚类博客 |
| `orange` | 橙色主题 | `#f97316` | 活力、教育类博客 |
| `red` | 红色主题 | `#ef4444` | 新闻、热点类博客 |
| `teal` | 青色主题 | `#14b8a6` | 清新、简约风格 |
| `indigo` | 靛蓝色主题 | `#6366f1` | 商务、企业博客 |
| `yellow` | 黄色主题 | `#eab308` | 阳光、积极风格 |
| `gray` | 灰色主题 | `#6b7280` | 中性、专业风格 |

#### 自定义主题配置
```typescript
// 在 WebSetting.ts 中配置自定义主题
export const customTheme = {
  primary: "#your-color",     // 主色调
  secondary: "#your-color",   // 辅助色
  accent: "#your-color",      // 强调色
  neutral: "#your-color",     // 中性色
  // 更多颜色配置...
};

// 应用自定义主题
export const WebSetting = {
  theme: {
    current: "custom",        // 使用自定义主题
    presets: {
      ...themePresets,
      custom: customTheme     // 添加自定义主题
    }
  }
};
```

#### 主题切换功能
- **亮色/暗色模式**: 自动适配系统主题偏好
- **主题持久化**: 用户选择自动保存到 localStorage
- **平滑过渡**: 使用 CSS 变量实现流畅的主题切换动画
- **无障碍支持**: 支持 prefers-reduced-motion 媒体查询

当前默认使用 **蓝色主题** (`themePresets.blue`)。

## 🚀 部署指南

### 部署选项对比

| 部署平台 | 优势 | 限制 | 推荐场景 |
|----------|------|------|----------|
| **GitHub Pages** | 免费、静态托管、全球CDN | 不支持服务端渲染 | 个人博客、静态网站 |
| **Vercel** | 自动部署、边缘网络、Serverless | 免费版有使用限制 | 生产环境、团队项目 |
| **Netlify** | 持续部署、表单处理、身份验证 | 免费版功能有限 | 静态站点、Jamstack应用 |

### 📦 GitHub Pages 部署（推荐）

#### 1. 准备工作
- Fork 本项目到你的 GitHub 账户
- 确保仓库名为 `OxygenBlogPlatform`（或修改配置）

#### 2. 配置环境变量
在项目根目录创建 `.env` 文件：
```bash
NODE_ENV=production
NEXT_PUBLIC_GITHUB_REPO_NAME=OxygenBlogPlatform
NEXT_PUBLIC_BASE_PATH=/OxygenBlogPlatform
```

#### 3. 启用 GitHub Pages
1. 进入仓库 Settings → Pages
2. 选择 Source: **GitHub Actions**
3. 保存设置

#### 4. 自动部署流程
项目已配置 GitHub Actions，推送代码到 main 分支将自动：
- 执行 `npm run build:pages`
- 生成静态文件到 `out/` 目录
- 部署到 GitHub Pages

### 🌐 Vercel 部署

#### 1. 导入项目
1. 登录 [Vercel](https://vercel.com)
2. 点击 "New Project"
3. 导入你的 GitHub 仓库

#### 2. 配置部署设置
- **Framework Preset**: Next.js
- **Root Directory**: ./ (默认)
- **Build Command**: `npm run build`
- **Output Directory**: .next (默认)

#### 3. 环境变量（可选）
```bash
NODE_ENV=production
```

#### 4. 部署
点击 "Deploy"，Vercel 将自动构建并部署你的应用

### 🔧 自定义域名配置

#### GitHub Pages
1. 在仓库 Settings → Pages → Custom domain
2. 输入你的域名
3. 在域名服务商添加 CNAME 记录

#### Vercel
1. 在项目设置 → Domains
2. 添加自定义域名
3. 按照提示配置 DNS 记录

### 📊 部署状态检查

部署完成后，检查以下内容：
- [ ] 网站可正常访问
- [ ] 主题切换功能正常
- [ ] 图片和资源加载正确
- [ ] 路由导航正常工作
- [ ] 移动端响应式适配

### 🔄 更新部署

#### 自动更新
- 推送代码到 main 分支将触发自动部署
- GitHub Actions 或 Vercel 会自动重新构建

#### 手动更新
```bash
# 本地构建测试
npm run build:pages

# 推送代码
git add .
git commit -m "feat: 更新内容"
git push origin main
```


## 🤝 贡献指南

我们欢迎任何形式的贡献！

### 贡献方式
- 🐛 **报告 Bug**：在 [Issues](https://github.com/your-username/OxygenBlogPlatform/issues) 中提交问题
- 💡 **新功能建议**：提出你的创意想法
- 📝 **改进文档**：帮助完善文档和示例
- 🔧 **代码贡献**：提交 Pull Request

### 开发流程
1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目基于 [MIT License](./LICENSE) 开源协议发布。

MIT License 允许您：
- ✅ 商业使用
- ✅ 修改代码
- ✅ 分发代码
- ✅ 私人使用

但需要：
- 📋 保留版权声明
- 📋 保留许可证声明

详细条款请查看 [LICENSE](./LICENSE) 文件。

## �️ 技术栈

### 核心框架
| 技术 | 版本 | 用途 |
|------|------|------|
| [Next.js](https://nextjs.org/) | 15.3.4 | React 全栈框架，支持 App Router |
| [React](https://reactjs.org/) | 19.0.0 | 用户界面构建库 |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | 类型安全的 JavaScript 超集 |

### 样式系统
| 技术 | 版本 | 用途 |
|------|------|------|
| [Tailwind CSS](https://tailwindcss.com/) | 4.0 | 实用优先的 CSS 框架 |
| [Framer Motion](https://www.framer.com/motion/) | 11.x | 流畅的动画和过渡效果 |
| [Lucide React](https://lucide.dev/) | 最新 | 现代化图标库 |

### 内容处理
| 技术 | 用途 |
|------|------|
| [React Markdown](https://github.com/remarkjs/react-markdown) | Markdown 内容渲染 |
| [Remark](https://remark.js.org/) | Markdown 解析和处理 |
| [Rehype](https://github.com/rehypejs/rehype) | HTML 处理和转换 |
| [Highlight.js](https://highlightjs.org/) | 代码语法高亮 |

### 工具功能
| 功能 | 技术 | 描述 |
|------|------|------|
| **拼音转换器** | pinyin-pro | 支持多音字、声调转换 |
| **Markdown 编辑器** | react-markdown | 实时预览与语法高亮 |
| **Remark/Rehype 插件** | 多个插件 | 扩展 Markdown 功能 |

### 特色功能
| 功能 | 技术 | 描述 |
|------|------|------|
| **Live2D 看板娘** | 洛天依模型 | 交互式虚拟角色 |
| **音乐播放器** | APlayer | 支持播放列表和状态持久化 |
| **粒子动画** | Particles.js | 动态背景效果 |
| **评论系统** | Giscus | 基于 GitHub Discussions |
| **主题系统** | next-themes | 亮色/暗色模式切换 |

感谢所有为这个项目做出贡献的开发者，以及使用 OxygenBlogPlatform 的用户们！

---

<div align="center">

**✨ 感谢您的使用！在使用过程中遇到任何问题，欢迎提出 Issues 或联系开发者，助力平台变得更好！**

[⬆️ 返回顶部](#-oxygenblogplatform)

</div>
