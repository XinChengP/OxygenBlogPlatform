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
- **Live2D看板娘** - 洛天依互动系统，支持音乐/主题/页面联动
- **音乐** - 精选洛天依歌曲，播放状态持久化
- **主题系统** - 锁定天依蓝配色
- **实用工具** - 拼音转换器、Markdown编辑器等小工具
- **GitHub评论** - Giscus评论系统，基于GitHub Discussions
- **粒子动画** - Particles.js背景效果
- **文章归档** - 按分类和时间整理文章
- **GitHub发布** - 支持直接从编辑器发布到GitHub仓库
- **个人动态** - 记录生活点滴，支持置顶功能
- **画廊系统** - 图片管理和展示，支持分类筛选和预览

## 项目架构

### 目录结构规范
```
src/
├── app/                    # Next.js App Router
│   ├── about/             # 关于页面
│   ├── archive/           # 文章归档
│   ├── blogs/             # 博客文章动态路由
│   ├── gallery/           # 画廊页面
│   ├── guestbook/         # 留言板
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
│   ├── core/             # 核心组件
│   └── widgets/          # 功能组件
├── content/               # 内容文件
│   ├── blogs/            # Markdown博客文章
│   └── moments/           # Markdown个人动态
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
  
  // 静态导出配置
  output: "export",
  distDir: 'out',
  trailingSlash: true,
  
  // 根据环境变量自动设置basePath和assetPrefix
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
  
  images: {
    unoptimized: true,
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

## 工具开发规范
- **拼音转换器**: 汉字转拼音、多音字识别、拼音首字母提取、声调转换
- **Markdown编辑器**: 实时预览、语法高亮、工具栏、导出功能、GitHub发布
- **画廊系统**: 图片管理、分类筛选、图片预览、高级放大控制

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
time: "YYYY-MM-DD HH:MM"
pinned: false  # 可选，设置为true可置顶动态
tags: ["标签1", "标签2"]
images: ["图片URL1", "图片URL2"]  # 可选，支持多张图片
---

动态内容使用 Markdown 格式编写
```

### 时间格式规范
- **时间格式**: `YYYY-MM-DD HH:MM`，精确到分钟
- **时区设置**: 使用北京时间（UTC+8）
- **排序依据**: 按时间倒序排序，置顶动态优先

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
```

### 开发环境要求
- **Node.js**: 20.9+ 或更高版本（Next.js 16 要求）
- **npm**: 9.x 或更高版本
- **Git**: 2.x 或更高版本

---

*最后更新: 2026年2月27日*  
*维护者: 歆橙*  
*版本: v3.5 *