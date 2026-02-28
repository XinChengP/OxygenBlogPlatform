# 博客管理后台系统 Spec

## Why
当前博客系统缺乏可视化的内容管理界面，用户需要手动编辑 Markdown 文件并提交到 GitHub，操作繁琐且容易出错。开发一个本地管理后台应用可以提供直观的内容管理界面，提升博客维护效率，同时集成图床管理功能，实现图片资源的统一管理。

## What Changes
- 新增管理后台入口页面 `/admin`
- 新增文章管理模块 `/admin/blogs`
- 新增动态管理模块 `/admin/moments`
- 新增图床管理模块 `/admin/gallery`
- 新增系统设置模块 `/admin/settings`
- 新增通用组件库和工具函数
- 集成 GitHub API 实现远程内容管理

## Impact
- Affected specs: 内容管理系统、图床管理系统、GitHub API 集成
- Affected code: 
  - 新增 `src/app/admin/` 目录
  - 新增 `src/components/admin/` 目录
  - 扩展 `src/services/githubApi.ts`
  - 新增 `src/utils/adminUtils.ts`

---

## ADDED Requirements

### Requirement: 管理后台入口
系统应提供独立的管理后台入口，与前台博客系统分离但共享主题系统。

#### Scenario: 访问管理后台
- **WHEN** 用户访问 `/admin` 路径
- **THEN** 系统显示管理后台仪表盘，展示内容统计信息

#### Scenario: 主题一致性
- **WHEN** 用户切换博客系统的深色/浅色模式
- **THEN** 管理后台同步应用相同的主题模式

---

### Requirement: 文章管理模块
系统应提供完整的博客文章 CRUD 功能，支持中文文件名和路径。

#### Scenario: 文章列表展示
- **WHEN** 用户进入文章管理页面
- **THEN** 系统展示所有文章列表，包含标题、分类、标签、日期、状态等信息
- **AND** 支持按分类、标签、日期筛选
- **AND** 支持关键词搜索

#### Scenario: 创建新文章
- **WHEN** 用户点击"新建文章"按钮
- **THEN** 系统显示文章编辑表单，包含标题、分类、标签、摘要、封面图、正文等字段
- **AND** 自动生成符合规范的文件名
- **AND** 实时预览 Markdown 内容

#### Scenario: 编辑现有文章
- **WHEN** 用户选择一篇文章并点击"编辑"
- **THEN** 系统加载文章内容到编辑器
- **AND** 保留原始文件的元数据格式

#### Scenario: 删除文章
- **WHEN** 用户点击"删除"按钮
- **THEN** 系统弹出二次确认对话框
- **AND** 确认后从 GitHub 仓库删除文件

#### Scenario: 批量操作
- **WHEN** 用户选择多篇文章
- **THEN** 系统提供批量删除、批量修改分类等操作选项

#### Scenario: 中文文件名处理
- **WHEN** 文章标题包含中文字符
- **THEN** 系统正确处理文件名编码，确保 GitHub API 调用成功
- **AND** 文件名保持可读性

---

### Requirement: 动态管理模块
系统应提供个人动态的完整管理功能，遵循现有的动态文件格式规范。

#### Scenario: 动态列表展示
- **WHEN** 用户进入动态管理页面
- **THEN** 系统展示所有动态列表，包含 ID、时间、内容预览、标签、置顶状态
- **AND** 按时间倒序排列，置顶动态优先显示

#### Scenario: 创建新动态
- **WHEN** 用户点击"发布动态"按钮
- **THEN** 系统显示动态编辑表单，支持文本内容和图片上传
- **AND** 自动生成递增的动态 ID
- **AND** 自动填充当前时间

#### Scenario: 编辑动态
- **WHEN** 用户选择一条动态并点击"编辑"
- **THEN** 系统加载动态内容到编辑器
- **AND** 支持修改图片列表

#### Scenario: 置顶管理
- **WHEN** 用户切换动态的置顶状态
- **THEN** 系统更新动态的 `pinned` 属性
- **AND** 在列表中实时反映置顶状态变化

#### Scenario: 图片管理
- **WHEN** 用户在动态中添加或删除图片
- **THEN** 系统更新动态的 `images` 数组
- **AND** 支持图片预览和排序

---

### Requirement: 图床管理模块
系统应提供本地图床和 GitHub 远程图床的统一管理功能。

#### Scenario: 图床配置
- **WHEN** 用户进入图床设置页面
- **THEN** 系统显示 GitHub 图床配置表单
- **AND** 提供 Token 安全存储机制（本地 localStorage 加密存储）
- **AND** 预设远程图床仓库地址 `Eiheir/Luo_Tianyi_Image`

