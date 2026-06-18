# OxygenBlogPlatform 领域词汇表

本文档定义了项目中的核心领域概念和术语，用于统一沟通语言。

## 核心概念

### 关于我页面 (About Page)
展示博主个人信息、博客故事、联系方式的独立页面。路径为 `/about`，内容通过 `src/setting/AboutSetting.ts` 配置驱动。

**当前结构：**
- 左侧边栏：个人信息卡片、兴趣爱好
- 右侧主内容：关于我、关于本站、关于域名

**交互模式：**
- 随机宣言：点击名字/宣言区域，从预设列表中随机切换 slogan
- Toast 提示：复制邮箱等操作后显示临时反馈提示

**布局模式：**
- 横向手风琴 (Horizontal Accordion)：桌面端右侧主内容区使用三个水平排列的可折叠面板展示"关于我""关于本站""关于域名"，点击后展开显示内容，其他面板收缩显示封面和标题
- 卡片网格：右侧主内容区使用独立卡片组合，核心区块占满宽度，辅助区块并排显示
- 滚动触发动画：页面滚动到可视区域时，区块依次执行渐入动画

**手风琴配置项：**
- coverImage: 收缩状态封面图片路径
- coverHorizontalPosition: 封面水平位置
- coverVerticalPosition: 封面垂直位置（0% 最上，100% 最下）
- coverSize: 封面图片缩放比例，默认 120%

### 博客文章 (Blog Post / Article)
已发布的博客内容，对公众可见。存储在 `src/content/blogs/` 目录下，使用 Markdown 格式。

**属性：**
- title: 文章标题
- date: 发布日期
- category: 分类
- tags: 标签列表
- excerpt: 摘要
- hidden: 是否隐藏

### 草稿 (Draft)
未发布的文章内容。在项目中，草稿通过 `hidden: true` 标记的文章来实现。

### 个人动态 (Moment)
简短的个人状态更新，类似微博。存储在 `src/content/moments/` 目录下。

**属性：**
- id: 唯一标识
- time: 发布时间
- pinned: 是否置顶
- hidden: 是否隐藏
- tags: 标签
- images: 图片列表

### 画廊 (Gallery)
图片管理和展示系统，支持分类筛选、预览、递归扫描和目录树导航。

### 更新日志 (Changelog)
开发日志记录，包含类型标记（feature/optimize/fix/docs/style/refactor）。

**类型说明：**
- feature: 新功能
- optimize: 性能优化
- fix: Bug 修复
- docs: 文档更新
- style: 样式调整
- refactor: 代码重构

### 待办事项 (Todo)
任务管理，支持优先级（high/medium/low）和完成状态。

### Live2D 看板娘
洛天依互动系统，支持音乐/主题/页面联动、彩蛋消息功能。

## 技术术语

### Server Actions
Next.js 的服务端函数，用于处理表单提交和数据变更。

### 静态导出 (Static Export)
Next.js 的 `output: 'export'` 模式，生成静态 HTML 文件用于 GitHub Pages 部署。

### 深度模块 (Deep Module)
小接口、深实现的模块设计原则。接口简单，内部封装复杂逻辑。

## 命名约定

### 组件命名
- PascalCase: `Navigation.tsx`, `BlogCard.tsx`

### 工具函数命名
- camelCase: `assetUtils.ts`, `formatDate.ts`

### 页面文件命名
- Next.js 约定: `page.tsx`, `layout.tsx`

## 相关文档

- ADR 记录: `.trae/docs/adr/`
- 技能文档: `.trae/skills/`
