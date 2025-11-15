# OxygenBlogPlatform 项目规则文档

## 项目概述
OxygenBlogPlatform 是一个基于 Next.js 15.3.4 的现代化个人博客平台，支持 GitHub Pages 静态部署，具有响应式设计和主题切换功能。项目集成了洛天依Live2D看板娘、音乐播放器、粒子动画等特色功能。

## 技术栈规范

### 核心框架
- **Next.js 15.3.4** - 使用 Turbopack 进行快速开发，支持 App Router
- **React 19.0.0** - 最新版本的 React
- **TypeScript 5.x** - 严格模式启用的类型安全开发

### 样式系统
- **Tailwind CSS 4** - 原子化 CSS 框架，支持深色模式
- **@tailwindcss/typography** - 文章排版样式优化
- **CSS Variables** - 动态主题色系统，支持10种预设主题
- **Framer Motion** - 流畅的动画和过渡效果

### 功能组件
- **Next Themes** - 主题切换管理（亮色/暗色/系统）
- **Heroicons & Lucide React** - 现代化图标库
- **Particles.js** - 动态粒子背景效果

### 内容处理
- **React Markdown** - Markdown 内容渲染
- **Remark & Rehype** - Markdown 处理插件链
- **Highlight.js** - 代码语法高亮显示
- **KaTeX** - 数学公式渲染支持

### 特色功能
- **洛天依Live2D** - 集成看板娘互动系统
- **APlayer** - 音乐播放器，支持播放状态持久化
- **Giscus** - 基于GitHub Issues的评论系统

## 项目架构规范

### 目录结构
```
src/
├── app/                    # Next.js App Router 页面路由
│   ├── about/             # 关于页面
│   ├── archive/           # 文章归档页面
│   ├── blogs/             # 博客文章动态路由
│   ├── guestbook/         # 留言板页面
│   ├── settings/          # 设置页面
│   └── tools/             # 工具页面
├── components/            # 可复用组件
│   ├── archive/           # 归档页面专用组件
│   ├── magicui/         # 特效UI组件
│   ├── ui/               # 基础UI组件
│   ├── LuoTianyiLive2D.tsx    # Live2D看板娘组件
│   ├── MusicPlayer.tsx        # 音乐播放器组件
│   ├── Navigation.tsx         # 导航栏组件
│   └── ThemeToggle.tsx        # 主题切换组件
├── utils/                 # 工具函数
│   ├── assetUtils.ts      # 资源路径处理工具
│   ├── globalMusicPlayerManager.ts  # 音乐播放状态管理
│   └── loadScript.ts      # 脚本加载工具
├── setting/               # 配置设置
│   ├── WebSetting.ts      # 网站全局配置
│   ├── NavigationSetting.ts   # 导航配置
│   ├── FooterSetting.ts   # 页脚配置
│   └── AboutSetting.ts    # 关于页面配置
├── types/                 # TypeScript 类型定义
├── contexts/              # React 上下文
└── hooks/                 # 自定义React Hooks

public/
├── luotianyi-live2d-master/   # Live2D模型资源
├── music/                 # 音乐文件
└── assets/               # 静态资源
```

### 文件命名规范
- **组件文件**: PascalCase (如 `Navigation.tsx`)
- **工具函数**: camelCase (如 `assetUtils.ts`)
- **配置文件**: camelCase (如 `WebSetting.ts`)
- **页面文件**: 使用 Next.js App Router 约定 (如 `page.tsx`, `layout.tsx`)
- **类型定义**: PascalCase 接口，camelCase 类型文件 (如 `types.ts`)

### 代码规范
- **ESLint**: 使用 Next.js 推荐的配置 + TypeScript严格模式
- **TypeScript**: 启用严格模式，使用接口定义组件Props
- **路径别名**: 使用 `@/*` 指向 `src/*`
- **客户端组件**: 使用 `'use client'` 标记明确区分

## 开发环境配置

### 环境变量配置
- **开发环境** (`.env.local`): 
  - `NODE_ENV=development`
  - `NEXT_PUBLIC_BASE_PATH=` (空值，本地开发)
  - `NEXT_PRIVATE_STATIC_EXPORT=false`

- **生产环境** (`.env`):
  - `NODE_ENV=production`
  - `NEXT_PUBLIC_GITHUB_REPO_NAME=OxygenBlogPlatform`
  - `NEXT_PUBLIC_BASE_PATH=/OxygenBlogPlatform` (GitHub Pages路径)

### 开发命令
```bash
npm run dev          # 开发服务器 (Turbopack加速)
npm run build        # 生产构建 (自动同步主题)
npm run build:pages  # GitHub Pages专用构建
npm run sync-theme   # 同步主题颜色配置
npm run lint         # 代码质量检查
npm run export       # 静态导出构建
```

### 构建流程
1. **开发模式**: `npm run dev` - 启用Turbopack，支持热更新
2. **生产构建**: `npm run build` - 自动执行主题同步，生成优化构建
3. **GitHub Pages**: `npm run build:pages` - 专为GitHub Pages优化的构建流程

## 静态资源处理规范

