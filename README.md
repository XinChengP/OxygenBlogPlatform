# 🌸 个人博客 - 洛天依主题

<div align="center">

一个以洛天依为主题的个人博客，基于 Next.js 15.3.4 构建，支持 GitHub Pages 静态部署，集成 Live2D 看板娘、音乐播放器、主题切换等特色功能，用于记录技术学习与生活感悟。

**Live站点**: [https://xinchengp.github.io/OxygenBlogPlatform](https://xinchengp.github.io/OxygenBlogPlatform)

[快速开始](#-快速开始) • [功能特色](#-功能特色) • [博客管理](#-博客管理) • [工具功能](#-工具功能) • [部署指南](#-部署指南)

</div>

## 📋 目录

- [🚀 快速开始](#-快速开始)
- [✨ 功能特色](#-功能特色)
- [📝 博客管理](#-博客管理)
- [🔧 工具功能](#-工具功能)
- [⚙️ 个性化配置](#️-个性化配置)
- [🚀 部署指南](#-部署指南)
- [🌟 特色亮点](#-特色亮点)

## ✨ 功能特色

### 🌸 洛天依主题
- **Live2D看板娘** - 可爱的洛天依会陪伴你的阅读时光，支持互动对话
- **天依音乐** - 精选洛天依歌曲，营造温馨的博客氛围

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
- **拼音转换器** - 汉字转拼音，支持多音字识别和声调显示
- **Markdown编辑器** - 实时预览，支持导出功能和GitHub发布
- **主题切换** - 10种精选主题，随心切换
- **文章归档** - 按分类和时间整理文章

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
date: "2012-07-12"                          # 发布日期
category: "洛天依"                            # 分类（支持：技术、学习、生活、洛天依）
tags: ["React", "洛天依"]                    # 标签
excerpt: "文章摘要"                        # 简短描述
---
```

### 支持的分类
- **技术** - 技术文章和教程
- **学习** - 学习笔记和心得
- **生活** - 生活感悟和随笔
- **洛天依** - 洛天依相关内容

## 🔧 工具功能

### 拼音转换器
访问地址: `/tools/pinyin-converter`

**主要功能:**
- ✅ 汉字转拼音，支持带声调数字显示
- ✅ 智能多音字识别，提供多音字选择
- ✅ 支持只显示多音字模式，便于学习
- ✅ 实时转换，输入即时显示结果
- ✅ 支持拼音首字母提取
- ✅ 支持声调数字与符号转换

### Markdown编辑器
访问地址: `/tools/markdown-editor`

**主要功能:**
- ✅ 实时预览：左侧编辑，右侧实时渲染
- ✅ 语法高亮：支持代码块语法高亮
- ✅ 工具栏：常用格式快捷按钮
- ✅ 导出功能：支持导出为HTML或Markdown
- ✅ 主题适配：自动适配当前主题色
- ✅ GitHub发布：直接发布到GitHub仓库

### 图片与资源
- 图片放在 `public` 文件夹下
- 支持外链图片
- 自动优化图片加载

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


## 🌟 特色亮点

### 设计特色
- **静态导出** - 支持GitHub Pages免费托管
- **响应式设计** - 完美适配各种设备
- **Live2D集成** - 洛天依看板娘互动系统
- **音乐播放** - 跨页面的音乐播放状态保持
- **粒子动画** - 动态背景效果

---

<div align="center">

**🌸 一个温馨的个人博客，记录技术与生活的美好时光**

[⬆️ 返回顶部](#-个人博客---洛天依主题)

</div>
