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

### 代码风格规范
- **导入顺序**: React → 第三方库 → 内部组件 → 工具函数 → 类型定义 → 样式文件
- **组件定义**: 优先使用函数组件和 React Hooks
- **Props 类型**: 使用接口定义 Props，避免使用 any 类型
- **状态管理**: 使用 useState、useReducer，避免直接修改状态
- **副作用**: 在 useEffect 中处理，确保正确的依赖数组
- **事件处理**: 使用 camelCase 命名，如 `onClick={handleClick}`
- **条件渲染**: 使用短路运算符或条件表达式，避免嵌套过深
- **列表渲染**: 必须提供 key 属性，使用稳定的唯一标识符

### CSS 规范
- **类名命名**: 使用 Tailwind CSS 工具类，避免自定义 CSS
- **响应式**: 使用 Tailwind 响应式前缀，如 `md:text-lg`
- **状态样式**: 使用 Tailwind 状态变体，如 `hover:bg-blue-500`
- **自定义样式**: 仅在必要时使用 CSS Modules 或 styled-components
- **动画**: 优先使用 Framer Motion，避免 CSS 动画冲突

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

## 数据管理规范

### 状态管理原则
- **局部状态**: 使用 useState 管理组件内部状态
- **全局状态**: 使用 React Context 或自定义 Hooks
- **持久化状态**: 使用 localStorage 或 sessionStorage
- **服务器状态**: 使用 SWR 或 React Query 进行缓存管理

### 数据获取规范
- **静态生成**: 使用 `getStaticProps` 生成静态内容
- **服务端渲染**: 使用 `getServerSideProps` 处理动态内容
- **客户端获取**: 使用 `useEffect` + `fetch` 或 SWR
- **错误处理**: 统一的错误处理和加载状态管理

### API 设计规范
- **RESTful**: 遵循 RESTful API 设计原则
- **版本控制**: API 版本号管理，如 `/api/v1/`
- **状态码**: 使用标准的 HTTP 状态码
- **错误响应**: 统一的错误响应格式

## 组件设计模式

### 复合组件模式
```tsx
// 主组件
const Card = ({ children, className }: CardProps) => {
  return <div className={`card ${className}`}>{children}</div>;
};

// 子组件
Card.Header = ({ title }: { title: string }) => <h3>{title}</h3>;
Card.Body = ({ children }: { children: ReactNode }) => <div>{children}</div>;

// 使用
<Card>
  <Card.Header title="标题" />
  <Card.Body>内容</Card.Body>
</Card>
```

### 高阶组件 (HOC)
```tsx
// withLoading 高阶组件
const withLoading = <P extends object>(
  Component: ComponentType<P>
) => {
  return ({ isLoading, ...props }: P & { isLoading: boolean }) => {
    if (isLoading) return <LoadingSpinner />;
    return <Component {...(props as P)} />;
  };
};
```

