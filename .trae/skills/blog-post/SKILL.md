---
name: "blog-post"
description: "创建和管理博客文章。Invoke when user wants to create a new blog post, edit existing blog posts, or needs help with blog content structure."
---

# 博客文章管理技能

## 概述

本技能用于帮助用户创建、编辑和管理洛天依主题博客的文章内容。

## 文章文件结构

文章存储在 `src/content/blogs/` 目录下，使用 Markdown 格式。

### 文章前置元数据 (Frontmatter)

```yaml
---
title: "文章标题"
date: "YYYY-MM-DD"
updatedAt: "YYYY-MM-DD"  # 可选：文章更新时间
category: "分类"
tags: ["标签1", "标签2"]
excerpt: "文章摘要"
coverImage: "/Blogabout/xxx/图片.webp"  # 可选：封面图片路径
hidden: false  # 可选：设置为true隐藏文章
---
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| title | 是 | 文章标题 |
| date | 是 | 发布日期，格式 `YYYY-MM-DD` |
| updatedAt | 否 | 更新日期，用于时效性提示 |
| category | 是 | 文章分类，如：技术、生活、洛天依、学习笔记、项目文档 |
| tags | 是 | 标签数组，3-5个为宜，使用小写字母和连字符 |
| excerpt | 是 | 文章摘要，用于列表展示 |
| coverImage | 否 | 封面图片路径，推荐 `/Blogabout/文章名/图片.webp` |
| hidden | 否 | 是否隐藏文章，`true` 或 `false`，默认 `false` |

### 内容分类标准

- **技术文章**: 编程、开发、技术分享
- **生活随笔**: 个人感悟、生活记录
- **洛天依**: VOCALOID、洛天依相关内容
- **学习笔记**: 学习过程中的笔记总结
- **项目文档**: 项目相关的说明文档

### 标签使用规范

- 使用小写字母
- 多词标签使用连字符，如 `machine-learning`
- 每篇文章标签数量控制在 3-5 个
- 相同概念使用相同标签

## 时效性说明规则

仅技术分类文章显示时效性说明：

- **超过3年**: 黄色警告样式，提示"本文于 XXXX 年发布/更新，距今已超过 X 年，文中内容可能已过时"
- **超过1年**: 蓝色信息样式，提示"本文于 XXXX 年发布/更新，距今已超过 X 年，部分内容可能已更新"

## 图片引用规范

```markdown
![图片描述](/Blogabout/文章名/图片.webp)
```

图片存储在 `public/Blogabout/文章名/` 目录下。

## 创建新文章步骤

1. 确定文章文件名（使用英文，如 `my-new-post.md`）
2. 创建文件在 `src/content/blogs/` 目录
3. 编写前置元数据
4. 编写 Markdown 内容
5. 如有图片，放入 `public/Blogabout/文章名/` 目录

## 示例文章结构

```markdown
---
title: "VOCALOID6 使用指南"
date: "2025-01-15"
updatedAt: "2025-06-20"
category: "技术"
tags: ["vocaloid", "音乐制作", "教程"]
excerpt: "详细介绍 VOCALOID6 的安装和基础使用方法"
coverImage: "/Blogabout/vocaloid6-guide/cover.webp"
---

# VOCALOID6 使用指南

## 一、安装

...

## 二、基础操作

...
```

## 隐藏文章功能

### 设置隐藏

在文章 frontmatter 中添加 `hidden: true`：

```yaml
---
title: "草稿文章"
date: "2026-04-11"
category: "技术"
tags: ["草稿"]
excerpt: "这是一篇隐藏的文章"
hidden: true  # 隐藏此文章
---
```

### 隐藏文章特性

- 隐藏文章不会显示在博客列表和归档页面
- 知道文章链接的用户仍可直接访问
- 在归档页面可以通过"显示隐藏文章"筛选器查看
- 后台管理系统可以管理隐藏状态

### 使用场景

- 草稿文章，尚未完成
- 私密内容，仅通过链接分享
- 过时内容，保留但不展示

## 目录结构规范

```
src/content/blogs/          # Markdown博客文章
public/Blogabout/           # 博客文章图片
```

## 时效性说明规则

仅技术分类文章显示时效性说明：

- **超过3年**: 黄色警告样式，提示内容可能已过时
- **超过1年**: 蓝色信息样式，提示部分内容可能已更新
- **时间计算**: 优先使用 `updatedAt` 日期，否则使用 `date` 日期

## 内容分类标准

- **技术文章**: 编程、开发、技术分享
- **生活随笔**: 个人感悟、生活记录
- **洛天依**: VOCALOID、洛天依相关内容
- **学习笔记**: 学习过程中的笔记总结
- **项目文档**: 项目相关的说明文档

## 标签使用规范

- 使用小写字母
- 多词标签使用连字符，如 `machine-learning`
- 每篇文章标签数量控制在 3-5 个
- 相同概念使用相同标签

## 注意事项

- 技术文章建议添加 `updatedAt` 字段
- 图片优先使用 WebP 格式
- 文件名使用英文，避免特殊字符
- 文章内容使用 Markdown 格式编写
- 隐藏文章修改后需要重新构建部署才能生效
