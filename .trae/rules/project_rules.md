# 个人博客 - 洛天依主题 开发规范

## 项目概述
以洛天依为主题的个人博客，基于 Next.js 16.1.6 构建，支持 GitHub Pages 静态部署（已配置 GitHub Actions 自动部署，使用自定义域名 blog.xinchengp.cn），集成 Live2D 看板娘、Howler 音乐播放器、时光河流归档等特色功能，用于记录技术学习与生活感悟。

## 核心技术栈

### 核心框架
- **Next.js 16.1.6** - App Router；开发模式使用 Turbopack，静态导出/生产构建强制使用 webpack（`next build --webpack`，避免 Turbopack 生产构建偶发缺失 chunk）
- **React 19.x** - 函数组件 + Hooks
- **TypeScript 5.x** - 严格模式，类型安全
- **Node.js 24** - engines 强制要求 >=24.0.0，npm >=10.0.0

### 样式系统
- **Tailwind CSS 4** - 原子化CSS，深色模式支持
- **CSS Variables** - 主题色系统，锁定天依蓝配色
- **Framer Motion** - 动画和过渡效果

### 核心依赖
- **howler** - 音乐播放器核心（`src/utils/howlerPlayerManager.ts` 单例管理器）
- **recharts** - 数据可视化（更新日志统计图、技能雷达图）
- **leaflet / react-leaflet** - 旅行足迹地图
- **yet-another-react-lightbox** - 图片灯箱预览
- **katex / remark-math / rehype-katex** - 数学公式渲染
- **dompurify** - XSS防护
- **octokit / simple-git** - GitHub API 与后台推送
- **express / compression** - 本地静态预览服务器
- **chinese-lunar-calendar** - 农历节日计算

### 核心功能
- **Live2D看板娘** - 洛天依互动系统，支持音乐/主题/页面联动，彩蛋消息功能
- **音乐播放器** - 基于 Howler.js，侧边滑出式设计，播放状态持久化
- **主题系统** - 锁定天依蓝配色，支持暗黑模式图片滤镜优化
- **时光河流归档** - 水平波浪时间线布局，年份自动分组
- **实用工具** - 拼音转换器、Markdown编辑器、洛克王国阵容搭配模拟器
- **GitHub评论** - Giscus评论系统，基于GitHub Discussions
- **粒子动画** - tsparticles背景效果
- **GitHub发布** - 支持直接从编辑器发布到GitHub仓库
- **个人动态** - 记录生活点滴，支持置顶和隐藏功能，画廊选图
- **画廊系统** - 图片管理和展示，支持分类筛选、预览、递归扫描和目录树导航
- **待办事项** - 待办管理和展示，支持优先级和完成状态
- **更新日志** - 开发日志记录，时间线展示，数据可视化图表，成就标签系统
- **后台管理** - 本地开发环境后台管理系统，内容/画廊/备份/推送/设置全模块管理
- **浏览器检测** - 自动检测浏览器兼容性并提示
- **时间进度** - 年度进度和节日倒计时展示
- **桌面应用** - 支持 Electron 34 打包为桌面应用
- **代码复制** - 代码块一键复制功能
- **SEO优化** - 自动生成robots.txt和sitemap.xml，支持搜索引擎验证
- **网站统计** - 接入51la网站统计分析功能
- **安全防护** - XSS防护、CSP策略、防劫持检测（security组件）

## 项目架构

