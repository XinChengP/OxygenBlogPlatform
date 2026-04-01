# Checklist

## 博客文章隐藏功能

### 后台 Server Actions（本地开发环境）
- [x] 博客文章 `BlogPost` 接口包含 `hidden` 属性
- [x] 博客文章 `BlogPostData` 接口包含 `hidden` 属性
- [x] `parseFrontmatter` 函数正确解析 `hidden` 字段
- [x] `generateFrontmatter` 函数正确生成 `hidden` 字段
- [x] `getBlogList` 函数返回所有文章（包括隐藏的），并包含 `hidden` 属性
- [x] `getBlogDetail` 函数返回 `hidden` 属性
- [x] `createBlog` 函数支持 `hidden` 属性
- [x] `updateBlog` 函数支持更新 `hidden` 属性
- [x] `toggleBlogHidden` 函数正确切换隐藏状态
- [x] `batchToggleBlogHidden` 函数正确批量切换隐藏状态

### 前台构建时过滤（GitHub Pages 兼容）
- [x] `blogs/page.tsx` 中的 `getAllBlogs` 函数过滤隐藏文章
- [x] `momentsUtils.ts` 中的 `getServerBlogs` 函数过滤隐藏博客
- [x] 构建后的静态页面不包含隐藏的文章

### 后台管理界面（本地开发环境）
- [x] 后台博客管理列表显示隐藏状态标识
- [x] 后台支持单篇文章隐藏/显示操作
- [x] 后台支持批量隐藏/显示操作
- [x] 后台支持按隐藏状态筛选

## 动态隐藏功能

### 后台 Server Actions（本地开发环境）
- [x] 动态 `Moment` 接口包含 `hidden` 属性
- [x] 动态 `MomentData` 接口包含 `hidden` 属性
- [x] `parseFrontmatter` 函数正确解析 `hidden` 字段
- [x] `generateFrontmatter` 函数正确生成 `hidden` 字段
- [x] `getMomentList` 函数返回所有动态（包括隐藏的），并包含 `hidden` 属性
- [x] `getMomentDetail` 函数返回 `hidden` 属性
- [x] `createMoment` 函数支持 `hidden` 属性
- [x] `updateMoment` 函数支持更新 `hidden` 属性
- [x] `toggleMomentHidden` 函数正确切换隐藏状态
- [x] `batchToggleMomentHidden` 函数正确批量切换隐藏状态

### 前台构建时过滤（GitHub Pages 兼容）
- [x] `momentsUtils.ts` 中的 `getServerMoments` 函数过滤隐藏动态
- [x] 构建后的静态页面不包含隐藏的动态

### 后台管理界面（本地开发环境）
- [x] 后台动态管理列表显示隐藏状态标识
- [x] 后台支持单条动态隐藏/显示操作
- [x] 后台支持批量隐藏/显示操作
- [x] 后台支持按隐藏状态筛选

## 整体验证

### 本地开发环境
- [x] 新创建的博客文章默认不隐藏
- [x] 新创建的动态默认不隐藏
- [x] 后台可以正常管理所有内容（包括隐藏的）
- [x] 隐藏状态切换操作成功

### GitHub Pages 静态部署
- [x] TypeScript 类型检查通过（`npx tsc --noEmit`）
- [x] 隐藏的博客文章不出现在前台博客列表
- [x] 隐藏的动态不出现在前台动态页面
- [x] 隐藏的文章/动态不出现在动态页面的博客更新列表中
