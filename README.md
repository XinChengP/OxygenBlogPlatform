# 🌸 个人博客 - 洛天依主题

<div align="center">

一个以洛天依为主题的个人博客，记录技术学习与生活感悟。

**Live站点**: [https://your-username.github.io/OxygenBlogPlatform](https://your-username.github.io/OxygenBlogPlatform)

[快速开始](#-快速开始) • [功能特色](#-功能特色) • [博客管理](#-博客管理)

</div>

## 📋 目录

- [🚀 快速开始](#-快速开始)
- [✨ 功能特色](#-功能特色)
- [📝 博客管理](#-博客管理)
- [🎨 主题系统](#-主题系统)
- [⚙️ 个性化配置](#️-个性化配置)
- [🚀 部署指南](#-部署指南)
- [🌟 技术亮点](#-技术亮点)

## ✨ 功能特色

### 🌸 洛天依主题
- **Live2D看板娘** - 可爱的洛天依会陪伴你的阅读时光，支持互动对话
- **天依音乐** - 精选洛天依歌曲，营造温馨的博客氛围
- **主题配色** - 10种主题色可选，包含天依蓝等特色配色

### 🎨 设计亮点
- **响应式设计** - 完美适配手机、平板、桌面设备
- **毛玻璃特效** - 现代化的毛玻璃卡片设计
- **流畅动画** - 页面切换和交互动画自然流畅
- **深色模式** - 支持亮色/暗色/跟随系统三种模式

### 📝 博客功能
- **Markdown写作** - 支持完整的Markdown语法，代码高亮、数学公式等
- **文章归档** - 按时间自动整理文章，方便查找历史内容
- **阅读统计** - 自动计算文章阅读时间
- **评论互动** - 基于GitHub Discussions的评论系统

### 🛠️ 实用工具
- **拼音转换器** - 汉字转拼音，支持多音字识别
- **Markdown编辑器** - 实时预览，支持导出功能
- **主题切换** - 10种精选主题，随心切换

## 🚀 快速开始

### 环境要求
- **Node.js**: >= 22.0.0
- **包管理器**: npm

### 本地运行

1. **克隆项目**
```bash
git clone https://github.com/your-username/OxygenBlogPlatform.git
cd OxygenBlogPlatform
```

2. **安装依赖**
```bash
npm install
```

3. **启动开发服务器**
```bash
npm run dev
```

4. **访问博客**
打开浏览器访问 [http://localhost:3000](http://localhost:3000)

### 常用命令

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build:pages` | 构建GitHub Pages版本 |
| `npm run sync-theme` | 同步主题配置 |
## 📝 博客管理

### 写作方式
博客文章存放在 `src/content/blogs` 文件夹中，使用Markdown格式编写。

### 文章元数据
每篇文章需要添加以下信息：

```yaml
---
title: "文章标题"
date: "2024-01-20"                          # 发布日期
category: "技术"                            # 分类
tags: ["React", "生活"]                    # 标签
excerpt: "文章摘要"                        # 简短描述
---
```

### 工具页面
博客内置了两个实用小工具：

- **拼音转换器**: `/tools/pinyin-converter` - 汉字转拼音工具
- **Markdown编辑器**: `/tools/markdown-editor` - 实时预览编辑器

### 图片与资源
- 图片放在 `public` 文件夹下
- 支持外链图片
- 自动优化图片加载

## 🎨 主题系统

### 10种主题色
- **天依蓝** - 主推荐，清新的蓝色主题
- **薄荷绿** - 自然的绿色主题  
- **薰衣草紫** - 优雅的紫色主题
- **樱花粉** - 温柔的粉色主题
- **暖阳橙** - 活力的橙色主题
- **其他5种** - 红、青、靛、黄、灰主题

### 主题切换
- 亮色/暗色/跟随系统 三种模式
- 选择自动保存，下次访问记住偏好
- 流畅的颜色过渡动画

### 个性化配置
在 `src/setting/` 文件夹中可以自定义：

- **网站信息** - 标题、描述、作者信息
- **导航菜单** - 添加/修改页面链接
- **关于页面** - 个人介绍、技能展示
- **社交链接** - GitHub、邮箱等联系方式
- **页脚信息** - 版权信息、备案号等

## ⚙️ 个性化配置

### 基础配置
在 `src/setting/WebSetting.ts` 中修改：
```typescript
export const WebSetting = {
  title: "我的个人博客",           // 博客标题
  description: "记录技术与生活",   // 博客描述
  author: "你的名字",             // 作者名称
  email: "your-email@example.com", // 联系邮箱
  github: "https://github.com/your-username", // GitHub地址
}
```

### 部署配置
创建 `.env` 文件：
```bash
NEXT_PUBLIC_GITHUB_REPO_NAME=你的仓库名
NEXT_PUBLIC_BASE_PATH=/你的仓库名
```

### 环境变量
- **开发环境**: 使用 `.env.local` 文件
- **生产环境**: 使用 `.env` 文件
- **必需配置**: `NEXT_PUBLIC_GITHUB_REPO_NAME` 和 `NEXT_PUBLIC_BASE_PATH`

## 🚀 部署指南

### GitHub Pages 部署（推荐）

#### 1. 准备工作
- Fork 本项目到你的GitHub账户
- 仓库名建议使用 `OxygenBlogPlatform`

#### 2. 配置项目
修改 `src/setting/WebSetting.ts` 中的个人信息，然后提交到main分支。

#### 3. 启用GitHub Pages
1. 进入仓库 Settings → Pages
2. Source选择 **GitHub Actions**
3. 保存设置

#### 4. 自动部署
项目已配置GitHub Actions，推送代码到main分支会自动部署。

### 自定义域名（可选）
在仓库 Settings → Pages → Custom domain 中设置你的域名。

### 更新博客
只需将写好的Markdown文章放入 `src/content/blogs` 文件夹，然后推送到main分支即可自动更新。


## 🌟 技术亮点

### 技术栈
- **Next.js 15.3.4** - 现代化的React框架
- **React 19.0.0** - 最新版React
- **TypeScript** - 类型安全的开发体验
- **Tailwind CSS 4** - 原子化CSS框架

### 特色实现
- **静态导出** - 支持GitHub Pages免费托管
- **响应式设计** - 完美适配各种设备
- **主题系统** - 10种主题色，支持深色模式
- **Live2D集成** - 独特的看板娘互动体验
- **音乐播放** - 跨页面的音乐播放状态保持

### 性能优化
- **Turbopack** - 快速的开发构建
- **图片优化** - 自动的懒加载和格式优化
- **代码分割** - 自动的代码分割和优化
- **缓存策略** - 智能的缓存机制

---

<div align="center">

**🌸 一个温馨的个人博客，记录技术与生活的美好时光**

[⬆️ 返回顶部](#-个人博客---洛天依主题)

</div>