### 目录结构规范
```
src/
├── app/                    # Next.js App Router
│   ├── about/             # 关于页面
│   ├── archive/           # 文章归档（时光河流）
│   ├── blogs/             # 博客文章动态路由 [slug]
│   ├── changelogs/        # 更新日志页面
│   ├── friends/           # 友情链接页面
│   ├── gallery/           # 画廊页面
│   ├── guestbook/         # 留言板
│   ├── links/             # 相关链接页面
│   ├── moments/           # 个人动态
│   ├── settings/          # 设置页面
│   ├── admin/             # 后台管理（dashboard/blogs/moments/changelogs/gallery/todo/backup/settings）
│   ├── tools/             # 工具页面
│   │   ├── pinyin-converter/     # 拼音转换器
│   │   ├── markdown-editor/      # Markdown编辑器
│   │   └── roco-team/            # 洛克王国阵容搭配模拟器
│   └── api/               # API路由（about.txt等）
├── actions/               # Server Actions（含静态导出空实现检测）
│   ├── todoActions.ts     # 待办数据操作
│   ├── momentActions.ts   # 动态数据操作
│   ├── blogActions.ts     # 博客数据操作
│   ├── galleryActions.ts  # 画廊数据操作
│   ├── changelogActions相关/ settingsActions / backupActions / githubActions
│   └── index.static.ts    # 静态导出空实现
├── admin/                 # 后台管理逻辑
├── components/            # 可复用组件
│   ├── ui/               # 基础UI组件
│   ├── magicui/          # 特效UI组件
│   ├── archive/          # 归档专用组件（ClientArchivePage 时光河流）
│   ├── about/            # 关于页面组件（技能雷达图、旅行地图、设备卡片等）
│   ├── tools/            # 工具专用组件
│   ├── moments/          # 个人动态组件
│   ├── blogs/            # 博客专用组件（分享面板、相关文章等）
│   ├── changelogs/       # 更新日志组件
│   ├── admin/            # 后台管理组件库
│   ├── core/             # 核心组件（OptimizedImage等）
│   ├── security/         # 安全组件（防劫持等）
│   └── widgets/          # 功能组件
├── content/               # 内容文件
│   ├── blogs/            # Markdown博客文章
│   ├── moments/          # Markdown个人动态
│   ├── changelogs/       # 更新日志
│   └── todo.json         # 待办事项数据
├── data/                  # 静态数据文件
├── utils/                 # 工具函数（assetUtils、howlerPlayerManager等）
├── setting/               # 配置文件（WebSetting、AboutSetting、toolsSetting等）
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
├── footprintmap/         # 旅行足迹地图资源
├── roco-icons/           # 洛克王国宠物图标
├── giscus-theme/         # Giscus评论区自定义主题样式
├── bilibili-collections/ # B站收藏夹资源
├── aboutme/              # 关于页面资源
├── friendlink/           # 友链相关
├── js/                   # JavaScript文件
├── api/                  # API相关
└── .well-known/          # 域名验证文件
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
- **注释语言**: 所有代码注释必须使用中文

### 样式规范
- **Tailwind优先**: 避免自定义CSS
- **响应式设计**: 使用Tailwind响应式前缀
- **状态样式**: 使用Tailwind状态变体
- **动画**: Framer Motion优先

## 环境配置

### 环境变量
```bash
# 开发环境 (.env.local 或 .env.development)
NEXT_PUBLIC_51LA_ID=...             # 51la统计ID（开发环境与生产一致便于测试）
NEXT_PUBLIC_51LA_CK=...             # 51la统计CK

# 生产环境 (.env.production) - 自定义域名模式（当前使用）
STATIC_EXPORT=true                  # 启用静态导出（必须，否则不生成sitemap）
NEXT_PUBLIC_SITE_URL=https://blog.xinchengp.cn
CUSTOM_DOMAIN=true                  # 使用自定义域名，basePath为空

# 生产环境 - GitHub Pages 默认域名模式
STATIC_EXPORT=true
NEXT_PUBLIC_SITE_URL=https://用户名.github.io
NEXT_PUBLIC_GITHUB_REPO_NAME=你的仓库名
NEXT_PUBLIC_BASE_PATH=/你的仓库名
CUSTOM_DOMAIN=false
```

### 静态导出判定逻辑（next.config.ts）
```typescript
// 同时满足以下条件才启用静态导出：
// 1. NODE_ENV !== 'development'
// 2. STATIC_EXPORT=true 或 NEXT_PRIVATE_STATIC_EXPORT=true
const isStaticExport = process.env.NODE_ENV !== 'development' &&
  (String(process.env.STATIC_EXPORT).toLowerCase() === 'true' ||
   String(process.env.NEXT_PRIVATE_STATIC_EXPORT).toLowerCase() === 'true');
