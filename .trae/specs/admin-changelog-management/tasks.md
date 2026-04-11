# 后台管理日志功能 - 任务列表

## [x] Task 1: 创建日志管理相关的Server Actions
- **优先级**: P0
- **依赖**: 无
- **描述**:
  - 创建 `src/app/admin/changelogs/changelogActions.ts`
  - 实现 `getChangelogs()` - 获取所有日志列表
  - 实现 `getChangelogByDate(date)` - 根据日期获取单条日志
  - 实现 `createChangelog(data)` - 创建新日志
  - 实现 `updateChangelog(date, data)` - 更新日志
  - 实现 `deleteChangelog(date)` - 删除日志
- **验收标准**: AC-2, AC-3, AC-4, AC-5
- **测试要求**:
  - Server Actions能正确读写Markdown文件
  - 数据格式符合Changelog类型定义

## [x] Task 2: 更新后台侧边栏导航
- **优先级**: P0
- **依赖**: 无
- **描述**:
  - 修改 `src/components/admin/AdminSidebar.tsx`
  - 在导航配置中增加"日志管理"菜单项
  - 添加子菜单：日志列表、撰写日志
  - 使用合适的图标（如History或GitCommit）
- **验收标准**: AC-1
- **测试要求**:
  - 侧边栏正确显示新菜单项
  - 点击能正确跳转

## [x] Task 3: 创建日志列表页面
- **优先级**: P0
- **依赖**: Task 1
- **描述**:
  - 创建 `src/app/admin/changelogs/page.tsx`
  - 创建 `src/app/admin/changelogs/ChangelogsManageClient.tsx`
  - 使用AdminTable组件展示日志列表
  - 实现按类型筛选功能
  - 实现按日期排序功能
  - 每行显示编辑和删除按钮
- **验收标准**: AC-2
- **测试要求**:
  - 列表正确显示所有日志
  - 筛选和排序功能正常

## [x] Task 4: 创建日志编辑页面
- **优先级**: P0
- **依赖**: Task 1
- **描述**:
  - 创建 `src/app/admin/changelogs/edit/page.tsx`
  - 支持通过query参数传入日期（编辑模式）
  - 创建表单组件，包含：
    - 日期选择器（编辑时只读）
    - 类型选择下拉框
    - Markdown内容编辑器（文本域）
  - 实现保存功能
- **验收标准**: AC-3, AC-4
- **测试要求**:
  - 编辑时正确加载现有数据
  - 新建时显示空表单
  - 保存后数据正确更新

## [x] Task 5: 实现日志删除功能
- **优先级**: P1
- **依赖**: Task 1, Task 3
- **描述**:
  - 在日志列表中添加删除按钮
  - 使用AdminConfirm组件实现确认对话框
  - 调用deleteChangelog Server Action
  - 显示操作结果提示（AdminToast）
- **验收标准**: AC-5
- **测试要求**:
  - 删除前显示确认对话框
  - 删除后列表自动刷新

## [x] Task 6: 实现表单验证
- **优先级**: P1
- **依赖**: Task 4
- **描述**:
  - 验证日期必填
  - 验证类型必填
  - 验证内容必填
  - 验证日期格式正确
  - 验证日期唯一性（新建时）
- **验收标准**: AC-6
- **测试要求**:
  - 必填字段未填写时显示错误提示
  - 重复日期时显示错误提示

## [x] Task 7: 整体测试和优化
- **优先级**: P2
- **依赖**: Task 2, Task 3, Task 4, Task 5, Task 6
- **描述**:
  - 测试完整CRUD流程
  - 验证UI风格一致性
  - 检查响应式布局
  - 优化用户体验
- **验收标准**: 所有AC
- **测试要求**:
  - 功能完整可用
  - 无明显bug

# 任务依赖关系
```
Task 1 (Server Actions)
    |
    +---> Task 2 (侧边栏) --------+
    |                             |
    +---> Task 3 (列表页面) ------+---> Task 5 (删除功能)
    |                             |
    +---> Task 4 (编辑页面) ------+---> Task 6 (表单验证)
                                          |
                                          +---> Task 7 (整体测试)
```