### 自定义 Hooks
```tsx
// useLocalStorage 自定义 Hook
const useLocalStorage = <T,>(
  key: string,
  initialValue: T
): [T, (value: T) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
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

## 性能优化最佳实践

### React 性能优化
- **React.memo**: 对纯函数组件进行记忆化
- **useMemo**: 缓存昂贵的计算结果
- **useCallback**: 缓存函数引用，避免不必要的重渲染
- **key 属性**: 在列表渲染中使用稳定的 key
- **虚拟滚动**: 长列表使用虚拟滚动技术

### 图片优化策略
- **懒加载**: 使用 loading="lazy" 属性
- **响应式图片**: 使用 srcset 和 sizes 属性
- **现代格式**: 优先使用 WebP、AVIF 格式
- **占位符**: 使用模糊占位符提升感知性能

### 代码分割
- **动态导入**: 使用 `import()` 进行代码分割
- **路由级别**: 按路由进行代码分割
- **组件级别**: 对大型组件进行动态导入
- **第三方库**: 延迟加载非关键第三方库

## 安全最佳实践

### 前端安全
- **XSS 防护**: 对用户输入进行转义
- **CSRF 防护**: 使用 CSRF Token
- **CSP 策略**: 实施内容安全策略
- **HTTPS**: 强制使用 HTTPS

### 数据安全
- **敏感数据**: 不在客户端存储敏感信息
- **API 密钥**: 使用环境变量存储 API 密钥
- **输入验证**: 前后端都要进行输入验证
- **错误信息**: 不要暴露敏感的错误信息

## 监控和分析

### 性能监控
- **Core Web Vitals**: 监控 LCP、FID、CLS 指标
- **自定义指标**: 监控关键用户流程的性能
- **错误监控**: 使用 Sentry 等工具监控运行时错误
- **性能预算**: 设置并监控性能预算

### 用户分析
- **页面浏览**: 使用 Google Analytics 等工具
- **用户行为**: 分析用户在站点的行为模式
- **转化率**: 监控关键功能的转化率
- **A/B 测试**: 进行功能优化的 A/B 测试

### 功能联动开发规范

### Live2D 看板娘联动系统

#### 核心设计理念
Live2D 看板娘作为博客的情感化交互中心，所有新增功能都应考虑与看板娘的联动可能性，创造沉浸式的用户体验。

#### 组件架构规范
```tsx
// Live2D 组件标准结构
interface Live2DConfig {
  modelPath: string;           // 模型文件路径
  messagePath: string;         // 消息配置文件路径
  width: number;               // 画布宽度 (默认: 280)
  height: number;              // 画布高度 (默认: 250)
  mobileDisabled: boolean;     // 是否在移动端禁用 (默认: true)
  autoHideTimeout: number;     // 自动隐藏消息超时时间 (默认: 5000ms)
  fadeOutDuration: number;     // 淡出动画持续时间 (默认: 500ms)
  // 联动配置
  enableMusicInteraction: boolean;  // 启用音乐联动 (默认: true)
  enableThemeInteraction: boolean;  // 启用主题联动 (默认: true)
  enablePageInteraction: boolean;   // 启用页面联动 (默认: true)
  interactionDelay: number;        // 联动响应延迟 (默认: 300ms)
}

// 消息类型定义 - 扩展联动支持
interface Live2DMessage {
  type: 'mouseover' | 'click' | 'time' | 'copy' | 'error' | 'music' | 'theme' | 'page' | 'feature';
  selector?: string;            // CSS 选择器 (mouseover/click 类型)
  text: string | string[];      // 消息内容
  weight?: number;              // 权重，用于随机选择
  condition?: () => boolean;    // 显示条件函数
  // 联动专用字段
  triggerEvent?: string;        // 触发事件名称
  featureName?: string;        // 功能名称 (用于功能联动)
  responseType?: 'immediate' | 'delayed' | 'random'; // 响应类型
}
```

##### 文件结构规范
```
public/luotianyi-live2d-master/
├── live2d/
│   ├── js/
│   │   ├── live2d.js          # Live2D 核心库
│   │   ├── message.js         # 消息系统
│   │   └── controller.js      # 组件控制器
│   ├── css/
│   │   └── live2d.css         # 组件样式
│   ├── model/
│   │   └── tianyi/
│   │       ├── model.json     # 模型配置
│   │       ├── textures/      # 贴图文件
│   │       └── motions/       # 动作文件
│   └── config/
│       ├── messages.json      # 消息配置文件
│       ├── settings.json      # 组件设置
│       └── interactions.json  # 联动配置 (新增)

src/utils/
├── live2dMessageManager.ts    # Live2D消息管理器
├── live2dInteractionManager.ts # Live2D联动管理器 (新增)
└── live2dEventEmitter.ts     # Live2D事件总线 (新增)
```

##### 组件实现规范
```tsx
// 1. 状态管理 - 支持联动状态
const [isVisible, setIsVisible] = useState(true);
const [isLoading, setIsLoading] = useState(true);
const [message, setMessage] = useState('');
const [messageOpacity, setMessageOpacity] = useState(1);
const [interactionState, setInteractionState] = useState<'idle' | 'music' | 'theme' | 'page'>('idle');