```

**重要**：禁止在 .env.local 中设置 NEXT_PRIVATE_STATIC_EXPORT，否则开发服务器会进入静态导出模式，导致后台所有 Server Actions 返回空数据（页面只剩空壳）。

### 核心命令
```bash
npm run dev              # 开发服务器，固定端口 7120（Turbopack）
npm run build            # 生产环境构建（webpack，需先配置环境变量）
npm run build:pages      # GitHub Pages构建：prepare脚本替换actions → sync-theme → build --webpack → restore
npm run build:static     # 同 build:pages
npm run lint             # 代码检查（eslint src）
npm run sync-theme       # 同步主题色配置
npm run generate-gallery # 生成画廊数据（tsx 执行 TS 脚本）
npm run export           # 静态导出（next build --webpack）
npm run serve            # 本地预览构建结果（Express + compression）
npm run electron         # 运行桌面应用
```

### 构建脚本说明（scripts/）
- **prepare-static-export.js** - 构建前将带 'use server' 的 actions 文件替换为空实现（.bak备份），构建后自动恢复
- **serve-static.js** - Express静态预览服务器
- **sync-theme-colors.js** - 主题色同步
- **generate-sitemap.ts** - 生成 sitemap.xml 和 robots.txt
- **generate-gallery-data.ts** - 递归扫描画廊图片生成数据

## 资源管理

### 路径处理
- **核心工具**: `src/utils/assetUtils.ts`
- **关键函数**: `getAssetPath()`, `getBasePath()`, `formatAudioUrl()`
- **规则**: 所有 public 资源引用必须通过 getAssetPath() 处理，兼容本地开发与 GitHub Pages 部署

### 图片优化
- **组件**: `OptimizedImage` - 统一图片加载
- **格式**: WebP/AVIF优先
- **懒加载**: 内置支持

### 音乐播放器（Howler 实现规范）
- **核心管理器**: `src/utils/howlerPlayerManager.ts`（单例模式）
- **UI组件**: `src/components/MusicPlayer.tsx` + `MusicPlayerController.tsx`
- **交互约束**:
  - 播放器隐藏于屏幕左侧，鼠标进入左侧20px热区或点击独立展开按钮滑出
  - 独立展开按钮仅显示 music.gif 动画，hover 放大1.1倍
  - 鼠标离开播放器区域400ms后自动隐藏
  - 右下角按钮可完全隐藏UI和提示条，热区同步禁用，但播放继续
  - 进度条支持点击和拖拽，悬停时间气泡按位置动态对齐
  - 音量控制使用可拖拽滑块，与播放控制按钮同行
  - 歌单列表仅在播放器展开时完整渲染（交互门控，防止AI爬虫抓取）
  - 播放状态（歌曲索引、进度、音量、播放模式）通过 localStorage 持久化（1秒节流）
  - 单曲循环使用 Howler 原生 loop，随机播放追踪已播索引防止连续重复
  - 歌曲加载失败需等待12秒后自动跳过下一首
  - 对AI爬虫/SEO工具的UA检测跳过加载网易云歌单

## 主题系统

### 主题配置
- **配置**: `src/setting/WebSetting.ts`，主题色由 `scripts/sync-theme-colors.js` 同步
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

### 部署流程（GitHub Actions 自动部署）
- **工作流文件**: `.github/workflows/deploy.yml`
- **触发条件**: 推送到 main 分支或手动触发
- **构建环境**: Node.js 24，npm ci 安装依赖
- **构建步骤**: 删除 .env.local → 生成sitemap → `npm run build:pages` → 上传 out 目录 → 部署
- **环境变量注入**: NODE_ENV=production、NEXT_PRIVATE_STATIC_EXPORT=true、STATIC_EXPORT=true、CUSTOM_DOMAIN=true、NEXT_PUBLIC_SITE_URL=https://blog.xinchengp.cn、NEXT_PUBLIC_BASE_PATH 为空

### Next.js配置要点（next.config.ts）
```typescript
// 三套配置按环境切换：devConfig（开发）/ staticConfig（静态导出）/ 基础配置
// 开发环境：
//   - Turbopack（Next.js 16 默认）
//   - headers 配置 CSP 安全策略、no-store 缓存（避免 dev 缓存导致改代码不生效）
//   - giscus-theme 路径返回 ACAO:* 跨域头（评论区自定义样式）
//   - devIndicators: false，allowedDevOrigins 跨域白名单
// 静态导出环境：
//   - output: "export"、distDir: 'out'、trailingSlash: true
//   - webpack 构建（turbopack: undefined），避免生产构建偶发缺失 chunk
//   - basePath/assetPrefix 由 CUSTOM_DOMAIN 决定：自定义域名为空，否则取 NEXT_PUBLIC_BASE_PATH
//   - images.unoptimized: true
//   - compiler: 移除 console（保留 error）和 React 属性
//   - experimental 禁用（Server Actions 不可用于静态导出）
```

### Server Actions 静态导出处理
- 所有 actions 文件（momentActions、todoActions、backupActions等）内置 `isStaticExport` 检测
- 静态导出模式下自动返回空实现，无需手动创建空文件
- build:pages 命令通过 prepare-static-export.js 脚本在构建前临时替换，构建后自动恢复

## 性能优化
- **代码分割**: Next.js自动分割 + 动态导入
- **包大小**: 定期分析，移除未使用依赖
- **图片格式**: WebP/AVIF优先
- **加载优化**: 懒加载 + 渐进式占位符
- **缓存策略**: 开发环境 no-store 强制刷新；生产由 GitHub Pages 默认策略处理
- **编译优化**: 静态导出时移除console日志（保留error）和React属性

## 安全规范
- **前端安全**: TypeScript严格检查，输入验证，XSS防护（dompurify），CSP策略（next.config.ts headers）
- **防劫持**: security组件（SecurityProvider、HijackingProtector）
- **依赖安全**: `npm audit`定期检查，Dependabot自动补丁，最小权限原则

## 文档规范
- **代码注释**: 记录开发思考，关键逻辑说明，组件用途和props，一律使用中文
- **README要求**: 项目概述，安装运行步骤，部署流程，基础配置，个性化设置

## 版本控制
- **提交策略**: 完整功能开发测试后提交，每个提交对应单一逻辑变更，提交信息写中文
- **分支管理**: main（主分支），feature（功能开发分支）

## 数据管理
- **状态管理**: 局部使用useState，全局使用React Context或自定义Hooks
- **数据获取**: 静态导出用服务端组件直接读取，客户端用useEffect + fetch
- **Server Actions**: 仅开发环境可用（/admin 后台），静态导出模式下为空实现

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
- **音乐元素**: Howler驱动的沉浸式音乐体验
- **视觉设计**: 天依蓝主色调，和谐统一的视觉风格
- **互动体验**: Live2D看板娘提供个性化交互

## 导航结构

### 桌面端导航
```
首页 | 博客 | 归档 | 画廊 | 动态 | 小工具 | 社交 ▼ | 关于 ▼
                                        ├─ 友链        ├─ 关于我
                                        └─ 留言板      ├─ 日志
                                                       └─ 相关链接
