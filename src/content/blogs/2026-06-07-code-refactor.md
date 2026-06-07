---
title: "博客代码冗余清理与技术方案统一"
date: "2026-06-07"
category: "技术"
tags: ["重构", "代码质量"]
excerpt: "使用 AI 辅助检查并清理博客项目中功能类似但实现方式不同的冗余代码"
hidden: true
---

# 博客代码冗余清理与技术方案统一

今天借助 AI 对博客项目做了一次全面的代码冗余检查，发现了多处"功能类似但用了不同实现方式"的重复代码，并进行了清理和统一。

## 一、检查过程

使用 `/grill-me` 深度提问模式，让 AI 从以下维度扫描了代码库：

- 多个文件实现了同一功能（如 frontmatter 解析、Markdown 渲染）
- 同一 Hook/工具函数被重复封装（如主题切换）
- 同一组件内部存在重复模板（如代码块 HTML）
- 服务端与客户端存在重复逻辑（如画廊分类提取）

最终共发现 **9 处冗余**，涉及 8 个文件领域。

## 二、清理清单

### 1. 资源路径工具函数去重

**问题**：`getAssetPath()` 和 `getBasePath()` 两者都包含完全相同的 GitHub Pages 检测、环境变量读取、路径推断逻辑。

**修复**：`getAssetPath` 改为直接调用 `getBasePath()` 获取前缀，再拼接资源路径。

**文件**：`src/utils/assetUtils.ts`

### 2. Markdown 代码块模板提取

**问题**：`safeMarked.ts` 中主函数 `safeMarkdownToHtml` 和降级函数 `fallbackMarkdownToHtml` 各自维护了一份几乎相同的代码块 HTML 模板（标题栏、三个彩色圆点、"代码"标签、复制按钮）。

**修复**：提取公共函数 `generateCodeBlockHtml(code, language?)`，两处共用同一份模板。

**文件**：`src/utils/safeMarked.ts`

### 3. 移除内嵌 frontmatter 解析器

**问题**：`blogActions.ts` 中内嵌了一个简易的 frontmatter 解析器，与 `frontMatterUtils.ts` 功能重复。

**修复**：删除内嵌版本，导入并使用 `frontMatterUtils.ts` 的 `parseFrontMatter`。

**文件**：`src/actions/blogActions.ts`

### 4. 统一使用 gray-matter 解析 YAML

**问题**：项目中已安装 `gray-matter`，却同时维护着 180 行的手写 YAML frontmatter 解析器。

**修复**：`frontMatterUtils.ts` 改为直接调用 `matter(content)`，一行替代全部手写逻辑。

**文件**：`src/utils/frontMatterUtils.ts`

### 5. 删除未使用的主题 Hook

**问题**：`useThemeOptimized.ts` 与 `useDarkMode.ts` 都基于 `next-themes` 封装主题切换，但前者没有任何文件导入使用。

**修复**：直接删除 `src/hooks/useThemeOptimized.ts`。

### 6. 统一暗黑模式图片滤镜实现

**问题**：同一套"暗黑模式给图片降亮度"的滤镜逻辑，以 Hook 样式函数、`DarkModeImage` 组件内联、`DarkModeFilters` 包装组件三种形态并存。

**修复**：
- 从 `useDarkMode.ts` 移除未使用的 `getImageDarkModeStyle` / `getContentDarkModeStyle`
- `DarkModeImage` 和 `DarkModeContent` 统一委托给 `DarkModeImageFilter` / `DarkModeContentFilter`

**文件**：`src/hooks/useDarkMode.ts`、`src/components/DarkModeImage.tsx`

### 7. 提取公共随机播放洗牌函数

**问题**：`useMusicPlayer.ts` 和 `globalMusicPlayerManager.ts` 包含完全相同的 Fisher-Yates 洗牌算法和 APlayer `randomOrder` 调用逻辑。

**修复**：在 `globalMusicPlayerManager.ts` 中新增导出函数 `regenerateRandomOrder(player, context)`，两处均调用它。

**文件**：`src/utils/globalMusicPlayerManager.ts`、`src/hooks/useMusicPlayer.ts`

## 三、踩坑记录

### 动态页面图片放大功能的回滚

在清理 `ImageGrid` 与 `ImageViewer` 的冗余时，我最初将 `ImageGrid` 的内嵌查看器替换为全屏 Modal 组件 `ImageViewer`，意图消除重复实现。但连续踩了两个坑：

1. **点击逻辑冲突**：内嵌查看器的"再次点击关闭"逻辑在 Modal 模式下变成了"Modal 打开时点击任何缩略图都会关闭 Modal"，而不是切换图片。
2. **层叠上下文截断**：动态卡片使用了 `backdrop-blur-md`，这会创建新的层叠上下文，导致子元素的 `position: fixed` 被截断在卡片内部，无法全屏显示。

虽然尝试用 React Portal 修复了截断问题，但最终用户反馈的设计意图是"在对应动态卡片里左右顶满的放大"，而非全屏 Modal。因此回滚了 `ImageGrid` 的内嵌查看器，`ImageViewer` 作为独立组件保留（目前无引用，可视为预留组件）。

## 四、经验总结

1. **消除冗余前先理解业务场景**：`ImageGrid` 和 `ImageViewer` 看似功能重复，但一个用于卡片内嵌展开、一个用于全屏弹窗，业务场景不同，强行统一反而引入 bug。
2. **CSS 层叠上下文是隐形陷阱**：`backdrop-filter`、`transform`、`perspective` 等属性会创建新的层叠上下文，导致 `fixed` 定位失效，这在组件复用时极易被忽略。
3. **优先使用成熟库而非自研解析器**：`gray-matter` 替代手写 YAML 解析器后，代码量从 180 行降到 8 行，同时提升了解析的准确性和边界情况处理能力。
4. **定期扫描死代码**：`useThemeOptimized.ts` 这种没有任何导入者的 Hook，应该在日常开发中及时清理，避免成为"幽灵代码"。

---

*本文记录了一次由 AI 辅助驱动的代码重构过程，共涉及 9 处冗余点、8 个文件修改、1 个文件删除。*
