# 个人博客 - 洛天依主题 开发规范

## 项目概述
以洛天依为主题的个人博客，基于 Next.js 15.5.9 构建，支持 GitHub Pages 静态部署，集成 Live2D 看板娘、音乐播放器、主题切换等特色功能，用于记录技术学习与生活感悟。

## 核心技术栈

### 核心框架
- **Next.js 15.5.9** - App Router + Turbopack，静态导出模式
- **React 19.0.0** - 函数组件 + Hooks
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
- **粒子动画** - Particles.js背景效果，增强视觉体验
- **文章归档** - 按分类和时间整理文章
- **GitHub发布** - 支持直接从编辑器发布到GitHub仓库

## 项目架构

### 目录结构规范
```
src/
├── app/                    # Next.js App Router
│   ├── about/             # 关于页面
│   ├── archive/           # 文章归档
│   ├── blogs/             # 博客文章动态路由
│   ├── guestbook/         # 留言板
│   ├── settings/          # 设置页面
│   └── tools/             # 工具页面
│       ├── pinyin-converter/     # 拼音转换器
│       └── markdown-editor/      # Markdown编辑器
├── components/            # 可复用组件
│   ├── ui/               # 基础UI组件
│   ├── magicui/          # 特效UI组件
│   ├── archive/          # 归档专用组件
│   ├── tools/            # 工具专用组件
│   └── widgets/          # 功能组件
├── content/               # 内容文件
│   └── blogs/            # Markdown博客文章
├── utils/                 # 工具函数
├── setting/               # 配置文件
├── types/                 # TypeScript类型
├── contexts/              # React上下文
└── hooks/                 # 自定义Hooks

public/
├── luotianyi-live2d-master/   # Live2D资源
├── music/                 # 音乐文件
├── tools/                 # 工具相关静态资源
└── assets/               # 静态资源
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
npm run build:pages  # GitHub Pages构建
npm run sync-theme   # 主题同步
npm run lint         # 代码检查
```

### 构建流程
1. **开发**: `npm run dev` - 热更新，Turbopack加速
2. **构建**: `npm run build:pages` - 静态导出，GitHub Pages优化

## 资源管理

### 路径处理
- **核心工具**: `src/utils/assetUtils.ts`
- **开发环境**: 相对路径
- **生产环境**: 根据配置自动处理
- **关键函数**: `getAssetPath()`, `getBasePath()`, `formatAudioUrl()`
- **环境适配**: 自动检测当前环境，支持自定义域名处理

### 图片优化
- **组件**: `OptimizedImage` - 统一图片加载
- **格式**: WebP/AVIF优先
- **懒加载**: 内置支持
- **缓存**: 全局图片缓存系统

### 音乐管理
- **存储**: `public/music/`
- **播放器**: APlayer
- **状态**: 跨页面持久化
- **播放列表**: 自动提取文件名

## 主题系统

### 主题配置
- **配置**: `src/setting/WebSetting.ts`
- **预设**: 锁定天依蓝
- **动态**: 基于主色调生成辅助色

### 主题切换
- **模式**: 亮色/暗色/系统
- **状态**: localStorage持久化
- **组件**: `ThemeToggle`提供界面

### CSS变量
- **定义**: CSS自定义属性
- **智能**: 自动计算亮度和对比度
- **类型**: TypeScript类型安全

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

### 动画规范
- **库**: Framer Motion
- **性能**: 避免重排重绘
- **可访问性**: 支持prefers-reduced-motion

## 部署配置

### GitHub Pages部署
- **自动化**: GitHub Actions
- **模式**: 静态导出 (`output: "export"`)
- **路径**: 自动basePath配置
- **触发**: main分支推送

