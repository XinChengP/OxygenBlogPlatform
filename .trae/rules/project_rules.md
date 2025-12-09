# 个人博客 - 洛天依主题 开发规范

## 项目概述
以洛天依为主题的个人博客，基于 Next.js 15.3.4 构建，支持 GitHub Pages 静态部署，集成 Live2D 看板娘、音乐播放器、主题切换等特色功能，用于记录技术学习与生活感悟。

## 核心技术栈

### 核心框架
- **Next.js 15.3.4** - App Router + Turbopack，静态导出模式
- **React 19.0.0** - 函数组件 + Hooks
- **TypeScript 5.x** - 严格模式，类型安全

### 样式系统
- **Tailwind CSS 4** - 原子化CSS，深色模式支持
- **CSS Variables** - 10种预设主题色系统
- **Framer Motion** - 动画和过渡效果

### 核心功能
- **Live2D看板娘** - 洛天依互动系统，支持音乐/主题/页面联动
- **天依音乐** - 精选洛天依歌曲，播放状态持久化
- **主题系统** - 10种预设主题色，包含天依蓝等特色配色
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
│   ├── assetUtils.ts     # 资源路径处理
│   ├── live2d*.ts        # Live2D相关工具
│   └── pinyinUtils.ts    # 拼音转换工具
├── setting/               # 配置文件
├── types/                 # TypeScript类型
├── contexts/              # React上下文
└── hooks/                 # 自定义Hooks

public/
├── luotianyi-live2d-master/   # Live2D资源
├── music/                 # 音乐文件
├── tools/                 # 工具相关静态资源
│   ├── pinyin-data/      # 拼音数据文件
│   └── markdown-editor/  # Markdown编辑器资源
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

# 生产环境 (.env)
NODE_ENV=production
NEXT_PUBLIC_GITHUB_REPO_NAME=你的仓库名
NEXT_PUBLIC_BASE_PATH=/你的仓库名  # GitHub Pages路径
```

### 核心命令
```bash
npm run dev          # 开发服务器 (Turbopack)
npm run build:pages  # GitHub Pages构建
npm run sync-theme   # 主题同步
npm run lint         # 代码检查
```

### 工具页面访问
```bash
# 拼音转换器
http://localhost:3000/tools/pinyin-converter

# Markdown编辑器
http://localhost:3000/tools/markdown-editor
```

### 工具页面命令
```bash
# 拼音转换器相关
npm run dev          # 访问 http://localhost:3000/tools/pinyin-converter
# Markdown编辑器相关  
npm run dev          # 访问 http://localhost:3000/tools/markdown-editor
```

### 构建流程
1. **开发**: `npm run dev` - 热更新，Turbopack加速
2. **构建**: `npm run build:pages` - 静态导出，GitHub Pages优化

## 资源管理

### 路径处理
- **核心工具**: `src/utils/assetUtils.ts`
- **开发环境**: 相对路径
- **生产环境**: 自动添加GitHub Pages basePath
- **关键函数**:
  - `getAssetPath()` - 静态资源路径
  - `getBasePath()` - 基础路径
  - `formatAudioUrl()` - 音频路径

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
- **预设**: 10种主题色方案
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
  output: "export",                    // 静态导出
  basePath: `/${repoName}`,           // 仓库路径
  assetPrefix: `/${repoName}`,        // 资源前缀
  images: { unoptimized: true },      // 禁用优化
  trailingSlash: true,                 // URL一致性
  distDir: 'out',                      // 输出目录
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
- **CDN**: GitHub Pages全球加速

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
- **批量**: 相关修改批量提交
- **测试**: 本地验证通过后推送
- **审查**: 提交前自我审查

### 提交信息
- **格式**: 简洁描述修改内容
- **类型**: 功能更新、问题修复、文档更新等
- **描述**: 清晰说明修改目的和影响
- **个人博客**: 记录开发过程中的思考与感悟

### 分支管理
- **main**: 主分支，稳定可部署
- **feature**: 功能开发分支
- **个人开发**: 根据需求创建分支，保持简洁

### 合并流程
1. **开发**: 功能开发完成
2. **测试**: 本地验证通过
3. **合并**: 合并到主分支
4. **部署**: 自动部署到GitHub Pages

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

### API设计
- **RESTful**: 标准设计原则
- **版本**: `/api/v1/`版本管理
- **状态码**: 标准HTTP状态码
- **错误**: 统一响应格式

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

## 性能最佳实践

### React优化
- **memo**: 纯函数组件记忆化
- **useMemo**: 昂贵计算缓存
- **useCallback**: 函数引用缓存
- **key**: 稳定列表键值
- **虚拟滚动**: 长列表优化

### 图片策略
- **懒加载**: `loading="lazy"`
- **响应式**: `srcset`和`sizes`
- **格式**: WebP/AVIF优先
- **占位符**: 模糊占位提升感知

### 代码分割
- **动态导入**: `import()`分割
- **路由级**: 按路由分割
- **组件级**: 大型组件动态导入
- **第三方库**: 延迟非关键库

## 安全最佳实践

### 前端安全
- **XSS**: 输入转义防护
- **CSRF**: Token验证
- **CSP**: 内容安全策略
- **HTTPS**: 强制加密

### 数据安全
- **敏感信息**: 禁止客户端存储
- **API密钥**: 环境变量存储
- **验证**: 前后端双重验证
- **错误**: 避免敏感信息泄露

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

### 工具开发规范

### 拼音转换器 (Pinyin Converter)
- **功能特性**:
  - 支持汉字转拼音，包含声调数字表示
  - 智能多音字识别，提供多音字选择功能
  - 支持只显示多音字模式，便于学习
  - 实时转换，输入即时显示结果
  - 支持拼音首字母提取
  - 支持声调数字与符号转换
  - 支持声调显示（数字/符号/无）

- **技术实现**:
  - 使用 `pinyin-pro` 库进行拼音转换
  - 自定义拼音数据加载：`/tools/pinyin-data/pinyin.txt`
  - 多音字状态管理：`selectedHeteronyms` 状态
  - 过滤模式：`showOnlyHeteronyms` 状态
  - 声调显示模式：`toneDisplayMode` 状态

- **文件结构**:
  ```
  src/app/tools/pinyin-converter/page.tsx    # 主页面组件
  public/tools/pinyin-data/                # 拼音数据文件
  └── pinyin.txt                          # 拼音数据库
  ```

### Markdown编辑器 (Markdown Editor)
- **功能特性**:
  - 实时预览：左侧编辑，右侧实时渲染
  - 语法高亮：支持代码块语法高亮
  - 工具栏：常用格式快捷按钮
  - 导出功能：支持导出为HTML或Markdown
  - 主题适配：自动适配当前主题色
  - 响应式设计：移动端友好
  - GitHub发布：支持直接发布到GitHub仓库

- **技术实现**:
  - 使用 `react-markdown` 进行Markdown渲染
  - 使用 `remark` 和 `rehype` 插件系统
  - 代码高亮：`highlight.js` 集成
  - 状态管理：`useState` 管理编辑内容
  - GitHub集成：通过GitHub API发布文章

- **文件结构**:
  ```
  src/app/tools/markdown-editor/page.tsx    # 主页面组件
  src/components/tools/MarkdownToolbar.tsx  # 工具栏组件
  ```

### 工具组件开发标准
```tsx
// Props接口定义
interface ToolComponentProps {
  className?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
}

