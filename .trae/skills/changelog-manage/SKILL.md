---
name: "changelog-manage"
description: "管理和发布更新日志。Invoke when user wants to add a new changelog entry, organize development logs, or view the changelog timeline display."
---

# 更新日志管理技能

## 概述

本技能用于帮助用户管理和发布项目的更新日志，记录开发过程和功能更新。

## 目录结构规范

```
src/content/changelogs/     # 更新日志
```

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
title: "更新标题"
type: "feature|optimize|fix|docs|style|refactor"
commits:
  - "commit message 1"
  - "commit message 2"
---
```

### 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| date | 是 | 更新日期，格式 `YYYY-MM-DD` |
| title | 是 | 更新标题，简要概括本次更新内容 |
| type | 是 | 更新类型，见下方类型说明 |
| commits | 否 | 相关的 git 提交记录 |

### 更新类型说明

| 类型 | 标签 | 说明 | 颜色 |
|------|------|------|------|
| feature | 新功能 | 新功能添加 | #66ccff (天依蓝) |
| optimize | 优化 | 性能优化或代码重构 | #9966ff (紫色) |
| fix | 修复 | Bug修复 | #ff66cc (粉色) |
| docs | 文档 | 文档更新 | #ff9966 (橙色) |
| style | 样式 | 样式调整 | #ccff66 (黄绿色) |
| refactor | 重构 | 代码重构 | #66ff99 (绿色) |

### 旧类型映射（已弃用）

以下旧类型会被自动映射到新类型：

| 旧类型 | 映射到 | 说明 |
|--------|--------|------|
| perf | optimize | 性能优化 |
| chore | docs | 其他/杂项 |

**注意**: 创建新日志时，请使用新的六种类型，不要使用已弃用的类型。

## 重要规则

### 排除内容（不记录到日志）

**以下内容不应该创建或更新到日志文件中：**

1. **博客文章更新**
   - 提交信息包含"更新博客"、"添加博客"、"博客内容更新"等
   - 文件路径为 `src/content/blogs/` 下的新增或修改
   - 示例：`feat: 更新博客内容`、`docs: 添加新博客文章`

2. **动态内容更新**
   - 提交信息包含"更新动态"、"添加动态"、"动态内容更新"等
   - 文件路径为 `src/content/moments/` 下的新增或修改
   - 示例：`feat: 更新动态 #000009`、`feat: 添加新动态`

3. **纯内容更新**
   - 仅添加图片资源到 `public/Momentsabout/` 或 `public/Blogabout/`
   - 仅修改 Markdown 内容文件而无功能代码变更

### 应该记录的内容

**以下内容应该记录到日志文件中：**

1. **功能开发**
   - 新增功能模块
   - 新增组件或页面
   - 新增工具函数或 Hook

2. **性能优化**
   - 代码重构
   - 性能提升
   - 资源优化

3. **Bug 修复**
   - 修复功能缺陷
   - 修复样式问题
   - 修复兼容性问题

4. **架构改进**
   - 项目结构调整
   - 构建流程优化
   - 部署配置更新

5. **开发工具**
   - 新增开发脚本
   - 新增管理功能
   - 新增自动化工具

## 创建新更新日志步骤

1. **查看 git 提交记录**
   ```bash
   git log --format="%H|%ai|%s" -n 20
   ```

2. **筛选有效提交**
   - 排除包含"更新动态"、"更新博客"的提交
   - 排除纯内容更新的提交
   - 保留功能开发、优化、修复等提交

3. **确定更新日期**
   - 按照 git 提交的实际日期
   - 同一天的所有更新放在同一个文件中

4. **检查现有文件**
   - 检查 `src/content/changelogs/` 目录是否已有该日期的文件
   - 如有，则在该文件中添加新条目
   - 如无，则创建新文件

5. **编写日志内容**
   - 编写前置元数据（date, title, type, commits）
   - 编写功能概述
   - 列出主要变更点
   - 添加技术实现表格
   - 添加使用方式和注意事项

## 日志内容结构模板

