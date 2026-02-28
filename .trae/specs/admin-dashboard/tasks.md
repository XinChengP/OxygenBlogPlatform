# Tasks

## 第一阶段：基础架构搭建

- [x] Task 1: 创建管理后台目录结构和基础配置
  - [x] SubTask 1.1: 创建 `src/app/admin/` 目录结构
  - [x] SubTask 1.2: 创建管理后台布局组件 `AdminLayout.tsx`
  - [x] SubTask 1.3: 创建管理后台导航组件 `AdminNavigation.tsx`
  - [x] SubTask 1.4: 配置管理后台路由和中间件

- [x] Task 2: 开发管理后台通用组件库
  - [x] SubTask 2.1: 创建 `AdminCard` 卡片组件
  - [x] SubTask 2.2: 创建 `AdminTable` 表格组件（支持排序、筛选、分页）
  - [x] SubTask 2.3: 创建 `AdminForm` 表单组件
  - [x] SubTask 2.4: 创建 `AdminModal` 模态框组件
  - [x] SubTask 2.5: 创建 `AdminToast` 消息提示组件
  - [x] SubTask 2.6: 创建 `AdminConfirm` 确认对话框组件
  - [x] SubTask 2.7: 创建 `AdminLoading` 加载状态组件

- [x] Task 3: 开发管理后台工具函数
  - [x] SubTask 3.1: 创建 `src/utils/adminUtils.ts` 文件名处理工具
  - [x] SubTask 3.2: 创建 Token 加密存储工具
  - [x] SubTask 3.3: 创建本地存储管理工具
  - [x] SubTask 3.4: 创建中文路径编码工具

## 第二阶段：仪表盘和导航

- [x] Task 4: 开发管理后台仪表盘页面
  - [x] SubTask 4.1: 创建 `src/app/admin/page.tsx` 仪表盘主页面
  - [x] SubTask 4.2: 开发统计卡片组件（文章数、动态数、图片数等）
  - [x] SubTask 4.3: 开发最近活动列表组件
  - [x] SubTask 4.4: 开发快捷操作入口组件

- [x] Task 5: 开发管理后台侧边栏导航
  - [x] SubTask 5.1: 创建侧边栏容器组件
  - [x] SubTask 5.2: 开发导航菜单项组件
  - [x] SubTask 5.3: 实现导航折叠/展开功能
  - [x] SubTask 5.4: 实现移动端响应式适配

## 第三阶段：文章管理模块

- [x] Task 6: 开发文章列表页面
  - [x] SubTask 6.1: 创建 `src/app/admin/blogs/page.tsx` 文章列表页面
  - [x] SubTask 6.2: 开发文章数据获取 Hook `useBlogs`
  - [x] SubTask 6.3: 开发文章列表表格组件
  - [x] SubTask 6.4: 实现文章筛选功能（分类、标签、日期）
  - [x] SubTask 6.5: 实现文章搜索功能
  - [x] SubTask 6.6: 实现文章批量选择功能

- [x] Task 7: 开发文章编辑器页面
  - [x] SubTask 7.1: 创建 `src/app/admin/blogs/edit/page.tsx` 文章编辑页面
  - [x] SubTask 7.2: 开发文章元数据编辑表单
  - [x] SubTask 7.3: 集成现有 MarkdownEditor 组件
  - [x] SubTask 7.4: 实现文章实时预览功能
  - [x] SubTask 7.5: 开发封面图片选择器
  - [x] SubTask 7.6: 实现文章保存和发布功能

- [x] Task 8: 开发文章批量操作功能
  - [x] SubTask 8.1: 实现批量删除文章功能
  - [x] SubTask 8.2: 实现批量修改分类功能
  - [x] SubTask 8.3: 实现批量添加标签功能

## 第四阶段：动态管理模块

- [x] Task 9: 开发动态列表页面
  - [x] SubTask 9.1: 创建 `src/app/admin/moments/page.tsx` 动态列表页面
  - [x] SubTask 9.2: 开发动态数据获取 Hook `useMoments`
  - [x] SubTask 9.3: 开发动态列表卡片组件
  - [x] SubTask 9.4: 实现动态筛选功能（标签、置顶状态）
  - [x] SubTask 9.5: 实现动态搜索功能

- [x] Task 10: 开发动态编辑器页面
  - [x] SubTask 10.1: 创建 `src/app/admin/moments/edit/page.tsx` 动态编辑页面
  - [x] SubTask 10.2: 开发动态内容编辑表单
  - [x] SubTask 10.3: 开发动态图片管理组件
  - [x] SubTask 10.4: 实现动态 ID 自动生成功能
  - [x] SubTask 10.5: 实现置顶状态切换功能
  - [x] SubTask 10.6: 实现动态保存和发布功能

- [x] Task 11: 开发动态批量操作功能
  - [x] SubTask 11.1: 实现批量删除动态功能
  - [x] SubTask 11.2: 实现批量置顶/取消置顶功能