#### Scenario: 本地图床管理
- **WHEN** 用户选择"本地图床"标签
- **THEN** 系统展示 `public/` 目录下的图片资源
- **AND** 支持按目录分类浏览
- **AND** 显示图片预览、大小、格式等信息

#### Scenario: 远程图床管理
- **WHEN** 用户选择"远程图床"标签
- **THEN** 系统连接 GitHub API 获取 `Eiheir/Luo_Tianyi_Image` 仓库的图片列表
- **AND** 支持递归遍历子目录
- **AND** 正确处理中文路径

#### Scenario: 图片上传
- **WHEN** 用户上传图片到远程图床
- **THEN** 系统调用 GitHub API 上传文件
- **AND** 自动生成唯一文件名（原名-时间戳.扩展名）
- **AND** 返回图片的 Raw URL 供复制使用

#### Scenario: 图片删除
- **WHEN** 用户删除远程图床中的图片
- **THEN** 系统弹出二次确认对话框
- **AND** 确认后调用 GitHub API 删除文件

#### Scenario: 批量操作
- **WHEN** 用户选择多张图片
- **THEN** 系统提供批量删除、批量移动目录等操作选项

---

### Requirement: 文件命名规范
系统应实现统一的文件命名规范，确保文件名清晰、唯一且符合项目风格。

#### Scenario: 文章文件命名
- **WHEN** 创建新文章时
- **THEN** 系统根据标题生成文件名
- **AND** 规则：小写字母 + 连字符，保留中文字符，移除特殊字符
- **AND** 格式：`{处理后的标题}.md`

#### Scenario: 动态文件命名
- **WHEN** 创建新动态时
- **THEN** 系统生成递增的 6 位数字 ID
- **AND** 格式：`{ID}.md`，如 `000004.md`

#### Scenario: 图片文件命名
- **WHEN** 上传图片时
- **THEN** 系统生成唯一文件名
- **AND** 格式：`{原名处理}-{时间戳}.{扩展名}`
- **AND** 保留原始文件名的可读部分

#### Scenario: 命名冲突检测
- **WHEN** 生成的文件名与现有文件冲突
- **THEN** 系统自动添加序号后缀
- **AND** 提示用户可选择手动重命名

---

### Requirement: 数据同步机制
系统应确保本地编辑内容与 GitHub 仓库的一致性。

#### Scenario: 保存到 GitHub
- **WHEN** 用户完成编辑并点击"发布"按钮
- **THEN** 系统调用 GitHub API 提交更改
- **AND** 显示提交进度和结果反馈

#### Scenario: 从 GitHub 拉取
- **WHEN** 用户进入管理后台
- **THEN** 系统自动获取 GitHub 仓库最新内容
- **AND** 检测本地与远程的差异并提示

#### Scenario: 离线编辑
- **WHEN** 用户在无网络环境下编辑
- **THEN** 系统将内容暂存到本地存储
- **AND** 网络恢复后提示同步

---

### Requirement: UI/UX 设计规范
管理后台应遵循克制、高效的设计原则，与博客系统风格统一。

#### Scenario: 界面风格
- **WHEN** 用户访问管理后台
- **THEN** 界面采用简洁的卡片式布局
- **AND** 使用天依蓝作为主色调
- **AND** 避免过度装饰和动画效果

#### Scenario: 深色模式
- **WHEN** 用户切换深色/浅色模式
- **THEN** 管理后台同步切换
- **AND** 保持与博客系统一致的视觉体验

#### Scenario: 操作反馈
- **WHEN** 用户执行任何操作
- **THEN** 系统提供明确的视觉反馈
- **AND** 成功操作显示绿色提示
- **AND** 失败操作显示红色错误信息
- **AND** 加载状态显示进度指示器

#### Scenario: 响应式设计
- **WHEN** 用户在不同设备上访问
- **THEN** 界面自适应屏幕尺寸
- **AND** 移动端提供简化的操作界面

---

### Requirement: 安全机制
系统应确保敏感信息的安全存储和传输。

#### Scenario: Token 存储
- **WHEN** 用户配置 GitHub Token
- **THEN** 系统加密存储到 localStorage
- **AND** 不在代码中硬编码任何敏感信息
- **AND** 不在日志中输出 Token

#### Scenario: API 调用
- **WHEN** 系统调用 GitHub API
- **THEN** 使用 HTTPS 加密传输
- **AND** 正确处理 API 错误响应
- **AND** 不暴露敏感信息给前端

---

## MODIFIED Requirements

### Requirement: GitHub API 服务扩展
扩展现有的 `githubApi.ts` 服务，支持更多操作。

#### 新增功能
- 批量文件操作 API
- 目录创建和删除 API
- 文件搜索 API
- 中文路径完整支持

---

## REMOVED Requirements

无移除的需求。本功能为新增模块，不影响现有功能。
