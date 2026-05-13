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
author: "作者名"  # 可选：文章作者
seriesOrder: 1  # 可选：系列文章序号
language: "zh-CN"  # 可选：文章语言
seoTitle: "SEO标题"  # 可选：自定义SEO标题
seoDescription: "SEO描述"  # 可选：自定义SEO描述
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
| author | 否 | 文章作者，用于文章署名展示 |
| seriesOrder | 否 | 系列文章序号，用于系列文章排序 |
| language | 否 | 文章语言，如 `zh-CN`、`en`，用于多语言支持 |
| seoTitle | 否 | 自定义SEO标题，用于页面 `<title>` 标签 |
| seoDescription | 否 | 自定义SEO描述，用于页面 `<meta name="description">` 标签 |

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

## 图片并排显示功能

### 功能说明

博客支持使用 HTML 标签实现图片并排显示，方便展示多张相关图片。

### 使用方法

在 Markdown 文章中使用 `<div>` 标签包裹需要并排显示的图片：

```markdown
<div class="image-grid image-grid-2-cols">
![图片1](/Blogabout/文章名/图片1.webp)
![图片2](/Blogabout/文章名/图片2.webp)
</div>

<div class="image-grid image-grid-3-cols">
![图片1](/Blogabout/文章名/图片1.webp)
![图片2](/Blogabout/文章名/图片2.webp)
![图片3](/Blogabout/文章名/图片3.webp)
</div>
```

### 可用的布局类名

| 类名 | 说明 |
|------|------|
| `image-grid-2-cols` | 2列并排 |
| `image-grid-3-cols` | 3列并排 |
| `image-grid-4-cols` | 4列并排 |

### 示例场景

#### 周边展示（2列）

```markdown
<div class="image-grid image-grid-2-cols">
![初心∞歌词本封面](/LTY_Picture/初心∞歌词本封面.webp)
![初心∞歌词本内页](/LTY_Picture/初心∞歌词本内页.webp)
</div>
```

#### 音乐专辑展示（3列）

```markdown
<div class="image-grid image-grid-3-cols">
![专辑1](/LTY_Picture/专辑1.webp)
![专辑2](/LTY_Picture/专辑2.webp)
![专辑3](/LTY_Picture/专辑3.webp)
</div>
```

#### 画廊展示（4列）

```markdown
<div class="image-grid image-grid-4-cols">
![图片1](/Gallery/图片1.webp)
![图片2](/Gallery/图片2.webp)
![图片3](/Gallery/图片3.webp)
![图片4](/Gallery/图片4.webp)
</div>
```

### 功能特性

- ✅ 支持 2、3、4 列布局
- ✅ 响应式设计，移动端自动切换为单列
- ✅ 点击图片可放大查看大图
- ✅ 悬停时图片微微放大
- ✅ 图片描述文字居中显示
- ✅ 平板端自动调整布局

### 高级布局（自定义比例）

支持不等宽图片排列，适用于需要突出某张图片的场景：

#### 1-2-1 布局（中间占2/4）

```html
<div class="image-grid image-grid-1-2-1">
  <img src="/Blogabout/文章名/图片1.webp" alt="描述1" />
  <img src="/Blogabout/文章名/图片2.webp" alt="描述2" />
  <img src="/Blogabout/文章名/图片3.webp" alt="描述3" />
</div>
```

**效果**：左侧1/4、中间2/4、右侧1/4

#### 1-1-2 布局（右侧占2/3）

```html
<div class="image-grid image-grid-1-1-2">
  <img src="/Blogabout/文章名/图片1.webp" alt="描述1" />
  <img src="/Blogabout/文章名/图片2.webp" alt="描述2" />
</div>
```

**效果**：左侧1/3、右侧2/3

#### 2-1-1 布局（左侧占2/3）

```html
<div class="image-grid image-grid-2-1-1">
  <img src="/Blogabout/文章名/图片1.webp" alt="描述1" />
  <img src="/Blogabout/文章名/图片2.webp" alt="描述2" />
</div>
```

**效果**：左侧2/3、右侧1/3

### 统一高度布局

对于需要整齐排列的图片组，添加 `image-grid-equal-height` 类：

```html
<div class="image-grid image-grid-2-cols image-grid-equal-height">
  <img src="/Blogabout/文章名/图片1.webp" alt="描述1" />
  <img src="/Blogabout/文章名/图片2.webp" alt="描述2" />
</div>
```

**效果**：
- 所有图片高度自动协调
- 保持原始比例，内容完整显示
- 最大高度限制为350px

### 注意事项

- 图片并排布局需要在 `<div class="image-grid ...">` 和 `</div>` 之间放置图片
- 可以混合使用不同的列数布局
- 图片会自动调整大小以填满网格单元格
- 高级布局类名可以组合使用，如 `image-grid-2-cols image-grid-equal-height`

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
author: "歆橙"
seriesOrder: 1
language: "zh-CN"
seoTitle: "VOCALOID6 使用指南 - 详细教程"
seoDescription: "本文详细介绍 VOCALOID6 的安装和基础使用方法，帮助初学者快速上手"
---

# VOCALOID6 使用指南

## 一、安装

...

## 二、基础操作

...
```

### 发癫语录类文章示例

对于洛天依相关的发癫语录类文章，可参考以下结构：

```markdown
---
title: "对洛佬の发癫语录"
date: "2025-11-16"
updatedAt: "2026-04-28"
category: "洛天依"
tags: ["洛天依", "VOCALOID", "发癫"]
excerpt: "华风夏韵，洛水天依"
coverImage: "/Blogabout/fadian/cover.gif"
author: "歆橙"
seriesOrder: 1
language: "zh-CN"
seoTitle: "对洛佬の发癫语录"
seoDescription: "华风夏韵，洛水天依"
---

# 对洛佬の发癫语录

## 1.1

洛佬😋，嘿嘿，佬🤤 ，嘿嘿，佬🤤 ...

## 1.2

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