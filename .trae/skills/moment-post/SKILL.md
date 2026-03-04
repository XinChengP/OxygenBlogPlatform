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

## 注意事项

- 动态 ID 必须唯一，建议使用有意义的英文标识
- 时间精确到秒，确保排序准确
- 图片数量没有严格限制，但建议合理控制
- 动态内容支持 Markdown 格式
- 置顶动态建议最多 3 条