// 函数组件实现
export default function ToolComponent({ 
  className, 
  onChange, 
  defaultValue 
}: ToolComponentProps) {
  const [inputValue, setInputValue] = useState(defaultValue || '');
  const [outputValue, setOutputValue] = useState('');
  
  // 工具逻辑处理
  const processContent = useCallback((input: string) => {
    // 实现工具核心逻辑
    return processedContent;
  }, []);
  
  // 输入变化处理
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    const result = processContent(value);
    setOutputValue(result);
    onChange?.(result);
  }, [processContent, onChange]);
  
  return (
    <div className={cn("tool-container", className)}>
      {/* 工具界面 */}
    </div>
  );
}
```

## 工具开发规范

### 拼音转换器 (Pinyin Converter)
- **功能特性**:
  - 支持汉字转拼音，包含声调数字表示
  - 智能多音字识别，提供多音字选择功能
  - 支持只显示多音字模式，便于学习
  - 实时转换，输入即时显示结果
  - 支持拼音首字母提取
  - 支持声调数字与符号转换

- **技术实现**:
  - 使用 `pinyin-pro` 库进行拼音转换
  - 自定义拼音数据加载：`/tools/pinyin-data/pinyin.txt`
  - 多音字状态管理：`selectedHeteronyms` 状态
  - 过滤模式：`showOnlyHeteronyms` 状态

- **文件结构**:
  ```
  src/app/tools/pinyin-converter/page.tsx    # 主页面组件
  public/tools/pinyin-data/                # 拼音数据文件
  └── pinyin.txt                          # 拼音数据库
  ```

### Markdown编辑器 (Markdown Editor)
- **功能特性**:
  - 实时预览：左侧编辑，右侧实时渲染
  - 语法高亮：支持代码块语法高亮
  - 工具栏：常用格式快捷按钮
  - 导出功能：支持导出为HTML或Markdown
  - 主题适配：自动适配当前主题色
  - 响应式设计：移动端友好

- **技术实现**:
  - 使用 `react-markdown` 进行Markdown渲染
  - 使用 `remark` 和 `rehype` 插件系统
  - 代码高亮：`highlight.js` 集成
  - 状态管理：`useState` 管理编辑内容

- **文件结构**:
  ```
  src/app/tools/markdown-editor/page.tsx    # 主页面组件
  src/components/tools/MarkdownToolbar.tsx  # 工具栏组件
  ```

### 工具组件开发标准
```tsx
// Props接口定义
interface ToolComponentProps {
  className?: string;
  onChange?: (value: string) => void;
  defaultValue?: string;
}

// 函数组件实现
export default function ToolComponent({ 
  className, 
  onChange, 
  defaultValue 
}: ToolComponentProps) {
  const [inputValue, setInputValue] = useState(defaultValue || '');
  const [outputValue, setOutputValue] = useState('');
  
  // 工具逻辑处理
  const processContent = useCallback((input: string) => {
    // 实现工具核心逻辑
    return processedContent;
  }, []);
  
  // 输入变化处理
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    const result = processContent(value);
    setOutputValue(result);
    onChange?.(result);
  }, [processContent, onChange]);
  
  return (
    <div className={cn("tool-container", className)}>
      {/* 工具界面 */}
    </div>
  );
}
```

## 功能联动

### Live2D看板娘联动

#### 设计理念
看板娘作为交互中心，新功能需考虑联动可能性。

#### 组件规范
```tsx
interface Live2DConfig {
  modelPath: string;           // 模型路径
  messagePath: string;         // 消息配置
  width: number;               // 画布宽度
  height: number;              // 画布高度
  // 联动配置
  enableMusicInteraction: boolean;  // 音乐联动
  enableThemeInteraction: boolean;  // 主题联动
  enablePageInteraction: boolean;   // 页面联动
}
```sage {
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
    '你要请我吃小笼包吗qwq'
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
- **洛天依**: VOCALOID、洛天依相关内容（原“洛佬”分类已更新）
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