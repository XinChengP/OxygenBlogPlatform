# 个人博客 - 洛天依主题 开发规范

## 项目概述
以洛天依为主题的个人博客，基于 Next.js 16.1.6 构建，支持 GitHub Pages 静态部署，集成 Live2D 看板娘、音乐播放器、主题切换等特色功能，用于记录技术学习与生活感悟。

## 核心技术栈

### 核心框架
- **Next.js 16.1.6** - App Router + Turbopack，静态导出模式
- **React 19.2.x** - 函数组件 + Hooks
- **TypeScript 5.x** - 严格模式，类型安全

### 样式系统
- **Tailwind CSS 4** - 原子化CSS，深色模式支持
- **CSS Variables** - 10种预设主题色系统
- **Framer Motion** - 动画和过渡效果

### 核心功能
- **Live2D看板娘** - 洛天依互动系统，支持音乐/主题/页面联动，彩蛋消息功能
- **音乐** - 精选洛天依歌曲，播放状态持久化
- **主题系统** - 锁定天依蓝配色，支持暗黑模式图片滤镜优化
- **实用工具** - 拼音转换器、Markdown编辑器等小工具
- **GitHub评论** - Giscus评论系统，基于GitHub Discussions
- **粒子动画** - Particles.js背景效果
- **文章归档** - 按分类和时间整理文章，支持隐藏文章筛选
- **GitHub发布** - 支持直接从编辑器发布到GitHub仓库
- **个人动态** - 记录生活点滴，支持置顶和隐藏功能
- **画廊系统** - 图片管理和展示，支持分类筛选、预览、递归扫描和目录树导航
- **待办事项** - 待办管理和展示，支持优先级和完成状态
- **更新日志** - 开发日志记录，时间线展示，数据可视化图表，成就标签系统
- **后台管理** - 本地开发环境后台管理系统，支持代码备份和GitHub推送
- **浏览器检测** - 自动检测浏览器兼容性并提示
- **时间进度** - 年度进度和节日倒计时展示
- **桌面应用** - 支持 Electron 34 打包为桌面应用
- **代码复制** - 代码块一键复制功能
- **SEO优化** - 自动生成robots.txt和sitemap.xml，支持搜索引擎验证
- **网站统计** - 接入51la网站统计分析功能

## 项目架构

### 目录结构规范
```
src/
├── app/                    # Next.js App Router
│   ├── about/             # 关于页面
│   ├── archive/           # 文章归档
│   ├── blogs/             # 博客文章动态路由
│   ├── changelogs/        # 更新日志页面
│   ├── friends/           # 友情链接页面
│   ├── gallery/           # 画廊页面
│   ├── guestbook/         # 留言板
│   ├── links/             # 相关链接页面
│   ├── moments/           # 个人动态
│   ├── settings/          # 设置页面
│   ├── tools/             # 工具页面
│   │   ├── pinyin-converter/     # 拼音转换器
│   │   └── markdown-editor/      # Markdown编辑器
│   └── api/               # API路由
├── components/            # 可复用组件
│   ├── ui/               # 基础UI组件
│   ├── magicui/          # 特效UI组件
│   ├── archive/          # 归档专用组件
│   ├── tools/            # 工具专用组件
│   ├── moments/          # 个人动态组件
│   ├── admin/            # 后台管理组件
│   ├── changelogs/       # 更新日志组件
│   ├── core/             # 核心组件
│   └── widgets/          # 功能组件
├── content/               # 内容文件
│   ├── blogs/            # Markdown博客文章
│   ├── moments/          # Markdown个人动态
│   ├── changelogs/       # 更新日志
│   └── todo.json         # 待办事项数据
├── utils/                 # 工具函数
├── setting/               # 配置文件
├── types/                 # TypeScript类型
├── contexts/              # React上下文
├── hooks/                 # 自定义Hooks
├── services/              # 服务文件
├── lib/                   # 库文件
└── assets/                # 内部资源

public/
├── luotianyi-live2d-master/   # Live2D资源
├── music/                 # 音乐文件
├── tools/                 # 工具相关静态资源
├── assets/               # 静态资源
├── LTY_Picture/          # 洛天依图片资源
├── Blogabout/            # 博客文章图片
├── Momentsabout/         # 个人动态图片
├── friendlink/           # 友链相关
├── js/                   # JavaScript文件
├── api/                  # API相关
└── 404/                  # 404页面
```