```markdown
---
date: "2026-04-09"
title: "功能名称"
type: "feature"
commits:
  - "feat: 功能描述"
---

## 后台管理日志功能

项目提供后台管理界面进行日志的增删改查操作。

### 访问方式

- **路径**: `/admin/changelogs`
- **环境**: 仅本地开发环境可用（`NODE_ENV=development`）
- **功能**: 
  - 日志列表：查看所有更新日志，支持按类型筛选
  - 撰写日志：创建新的更新日志
  - 编辑日志：修改现有日志内容
  - 删除日志：删除指定日期的日志

### 后台管理组件

| 组件 | 路径 | 功能 |
|------|------|------|
| ChangelogsManageClient | `src/app/admin/changelogs/ChangelogsManageClient.tsx` | 日志列表管理 |
| ChangelogEditClient | `src/app/admin/changelogs/edit/ChangelogEditClient.tsx` | 日志编辑/创建 |
| changelogActions | `src/app/admin/changelogs/changelogActions.ts` | Server Actions |

### 数据存储

- **存储位置**: `src/content/changelogs/`
- **文件格式**: Markdown + YAML Frontmatter
- **命名规范**: `YYYY-MM-DD.md`

## 功能概述

简要描述本次更新的功能和目的。

### 主要变更

#### 功能点1
- 详细描述1
- 详细描述2

#### 功能点2
- 详细描述1
- 详细描述2

### 技术实现

| 文件路径 | 说明 |
|---------|------|
| `src/...` | 文件说明 |

### 使用方式

- 使用步骤1
- 使用步骤2

### 注意事项

- 注意点1
- 注意点2
```

## 示例更新日志

### 功能更新示例

`2026-04-09.md`:

```markdown
---
date: "2026-04-09"
title: "GitHub手动推送功能"
type: "feature"
commits:
  - "feat: 添加GitHub手动推送功能"
---

## 功能概述

新增 GitHub 手动推送功能，支持在后台管理界面直接推送代码到 GitHub 仓库。

### 主要变更

#### GitHub推送功能
- **直接推送**: 支持直接推送当前更改到远程仓库
- **构建并推送**: 先执行项目构建，再推送构建产物
- **状态检测**: 自动检测 Git 仓库状态

### 技术实现

| 文件路径 | 说明 |
|---------|------|
| `src/hooks/useGitHubPush.ts` | GitHub推送Hook |
| `src/actions/githubActions.ts` | Git操作Server Actions |

### 使用方式

1. 进入后台管理界面
2. 点击"推送到GitHub"按钮
3. 选择直接推送或构建并推送

### 注意事项

- 仅在本地开发环境可用
- 需要配置 Git 用户信息
```

### 优化更新示例

`2026-03-22.md`:

```markdown
---
date: "2026-03-22"
title: "前端性能优化"
type: "optimize"
commits:
  - "perf: 优化前端性能，添加GPU加速和资源预加载"
---

## 功能概述

全面优化前端性能，通过 GPU 加速、资源预加载等技术手段提升页面加载速度。

### 主要变更

#### GPU 加速优化
- 为动画组件添加 GPU 加速类名
- 添加 `will-change` 属性优化渲染性能

#### 资源预加载
- 实现关键资源的预加载机制
- 添加 DNS 预解析，加速外部资源加载

### 技术实现

| 文件路径 | 说明 |
|---------|------|
| `src/app/globals.css` | 全局性能优化样式 |
| `src/app/layout.tsx` | 资源预加载配置 |

### 性能提升

- 首屏加载时间减少
- 动画流畅度提升
- 滚动性能优化
```

## 展示规则

### 时间线展示

- 更新日志页面按日期倒序排列
- 最新的更新显示在最前面
- 按月份自动分组展示

### 分类标记

- 不同类型使用不同颜色的标签
- 可以在页面中按类型筛选

### 成就标签系统

日志支持自动计算成就标签，根据关联提交数量和日志行数授予不同成就：

| 成就名称 | 触发条件 | 颜色 |
|---------|---------|------|
| 略感疲惫 | 关联提交数量 >= 10 且 < 20 | #7366ff |
| 肝爆了 | 关联提交数量 >= 20 | #e566ff |
| 麻雀虽小五脏俱全 | 关联提交 = 1 且 日志行数 > 55 | #ff66a6 |
| 人声鼎沸 | 日志行数 > 250 | #ff9966 |

