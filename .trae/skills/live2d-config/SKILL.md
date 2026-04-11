---
name: "live2d-config"
description: "配置和管理Live2D洛天依看板娘。Invoke when user wants to configure Live2D settings, customize messages, or adjust the interactive behaviors of the LuoTianyi mascot."
---

# Live2D 看板娘配置技能

## 概述

本技能用于帮助用户配置和管理洛天依 Live2D 看板娘的交互行为、消息提示和联动功能。

## Live2D 文件结构

```
src/
├── components/
│   ├── Live2DController.tsx          # Live2D 控制器（显示逻辑）
│   ├── Live2DControllerOptimized.tsx # 优化版控制器
│   └── LuoTianyiLive2D.tsx           # 主 Live2D 组件
├── utils/
│   ├── live2dInstanceManager.ts      # 实例管理器
│   ├── live2dResourceManager.ts      # 资源管理器
│   ├── live2dEventEmitter.ts          # 事件发射器
│   └── live2dMessageManager.ts        # 消息管理器
public/
└── luotianyi-live2d-master/           # Live2D 资源文件
```

## 显示控制

### 页面显示规则

Live2D 看板娘的显示由 `Live2DController` 组件控制：

```typescript
// 只在首页(/)、404页面和不存在的路由隐藏Live2D
// 所有其他页面（包括动态页面）都显示Live2D
const shouldShowLive2D = useMemo(() => {
  return pathname !== '/' && pathname !== '/404' && pathname !== '/not-found';
}, [pathname]);
```

### 修改显示规则

编辑 `src/components/Live2DController.tsx`：

```typescript
// 添加需要隐藏的页面路径
const hiddenPaths = ['/', '/404', '/not-found', '/custom-page'];
const shouldShowLive2D = !hiddenPaths.includes(pathname);
```

## 消息系统

### 消息管理器

使用 `live2dMessageManager` 发送消息给看板娘：

```typescript
import live2dMessageManager from '@/utils/live2dMessageManager';

// 显示消息
live2dMessageManager.showMessage('你好～我是洛天依！', 3000, 1);

// 参数说明：
// message: 消息文本
// duration: 显示时长（毫秒），默认 3000ms
// priority: 优先级（0-10），数值越高优先级越高，默认 1
```

### 预设消息

使用预设消息常量：

```typescript
import live2dMessageManager, { Live2DMessages } from '@/utils/live2dMessageManager';

// Markdown 编辑器相关
live2dMessageManager.showMessage(Live2DMessages.MARKDOWN.SAVE);
live2dMessageManager.showMessage(Live2DMessages.MARKDOWN.COPY);
live2dMessageManager.showMessage(Live2DMessages.MARKDOWN.PUBLISH);

// 通用消息
live2dMessageManager.showMessage(Live2DMessages.GENERAL.HELLO);
live2dMessageManager.showMessage(Live2DMessages.GENERAL.SUCCESS);

// 彩蛋消息 - 发现隐藏内容时触发
live2dMessageManager.showMessage(Live2DMessages.HIDDEN_TAG.DISCOVERED, 4000, 8);
live2dMessageManager.showMessage(Live2DMessages.HIDDEN_TAG.SPECIAL_NOTE, 4000, 8);
```

### 添加自定义消息

在 `live2dMessageManager.ts` 中的 `Live2DMessages` 对象添加：

```typescript
export const Live2DMessages = {
  // ... 现有消息

  // 自定义分类
  CUSTOM: {
    WELCOME: '欢迎来到我的博客～',
    MUSIC_PLAY: '开始播放音乐了！',
    THEME_CHANGE: '主题切换成功～',
  }
} as const;
```

## 彩蛋消息功能

### 功能概述

当用户发现隐藏的博客文章或动态时，Live2D看板娘会显示惊喜消息，增强互动体验。

### 触发条件

- 用户访问带有 `hidden: true` 标记的博客文章
- 用户访问带有 `hidden: true` 标记的个人动态

### 消息类型