### 命名规范
- **组件**: PascalCase (`Navigation.tsx`)
- **工具函数**: camelCase (`assetUtils.ts`)
- **配置文件**: camelCase (`WebSetting.ts`)
- **页面文件**: Next.js约定 (`page.tsx`, `layout.tsx`)

### 开发规范
- **TypeScript**: 严格模式，接口定义Props，禁用any
- **组件**: 函数组件优先，明确'use client'标记
- **状态管理**: useState/useReducer，禁止直接修改状态
- **导入顺序**: React → 第三方 → 内部组件 → 工具 → 类型 → 样式
- **命名**: 事件处理camelCase (`onClick={handleClick}`)
- **列表渲染**: 必须提供稳定key属性

### 样式规范
- **Tailwind优先**: 避免自定义CSS
- **响应式设计**: 使用Tailwind响应式前缀
- **状态样式**: 使用Tailwind状态变体
- **动画**: Framer Motion优先

## 环境配置

### 环境变量
```bash
# 开发环境 (.env.local)
NODE_ENV=development
NEXT_PUBLIC_BASE_PATH=              # 空值，本地开发
NEXT_PRIVATE_STATIC_EXPORT=false

# 生产环境 (.env) - GitHub Pages 默认域名
NODE_ENV=production
NEXT_PUBLIC_GITHUB_REPO_NAME=你的仓库名
NEXT_PUBLIC_BASE_PATH=/你的仓库名  # GitHub Pages路径前缀

# 生产环境 (.env) - 自定义域名
NODE_ENV=production
NEXT_PUBLIC_GITHUB_REPO_NAME=你的仓库名
NEXT_PUBLIC_BASE_PATH=             # 空值，自定义域名不需要仓库名前缀
```

### 核心命令
```bash
npm run dev          # 开发服务器 (Turbopack)
npm run build        # 生产环境构建
npm run build:pages  # GitHub Pages构建
npm run lint         # 代码检查
npm run sync-theme   # 主题同步
npm run generate-gallery  # 生成画廊数据
npm run export       # 静态导出（实际执行 next build）
npm run serve        # 本地预览构建结果
npm run electron     # 运行桌面应用
```

## 资源管理

### 路径处理
- **核心工具**: `src/utils/assetUtils.ts`
- **关键函数**: `getAssetPath()`, `getBasePath()`, `formatAudioUrl()`

### 图片优化
- **组件**: `OptimizedImage` - 统一图片加载
- **格式**: WebP/AVIF优先
- **懒加载**: 内置支持

### 音乐管理
- **存储**: `public/music/`
- **播放器**: APlayer
- **状态**: 跨页面持久化

## 主题系统

### 主题配置
- **配置**: `src/setting/WebSetting.ts`
- **预设**: 锁定天依蓝

### 主题切换
- **模式**: 亮色/暗色/系统
- **状态**: localStorage持久化

## 组件开发

### 组件标准
```tsx
// Props接口
interface ComponentProps {
  title: string;
  className?: string;
}

// 函数组件
export default function Component({ title, className }: ComponentProps) {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // 逻辑处理
    return () => { /* 清理 */ };
  }, [dependency]);
  
  return <div className={className}>{/* 内容 */}</div>;
}
```

## 部署配置

### Next.js配置
```typescript
const nextConfig = {
  reactStrictMode: true,
  turbopack: {},  // Next.js 16 默认启用 Turbopack
  
  // Server Actions 配置
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  
  // 静态导出配置（仅在构建时启用）
  ...(isStaticExport && !isDev && {
    output: "export",
    distDir: 'out',
    trailingSlash: true,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
    assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
    images: {
      unoptimized: true,
    },
  }),
  
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};
```

