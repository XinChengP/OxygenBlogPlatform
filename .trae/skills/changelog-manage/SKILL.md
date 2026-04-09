---
name: "changelog-manage"
description: "管理和发布更新日志。Invoke when user wants to add a new changelog entry, organize development logs, or view the changelog timeline display."
---

# 更新日志管理技能

## 概述

本技能用于帮助用户管理和发布项目的更新日志，记录开发过程和功能更新。

## 更新日志文件结构

更新日志存储在 `src/content/changelogs/` 目录中，使用 Markdown 格式。

### 日志文件命名规范

- **命名格式**: `YYYY-MM-DD.md`
- **示例**: `2026-04-09.md`
- 每个日期一个文件，同一天的所有更新放在同一个文件中

### 日志前置元数据 (Frontmatter)

```yaml
---
date: "YYYY-MM-DD"
type: "feature|optimize|fix|docs|style"
---
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| date | 是 | 更新日期，格式 `YYYY-MM-DD` |
| type | 是 | 更新类型，见下方类型说明 |

### 更新类型说明

| 类型 | 标签 | 说明 | 颜色 |
|------|------|------|------|
| feature | 新功能 | 新功能添加 | 绿色 |
| optimize | 优化 | 性能优化或代码重构 | 蓝色 |
| fix | 修复 | Bug修复 | 红色 |
| docs | 文档 | 文档更新 | 灰色 |
| style | 样式 | 样式调整 | 紫色 |

## 创建新更新日志步骤

1. 确定更新日期
2. 检查 `src/content/changelogs/` 目录是否已有该日期的文件
3. 如有，则在该文件中添加新条目；如无，则创建新文件
4. 编写前置元数据
5. 编写更新内容

## 示例更新日志结构

### 单个文件多个更新

```markdown
---
date: "2026-04-09"
type: "feature"
---

## 新增功能

- 添加了新的画廊系统，支持图片分类筛选
- 优化了 Live2D 看板娘的消息显示逻辑

---
date: "2026-04-09"
type: "optimize"
---

## 性能优化

- 优化了图片懒加载机制
- 减少了构建时的包大小
```

### 独立文件

`2026-04-09.md`:

```markdown
---
date: "2026-04-09"
type: "feature"
---

## 新增功能

### 画廊系统升级

- 添加了图片分类筛选功能
- 支持高级放大控制
- 优化了图片预览体验

### Live2D 消息优化

- 改进了消息队列管理
- 添加了预设消息常量
```

## 展示规则

### 时间线展示

- 更新日志页面按日期倒序排列
- 最新的更新显示在最前面
- 按月份自动分组展示

### 分类标记

- 不同类型使用不同颜色的标签
- 可以在页面中按类型筛选

### 显示格式

```
┌─────────────────────────────────────┐
│ ● feature        2026年4月9日      │
├─────────────────────────────────────┤
│ 新增画廊系统分类筛选功能             │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ● optimize       2026年4月8日      │
├─────────────────────────────────────┤
│ 优化图片懒加载机制                   │
└─────────────────────────────────────┘
```

## 组件结构

### 主要组件

| 组件 | 路径 | 功能 |
|------|------|------|
| ChangelogTimeline | `src/components/changelogs/ChangelogTimeline.tsx` | 时间线展示 |
| ChangelogCard | `src/components/changelogs/ChangelogCard.tsx` | 单条日志卡片 |
| ChangelogFilter | `src/components/changelogs/ChangelogFilter.tsx` | 类型筛选器 |

### 页面路径

- **页面**: `src/app/changelogs/page.tsx`
- **数据获取**: `src/lib/changelogs.ts`

## 注意事项

- 更新日志使用静态生成，修改后需重新构建
- 日期格式必须严格遵守 `YYYY-MM-DD`
- type 字段必须使用小写英文
- 建议每次更新只添加一个类型条目
- 保持内容简洁，突出重点变更