### Next.js配置
```typescript
const nextConfig = {
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

### 部署流程
1. **推送**: main分支触发
2. **构建**: `npm run build:pages`
3. **导出**: 静态文件到`out/`
4. **部署**: GitHub Pages自动部署
5. **CDN**: 全球加速分发

## 性能优化

### 代码优化
- **分割**: Next.js自动分割 + 动态导入
- **包大小**: 定期分析，移除未使用依赖
- **缓存**: 浏览器代码缓存机制

### 图片优化
- **格式**: WebP/AVIF优先
- **加载**: 懒加载 + 渐进式占位符
- **尺寸**: 按需优化

### 缓存策略
- **HTTP**: 合理设置Cache-Control
- **预加载**: 关键资源preload
- **离线**: Service Worker支持

## 测试规范

### 单元测试
- **工具函数**: 完整测试覆盖
- **组件**: 渲染、props、交互测试
- **框架**: Jest + React Testing Library
- **覆盖率**: 核心功能80%+

### 集成测试
- **路由**: 页面导航验证
- **主题**: 切换和持久化
- **响应式**: 多设备适配
- **性能**: 加载和响应时间

## 安全规范

### 前端安全
- **类型**: TypeScript严格检查
- **输入**: 验证所有用户输入
- **XSS**: 内容转义防护
- **CSRF**: 跨站请求保护
- **CSP**: 内容安全策略

### 依赖安全
- **审计**: `npm audit`定期检查
- **更新**: Dependabot自动补丁
- **权限**: 最小权限原则
- **供应链**: 验证依赖来源

## 文档规范

### 代码注释
- **个人理解**: 记录开发过程中的思考和感悟
- **关键逻辑**: 说明重要功能的实现思路
- **组件**: 用途、props、使用场景
- **类型**: 复杂类型的设计考虑
- **优化**: 性能优化和最佳实践

### README要求
- **概述**: 个人博客定位，突出洛天依主题特色
- **开始**: 简明安装运行步骤
- **部署**: GitHub Pages流程
- **配置**: 基础配置说明
- **个性化**: 主题和个性化设置
- **记录**: 个人博客使用心得

## 版本控制

### 提交策略
- **本地**: 完整功能开发测试后提交
- **原子**: 每个提交对应单一逻辑变更
- **测试**: 本地验证通过后推送
- **审查**: 提交前自我审查

### 提交信息
- **格式**: 简洁描述修改内容
- **类型**: 功能更新、问题修复、文档更新等
- **描述**: 清晰说明修改目的和影响

### 分支管理
- **main**: 主分支，稳定可部署
- **feature**: 功能开发分支
- **个人开发**: 根据需求创建分支，保持简洁

## 数据管理

### 状态管理
- **局部**: useState管理组件状态
- **全局**: React Context或自定义Hooks
- **持久化**: localStorage/sessionStorage
- **服务器**: SWR或React Query缓存

### 数据获取
- **静态**: `getStaticProps`生成内容
- **动态**: `getServerSideProps`处理
- **客户端**: `useEffect` + fetch/SWR
- **错误**: 统一错误处理

## 设计模式

### 复合组件
```tsx
const Card = ({ children, className }: CardProps) => {
  return <div className={`card ${className}`}>{children}</div>;
};

Card.Header = ({ title }: { title: string }) => <h3>{title}</h3>;
Card.Body = ({ children }: { children: ReactNode }) => <div>{children}</div>;
```

### 高阶组件
```tsx
const withLoading = <P extends object>(Component: ComponentType<P>) => {
  return ({ isLoading, ...props }: P & { isLoading: boolean }) => {
    if (isLoading) return <LoadingSpinner />;
    return <Component {...(props as P)} />;
  };
};
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

### 主题文化
- **洛天依主题**: 以虚拟歌手洛天依为核心设计元素
- **音乐元素**: 精选天依歌曲，营造沉浸式体验
- **视觉设计**: 天依蓝主色调，和谐统一的视觉风格
- **互动体验**: Live2D看板娘提供个性化交互

### 内容创作
- **技术记录**: 分享学习心得和开发经验
- **生活感悟**: 记录个人成长和思考
- **工具分享**: 提供实用的在线小工具
- **学习笔记**: 整理知识体系和技能总结

## 工具开发规范

### 拼音转换器 (Pinyin Converter)
- **功能特性**: 汉字转拼音、多音字识别、拼音首字母提取、声调转换
- **技术实现**: 使用 `pinyin-pro` 库，自定义拼音数据加载
- **文件结构**: `src/app/tools/pinyin-converter/page.tsx`

### Markdown编辑器 (Markdown Editor)
- **功能特性**: 实时预览、语法高亮、工具栏、导出功能、GitHub发布
- **技术实现**: 使用 `react-markdown`，`highlight.js` 集成
- **文件结构**: `src/app/tools/markdown-editor/page.tsx`

### 工具组件开发标准
- 明确的Props接口定义
- 输入输出状态管理
- 核心逻辑封装
- 响应式设计