## 性能优化
- **代码分割**: Next.js自动分割 + 动态导入
- **包大小**: 定期分析，移除未使用依赖
- **图片格式**: WebP/AVIF优先
- **加载优化**: 懒加载 + 渐进式占位符
- **缓存策略**: 合理设置Cache-Control，关键资源preload
- **编译优化**: 生产环境移除console日志和React属性

## 安全规范
- **前端安全**: TypeScript严格检查，输入验证，XSS防护，CSRF保护，CSP策略
- **依赖安全**: `npm audit`定期检查，Dependabot自动补丁，最小权限原则

## 文档规范
- **代码注释**: 记录开发思考，关键逻辑说明，组件用途和props
- **README要求**: 项目概述，安装运行步骤，部署流程，基础配置，个性化设置

## 版本控制
- **提交策略**: 完整功能开发测试后提交，每个提交对应单一逻辑变更
- **分支管理**: main（主分支），feature（功能开发分支）

## 数据管理
- **状态管理**: 局部使用useState，全局使用React Context或自定义Hooks
- **数据获取**: 静态使用`getStaticProps`，动态使用`getServerSideProps`，客户端使用`useEffect` + fetch/SWR

## 设计模式
### 复合组件
```tsx
const Card = ({ children, className }: CardProps) => {
  return <div className={`card ${className}`}>{children}</div>;
};

Card.Header = ({ title }: { title: string }) => <h3>{title}</h3>;
Card.Body = ({ children }: { children: ReactNode }) => <div>{children}</div>;
```

### 自定义Hooks
```tsx
const useLocalStorage = <T,>(key: string, initialValue: T) => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    setStoredValue(value);
    window.localStorage.setItem(key, JSON.stringify(value));
  };

  return [storedValue, setValue];
};
```

## 个人博客特色
- **洛天依主题**: 以虚拟歌手洛天依为核心设计元素
- **音乐元素**: 精选天依歌曲，营造沉浸式体验
- **视觉设计**: 天依蓝主色调，和谐统一的视觉风格
- **互动体验**: Live2D看板娘提供个性化交互

## 导航结构

### 桌面端导航
```
首页 | 博客 | 归档 | 画廊 | 动态 | 日志 | 社交 ▼ | 小工具 | 关于 ▼
                                    ├─ 留言板           ├─ 关于我
                                    └─ 友链             └─ 相关链接
```

### 导航说明
- **社交下拉菜单**: 包含留言板 (`/guestbook`) 和友链 (`/friends`)
- **关于下拉菜单**: 包含关于我 (`/about`) 和相关链接 (`/links`)
- **移动端**: 下拉菜单项在汉堡菜单中展开显示

## 工具开发规范
- **拼音转换器**: 汉字转拼音、多音字识别、拼音首字母提取、声调转换
- **Markdown编辑器**: 实时预览、语法高亮、工具栏、导出功能、GitHub发布
- **画廊系统**: 图片管理、分类筛选、图片预览、高级放大控制、递归扫描、目录树导航
- **待办事项**: 待办管理、优先级设置、完成状态、后台CRUD操作
- **代码块组件**: 语法高亮、语言标签显示、一键复制功能
- **暗黑模式图片**: 智能滤镜适配、懒加载、WebP格式支持

## 博客内容管理规范

### 文章结构标准
```markdown
---
title: "文章标题"
date: "YYYY-MM-DD"
updatedAt: "YYYY-MM-DD"  # 可选：文章更新时间
category: "分类"
tags: ["标签1", "标签2"]
excerpt: "文章摘要"
coverImage: "/path/to/image.png"  # 可选：封面图片路径
hidden: false  # 可选：设置为true隐藏文章
---

# 文章标题

文章内容使用 Markdown 格式编写
```

### 时效性说明规则
- **显示条件**：仅技术分类文章显示时效性说明
- **显示逻辑**：
  - 超过3年：显示警告样式，提示内容可能已过时
  - 超过1年：显示信息样式，提示部分内容可能已更新
- **时间计算**：优先使用 `updatedAt` 日期，否则使用 `date` 日期