```

### 导航说明
- **一级导航**: 首页、博客、归档、画廊、动态、小工具
- **社交下拉菜单**: 包含友链 (`/friends`) 和留言板 (`/guestbook`)
- **关于下拉菜单**: 包含关于我 (`/about`)、日志 (`/changelogs`) 和相关链接 (`/links`)
- **移动端**: 下拉菜单项在汉堡菜单中展开显示
- **配置位置**: `src/components/Navigation.tsx`

## 工具开发规范
- **拼音转换器**: 汉字转拼音、多音字识别、拼音首字母提取、声调转换
- **Markdown编辑器**: 实时预览、语法高亮、工具栏、导出功能、GitHub发布
- **阵容搭配模拟器** (`/tools/roco-team`): 洛克王国天梯赛宠物一览、阵容搭配、禁赛设置、外观切换、血脉选择
- **工具配置**: 新工具需在 `src/setting/toolsSetting.ts` 的 availableTools 中注册（isActive、path、featured）
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
coverImage: "/Blogabout/文章名/cover.png"  # 可选：封面图片路径
hidden: false  # 可选：设置为true隐藏文章
---

# 文章标题

文章内容使用 Markdown 格式编写
```

### Markdown 渲染增强
- **数学公式**: 支持 KaTeX 语法（remark-math + rehype-katex）
- **视频渲染**: 图片语法引用视频文件（.mp4/.webm/.mov/.mkv/.ogg）时自动渲染为 video 标签
- **B站嵌入**: 支持 BilibiliIframe 组件嵌入B站视频
- **视频路径**: 通过 getAssetPath() 处理，兼容本地开发与 GitHub Pages
- **视频排除**: 视频不纳入图片灯箱集合

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

