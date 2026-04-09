# 手动推送到 GitHub 功能 Spec

## Why
用户希望能够在本地后台管理界面中，直接将博客文章和动态推送到 GitHub 仓库，触发 GitHub Pages 自动部署。这比命令行操作更方便，特别是不熟悉 Git 的用户。

## What Changes
- 后台管理界面添加"推送到 GitHub"按钮
- 支持博客文章和动态的单独推送
- 支持批量推送功能
- 推送前自动执行构建
- 显示推送状态和结果

## Impact
- Affected specs: 博客管理、动态管理、GitHub 部署
- Affected code:
  - `src/app/admin/blogs/BlogsManageClient.tsx` - 博客后台管理
  - `src/app/admin/moments/MomentsManageClient.tsx` - 动态后台管理
  - `src/actions/githubActions.ts` - GitHub 推送 Server Actions（新增）
  - `src/hooks/useGitHubPush.ts` - GitHub 推送 Hook（新增）

## 部署环境约束

### 前台（GitHub Pages）
- 静态网站部署在 GitHub Pages
- 通过 GitHub Actions 自动构建和部署
- 推送到 main 分支自动触发部署

### 后台（仅本地开发环境）
- 后台管理功能仅在本地开发环境可用（`NODE_ENV=development`）
- 通过 GitHub Actions 触发部署需要手动推送

## ADDED Requirements

### Requirement: GitHub 推送 Server Actions
系统 SHALL 提供 GitHub 推送功能的后端逻辑。

#### Scenario: 初始化 Git 仓库
- **WHEN** 首次使用推送功能时
- **THEN** 自动检查并初始化 Git 仓库（如果需要）
- **AND** 配置远程仓库地址

#### Scenario: 推送博客文章
- **WHEN** 用户点击博客文章的"推送"按钮时
- **THEN** 执行 `git add` 添加更改
- **AND** 执行 `git commit` 提交更改
- **AND** 执行 `git push` 推送到远程仓库
- **AND** 返回推送结果

#### Scenario: 推送动态
- **WHEN** 用户点击动态的"推送"按钮时
- **THEN** 执行 `git add` 添加更改
- **AND** 执行 `git commit` 提交更改
- **AND** 执行 `git push` 推送到远程仓库
- **AND** 返回推送结果

#### Scenario: 批量推送
- **WHEN** 用户选择多个内容并点击"批量推送"时
- **THEN** 添加所有更改到暂存区
- **AND** 执行单次提交
- **AND** 推送到远程仓库

#### Scenario: 推送前构建
- **WHEN** 用户启用"推送前自动构建"选项时
- **THEN** 在推送前先执行 `npm run build:pages`
- **AND** 等待构建完成后推送

### Requirement: 后台管理界面 GitHub 推送按钮
系统 SHALL 在后台管理界面提供 GitHub 推送功能。

#### Scenario: 博客后台添加推送按钮
- **WHEN** 用户在博客后台管理页面时
- **THEN** 每篇博客文章显示"推送"按钮
- **AND** 批量操作栏显示"批量推送"按钮
- **AND** 页面显示推送状态

#### Scenario: 动态后台添加推送按钮
- **WHEN** 用户在动态后台管理页面时
- **THEN** 每条动态显示"推送"按钮
- **AND** 批量操作栏显示"批量推送"按钮
- **AND** 页面显示推送状态

#### Scenario: 推送状态显示
- **WHEN** 推送操作进行中时
- **THEN** 显示加载状态
- **AND** 显示推送进度
- **AND** 推送完成后显示成功/失败提示

#### Scenario: 错误处理
- **WHEN** 推送失败时
- **THEN** 显示错误信息
- **AND** 提示用户检查网络或 Git 配置

## MODIFIED Requirements

### Requirement: 后台管理界面
修改现有的后台管理界面，添加 GitHub 推送功能按钮。

## 技术实现

### 依赖
- `simple-git`: 用于执行 Git 操作
- Node.js `child_process`: 用于执行 npm 构建命令

### 实现方案
1. 使用 `simple-git` 库执行 Git 操作
2. 使用 Server Actions 在服务端执行操作
3. 推送前检查工作区状态，避免冲突
4. 支持自定义提交信息

### 安全性考虑
- 仅在本地开发环境启用
- 验证 Git 仓库状态
- 防止推送时数据丢失（未提交的更改给出警告）
