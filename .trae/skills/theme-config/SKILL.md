---
name: "theme-config"
description: "配置博客主题系统和样式。Invoke when user wants to customize theme colors, background images, or adjust the visual appearance of the blog."
---

# 主题系统配置技能

## 概述

本技能用于帮助用户配置和管理博客的主题系统，包括主题色、背景图片、显示模式等视觉样式。

## 主题配置文件

主题配置位于 `src/setting/WebSetting.ts`：

```typescript
// 网站基础配置
export const webTitle = "心想事成 的 Blog";
export const webDescription = "个人博客";

// 网站背景图配置
export const backgroundImage = "/LTY_Picture/光与影.png";
export const enableBackground = true;

// 背景图片显示模式配置
export const backgroundMode = "cover";
export const backgroundFixed = true;

// 主题色配置
export const themeColors = themePresets.blue;
```

## 网站基础配置

### 网站标题和描述

```typescript
export const webTitle = "心想事成 的 Blog";      // 浏览器标签页标题
export const webDescription = "个人博客";         // 网站描述
```

## 背景图片配置

### 启用/禁用背景

```typescript
export const enableBackground = true;   // 启用背景
export const enableBackground = false;  // 禁用背景
```

### 背景图片路径

```typescript
export const backgroundImage = "/LTY_Picture/光与影.png";
```

图片必须存储在 `public/` 目录下，路径以 `/` 开头。

### 背景显示模式

```typescript
export const backgroundMode = "cover";    // 覆盖整个容器，可能会裁剪图片
export const backgroundMode = "contain";  // 完整显示图片，可能会有空白区域
```

### 背景固定（视差效果）

```typescript
export const backgroundFixed = true;   // 固定背景，滚动时产生视差效果
export const backgroundFixed = false;  // 背景随页面滚动
```

## 主题色配置

### 预设主题色

当前项目锁定天依蓝配色：

```typescript
const themePresets = {
  blue: {
    primary: "#66ccff",    // 主色调 - 天依蓝
    secondary: "#1e40af",  // 次要色 - 深蓝色
    accent: "#06b6d4",     // 强调色 - 青色
  },
} as const;
```

### 应用主题色

```typescript
export const themeColors = themePresets.blue;
```

### 自定义主题色

如需添加新主题，在 `themePresets` 中添加：

```typescript
const themePresets = {
  blue: {
    primary: "#66ccff",
    secondary: "#1e40af",
    accent: "#06b6d4",
  },
  custom: {
    primary: "#ff6b6b",
    secondary: "#c92a2a",
    accent: "#ffa8a8",
  },
} as const;
```

然后在 `applyThemeColors` 函数中处理新主题。

## 主题应用函数

### applyThemeColors

```typescript
export const applyThemeColors = (isDark: boolean = false) => {
  // 自动根据亮/暗模式调整颜色亮度
  // 设置 CSS 变量供全局使用
};
```

### 自动适配暗色模式

主题系统会根据当前模式自动调整颜色：

- **亮色模式**: 颜色会适当加深
- **暗色模式**: 颜色会适当提亮

### CSS 变量

主题色通过 CSS 变量应用到全局：

```css
:root {
  --theme-primary: #66ccff;
  --theme-secondary: #1e40af;
  --theme-accent: #06b6d4;

  /* Tailwind 兼容变量 */
  --color-primary: #66ccff;
  --color-secondary: #1e40af;
  --color-accent: #06b6d4;
  --color-background: #ffffff;
  --color-foreground: #111827;
  /* ... 更多变量 */
}
```

## 主题切换

### 主题模式

博客支持三种主题模式：

1. **亮色模式** (light)
2. **暗色模式** (dark)
3. **跟随系统** (system)

### 切换主题

使用 `ThemeToggle` 组件或手动调用：

```typescript
import { useTheme } from 'next-themes';

const { theme, setTheme } = useTheme();

// 切换到暗色模式
setTheme('dark');

// 切换到亮色模式
setTheme('light');

// 跟随系统
setTheme('system');
```

### 持久化

主题设置会自动保存到 `localStorage`，下次访问时自动恢复。

## 响应式设计

### 断点设置

```css
/* Tailwind 默认断点 */
sm: 640px   /* 移动端 */
md: 768px   /* 平板端 */
lg: 1024px  /* 桌面端 */
xl: 1280px  /* 大屏 */
```

### 响应式类名示例

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
  <!-- 移动端1列，平板2列，桌面4列 -->
</div>
```

## 自定义样式

### 使用 Tailwind CSS

项目使用 Tailwind CSS 4，优先使用原子类：

```html
<div class="bg-primary text-white p-4 rounded-lg shadow-md">
  <!-- 内容 -->
</div>
```

### 使用 CSS 变量

```css
.custom-element {
  background-color: var(--theme-primary);
  color: var(--color-foreground);
}
```

### 暗色模式适配

```html
<div class="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
  <!-- 自动适配亮/暗模式 -->
</div>
```

## 配置步骤

1. **修改网站标题/描述**: 编辑 `webTitle` 和 `webDescription`
2. **更换背景图片**:
   - 将图片放入 `public/LTY_Picture/` 目录
   - 修改 `backgroundImage` 路径
3. **调整背景显示**: 修改 `backgroundMode` 和 `backgroundFixed`
4. **自定义主题色**: 修改 `themePresets` 中的颜色值
5. **同步主题**: 运行 `npm run sync-theme` 同步主题配置

## 注意事项

- 主题色锁定为天依蓝配色，不建议修改
- 背景图片建议使用 WebP 格式优化加载
- 修改主题配置后需要重新构建项目
- CSS 变量会自动适配亮/暗模式
- 使用 `next-themes` 实现主题切换功能