### 内容分类标准
- **技术文章**: 编程、开发、技术分享
- **生活随笔**: 个人感悟、生活记录
- **洛天依**: VOCALOID、洛天依相关内容
- **学习笔记**: 学习过程中的笔记总结
- **项目文档**: 项目相关的说明文档

### 标签使用规范
- **使用小写字母**: 统一使用小写字母
- **连字符分隔**: 多词标签使用连字符，如 `machine-learning`
- **避免过多**: 每篇文章标签数量控制在 3-5 个

## 个人动态管理规范

### 动态结构标准
```markdown
---
id: "1"
time: "YYYY-MM-DD HH:MM:SS"
pinned: false  # 可选，设置为true可置顶动态
hidden: false  # 可选，设置为true隐藏动态
tags: ["标签1", "标签2"]
images: ["/Momentsabout/图片1.jpg", "/LTY_Picture/图片2.png"]  # 可选，支持多张图片
---

动态内容使用 Markdown 格式编写
```

### 时间格式规范
- **时间格式**: `YYYY-MM-DD HH:MM:SS`，精确到秒
- **时区设置**: 使用北京时间（UTC+8）
- **排序依据**: 按时间倒序排序，置顶动态优先

## 待办事项管理规范

### 待办数据结构
待办数据存储在 `src/content/todo.json` 文件中：

```json
{
  "title": "待办事项",
  "showStats": true,
  "items": [
    {
      "id": "唯一标识符",
      "content": "待办内容",
      "completed": false,
      "priority": "medium",
      "dueDate": "YYYY-MM-DD",
      "createdAt": "YYYY-MM-DDTHH:MM:SS",
      "updatedAt": "YYYY-MM-DDTHH:MM:SS"
    }
  ]
}
```

### 字段说明
| 字段 | 必填 | 说明 |
|------|------|------|
| id | 是 | 唯一标识符，自动生成 |
| content | 是 | 待办内容 |
| completed | 是 | 完成状态，true/false |
| priority | 否 | 优先级：high/medium/low |
| dueDate | 否 | 截止日期，格式 YYYY-MM-DD |
| createdAt | 是 | 创建时间，ISO 8601格式 |
| updatedAt | 否 | 更新时间，ISO 8601格式 |

### 功能特性
- **前台展示**: 在动态页面侧边栏静态展示，支持完成进度统计
- **后台管理**: 本地开发环境访问 `/admin/todo` 进行管理
- **Server Actions**: 使用 `todoActions.ts` 处理数据操作
- **静态部署**: 修改后需重新构建部署

## 更新日志管理规范

### 日志文件结构
更新日志存储在 `src/content/changelogs/` 目录中：

```markdown
---
date: "YYYY-MM-DD"
title: "更新标题"
type: "feature|optimize|fix|docs|style|refactor"
commits:
  - "commit message 1"
  - "commit message 2"
---

更新内容描述
```

### 类型说明
| 类型 | 说明 | 颜色 |
|------|------|------|
| feature | 新功能添加 | #66ccff (天依蓝) |
| optimize | 性能优化或代码重构 | #9966ff (紫色) |
| fix | Bug修复 | #ff66cc (粉色) |
| docs | 文档更新 | #ff9966 (橙色) |
| style | 样式调整 | #ccff66 (黄绿色) |
| refactor | 代码重构 | #66ff99 (绿色) |

### 旧类型映射（已弃用）
| 旧类型 | 映射到 | 说明 |
|--------|--------|------|
| perf | optimize | 性能优化 |
| chore | docs | 其他/杂项 |

### 展示规则
- **时间线展示**: 按日期倒序排列
- **分类标记**: 不同类型使用不同颜色标记
- **自动归档**: 按月份自动分组
- **数据可视化**: 时间趋势折线图、类型分布环形图
- **成就标签**: 根据提交数量和日志行数自动计算成就标签

### 成就标签系统

#### 成就类型
| 成就名称 | 触发条件 | 颜色 |
|---------|---------|------|
| 略感疲惫 | 关联提交数量 >= 10 且 < 20 | #7366ff |
| 肝爆了 | 关联提交数量 >= 20 | #e566ff |
| 麻雀虽小五脏俱全 | 关联提交 = 1 且 日志行数 > 55 | #ff66a6 |

