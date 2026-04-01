# Tasks

- [x] Task 1: 修改博客文章数据结构和 Server Actions（后台本地使用）
  - [x] SubTask 1.1: 在 `blogActions.ts` 中为 `BlogPost` 和 `BlogPostData` 接口添加 `hidden` 属性
  - [x] SubTask 1.2: 修改 `parseFrontmatter` 函数，解析 `hidden` 字段
  - [x] SubTask 1.3: 修改 `generateFrontmatter` 函数，生成 `hidden` 字段
  - [x] SubTask 1.4: 修改 `getBlogList` 函数，返回 `hidden` 属性（不过滤，后台需要显示所有文章）
  - [x] SubTask 1.5: 修改 `getBlogDetail` 函数，返回 `hidden` 属性
  - [x] SubTask 1.6: 修改 `createBlog` 函数，支持 `hidden` 属性
  - [x] SubTask 1.7: 修改 `updateBlog` 函数，支持更新 `hidden` 属性
  - [x] SubTask 1.8: 新增 `toggleBlogHidden` 函数，切换单篇文章隐藏状态
  - [x] SubTask 1.9: 新增 `batchToggleBlogHidden` 函数，批量切换隐藏状态

- [x] Task 2: 修改动态数据结构和 Server Actions（后台本地使用）
  - [x] SubTask 2.1: 在 `momentActions.ts` 中为 `Moment` 和 `MomentData` 接口添加 `hidden` 属性
  - [x] SubTask 2.2: 修改 `parseFrontmatter` 函数，解析 `hidden` 字段
  - [x] SubTask 2.3: 修改 `generateFrontmatter` 函数，生成 `hidden` 字段
  - [x] SubTask 2.4: 修改 `getMomentList` 函数，返回 `hidden` 属性（不过滤，后台需要显示所有动态）
  - [x] SubTask 2.5: 修改 `getMomentDetail` 函数，返回 `hidden` 属性
  - [x] SubTask 2.6: 修改 `createMoment` 函数，支持 `hidden` 属性
  - [x] SubTask 2.7: 修改 `updateMoment` 函数，支持更新 `hidden` 属性
  - [x] SubTask 2.8: 新增 `toggleMomentHidden` 函数，切换单条动态隐藏状态
  - [x] SubTask 2.9: 新增 `batchToggleMomentHidden` 函数，批量切换隐藏状态

- [x] Task 3: 修改前台页面构建时过滤隐藏内容（GitHub Pages 兼容）
  - [x] SubTask 3.1: 修改 `momentsUtils.ts` 中的 `Moment` 接口，添加 `hidden` 属性
  - [x] SubTask 3.2: 修改 `getServerMoments` 函数，在构建时过滤隐藏的动态
  - [x] SubTask 3.3: 修改 `getServerBlogs` 函数，在构建时过滤隐藏的博客
  - [x] SubTask 3.4: 修改 `blogs/page.tsx` 中的 `BlogPost` 接口和 `getAllBlogs` 函数，在构建时过滤隐藏文章

- [x] Task 4: 修改博客后台管理界面（仅本地开发环境）
  - [x] SubTask 4.1: 在 `BlogsManageClient.tsx` 表格中添加"隐藏状态"列
  - [x] SubTask 4.2: 添加单篇文章隐藏/显示操作按钮
  - [x] SubTask 4.3: 添加批量隐藏/显示操作按钮
  - [x] SubTask 4.4: 添加按隐藏状态筛选功能

- [x] Task 5: 修改动态后台管理界面（仅本地开发环境）
  - [x] SubTask 5.1: 在 `MomentsManageClient.tsx` 列表中添加"隐藏状态"标识
  - [x] SubTask 5.2: 添加单条动态隐藏/显示操作按钮
  - [x] SubTask 5.3: 添加批量隐藏/显示操作按钮
  - [x] SubTask 5.4: 添加按隐藏状态筛选功能

# Task Dependencies
- Task 1 和 Task 2 可并行执行
- Task 3 依赖 Task 1 和 Task 2（需要了解数据结构）
- Task 4 依赖 Task 1（需要 Server Actions 支持）
- Task 5 依赖 Task 2（需要 Server Actions 支持）