// 2. 性能优化
const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const lastMessageTimeRef = useRef<number>(0);
const canvasRef = useRef<HTMLCanvasElement>(null);
const interactionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// 3. 联动消息系统
const updateMessage = useCallback((newMessage: string, type: 'normal' | 'interaction' = 'normal') => {
  // 过滤默认消息
  const isDefaultMessage = newMessage.includes('你好') && 
                          newMessage.includes('洛天依') && 
                          newMessage.includes('！');
  
  if (isDefaultMessage) return;
  
  // 消息去重
  const now = Date.now();
  if (now - lastMessageTimeRef.current < 1000) return;
  
  // 联动类型处理
  if (type === 'interaction') {
    setInteractionState('music'); // 或其他相应状态
    if (interactionTimeoutRef.current) {
      clearTimeout(interactionTimeoutRef.current);
    }
    interactionTimeoutRef.current = setTimeout(() => {
      setInteractionState('idle');
    }, 3000);
  }
  
  setMessage(newMessage);
  setMessageOpacity(1);
  lastMessageTimeRef.current = now;
  triggerFadeOut();
}, [triggerFadeOut]);

// 4. 联动事件监听
useEffect(() => {
  // 监听音乐播放事件
  const handleMusicPlay = (songName: string) => {
    updateMessage(`正在播放：${songName}，好听吗？`, 'interaction');
  };
  
  // 监听主题切换事件
  const handleThemeChange = (theme: string) => {
    const themeMessages = {
      'dark': '切换到深色模式了，天依也喜欢夜晚呢~',
      'light': '亮堂的模式，心情也变好了！',
      'blue': '蓝色主题，像天空一样清澈~',
      'green': '绿色主题，充满生机呢！'
    };
    updateMessage(themeMessages[theme] || '主题换了，新风格很棒呢！', 'interaction');
  };
  
  // 注册事件监听
  Live2DEventEmitter.on('music:play', handleMusicPlay);
  Live2DEventEmitter.on('theme:change', handleThemeChange);
  
  return () => {
    Live2DEventEmitter.off('music:play', handleMusicPlay);
    Live2DEventEmitter.off('theme:change', handleThemeChange);
  };
}, [updateMessage]);

// 5. 资源加载策略
const loadLive2D = useCallback(async () => {
  try {
    // CDN 备份策略
    const jquerySources = [
      'https://cdn.bootcss.com/jquery/2.2.4/jquery.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/jquery/2.2.4/jquery.min.js',
      'https://code.jquery.com/jquery-2.2.4.min.js'
    ];
    
    // 动态加载依赖
    for (const source of jquerySources) {
      try {
        await loadScript(source);
        break;
      } catch (error) {
        console.warn(`jQuery CDN ${source} 加载失败`);
      }
    }
    
    // 加载 Live2D 核心文件
    await loadScript(getAssetPath('/luotianyi-live2d-master/live2d/js/live2d.js'));
    await loadScript(getAssetPath('/luotianyi-live2d-master/live2d/js/message.js'));
    
  } catch (error) {
    console.error('Live2D 加载失败:', error);
  }
}, []);
```

##### 样式规范
```css
/* 1. 主题适配 */
.luotianyi-theme {
  --live2d-bg: rgba(102, 204, 255, 0.2);
  --live2d-border: rgba(102, 204, 255, 0.4);
  --live2d-shadow: 0 3px 15px 2px rgba(102, 204, 255, 0.4);
  --live2d-text: var(--aplayer-fg);
}

/* 2. 响应式设计 */
@media (max-width: 640px) {
  .landlord {
    display: none; /* 移动端默认隐藏 */
  }
}

/* 3. 消息气泡样式 */
.message {
  position: absolute;
  top: -20px;
  left: 50px;
  opacity: 1;
  transition: opacity 0.5s ease-in-out;
  background: var(--live2d-bg);
  padding: 7px;
  border-radius: 12px;
  border: 1px solid var(--live2d-border);
  box-shadow: var(--live2d-shadow);
  color: var(--live2d-text);
  font-size: 13px;
  max-width: 300px;
  word-wrap: break-word;
  z-index: 9997;
}

/* 4. 画布样式 */
.live2d {
  cursor: pointer;
  user-select: none;
  pointer-events: auto;
}

/* 5. 控制按钮 */
.hide-button,
.sing-button {
  position: absolute;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}
```

##### 交互事件规范
```tsx
// 1. 鼠标事件
const handleMouseEnter = useCallback(() => {
  updateMessage('鼠标移入消息');
}, [updateMessage]);

const handleMouseLeave = useCallback(() => {
  // 可选：鼠标离开时清除消息
}, []);

