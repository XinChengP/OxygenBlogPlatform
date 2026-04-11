---
name: "moment-post"
description: "创建和管理个人动态。Invoke when user wants to create a new moment/post, edit existing moments, or needs help with moment content structure."
---

# 个人动态管理技能

## 概述

本技能用于帮助用户创建、编辑和管理个人动态（朋友圈/说说风格的内容）。

## 动态文件结构

动态存储在 `src/content/moments/` 目录下，使用 Markdown 格式。

### 动态前置元数据 (Frontmatter)

```yaml
---
id: "动态ID"
time: "YYYY-MM-DD HH:MM:SS"
pinned: false  # 可选：设置为 true 可置顶
hidden: false  # 可选：设置为 true 可隐藏
tags:
  - "标签1"
  - "标签2"
images:
  - "/LTY_Picture/图片1.jpeg"
  - "/LTY_Picture/图片2.png"
---
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| id | 是 | 动态唯一标识，如 `first-moment` |
| time | 是 | 发布时间，格式 `YYYY-MM-DD HH:MM:SS`，使用北京时间（UTC+8） |
| pinned | 否 | 是否置顶，`true` 或 `false`，默认 `false` |
| hidden | 否 | 是否隐藏，`true` 或 `false`，默认 `false` |
| tags | 否 | 标签数组，用于分类 |
| images | 否 | 图片路径数组，支持多张图片 |

### 时间格式规范

- **格式**: `YYYY-MM-DD HH:MM:SS`，精确到秒
- **时区**: 使用北京时间（UTC+8）
- **排序**: 按时间倒序排序，置顶动态优先

### 置顶功能

- 在 YAML 前置元数据中添加 `pinned: true`
- 置顶动态显示在列表最前面，带有"置顶"标签
- 建议最多置顶 3 条动态，保持列表整洁

## 图片功能规范

### 图片存储

- 图片存储在 `public/LTY_Picture/` 或 `public/Momentsabout/` 目录
- 支持本地上传和画廊选择两种方式

### 图片显示

- 图片以九宫格形式排列
- 正方形缩小显示
- 点击图片可以放大显示，支持左右翻页
- 支持精细的缩放控制（+/-/0键）、鼠标拖拽查看、缩放百分比显示

### 图片路径示例

```yaml
images:
  - "/Momentsabout/1.jpeg"
  - "/LTY_Picture/2.png"
  - "/Momentsabout/图片名称.jpg"
```

## 创建新动态步骤

1. 确定动态 ID（唯一标识）
2. 创建文件在 `src/content/moments/` 目录，建议命名格式：`{序号}-{id}.md`，如 `00002-new-moment.md`
3. 编写前置元数据
4. 编写 Markdown 内容
5. 如有图片，放入 `public/LTY_Picture/` 或 `public/Momentsabout/` 目录

## 示例动态结构

```markdown
---
id: "travel-2025"
time: "2025-08-15 14:30:00"
pinned: false
tags:
  - "旅行"
  - "洛天依"
images:
  - "/Momentsabout/travel1.webp"
  - "/LTY_Picture/travel2.webp"
---

今天去了洛天依演唱会现场！氛围真的太棒了，心率都要爆了！🎵

期待下一次的相遇～
```

## 隐藏动态功能

### 设置隐藏

在动态 frontmatter 中添加 `hidden: true`：

```yaml
---
id: "draft-moment"
time: "2026-04-11 10:00:00"
pinned: false
hidden: true  # 隐藏此动态
tags: ["草稿"]
---

这是一条隐藏的动态内容
```

### 隐藏动态特性

- 隐藏动态不会显示在动态列表页面
- 后台管理系统可以管理隐藏状态
- 支持批量设置隐藏/显示

### 使用场景

- 草稿动态，尚未完成
- 私密内容
- 过时内容，保留但不展示

## Live2D彩蛋消息

当用户发现隐藏的博客文章或动态时，Live2D看板娘会显示惊喜消息：

- **发现隐藏博客**: 显示特殊的欢迎消息
- **发现隐藏动态**: 显示惊喜提示
- **消息优先级**: 彩蛋消息使用高优先级确保显示

## 目录结构规范

```
src/content/moments/        # Markdown个人动态
public/Momentsabout/        # 个人动态图片
public/LTY_Picture/         # 洛天依图片资源
```

## 时间格式规范

- **时间格式**: `YYYY-MM-DD HH:MM:SS`，精确到秒
- **时区设置**: 使用北京时间（UTC+8）
- **排序依据**: 按时间倒序排序，置顶动态优先

## 注意事项

- 动态 ID 必须唯一，建议使用有意义的英文标识
- 时间精确到秒，确保排序准确
- 图片数量没有严格限制，但建议合理控制
- 动态内容支持 Markdown 格式
- 置顶动态建议最多 3 条
- 隐藏动态修改后需要重新构建部署才能生效
