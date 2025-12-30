# 🌸 个人博客 - 洛天依主题

<div align="center">

一个以洛天依为主题的个人博客，基于 Next.js 15.3.4 构建，支持 GitHub Pages 静态部署，集成 Live2D 看板娘、音乐播放器、主题切换等特色功能。

**Live站点**: [https://blog.xinchengp.cn](https://blog.xinchengp.cn)

[快速开始](#-快速开始) • [功能特色](#-功能特色) • [博客管理](#-博客管理) • [部署指南](#-部署指南)

</div>

## 📋 目录

- [🚀 快速开始](#-快速开始)
- [✨ 功能特色](#-功能特色)
- [📝 博客管理](#-博客管理)
- [🚀 部署指南](#-部署指南)
- [🌟 特色亮点](#-特色亮点)

## ✨ 功能特色

### 🌸 洛天依主题
- **Live2D看板娘** - 可爱的洛天依互动陪伴
- **天依音乐** - 精选洛天依歌曲播放

### 🎨 设计亮点
- **响应式设计** - 适配各种设备
- **毛玻璃特效** - 现代化卡片设计
- **流畅动画** - 自然的交互动画
- **深色模式** - 支持亮色/暗色/跟随系统

### 📝 博客功能
- **Markdown写作** - 完整Markdown支持
- **文章归档** - 自动按时间整理
- **阅读统计** - 自动计算阅读时间
- **评论互动** - GitHub Discussions评论系统

### 🛠️ 实用工具
- **拼音转换器** - 汉字转拼音，支持多音字
- **Markdown编辑器** - 实时预览，支持导出

## 🚀 快速开始

### 环境要求
- **Node.js**: >= 22.0.0
- **包管理器**: npm

### 本地运行

1. **克隆项目**
```bash
git clone https://github.com/xinchengp/OxygenBlogPlatform.git
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
| `npm run build` | 构建生产版本 |
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
category: "洛天依"                            # 分类（技术、学习、生活、洛天依）
tags: ["React", "洛天依"]                    # 标签
excerpt: "文章摘要"                        # 简短描述
---
```

### 图片管理
- 图片放在 `public` 文件夹下
- 支持外链图片

## 🚀 部署指南

### GitHub Pages 部署

1. **配置环境变量**
创建 `.env` 文件：
```bash
NEXT_PUBLIC_GITHUB_REPO_NAME=OxygenBlogPlatform
NEXT_PUBLIC_BASE_PATH=
```

2. **构建项目**
```bash
npm run build
```

3. **推送代码**
项目已配置GitHub Actions，推送代码到main分支会自动部署到GitHub Pages。

### 自定义域名

1. 在GitHub仓库Settings → Pages中设置你的自定义域名
2. 确保 `.env` 文件中 `NEXT_PUBLIC_BASE_PATH` 为空字符串
3. 推送代码后等待自动部署完成

### 更新博客
将写好的Markdown文章放入 `src/content/blogs` 文件夹，推送代码到main分支即可自动更新。

## 🌟 特色亮点

- **静态导出** - GitHub Pages免费托管
- **响应式设计** - 适配各种设备
- **Live2D集成** - 洛天依看板娘互动系统
- **音乐播放** - 跨页面音乐播放
- **粒子动画** - 动态背景效果

---

<div align="center">

**🌸 一个温馨的个人博客，记录技术与生活的美好时光**

[⬆️ 返回顶部](#-个人博客---洛天依主题)

</div>