// 2. 点击事件
const handleClick = useCallback(() => {
  const clickMessages = [
    '想听我唱歌吗？',
    '不要动手动脚的！快把手拿开~~',
    '真…真的是不知羞耻！',
    '再摸的话我可要报警了！⌇●﹏●⌇',
    '110吗，这里有个变态一直在摸我(ó﹏ò｡)',
    '呀！你摸到我了！',
    '害羞ing...',
    '天依很萌的！',
    '我是世界第一吃货殿下哦！'
  ];
  
  const randomMessage = clickMessages[Math.floor(Math.random() * clickMessages.length)];
  updateMessage(randomMessage);
}, [updateMessage]);

// 3. 键盘事件
const handleKeyDown = useCallback((event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    setIsVisible(false); // ESC 键隐藏组件
  }
}, []);
```

##### 错误处理规范
```tsx
// 1. 加载错误处理
const handleLoadError = useCallback((error: Error, resource: string) => {
  console.error(`Live2D 资源加载失败: ${resource}`, error);
  
  // 降级处理
  setIsLoading(false);
  setMessage('模型加载失败了...');
  
  // 可选：显示错误提示给用户
  showNotification({
    type: 'error',
    message: 'Live2D 模型加载失败',
    description: '请检查网络连接或刷新页面重试'
  });
}, []);

// 2. 运行时错误处理
const handleRuntimeError = useCallback((error: Error) => {
  console.error('Live2D 运行时错误:', error);
  
  // 尝试恢复
  try {
    // 重新初始化
    loadLive2D();
  } catch (recoveryError) {
    console.error('Live2D 恢复失败:', recoveryError);
  }
}, [loadLive2D]);
```

##### 性能优化规范
```tsx
// 1. 懒加载
const LazyLive2D = lazy(() => import('@/components/LuoTianyiLive2D'));

// 2. 防抖处理
const debouncedUpdateMessage = useMemo(
  () => debounce(updateMessage, 300),
  [updateMessage]
);

// 3. 内存清理
useEffect(() => {
  return () => {
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }
    
    // 清理全局变量
    delete (window as any).showMessage;
    delete (window as any).message_Path;
    delete (window as any).messageConfig;
  };
}, []);

// 4. 条件渲染优化
const shouldRender = useMemo(() => {
  return isVisible && !isMobile && !isLoading;
}, [isVisible, isMobile, isLoading]);
```

##### 可访问性规范
```tsx
// 1. ARIA 标签
<canvas
  ref={canvasRef}
  id="live2d"
  width="280"
  height="250"
  className="live2d"
  role="img"
  aria-label="洛天依 Live2D 看板娘"
  aria-describedby="live2d-description"
/>

<div id="live2d-description" className="sr-only">
  这是洛天依的 Live2D 模型，点击可以与她互动
</div>

// 2. 键盘导航支持
<div
  className="hide-button"
  onClick={toggleVisibility}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleVisibility();
    }
  }}
>
  隐藏
</div>

// 3. 高对比度模式支持
@media (prefers-contrast: high) {
  .message {
    border: 2px solid currentColor;
    background: Canvas;
    color: CanvasText;
  }
}

