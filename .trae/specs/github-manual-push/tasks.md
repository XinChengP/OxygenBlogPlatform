# Tasks

- [x] Task 1: 创建 GitHub 推送 Server Actions
  - [x] SubTask 1.1: 安装 `simple-git` 依赖
  - [x] SubTask 1.2: 创建 `src/actions/githubActions.ts` 文件
  - [x] SubTask 1.3: 实现 `pushToGitHub` 函数 - 推送所有更改
  - [x] SubTask 1.4: 实现 `buildAndPush` 函数 - 构建后推送
  - [x] SubTask 1.5: 实现 `getGitStatus` 函数 - 获取 Git 状态
  - [x] SubTask 1.6: 实现 `hasUncommittedChanges` 函数 - 检查未提交的更改

- [x] Task 2: 创建 GitHub 推送 Hook
  - [x] SubTask 2.1: 创建 `src/hooks/useGitHubPush.ts` 文件
  - [x] SubTask 2.2: 实现 `useGitHubPush` Hook - 管理推送状态和结果

- [x] Task 3: 修改博客后台管理界面
  - [x] SubTask 3.1: 在 `BlogsManageClient.tsx` 中导入 `useGitHubPush` Hook
  - [x] SubTask 3.2: 添加"推送"按钮到博客操作列
  - [x] SubTask 3.3: 添加"批量推送"按钮到批量操作栏
  - [x] SubTask 3.4: 添加"推送前构建"选项
  - [x] SubTask 3.5: 添加推送状态显示和错误处理

- [x] Task 4: 修改动态后台管理界面
  - [x] SubTask 4.1: 在 `MomentsManageClient.tsx` 中导入 `useGitHubPush` Hook
  - [x] SubTask 4.2: 添加"推送"按钮到动态操作区
  - [x] SubTask 4.3: 添加"批量推送"按钮到批量操作栏
  - [x] SubTask 4.4: 添加推送状态显示和错误处理

- [ ] Task 5: 验证功能
  - [ ] SubTask 5.1: 运行 TypeScript 类型检查
  - [ ] SubTask 5.2: 测试推送功能
  - [ ] SubTask 5.3: 测试批量推送功能
  - [ ] SubTask 5.4: 测试构建并推送功能

# Task Dependencies
- Task 1 完成后才能开始 Task 3 和 Task 4
- Task 2 可以与 Task 1 并行执行
- Task 3 和 Task 4 可以并行执行
- Task 5 依赖 Task 1、Task 2、Task 3、Task 4
