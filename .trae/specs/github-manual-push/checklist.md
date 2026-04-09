# Checklist

## GitHub 推送 Server Actions
- [x] `simple-git` 依赖已安装
- [x] `src/actions/githubActions.ts` 文件已创建
- [x] `pushToGitHub` 函数正确实现
- [x] `buildAndPush` 函数正确实现
- [x] `getGitStatus` 函数正确实现
- [x] `hasUncommittedChanges` 函数正确实现

## GitHub 推送 Hook
- [x] `src/hooks/useGitHubPush.ts` 文件已创建
- [x] `useGitHubPush` Hook 正确实现
- [x] 推送状态管理正确
- [x] 错误处理正确

## 博客后台管理界面
- [x] 已导入 `useGitHubPush` Hook
- [x] 博客操作列显示"推送"按钮
- [x] 批量操作栏显示"批量推送"按钮
- [x] "推送前构建"选项正常工作
- [x] 推送状态显示正确
- [x] 错误处理正确

## 动态后台管理界面
- [x] 已导入 `useGitHubPush` Hook
- [x] 动态操作区显示"推送"按钮
- [x] 批量操作栏显示"批量推送"按钮
- [x] 推送状态显示正确
- [x] 错误处理正确

## 功能验证
- [x] TypeScript 类型检查通过
- [ ] 单篇博客推送功能正常（需要实际测试）
- [ ] 单条动态推送功能正常（需要实际测试）
- [ ] 批量推送功能正常（需要实际测试）
- [ ] 构建并推送功能正常（需要实际测试）
- [ ] 错误提示正确显示（需要实际测试）