// 4. 减少动画偏好
@media (prefers-reduced-motion: reduce) {
  .message {
    transition: none;
  }
}
```

##### 测试规范
```tsx
// 1. 单元测试
describe('LuoTianyiLive2D', () => {
  it('应该正确加载模型', async () => {
    render(<LuoTianyiLive2D />);
    await waitFor(() => {
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });
  
  it('应该处理消息显示', () => {
    const { getByText } = render(<LuoTianyiLive2D />);
    fireEvent.click(screen.getByRole('img'));
    expect(getByText(/天依/)).toBeInTheDocument();
  });
  
  it('应该响应键盘事件', () => {
    render(<LuoTianyiLive2D />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});

// 2. 集成测试
describe('Live2D 集成', () => {
  it('应该正确集成到页面中', () => {
    const Page = () => (
      <main>
        <h1>测试页面</h1>
        <LuoTianyiLive2D />
      </main>
    );
    
    render(<Page />);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });
});
```

#### 音乐播放器系统
- **状态管理**: 使用 `GlobalMusicPlayerManager` 实现跨页面状态保持
- **播放列表**: 支持自动扫描 `public/music/` 目录
- **UI组件**: `MusicPlayer` 组件提供完整的播放控制界面
- **主题适配**: 播放器样式自动适配当前主题色

#### 评论系统集成
- **Giscus集成**: 使用 GitHub Discussions 作为评论后端
- **主题同步**: 评论系统主题与博客主题保持一致
- **懒加载**: 评论组件采用懒加载优化页面性能

## 博客内容管理规范

### 文章结构标准
```markdown
---
title: "文章标题"
date: "YYYY-MM-DD"
category: "分类"
tags: ["标签1", "标签2"]
excerpt: "文章摘要"
coverImage: "/path/to/image.png"  # 可选：封面图片路径
---

# 文章标题

文章内容使用 Markdown 格式编写，支持以下扩展功能：

## 支持的 Markdown 扩展

### 代码块高亮
```language
// 代码内容
```

### 数学公式
行内公式：$E = mc^2$
块级公式：
$$
\sum_{i=1}^{n} x_i = x_1 + x_2 + \cdots + x_n
$$

### 表格
| 列1 | 列2 | 列3 |
|-----|-----|-----|
| 内容1 | 内容2 | 内容3 |

### 图片优化
![图片描述](/path/to/image.png)
```

### 封面图片规范
- **尺寸建议**: 1200x630 像素 (适合社交媒体分享)
- **文件格式**: WebP、PNG、JPG 均可
- **文件大小**: 建议不超过 500KB
- **存储位置**: `public/` 目录下的相关子目录
- **路径格式**: 使用绝对路径，如 `/Blogabout/benou/benou.png`

### 内容分类标准
- **技术文章**: 编程、开发、技术分享
- **生活随笔**: 个人感悟、生活记录
- **洛佬相关**: VOCALOID、洛天依相关内容
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

## 性能监控规范

### 核心指标
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FCP (First Contentful Paint)**: < 1.8s

### 监控工具
- **Lighthouse**: 定期进行性能审计
- **Web Vitals**: 监控真实用户体验
- **Bundle Analyzer**: 分析打包大小
- **Chrome DevTools**: 开发时性能调优

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

## 国际化规范

### 多语言支持
- **默认语言**: 简体中文 (zh-CN)
- **语言检测**: 根据用户浏览器设置自动检测
- **回退策略**: 不支持的语言回退到简体中文

### 内容翻译
- **关键内容**: 导航、按钮、提示信息等提供多语言支持
- **文章内容**: 支持多语言文章，通过文件命名区分
- **SEO 优化**: 正确设置 hreflang 标签

## 错误处理规范

### 错误类型
- **404 错误**: 自定义友好的 404 页面
- **500 错误**: 服务器错误的优雅处理
- **网络错误**: 离线状态的友好提示
- **加载错误**: 资源加载失败的处理

### 错误日志
- **客户端日志**: 使用 `console.error()` 记录关键错误
- **错误边界**: React 错误边界捕获组件错误
- **用户反馈**: 提供错误反馈机制

## 开发工具规范

### 推荐插件
- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Tailwind CSS IntelliSense**: CSS 类名智能提示
- **TypeScript Vue Plugin**: TypeScript 支持

### 调试工具
- **React Developer Tools**: React 组件调试
- **Redux DevTools**: 状态管理调试
- **Chrome DevTools**: 性能和网络调试

---

*最后更新: 2025年*  
*维护者: 歆橙*  
*版本: v3.0 - 全面规范化版项目规范*

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
│   ├── music/           # 音乐文件
│   ├── luotianyi-live2d-master/  # Live2D 模型
│   └── Blogabout/       # 博客相关图片
├── scripts/              # 构建脚本
└── .github/              # GitHub Actions 配置
```

### 开发环境要求
- **Node.js**: 18.x 或更高版本
- **npm**: 9.x 或更高版本
- **Git**: 2.x 或更高版本
- **操作系统**: Windows/macOS/Linux

### 浏览器支持
- **Chrome**: 最新版本
- **Firefox**: 最新版本
- **Safari**: 最新版本
- **Edge**: 最新版本
- **移动端**: iOS Safari, Chrome for Android