**成就标签特性**：
- 成就标签显示在类型标签左侧
- 可以同时显示多个成就
- 成就仅用于展示，不参与统计

### 显示格式

```
┌─────────────────────────────────────────────┐
│ 肝爆了 人声鼎沸  ● feature   2026年4月11日  │
├─────────────────────────────────────────────┤
│ 后台管理功能增强与系统升级                   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ● optimize       2026年3月22日     │
├─────────────────────────────────────┤
│ 前端性能优化                         │
└─────────────────────────────────────┘
```

## 组件结构

### 组件结构

### 前台组件

| 组件 | 路径 | 功能 |
|------|------|------|
| ClientChangelogsPage | `src/components/changelogs/ClientChangelogsPage.tsx` | 更新日志页面客户端组件 |
| ChangelogCard | `src/components/changelogs/ChangelogCard.tsx` | 单条日志卡片 |
| ChangelogFilter | `src/components/changelogs/ChangelogFilter.tsx` | 类型筛选器 |
| TypeStatsChart | `src/components/changelogs/TypeStatsChart.tsx` | 类型统计环形图 |
| TypeStatsWidget | `src/components/changelogs/TypeStatsWidget.tsx` | 类型统计小部件 |

### 后台组件

| 组件 | 路径 | 功能 |
|------|------|------|
| ChangelogsManageClient | `src/app/admin/changelogs/ChangelogsManageClient.tsx` | 日志列表管理 |
| ChangelogEditClient | `src/app/admin/changelogs/edit/ChangelogEditClient.tsx` | 日志编辑/创建 |
| changelogActions | `src/app/admin/changelogs/changelogActions.ts` | Server Actions |

### 页面路径

- **前台页面**: `src/app/changelogs/page.tsx`
- **后台页面**: `src/app/admin/changelogs/page.tsx`
- **数据获取**: `src/utils/changelogUtils.ts`

## 类型定义和工具函数

### 类型定义文件

**文件**: `src/types/changelogTypes.ts`

```typescript
// 六种有效类型
export type ChangelogType = 'feature' | 'optimize' | 'fix' | 'docs' | 'style' | 'refactor';

// 成就类型
export type ChangelogAchievement = 'tired' | 'exhausted' | 'smallButComplete' | 'lively';

// 获取类型颜色
export function getChangelogTypeColor(type: ChangelogType): string;

// 获取类型标签
export function getChangelogTypeLabel(type: ChangelogType): string;

// 解析 YAML Frontmatter
export function parseFrontMatter(content: string): { metadata: Record<string, unknown>; content: string };

// 计算成就
export function calculateAchievements(commits: string[], contentLineCount: number): ChangelogAchievement[];

// 获取成就标签
export function getAchievementLabel(achievement: ChangelogAchievement): string;

// 获取成就颜色
export function getAchievementColor(achievement: ChangelogAchievement): string;
```

### 颜色配置

所有类型颜色统一配置在 `src/types/changelogTypes.ts`：

```typescript
const colorMap: Record<ChangelogType, string> = {
  feature: '#66ccff',   // 新功能 - 天依蓝
  optimize: '#9966ff',  // 优化 - 紫色
  fix: '#ff66cc',       // 修复 - 粉色
  docs: '#ff9966',      // 文档 - 橙色
  style: '#ccff66',     // 样式 - 黄绿色
  refactor: '#66ff99',  // 重构 - 绿色
};
```

## 注意事项

- 更新日志使用静态生成，修改后需重新构建
- 日期格式必须严格遵守 `YYYY-MM-DD`
- type 字段必须使用小写英文
- **严格遵守排除规则，不记录博客和动态内容更新**
- 保持内容简洁，突出重点变更
- 技术实现表格中的文件路径必须准确
- **已弃用类型**: `perf` 和 `chore` 会被自动映射到 `optimize` 和 `docs`
- **成就标签**: 成就不参与任何统计，仅用于展示
- **行数计算**: 基于原始文件内容，不包括 frontmatter 部分