### 归档页面规范（时光河流）
- **布局**: 水平波浪河流时间线（ClientArchivePage.tsx），三个正弦波叠加形成波浪主线
- **年份标记**: 大数字年份标记，虚线连接时间线，按相邻卡片位置自动上/下翻转，年份间有专属间距
- **文章卡片**: 显示封面图、格式化日期（YYYY.MM.DD）、标签
- **标签交互**: 标签点击可筛选文章
- **渲染规则**: 仅渲染非隐藏文章

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
- **Server Actions**: 使用 `todoActions.ts` 处理数据操作（内置静态导出空实现）
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
代码中严格定义了六种类型，无其他选项：

| 类型 | 中文标签 | 颜色 |
|------|---------|------|
| feature | 新功能 | #66ccff (天依蓝) |
| optimize | 优化 | #9966ff (紫色) |
| fix | 修复 | #ff66cc (粉色) |
| docs | 文档 | #ff9966 (橙色) |
| style | 样式 | #ccff66 (黄绿色) |
| refactor | 重构 | #66ff99 (绿色) |

### 旧类型映射
代码读取时会将旧类型自动映射到上述六种之一：

| 旧类型 | 映射目标 | 说明 |
|--------|---------|------|
| perf | optimize | 性能优化类提交映射为优化 |
| chore | docs | 其他/杂项类提交映射为文档 |

**注意：** 若 frontmatter 中的 type 值不在有效列表中且无法映射，代码会默认将其视为 `docs` 类型。

### 展示规则
- **时间线展示**: 按日期倒序排列
- **分类标记**: 不同类型使用不同颜色标记
- **自动归档**: 按月份自动分组
- **数据可视化**: 时间趋势折线图、类型分布环形图（Recharts）
- **成就标签**: 根据提交数量和日志行数自动计算成就标签

### 成就标签系统

#### 成就类型
代码中定义了四种成就类型，自动根据提交数量和日志行数计算：

| 成就名称 | 触发条件 | 颜色 |
|---------|---------|------|
| 略感疲惫 | 关联提交数量 >= 10 且 < 20 | #7366ff |
| 肝爆了 | 关联提交数量 >= 20 | #e566ff |
| 麻雀虽小五脏俱全 | 关联提交 = 1 且 日志行数 > 55 | #ff66a6 |
| 人声鼎沸 | 预留成就类型 | #ff9966 |

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
- **开发环境**: 访问 `/admin` 进入后台管理（总览页为 dashboard）

### 后台管理功能
- **仪表盘** (`/admin/dashboard`): 站点数据总览
- **博客管理** (`/admin/blogs`): 博客文章列表、创建与编辑（`/admin/blogs/edit`）
- **动态管理** (`/admin/moments`): 动态列表、创建与编辑（`/admin/moments/edit`）
- **更新日志管理** (`/admin/changelogs`): 创建、编辑、删除更新日志
- **画廊管理** (`/admin/gallery`): 本地图片上传（local）、远程图床（remote）、画廊设置（settings）
- **待办管理** (`/admin/todo`): 待办事项的增删改查操作
- **代码备份** (`/admin/backup`): 本地代码备份快照的创建、恢复、删除，支持密码验证保护
- **站点设置** (`/admin/settings`): 站点配置在线调整
- **GitHub推送** (`/admin/github` 相关): 直接推送更改到远程仓库，支持构建后推送

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
- **节日倒计时**: 重要节日倒计时显示（农历节日由 chinese-lunar-calendar 计算）
- **可视化展示**: 进度条和数字结合展示