### 资源路径管理
- **核心工具**: 使用 `src/utils/assetUtils.ts` 中的工具函数处理路径
- **开发环境**: 直接使用相对路径，无需额外处理
- **生产环境**: 自动检测并添加 GitHub Pages basePath
- **路径函数**: 
  - `getAssetPath()` - 处理静态资源路径
  - `getBasePath()` - 获取基础路径
  - `formatAudioUrl()` - 处理音频文件路径

### 图片优化策略
- **静态导出模式**: 禁用图片优化 (`unoptimized: true`)
- **图片组件**: 使用 `OptimizedImage` 组件进行统一图片加载
- **格式支持**: 支持 WebP、AVIF 等现代格式
- **懒加载**: 实现图片懒加载和占位符

### 音乐文件管理
- **存储位置**: 音乐文件存储在 `public/music/` 目录
- **播放器**: 使用 APlayer 进行音乐播放管理
- **状态持久化**: 通过 `GlobalMusicPlayerManager` 实现播放状态跨页面保持
- **播放列表**: 支持自定义播放列表，自动提取文件名作为标题

## 主题系统规范

### 主题色配置系统
- **配置文件**: `src/setting/WebSetting.ts` - 集中管理主题配置
- **预设方案**: 支持 10 种精心设计的主题色方案
- **当前主题**: 蓝色主题 (`themePresets.blue`)
- **动态生成**: 基于主色调自动生成辅助色和文本色

### 主题切换机制
- **模式支持**: 亮色/暗色/系统主题三模式切换
- **技术实现**: 使用 `next-themes` 进行主题状态管理
- **持久化**: 主题状态自动存储在 localStorage
- **组件集成**: `ThemeToggle` 组件提供用户界面

### CSS 变量系统
- **变量定义**: 使用 CSS 自定义属性定义完整颜色系统
- **动态调整**: 智能计算颜色亮度、对比度和可访问性
- **响应式**: 支持媒体查询适配不同设备
- **类型安全**: TypeScript 类型定义确保变量使用正确

## 组件开发规范

### 组件结构标准
```tsx
// 1. 导入区域 - 按类型分组导入
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

// 2. 类型定义 - 清晰的Props接口
interface ComponentProps {
  title: string;
  className?: string;
}

// 3. 组件实现 - 函数组件优先
export default function Component({ title, className }: ComponentProps) {
  // 状态管理 - 使用描述性变量名
  const [isVisible, setIsVisible] = useState(false);
  
  // 副作用处理 - 包含清理逻辑
  useEffect(() => {
    // 逻辑处理
    return () => {
      // 清理函数
    };
  }, [dependency]);
  
  // 渲染逻辑 - 语义化JSX
  return (
    <div className={className}>
      {/* 组件内容 */}
    </div>
  );
}
```

### 动画规范
- **动画库**: 使用 Framer Motion 进行动画处理
- **设计原则**: 遵循 Material Design 动画原则
- **性能优化**: 确保动画流畅度，避免重排重绘
- **可访问性**: 提供 prefers-reduced-motion 媒体查询支持

## 部署配置规范

### GitHub Pages 部署策略
- **自动化部署**: 使用 GitHub Actions 自动部署流程
- **静态导出**: 启用静态导出模式 (`output: "export"`)
- **路径处理**: 自动设置 basePath 和 assetPrefix
- **分支保护**: main 分支自动触发部署流程

### Next.js 构建配置
```typescript
// next.config.ts - 生产环境优化配置
const isStaticExport = process.env.NODE_ENV === 'production';
const repoName = process.env.NEXT_PUBLIC_GITHUB_REPO_NAME || 'OxygenBlogPlatform';

const nextConfig = {
  output: "export",                    // 静态导出模式
  basePath: `/${repoName}`,           // GitHub Pages 仓库路径
  assetPrefix: `/${repoName}`,        // 资源前缀
  images: { unoptimized: true },      // 禁用图片优化
  trailingSlash: true,                // 确保URL一致性
  distDir: 'out',                     // 构建输出目录
  experimental: {
    optimizeCss: true,                 // CSS优化
  },
};
```

### 部署流程详解
1. **代码推送**: 推送到 main 分支触发 GitHub Actions
2. **自动构建**: 执行 `npm run build:pages` 进行优化构建
3. **环境配置**: 自动设置生产环境变量和路径配置
4. **静态导出**: 生成优化后的静态文件到 `out/` 目录
5. **Pages 部署**: 自动部署到 GitHub Pages 服务
6. **CDN 缓存**: 利用 GitHub 全球 CDN 加速内容分发

## 性能优化规范

### 代码分割策略
- **自动分割**: 利用 Next.js 自动代码分割功能
- **动态导入**: 对大型组件和库使用动态导入
- **包大小优化**: 定期分析并优化 bundle 大小
- **依赖管理**: 移除未使用的依赖，使用更轻量的替代方案

### 图片优化方案
- **格式选择**: 优先使用 WebP/AVIF 格式，提供 JPEG/PNG 回退
- **懒加载**: 实现图片懒加载和渐进式占位符
- **尺寸优化**: 根据显示需求优化图片尺寸和质量
- **CDN加速**: 利用 GitHub Pages 全球 CDN 加速图片分发