## 第五阶段：图床管理模块

- [x] Task 12: 开发图床配置页面
  - [x] SubTask 12.1: 创建 `src/app/admin/gallery/settings/page.tsx` 配置页面
  - [x] SubTask 12.2: 开发 GitHub Token 配置表单
  - [x] SubTask 12.3: 实现 Token 加密存储功能
  - [x] SubTask 12.4: 实现 GitHub 连接测试功能

- [x] Task 13: 开发本地图床管理页面
  - [x] SubTask 13.1: 创建 `src/app/admin/gallery/local/page.tsx` 本地图床页面
  - [x] SubTask 13.2: 开发本地图片列表组件
  - [x] SubTask 13.3: 实现图片预览功能
  - [x] SubTask 13.4: 实现图片删除功能
  - [x] SubTask 13.5: 实现图片路径复制功能

- [x] Task 14: 开发远程图床管理页面
  - [x] SubTask 14.1: 创建 `src/app/admin/gallery/remote/page.tsx` 远程图床页面
  - [x] SubTask 14.2: 开发 GitHub 图片列表获取功能
  - [x] SubTask 14.3: 实现图片上传功能
  - [x] SubTask 14.4: 实现图片删除功能
  - [x] SubTask 14.5: 实现图片 URL 复制功能
  - [x] SubTask 14.6: 实现批量图片操作功能

- [x] Task 15: 扩展 GitHub API 服务
  - [x] SubTask 15.1: 添加批量文件操作 API
  - [x] SubTask 15.2: 添加目录操作 API
  - [x] SubTask 15.3: 优化中文路径处理
  - [x] SubTask 15.4: 添加错误处理和重试机制

## 第六阶段：系统设置模块

- [x] Task 16: 开发系统设置页面
  - [x] SubTask 16.1: 创建 `src/app/admin/settings/page.tsx` 设置页面
  - [x] SubTask 16.2: 开发 GitHub 仓库配置表单
  - [x] SubTask 16.3: 开发文件命名规范配置
  - [x] SubTask 16.4: 实现配置导入/导出功能

## 第七阶段：集成测试和优化

- [x] Task 17: 功能测试和 Bug 修复
  - [x] SubTask 17.1: 测试文章管理完整流程
  - [x] SubTask 17.2: 测试动态管理完整流程
  - [x] SubTask 17.3: 测试图床管理完整流程
  - [x] SubTask 17.4: 测试中文路径和文件名处理
  - [x] SubTask 17.5: 测试深色/浅色模式切换
  - [x] SubTask 17.6: 测试响应式布局
  - [x] SubTask 17.7: 修复发现的 Bug

- [x] Task 18: 性能优化
  - [x] SubTask 18.1: 优化图片加载性能
  - [x] SubTask 18.2: 优化列表渲染性能
  - [x] SubTask 18.3: 实现 API 请求缓存
  - [x] SubTask 18.4: 优化打包体积

---

# Task Dependencies

- [Task 2] 依赖 [Task 1] - 通用组件需要基础目录结构
- [Task 3] 依赖 [Task 1] - 工具函数需要基础配置
- [Task 4] 依赖 [Task 2, Task 3] - 仪表盘需要通用组件和工具函数
- [Task 5] 依赖 [Task 2] - 导航需要通用组件
- [Task 6] 依赖 [Task 2, Task 3, Task 5] - 文章列表需要组件、工具和导航
- [Task 7] 依赖 [Task 6] - 编辑器需要列表页面支持
- [Task 8] 依赖 [Task 6, Task 7] - 批量操作需要列表和编辑功能
- [Task 9] 依赖 [Task 2, Task 3, Task 5] - 动态列表需要组件、工具和导航
- [Task 10] 依赖 [Task 9] - 动态编辑器需要列表页面支持
- [Task 11] 依赖 [Task 9, Task 10] - 批量操作需要列表和编辑功能
- [Task 12] 依赖 [Task 2, Task 3] - 配置页面需要组件和工具
- [Task 13] 依赖 [Task 12] - 本地图床需要配置支持
- [Task 14] 依赖 [Task 12, Task 15] - 远程图床需要配置和 API 支持
- [Task 15] 独立 - 可与其他任务并行开发
- [Task 16] 依赖 [Task 2, Task 3, Task 12] - 设置页面需要组件、工具和配置
- [Task 17] 依赖 [Task 6-16] - 测试需要所有功能完成
- [Task 18] 依赖 [Task 17] - 优化需要在测试后进行

---

# Parallelizable Tasks

以下任务可以并行开发：
- Task 3 和 Task 2（工具函数和通用组件）
- Task 6-8（文章管理）和 Task 9-11（动态管理）
- Task 13（本地图床）和 Task 14（远程图床）
- Task 15（GitHub API 扩展）可与 Task 12-14 并行