#### 自定义荣誉
支持在日志 frontmatter 中手动配置荣誉：
```yaml
honors:
  - name: "自定义荣誉名称"
    color: "bg-gradient-to-r from-blue-500 to-purple-500"
```

## 后台管理规范

### 组件库
后台管理使用统一的UI组件库，位于 `src/components/admin/`：

- **AdminLayout**: 后台布局组件
- **AdminCard**: 卡片容器组件
- **AdminButton**: 按钮组件
- **AdminInput**: 输入框组件
- **AdminForm**: 表单组件
- **AdminTable**: 表格组件
- **AdminModal**: 模态框组件
- **AdminConfirm**: 确认对话框组件
- **AdminLoading**: 加载状态组件
- **AdminToast**: 消息提示组件
- **AdminSearchBar**: 搜索栏组件
- **AdminSidebar**: 侧边栏导航组件

### 访问方式
- **开发环境**: 访问 `/admin` 进入后台管理
- **功能模块**: 待办管理、更新日志管理、代码备份、GitHub推送等

### 后台管理功能
- **待办管理** (`/admin/todo`): 待办事项的增删改查操作
- **更新日志管理** (`/admin/changelogs`): 创建、编辑、删除更新日志
- **代码备份** (`/admin/backup`): 本地代码备份快照的创建、恢复、删除，支持密码验证保护
- **GitHub推送** (`/admin/github`): 直接推送更改到远程仓库，支持构建后推送

## 浏览器兼容性规范

### 检测功能
- **自动检测**: 页面加载时自动检测浏览器类型和版本
- **兼容性提示**: 对不支持的浏览器显示警告信息
- **推荐浏览器**: Chrome、Firefox、Safari、Edge 最新版本

### 实现方式
- **检测组件**: `BrowserCompatibilityWarning` 组件
- **横幅提示**: `BrowserCompatibilityBanner` 组件
- **用户可关闭**: 提示可被用户手动关闭

## 时间进度组件规范

### 功能特性
- **年度进度**: 显示当前年份已过百分比
- **节日倒计时**: 重要节日倒计时显示
- **可视化展示**: 进度条和数字结合展示

### 组件位置
- **组件**: `src/components/moments/TimeProgressWidget.tsx`
- **展示位置**: 动态页面侧边栏

## 桌面应用支持

### Electron配置
- **入口文件**: `electron/main.js`
- **运行命令**: `npm run electron`
- **开发命令**: `npm run electron:dev`
- **当前版本**: Electron 34（支持Node.js 24）

### 注意事项
- 桌面应用为可选功能，不影响Web版本使用
- 需要单独安装Electron依赖
- 支持Windows、macOS、Linux平台
- Electron 34已解决与Node.js 24的兼容性问题

## 响应式设计规范
- **断点设置**: 移动端(< 640px)、平板端(640px - 1024px)、桌面端(> 1024px)、大屏(> 1280px 可选)
- **适配原则**: 移动优先，弹性布局，图片响应，字体大小使用rem单位

## 可访问性规范
- **WCAG 2.1 标准**: 颜色对比≥4.5:1，键盘导航支持，屏幕阅读器支持，清晰的焦点指示
- **图片可访问性**: 所有图片提供有意义的alt属性

## 附录

### 常用命令速查表
```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 生产环境构建
npm run build:pages      # GitHub Pages 构建
npm run lint             # 代码质量检查
npm run sync-theme       # 同步主题配置
npm run generate-gallery # 生成画廊数据

# 部署
npm run export           # 静态导出（实际执行 next build）
npm run serve            # 本地预览构建结果

# 桌面应用
npm run electron         # 运行桌面应用
```

### 开发环境要求
- **Node.js**: 20.9+ 或更高版本（Next.js 16 要求）
- **npm**: 9.x 或更高版本
- **Git**: 2.x 或更高版本

---

*最后更新: 2026年4月13日*
*维护者: 歆橙*
*版本: v4.4*
