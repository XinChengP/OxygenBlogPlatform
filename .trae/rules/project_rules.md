---
alwaysApply: true
---
# 个人博客 - 洛天依主题 开发规范

## 项目概述
以洛天依为主题的个人博客，基于 Next.js 16.1.6 构建，支持 GitHub Pages 静态部署。

## 核心技术栈

### 核心框架
- **Next.js 16.1.6** - App Router + Turbopack，静态导出模式
- **React 19.2.x** - 函数组件 + Hooks
- **TypeScript 5.x** - 严格模式，类型安全

### 样式系统
- **Tailwind CSS 4** - 原子化CSS，深色模式支持
- **Framer Motion** - 动画和过渡效果

### 测试框架
- **ESLint 9.x** - 代码规范检查
- **TypeScript 5.x** - 静态类型检查
- 运行 `npm run lint` 进行代码检查

## 开发规范

### 命名规范
- **组件**: PascalCase (`Navigation.tsx`)
- **工具函数**: camelCase (`assetUtils.ts`)
- **配置文件**: camelCase (`WebSetting.ts`)

### 代码规范
- **TypeScript**: 严格模式，接口定义Props，禁用any
- **组件**: 函数组件优先，明确'use client'标记
- **状态管理**: useState/useReducer，禁止直接修改状态
- **列表渲染**: 必须提供稳定key属性

### 样式规范
- **Tailwind优先**: 避免自定义CSS
- **响应式设计**: 使用Tailwind响应式前缀
- **动画**: Framer Motion优先

## 禁止使用的API

### 浏览器API
- **document.cookie** - 使用localStorage替代
- **eval()** - 存在安全风险，禁止使用
- **innerHTML** - 使用React的JSX替代
- **window.open()** - 使用Next.js路由

### React API
- **ReactDOM.render** - 使用createRoot替代
- **defaultProps** - 使用默认参数替代
- **componentWillMount** - 使用useEffect替代
- **findDOMNode** - 使用ref替代

### Next.js API
- **getInitialProps** - 使用getStaticProps/getServerSideProps替代
- **next/head**中的dangerouslySetInnerHTML

## 环境要求
- **Node.js**: 20.9+ 或更高版本
- **npm**: 9.x 或更高版本

## 核心命令
```bash
npm run dev          # 开发服务器
npm run build        # 生产构建
npm run lint         # 代码检查
npm run electron     # 运行桌面应用
```

---

*最后更新: 2026年4月11日*
*维护者: 歆橙*
*版本: v4.0*