### 组件位置
- **组件**: `src/components/moments/TimeProgressWidget.tsx`
- **展示位置**: 动态页面侧边栏

## 关于页面组件规范

### 页面构成
- **技能雷达图** (`SkillRadarCard`): Recharts 实现，天依蓝配色，悬停显示技能详情，支持入场动画与暗色适配，配置位于 `AboutSetting.ts`（skillList、skillEvaluation）
- **旅行足迹** (`TravelMap`): Leaflet 地图标记旅行地点，资源位于 `public/footprintmap/`
- **游戏库**: 展示常玩游戏卡片
- **设备卡片**: 翻转动画展示硬件信息，正面显示图标+名称
- **顶部收藏**: TopFavoritesCard 展示收藏内容
- **布局约束**: 技能雷达图与旅行地图在中等屏幕以上双列排布（左雷达右地图），移动端纵向堆叠

### 手风琴交互
- "关于我/关于博客/关于域名" 面板必须 hover 触发，0.3s ease-out 过渡，默认完全收起

## 桌面应用支持

### Electron配置
- **入口文件**: `electron/main.js`（默认连接 http://localhost:7120）
- **运行命令**: `npm run electron`
- **当前版本**: Electron 34（支持Node.js 24）

### 注意事项
- 桌面应用为可选功能，不影响Web版本使用
- 支持Windows、macOS、Linux平台
- Electron 34已解决与Node.js 24的兼容性问题
- 开发服务器必须先启动（7120端口）

## 响应式设计规范
- **断点设置**: 移动端(< 640px)、平板端(640px - 1024px)、桌面端(> 1024px)、大屏(> 1280px 可选)
- **适配原则**: 移动优先，弹性布局，图片响应，字体大小使用rem单位

## 可访问性规范
- **WCAG 2.1 标准**: 颜色对比≥4.5:1，键盘导航支持，屏幕阅读器支持，清晰的焦点指示
- **图片可访问性**: 所有图片提供有意义的alt属性
- **SEO门控**: 需要隐藏于爬虫的内容使用 data-nosnippet 属性与交互门控渲染

## AI 技能系统

本项目整合了 [mattpocock/skills](https://github.com/mattpocock/skills) 的 AI 辅助开发技能。

### 可用技能

| 技能 | 命令 | 用途 |
|------|------|------|
| 深度提问 | `/grill-me` | 需求澄清，设计梳理 |
| 带文档的深度提问 | `/grill-with-docs` | 复杂功能开发，建立领域模型 |
| 测试驱动开发 | `/tdd` | 红-绿-重构循环开发 |
| 系统化调试 | `/diagnose` | 困难 bug 的规范诊断流程 |
| 生成 PRD | `/to-prd` | 将讨论结果沉淀为产品需求文档 |
| 极简沟通 | `/caveman` | 减少 token 消耗，快速沟通 |

### 技能文档位置

- 技能说明: `.trae/skills/README.md`
- 领域词汇表: `.trae/CONTEXT.md`
- 架构决策: `.trae/docs/adr/`

### 使用建议

1. **复杂功能** → 先用 `/grill-with-docs` 建立领域模型
2. **核心功能** → 用 `/tdd` 确保代码质量
3. **困难 bug** → 用 `/diagnose` 系统化调试
4. **沉淀文档** → 用 `/to-prd` 生成需求文档

## 附录

### 常用命令速查表
```bash
# 开发
npm run dev              # 启动开发服务器（端口7120）
npm run build            # 生产环境构建
npm run build:pages      # GitHub Pages 构建（自动处理actions替换）
npm run lint             # 代码质量检查
npm run sync-theme       # 同步主题配置
npm run generate-gallery # 生成画廊数据

# 部署
npm run export           # 静态导出（next build --webpack）
npm run serve            # 本地预览构建结果（Express服务器）

# 桌面应用
npm run electron         # 运行桌面应用
```

### 开发环境要求
- **Node.js**: 24.0 或更高版本（engines 强制要求）
- **npm**: 10.0 或更高版本
- **Git**: 2.x 或更高版本

---

*最后更新: 2026年9月22日*
*维护者: 歆橙*
*版本: v5.0*
