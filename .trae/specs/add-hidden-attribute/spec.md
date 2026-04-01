# 博客文章和动态隐藏属性功能 Spec

## Why
用户需要在不删除博客文章和动态的情况下，临时隐藏某些内容。这在以下场景非常有用：
- 文章内容需要更新但暂时不想公开
- 动态内容需要审核或修改
- 保留历史内容但不希望在前台展示

## What Changes
- 博客文章和动态的 Markdown frontmatter 中新增 `hidden` 属性，默认为 `false`
- 前台页面在**构建时**自动过滤隐藏的文章和动态（适配 GitHub Pages 静态部署）
- 后台管理系统（仅本地开发环境）支持修改隐藏状态
- 后台列表显示隐藏状态标识

## Impact
- Affected specs: 博客文章管理、动态管理、前台展示
- Affected code:
  - `src/actions/blogActions.ts` - 博客 Server Actions（后台使用）
  - `src/actions/momentActions.ts` - 动态 Server Actions（后台使用）
  - `src/utils/momentsUtils.ts` - 动态工具函数（前台构建时使用）
  - `src/app/blogs/page.tsx` - 博客前台页面（构建时过滤）
  - `src/app/admin/blogs/BlogsManageClient.tsx` - 博客后台管理（仅本地）
  - `src/app/admin/moments/MomentsManageClient.tsx` - 动态后台管理（仅本地）

## 部署环境约束

### GitHub Pages 静态部署（前台）
- 前台页面在**构建时**读取 Markdown 文件并过滤隐藏内容
- 隐藏的文章和动态不会出现在生成的静态页面中
- 无需运行时 Server Actions，纯静态文件

### 本地开发环境（后台）
- 后台管理功能通过 `AdminGuard` 组件保护，仅在 `NODE_ENV=development` 时可访问
- 后台使用 Server Actions 修改 Markdown 文件的 frontmatter
- 修改后需要重新构建部署到 GitHub Pages

## ADDED Requirements

### Requirement: 博客文章隐藏属性
系统 SHALL 为博客文章提供隐藏属性功能。

#### Scenario: 博客文章默认不隐藏
- **WHEN** 创建新的博客文章时
- **THEN** 文章的 `hidden` 属性默认为 `false`，前台正常显示

#### Scenario: 隐藏博客文章
- **WHEN** 用户在本地后台将博客文章设置为隐藏
- **THEN** 下次构建时，该文章不会出现在 GitHub Pages 的前台博客列表中
- **AND** 后台管理列表中显示"已隐藏"标识

#### Scenario: 取消隐藏博客文章
- **WHEN** 用户在本地后台取消博客文章的隐藏状态
- **THEN** 下次构建部署后，该文章重新在前台显示

### Requirement: 动态隐藏属性
系统 SHALL 为动态提供隐藏属性功能。

#### Scenario: 动态默认不隐藏
- **WHEN** 创建新的动态时
- **THEN** 动态的 `hidden` 属性默认为 `false`，前台正常显示

#### Scenario: 隐藏动态
- **WHEN** 用户在本地后台将动态设置为隐藏
- **THEN** 下次构建时，该动态不会出现在 GitHub Pages 的前台动态页面中
- **AND** 后台管理列表中显示"已隐藏"标识

#### Scenario: 取消隐藏动态
- **WHEN** 用户在本地后台取消动态的隐藏状态
- **THEN** 下次构建部署后，该动态重新在前台显示

### Requirement: 后台隐藏状态管理（仅本地开发环境）
系统 SHALL 在后台管理界面提供隐藏状态管理功能，仅在本地开发环境可用。

#### Scenario: 单个内容切换隐藏状态
- **WHEN** 用户在本地后台点击单篇文章或动态的隐藏/显示按钮
- **THEN** 该内容的 Markdown 文件 frontmatter 中的 `hidden` 字段被更新
- **AND** 页面显示操作成功提示

#### Scenario: 批量切换隐藏状态
- **WHEN** 用户在本地后台选中多个内容并点击批量隐藏/显示按钮
- **THEN** 所有选中内容的 Markdown 文件 frontmatter 中的 `hidden` 字段被批量更新
- **AND** 页面显示操作成功提示

#### Scenario: 按隐藏状态筛选
- **WHEN** 用户在本地后台选择隐藏状态筛选条件
- **THEN** 列表只显示符合筛选条件的内容

### Requirement: 前台构建时过滤（GitHub Pages 兼容）
系统 SHALL 在构建时过滤隐藏的内容，确保 GitHub Pages 静态部署正常工作。

#### Scenario: 博客列表构建时过滤
- **WHEN** 执行 `npm run build` 或 `npm run build:pages` 时
- **THEN** 博客列表页面只包含 `hidden` 为 `false` 或未设置的文章

#### Scenario: 动态页面构建时过滤
- **WHEN** 执行 `npm run build` 或 `npm run build:pages` 时
- **THEN** 动态页面只包含 `hidden` 为 `false` 或未设置的动态

## MODIFIED Requirements

### Requirement: 博客文章数据结构
博客文章的 frontmatter 新增 `hidden` 字段：

```yaml
---
title: "文章标题"
date: "YYYY-MM-DD"
category: "分类"
tags: ["标签1", "标签2"]
excerpt: "文章摘要"
hidden: false  # 新增字段，默认为 false，可不写
---
```

### Requirement: 动态数据结构
动态的 frontmatter 新增 `hidden` 字段：

```yaml
---
id: "000001"
time: "YYYY-MM-DD HH:MM:SS"
pinned: false
hidden: false  # 新增字段，默认为 false，可不写
---
```

## REMOVED Requirements
无移除的需求。