| 消息类型 | 说明 | 优先级 |
|----------|------|--------|
| `HIDDEN_TAG.DISCOVERED` | 发现隐藏内容时的欢迎消息 | 8（高） |
| `HIDDEN_TAG.SPECIAL_NOTE` | 特殊提示信息 | 8（高） |

### 配置位置

彩蛋消息配置位于 `src/setting/live2dMessages.ts`：

```typescript
export const HiddenTagEasterEggMessages = {
  // 发现隐藏博客时的消息
  blog: [
    '哇！你发现了隐藏的博客文章！✨',
    '这是一篇特别的文章呢～',
    // ... 更多消息
  ],
  // 发现隐藏动态时的消息
  moment: [
    '你发现了隐藏动态！好厉害！🎉',
    '这是一条秘密动态哦～',
    // ... 更多消息
  ],
};
```

### 使用示例

在页面组件中检测隐藏内容并触发彩蛋消息：

```typescript
import { useEffect } from 'react';
import live2dMessageManager from '@/utils/live2dMessageManager';

useEffect(() => {
  if (post.hidden) {
    // 显示彩蛋消息
    live2dMessageManager.showMessage(
      Live2DMessages.HIDDEN_TAG.DISCOVERED,
      4000,  // 显示4秒
      8      // 高优先级
    );
  }
}, [post.hidden]);
```

## 功能联动

### 音乐联动

当音乐播放器状态改变时，可以发送消息给 Live2D：

```typescript
// 音乐播放时
live2dMessageManager.showMessage('开始播放音乐了～🎵', 3000, 2);

// 音乐暂停时
live2dMessageManager.showMessage('音乐暂停了', 2000, 1);
```

### 主题联动

当主题切换时：

```typescript
// 主题切换成功
live2dMessageManager.showMessage('主题切换成功～天依也换新装啦！', 3000, 2);
```

### 页面联动

根据当前页面发送不同的欢迎消息：

```typescript
const pathname = usePathname();

useEffect(() => {
  const pageMessages: Record<string, string> = {
    '/blogs': '这里是我的博客文章～',
    '/gallery': '来看看我的画廊吧！',
    '/moments': '这是我的个人动态～',
    '/about': '想了解更多关于我的事情吗？',
  };

  const message = pageMessages[pathname];
  if (message) {
    live2dMessageManager.showMessage(message, 3000, 1);
  }
}, [pathname]);
```

## 消息优先级

| 优先级 | 用途 |
|--------|------|
| 0-2 | 普通提示消息 |
| 3-5 | 重要操作反馈 |
| 6-8 | 用户主动触发的交互 |
| 9-10 | 系统级消息，可中断其他消息 |

## 高级功能

### 检查 Live2D 可用性

```typescript
if (live2dMessageManager.isLive2DAvailable()) {
  live2dMessageManager.showMessage('Live2D 已就绪！');
}
```

### 等待初始化完成

```typescript
await live2dMessageManager.waitForInitialization(10000);
live2dMessageManager.showMessage('初始化完成！');
```

### 清除消息队列

```typescript
live2dMessageManager.clearMessageQueue();
```

### 获取状态信息

```typescript
const status = live2dMessageManager.getStatus();
console.log(status.isDisplaying);  // 是否正在显示消息
console.log(status.queueLength);   // 消息队列长度
console.log(status.lastMessage);   // 上一条消息
```

## 资源管理

### Live2D 模型资源

模型资源存储在 `public/luotianyi-live2d-master/` 目录下。

### 资源加载优化

- 使用 `live2dResourceManager` 管理资源加载
- 支持资源预加载和懒加载
- 自动处理资源缓存

## 注意事项

- 消息发送有 500ms 的冷却时间，防止重复消息
- 高优先级消息可以中断当前显示的消息
- 消息队列会自动按优先级排序
- 在服务端渲染时，Live2D 不会加载（需要 `typeof window !== 'undefined'`）
- 首页和 404 页面默认不显示 Live2D