## 功能联动

### Live2D看板娘联动
- **设计理念**: 看板娘作为交互中心，新功能需考虑联动可能性
- **联动配置**: 支持音乐、主题、页面联动
- **事件系统**: 基于事件总线的消息机制

### 音乐播放器系统
- **状态管理**: 使用 `GlobalMusicPlayerManager` 实现跨页面状态保持
- **播放列表**: 支持自动扫描 `public/music/` 目录
- **主题适配**: 播放器样式自动适配当前主题色

### 评论系统集成
- **Giscus集成**: 使用 GitHub Discussions 作为评论后端
- **主题同步**: 评论系统主题与博客主题保持一致
- **懒加载**: 评论组件采用懒加载优化页面性能

## 博客内容管理规范

### 文章结构标准
```markdown
---
title: "文章标题"
date: "YYYY-MM-DD"
updatedAt: "YYYY-MM-DD"  # 可选：文章更新时间，用于区别发布时间
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
  - 超过3年：显示警告样式，提示"本文于 XXXX 年发布/更新，距今已超过 X 年，文中内容可能已过时"
  - 超过1年：显示信息样式，提示"本文于 XXXX 年发布/更新，距今已超过 X 年，部分内容可能已更新"
- **时间计算**：优先使用 `updatedAt` 日期，否则使用 `date` 日期
- **样式**：
  - 警告样式：黄色左边框，背景半透明
  - 信息样式：蓝色左边框，背景半透明
- **位置**：显示在文章元信息下方，目录导航上方

### 封面图片规范
- **尺寸建议**: 1200x630 像素
- **文件格式**: WebP、PNG、JPG 均可
- **文件大小**: 建议不超过 500KB
- **存储位置**: `public/` 目录下的相关子目录

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
- **保持一致**: 相同概念使用相同标签

## 响应式设计规范

### 断点设置
- **移动端**: < 640px
- **平板端**: 640px - 1024px
- **桌面端**: > 1024px
- **大屏**: > 1280px (可选)

### 组件适配原则
- **移动优先**: 默认样式适配移动端，然后通过媒体查询适配大屏
- **弹性布局**: 使用 Flexbox 和 Grid 进行响应式布局
- **图片响应**: 使用 `max-width: 100%` 确保图片自适应
- **字体大小**: 使用 rem 单位，便于响应式调整

## 可访问性规范

### WCAG 2.1 标准
- **颜色对比**: 确保文本与背景对比度 ≥ 4.5:1
- **键盘导航**: 所有交互元素支持键盘操作
- **屏幕阅读器**: 提供适当的 ARIA 标签
- **焦点指示**: 清晰的焦点状态显示

### 图片可访问性
- **Alt 文本**: 所有图片提供有意义的 alt 属性
- **装饰图片**: 使用空 alt 属性或 CSS 背景
- **复杂图像**: 提供详细的描述文本

## 附录

### 常用命令速查表
```bash
# 开发
npm run dev              # 启动开发服务器
npm run build            # 生产环境构建
npm run build:pages      # GitHub Pages 构建
npm run lint             # 代码质量检查
npm run sync-theme       # 同步主题配置

# 测试
npm run test             # 运行测试
npm run test:watch       # 监听模式运行测试
npm run test:coverage    # 生成测试覆盖率报告

# 部署
npm run export           # 静态导出
npm run serve            # 本地预览构建结果
```

### 项目结构速览
```
OxygenBlogPlatform/
├── src/                   # 源代码目录
│   ├── app/              # Next.js App Router
│   ├── components/       # React 组件
│   ├── content/          # 博客内容 (Markdown)
│   ├── setting/          # 配置文件
│   ├── utils/            # 工具函数
│   └── types/            # TypeScript 类型定义
├── public/               # 静态资源
├── scripts/              # 构建脚本
└── .github/              # GitHub Actions 配置
```

### 开发环境要求
- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本
- **Git**: 2.x 或更高版本

### 浏览器支持
- **Chrome**: 最新版本
- **Firefox**: 最新版本
- **Safari**: 最新版本
- **Edge**: 最新版本
- **移动端**: iOS Safari, Chrome for Android

---

*最后更新: 2026年1月3日*  
*维护者: 歆橙*  
*版本: v3.2 - 添加文章更新时间支持*