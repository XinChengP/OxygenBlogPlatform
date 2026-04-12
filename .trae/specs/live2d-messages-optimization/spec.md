# Live2D 消息系统优化规格文档

## Why

当前 Live2D 消息系统存在以下实际问题需要优化：

1. **画廊页面消息硬编码** - 画廊页面 (`GalleryClient.tsx`) 中的 Live2D 消息是硬编码的，应迁移到配置文件中统一管理
2. **个人动态页面缺少联动** - `/moments` 页面没有集成 Live2D 事件联动
3. **更新日志页面缺少联动** - `/changelogs` 页面没有集成 Live2D 事件联动
4. **部分消息可优化** - 部分现有消息可以更加契合博客特色（洛天依主题）
5. **保留现有彩蛋系统** - 现有的彩蛋消息已经很完善，必须保留

## What Changes

### 1. 画廊消息配置化迁移

将 `GalleryClient.tsx` 中硬编码的消息迁移到 `live2dMessages.ts` 配置中：

- 新增 `GalleryMessages` 配置分类
- 迁移现有的硬编码消息到配置中
- 在 `Live2DMessageHelper` 中添加 `showGalleryMessage()` 方法

### 2. 个人动态页面 Live2D 联动

在 `/moments` 页面集成 Live2D 事件：

- 页面访问欢迎消息
- 滚动浏览消息
- 动态交互消息（查看详情等）

### 3. 更新日志页面 Live2D 联动

在 `/changelogs` 页面集成 Live2D 事件：

- 页面访问欢迎消息
- 成就发现消息

### 4. 优化现有消息内容

在不改变消息结构的前提下，优化部分消息内容，使其更契合洛天依主题博客：

- 增强洛天依特色元素
- 保持与博客功能的契合度

### 5. 保留现有彩蛋系统

保持现有的彩蛋消息系统不变：

- `HiddenTagEasterEggMessages` - 隐藏博客/动态发现彩蛋
- `HolidayMessages` - 节日和特殊日期消息
- 彩蛋模式机制

## Impact

### 受影响的规格

- `Live2DMessageManager` - 需要添加画廊消息支持方法
- `live2dMessages.ts` - 需要新增画廊消息配置，迁移硬编码消息

### 受影响的代码

- `src/setting/live2dMessages.ts` - 新增画廊消息配置
- `src/utils/live2dMessageManager.ts` - 添加画廊消息helper方法
- `src/app/gallery/GalleryClient.tsx` - 使用配置化消息替代硬编码
- `src/app/moments/ClientMomentsPage.tsx` - 新增 Live2D 联动
- `src/app/changelogs/page.tsx` 或相关组件 - 新增 Live2D 联动

## ADDED Requirements

### Requirement: 画廊消息配置化

系统应将画廊页面的所有 Live2D 消息统一到配置文件中管理。

#### Scenario: 画廊页面加载
- **WHEN** 用户访问 `/gallery` 页面
- **THEN** 从 `GalleryMessages.PAGE_VISIT` 中随机选择消息显示

#### Scenario: 画廊分类切换
- **WHEN** 用户切换画廊分类
- **THEN** 从 `GalleryMessages.CATEGORY_CHANGE` 中随机选择消息显示

#### Scenario: 画廊图片点击
- **WHEN** 用户点击画廊图片
- **THEN** 从 `GalleryMessages.IMAGE_CLICK` 中随机选择消息显示

#### Scenario: 画廊图片预览
- **WHEN** 用户打开图片预览
- **THEN** 从 `GalleryMessages.IMAGE_PREVIEW` 中随机选择消息显示
- **WHEN** 用户关闭图片预览
- **THEN** 从 `GalleryMessages.PREVIEW_CLOSE` 中随机选择消息显示

#### Scenario: 画廊滚动浏览
- **WHEN** 用户在画廊页面滚动
- **THEN** 从 `GalleryMessages.SCROLL` 中随机选择消息显示（低概率触发）

### Requirement: 个人动态页面 Live2D 联动

系统应在用户访问个人动态页面时显示相关的 Live2D 消息。

#### Scenario: 动态页面访问
- **WHEN** 用户首次访问 `/moments` 页面
- **THEN** 从 `MomentsMessages.PAGE_VISIT` 中随机选择消息显示

### Requirement: 更新日志页面 Live2D 联动