### 缓存策略
- **HTTP缓存**: 合理设置 Cache-Control 和 ETag 头
- **资源预加载**: 使用 `<link rel="preload">` 预加载关键资源
- **代码缓存**: 利用浏览器代码缓存机制
- **离线支持**: 考虑实现 Service Worker 进行离线缓存

## 测试规范

### 单元测试标准
- **工具函数**: 为所有工具函数编写完整单元测试
- **组件测试**: 测试组件渲染、props处理和用户交互
- **测试框架**: 使用 Jest + React Testing Library 组合
- **覆盖率**: 追求核心功能 80% 以上测试覆盖率
- **测试结构**: 遵循 Arrange-Act-Assert 模式

### 集成测试要求
- **路由测试**: 验证页面路由和导航功能正常
- **主题系统**: 测试主题切换和持久化功能
- **响应式设计**: 检查不同设备尺寸的适配性
- **跨浏览器**: 确保主流浏览器兼容性
- **性能测试**: 验证页面加载和交互响应时间

## 安全规范

### 内容安全防护
- **类型安全**: 严格使用 TypeScript 进行类型检查
- **输入验证**: 验证所有用户输入和外部数据源
- **XSS防护**: 防止跨站脚本攻击，转义用户内容
- **CSRF防护**: 实施跨站请求伪造保护措施
- **内容策略**: 实施 Content Security Policy

### 依赖安全管理
- **定期审计**: 使用 `npm audit` 定期检查依赖漏洞
- **自动更新**: 配置 Dependabot 自动更新安全补丁
- **最小权限**: 遵循最小权限原则，限制第三方访问
- **供应链**: 验证依赖包来源，避免供应链攻击

## 文档规范

### 代码注释标准
- **复杂逻辑**: 为算法和业务逻辑添加详细注释
- **JSDoc格式**: 使用标准 JSDoc 格式注释所有公共函数
- **组件文档**: 说明组件用途、props 和使用示例
- **类型注释**: 为复杂类型定义提供使用说明
- **变更记录**: 重要修改添加注释说明原因

### README 文档要求
- **项目概述**: 清晰描述项目目标和核心功能
- **快速开始**: 提供简明的安装和运行步骤
- **部署指南**: 详细说明 GitHub Pages 部署流程
- **配置说明**: 解释环境变量和配置文件
- **故障排除**: 包含常见问题解决方案
- **贡献指南**: 说明如何参与项目开发
- **许可证**: 明确项目许可证信息

## 版本控制规范

### 提交策略指南
- **本地开发**: 在本地完成完整功能开发和测试后再提交
- **原子提交**: 保持提交的原子性，每个提交对应一个逻辑变更
- **批量提交**: 推荐批量提交相关修改，避免频繁小提交
- **测试验证**: 确保代码在本地测试通过后再推送
- **代码审查**: 提交前进行自我代码审查
- **禁止自动提交**: 不要设置自动提交到GitHub，所有提交都需要人工确认

### 提交信息规范
- **格式标准**: 使用约定式提交格式 (Conventional Commits)
- **类型明确**: 使用明确的类型标识 (feat, fix, docs, style, refactor, test, chore)
- **描述清晰**: 简洁描述功能修改和修复内容
- **关联引用**: 关联相关 Issue 和 Pull Request
- ** Breaking Change**: 重大变更需要明确标注

### 分支管理策略
- **main 分支**: 生产环境代码，保持稳定可部署状态
- **develop 分支**: 开发集成分支，合并功能开发
- **feature 分支**: 功能开发分支，命名格式 `feature/功能描述`
- **hotfix 分支**: 紧急修复分支，命名格式 `hotfix/问题描述`
- **个人分支**: 开发者个人工作分支，完成开发后合并到 develop

### 合并流程
1. **功能完成**: 在功能分支完成开发和测试
2. **代码审查**: 创建 Pull Request 进行代码审查
3. **自动化测试**: 通过 CI/CD 自动化测试
4. **合并策略**: 使用 Squash 合并保持主分支整洁
5. **分支清理**: 合并后删除已完成功能分支

### 特殊功能开发指南

#### Live2D 模型集成
- **模型文件**: 存储在 `public/luotianyi-live2d-master/` 目录
- **交互系统**: 通过 `message.js` 实现点击和悬停交互
- **消息管理**: 使用 `GlobalMessageManager` 统一管理消息显示
- **性能优化**: 模型加载采用懒加载策略

#### 音乐播放器系统
- **状态管理**: 使用 `GlobalMusicPlayerManager` 实现跨页面状态保持
- **播放列表**: 支持自动扫描 `public/music/` 目录
- **UI组件**: `MusicPlayer` 组件提供完整的播放控制界面
- **主题适配**: 播放器样式自动适配当前主题色

#### 评论系统集成
- **Giscus集成**: 使用 GitHub Discussions 作为评论后端
- **主题同步**: 评论系统主题与博客主题保持一致
- **懒加载**: 评论组件采用懒加载优化页面性能

---

*最后更新: 2025年*  
*维护者: 歆橙*  
*版本: v2.0 - 优化版项目规范*