系统应在用户访问更新日志页面时显示相关的 Live2D 消息。

#### Scenario: 更新日志页面访问
- **WHEN** 用户首次访问 `/changelogs` 页面
- **THEN** 从 `ChangelogsMessages.PAGE_VISIT` 中随机选择消息显示

## MODIFIED Requirements

### Requirement: 画廊消息优化

将现有的硬编码消息迁移到配置系统，并优化消息内容：

- 消息应体现洛天依主题特色
- 消息应与画廊功能紧密相关
- 保持消息的趣味性和互动性

## REMOVED Requirements

**无需删除任何现有功能**

## 技术实现要点

### 画廊消息配置结构

```typescript
export const GalleryMessages = {
  PAGE_VISIT: {
    messages: [
      '欢迎来到画廊！这里有很多好看的图片~',
      '来看看博主的精心收藏吧～',
      '画廊里有不少精彩图片呢！',
      '这些图片都是博主的心头好哦～'
    ],
    duration: 3000,
    priority: 3
  },
  CATEGORY_CHANGE: {
    messages: [
      '切换到{category}分类了~',
      '正在浏览{category}分类的图片~',
      '{category}分类有很多好看的图片呢！',
      '来看看{category}分类吧~'
    ],
    duration: 2500,
    priority: 2
  },
  IMAGE_CLICK: {
    messages: [
      '这张图片真好看呢~',
      '洛天依好可爱呀！',
      '喜欢这张图片吗？',
      '这张图的色调很舒服~',
      '看起来真不错！'
    ],
    duration: 3000,
    priority: 3
  },
  IMAGE_PREVIEW: {
    messages: [
      '正在查看大图~',
      '这张图好清晰呀！',
      '细节看得更清楚了~',
      '大图看起来更震撼呢！'
    ],
    duration: 2500,
    priority: 2
  },
  PREVIEW_CLOSE: {
    messages: [
      '预览已关闭~',
      '回到画廊了~',
      '继续看其他图片吧！'
    ],
    duration: 2000,
    priority: 2
  },
  SCROLL: {
    messages: [
      '正在浏览画廊~',
      '看看还有什么好看的图片吧！',
      '这么多好看的图片~',
      '继续往下看看吧~'
    ],
    duration: 2500,
    priority: 1
  }
} as const;
```

### 个人动态消息配置结构

```typescript
export const MomentsMessages = {
  PAGE_VISIT: {
    messages: [
      '这是博主的个人动态～记录着生活的点点滴滴！',
      '来看看最近都发生了什么吧～',
      '生活中的小确幸都在这里呢～',
      '来了解一下博主的日常吧～'
    ],
    duration: 3000,
    priority: 3
  }
} as const;
```

### 更新日志消息配置结构

```typescript
export const ChangelogsMessages = {
  PAGE_VISIT: {
    messages: [
      '这是更新日志～记录着博客的成长历程！',
      '来看看博客都有哪些变化吧～',
      '每一次更新都是博主的心血呢～',
      '了解博客的最新动态吧～'
    ],
    duration: 3000,
    priority: 3
  }
} as const;
```

### Live2DMessageHelper 新增方法

```typescript
// 画廊消息
static showGalleryMessage(type: 'PAGE_VISIT' | 'CATEGORY_CHANGE' | 'IMAGE_CLICK' | 'IMAGE_PREVIEW' | 'PREVIEW_CLOSE' | 'SCROLL', data?: { category?: string }): void

// 个人动态消息
static showMomentsMessage(type: 'PAGE_VISIT'): void

// 更新日志消息
static showChangelogsMessage(type: 'PAGE_VISIT'): void
```

### 页面事件发射规范

```typescript
// 在页面组件中使用
import { emitLive2DEvent, Live2DEvents } from '@/utils/live2dEventEmitter';
import { Live2DMessageHelper } from '@/utils/live2dMessageManager';

// 页面加载时
useEffect(() => {
  Live2DMessageHelper.showGalleryMessage('PAGE_VISIT');
}, []);
```

## GitHub Pages 兼容性说明

所有改动必须保持与 GitHub Pages 静态部署的兼容性：

1. 使用 `getAssetPath()` 处理资源路径
2. 事件系统在客户端运行，不依赖服务端
3. 消息配置为静态数据，无服务端依赖
4. 保持现有的懒加载和性能优化
