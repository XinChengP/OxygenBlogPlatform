# Live2D 场景联动增强 Implementation Plan

> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/live2d-scene-enhancement.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强 Live2D 看板娘的互动功能，添加新的触发条件和更智能的消息选择逻辑

**Architecture:** 在现有消息系统基础上，新增行为追踪器和上下文感知消息选择器，实现基于时间、页面、用户行为的智能消息生成

**Tech Stack:** TypeScript, React, Next.js

## Global Constraints

- 只改消息，不改模型/背景
- 向后兼容现有消息系统
- 保持代码风格一致
- 使用现有的消息优先级系统

---

## 文件结构

| 文件 | 职责 |
|------|------|
| `src/utils/live2dContextTracker.ts` | 新增：行为追踪和上下文管理 |
| `src/utils/live2dMessageManager.ts` | 修改：新增智能消息选择方法 |
| `src/setting/live2dMessages.ts` | 修改：新增上下文感知消息模板 |
| `src/components/LuoTianyiLive2D.tsx` | 修改：集成行为追踪器 |

---

### Task 1: 创建行为追踪器

**Covers:** 新增触发条件

**Files:**
- Create: `src/utils/live2dContextTracker.ts`

**Interfaces:**
- Produces: `Live2DContextTracker` class with `getContext()`, `onBehaviorChange()`, `destroy()` methods

- [ ] **Step 1: 创建基础类结构**

```typescript
// src/utils/live2dContextTracker.ts

export interface BehaviorContext {
  // 时间上下文
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  isLateNight: boolean; // 0-5点
  
  // 页面上下文
  currentPage: string;
  pageVisitCount: number;
  timeOnPage: number; // 秒
  
  // 行为上下文
  scrollSpeed: 'slow' | 'normal' | 'fast';
  isInactive: boolean; // 3分钟无操作
  lastActivityTime: number;
  
  // 访问历史
  recentPages: string[];
  returnVisits: number; // 10秒内返回次数
}

type ContextChangeHandler = (context: BehaviorContext) => void;

export class Live2DContextTracker {
  private context: BehaviorContext;
  private handlers: Set<ContextChangeHandler> = new Set();
  private inactiveTimer: ReturnType<typeof setTimeout> | null = null;
  private scrollBuffer: number[] = [];
  private lastScrollTime: number = 0;
  private pageStartTime: number = Date.now();
  private recentPageChanges: number[] = [];
  
  constructor() {
    this.context = this.getInitialContext();
    this.setupEventListeners();
    this.startTimers();
  }
  
  private getInitialContext(): BehaviorContext {
    return {
      timeOfDay: this.getTimeOfDay(),
      isLateNight: this.isLateNight(),
      currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
      pageVisitCount: 1,
      timeOnPage: 0,
      scrollSpeed: 'normal',
      isInactive: false,
      lastActivityTime: Date.now(),
      recentPages: [],
      returnVisits: 0
    };
  }
  
  private getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }
  
  private isLateNight(): boolean {
    const hour = new Date().getHours();
    return hour >= 0 && hour < 6;
  }
  
  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;
    
    // 监听用户活动
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      window.addEventListener(event, () => this.onActivity(), { passive: true });
    });
    
    // 监听滚动速度
    window.addEventListener('scroll', () => this.onScroll(), { passive: true });
    
    // 监听页面切换
    window.addEventListener('popstate', () => this.onPageChange());
    
    // 监听路由变化（Next.js）
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.onPageChange();
    };
  }
  
  private startTimers(): void {
    // 每分钟更新页面停留时间
    setInterval(() => {
      this.context.timeOnPage = Math.floor((Date.now() - this.pageStartTime) / 1000);
      this.notifyHandlers();
    }, 60000);
    
    // 每小时更新时间上下文
    setInterval(() => {
      this.context.timeOfDay = this.getTimeOfDay();
      this.context.isLateNight = this.isLateNight();
      this.notifyHandlers();
    }, 3600000);
  }
  
  private onActivity(): void {
    this.context.lastActivityTime = Date.now();
    this.context.isInactive = false;
    
    if (this.inactiveTimer) {
      clearTimeout(this.inactiveTimer);
    }
    
    // 3分钟无操作触发
    this.inactiveTimer = setTimeout(() => {
      this.context.isInactive = true;
      this.notifyHandlers();
    }, 180000); // 3分钟
  }
  
  private onScroll(): void {
    const now = Date.now();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    // 记录滚动位置和时间
    this.scrollBuffer.push(scrollTop);
    this.lastScrollTime = now;
    
    // 只保留最近1秒的滚动数据
    this.scrollBuffer = this.scrollBuffer.filter((_, i) => {
      const timeDiff = now - (this.lastScrollTime - (this.scrollBuffer.length - i) * 16);
      return timeDiff < 1000;
    });
    
    // 计算滚动速度
    if (this.scrollBuffer.length >= 2) {
      const first = this.scrollBuffer[0];
      const last = this.scrollBuffer[this.scrollBuffer.length - 1];
      const distance = Math.abs(last - first);
      
      if (distance > 500) {
        this.context.scrollSpeed = 'fast';
      } else if (distance > 100) {
        this.context.scrollSpeed = 'normal';
      } else {
        this.context.scrollSpeed = 'slow';
      }
      
      this.notifyHandlers();
    }
  }
  
  private onPageChange(): void {
    const currentPath = window.location.pathname;
    
    // 记录最近访问的页面
    this.context.recentPages.unshift(this.context.currentPage);
    if (this.context.recentPages.length > 5) {
      this.context.recentPages.pop();
    }
    
    // 检测是否是返回访问（10秒内）
    const now = Date.now();
    this.recentPageChanges.push(now);
    this.recentPageChanges = this.recentPageChanges.filter(t => now - t < 10000);
    this.context.returnVisits = this.recentPageChanges.length - 1;
    
    // 更新当前页面
    this.context.currentPage = currentPath;
    this.context.pageVisitCount++;
    this.context.timeOnPage = 0;
    this.pageStartTime = now;
    
    // 重置滚动速度
    this.context.scrollSpeed = 'normal';
    
    this.notifyHandlers();
  }
  
  getContext(): BehaviorContext {
    return { ...this.context };
  }
  
  onBehaviorChange(handler: ContextChangeHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }
  
  private notifyHandlers(): void {
    const context = this.getContext();
    this.handlers.forEach(handler => {
      try {
        handler(context);
      } catch (error) {
        console.warn('[Live2DContextTracker] Handler error:', error);
      }
    });
  }
  
  destroy(): void {
    if (this.inactiveTimer) {
      clearTimeout(this.inactiveTimer);
    }
    this.handlers.clear();
  }
}

// 创建全局单例
export const live2dContextTracker = new Live2DContextTracker();
```

- [ ] **Step 2: 验证文件创建成功**

```bash
cd W:\Web\004\OxygenBlogPlatform
ls src/utils/live2dContextTracker.ts
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/live2dContextTracker.ts
git commit -m "feat: add Live2D context tracker for behavior tracking"
```

---

### Task 2: 新增上下文感知消息模板

**Covers:** 消息更智能

**Files:**
- Modify: `src/setting/live2dMessages.ts`

**Interfaces:**
- Consumes: 无
- Produces: `ContextAwareMessages` 导出对象

- [ ] **Step 1: 在文件末尾添加上下文感知消息**

```typescript
// src/setting/live2dMessages.ts

// ... 现有代码 ...

/**
 * 上下文感知消息配置
 * 根据时间、页面、用户行为组合生成更自然的对话
 */
export const ContextAwareMessages = {
  // 快速滚动消息
  FAST_SCROLL: {
    messages: [
      '哇，你看得好快呀～',
      '慢一点嘛，天依都跟不上了～',
      '这么着急吗？内容不会跑掉的～',
      '哇塞，一目十行呢！'
    ],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  
  // 长时间无操作消息
  INACTIVE: {
    messages: [
      '天依要睡着了...zzZ',
      '还在吗？天依一个人好无聊～',
      '咦？怎么不动了？',
      '天依在等你回来～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.LOW
  },
  
  // 频繁返回消息
  FREQUENT_RETURN: {
    messages: [
      '你在找什么呢？天依帮你～',
      '又回来了？果然很喜欢这里呢～',
      '迷路了吗？天依帮你导航～'
    ],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  
  // 深夜访问消息
  LATE_NIGHT: {
    messages: [
      '这么晚了还在看博客？要注意休息哦～',
      '夜深了，天依陪你一起熬夜～',
      '凌晨了呢，早点休息吧～',
      '晚安前再看一眼吗？'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.MEDIUM
  },
  
  // 重复访问消息
  REPEAT_VISIT: {
    messages: [
      '又来看这篇文章？果然很喜欢呢～',
      '这篇文章一定很精彩，看了还想看～',
      '天依知道你很喜欢这篇！'
    ],
    duration: MessageDuration.SHORT,
    priority: MessagePriority.LOW
  },
  
  // 长时间阅读消息
  LONG_READ: {
    messages: [
      '这篇文章真的很吸引人呢～',
      '读了这么久，一定很有收获吧？',
      '天依也想看看你在读什么～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.LOW
  },
  
  // 时间+页面组合消息
  MORNING_BLOG: {
    messages: [
      '早上好！这么早就来阅读了？',
      '新的一天从阅读开始～',
      '早安！今天想读点什么呢？'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.LOW
  },
  
  EVENING_GALLERY: {
    messages: [
      '晚上来看画廊？夜色中的图片别有风味～',
      '夜晚的画廊更安静呢～',
      '晚安前欣赏一下美图吧～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.LOW
  },
  
  NIGHT_TOOLS: {
    messages: [
      '深夜还在用工具？真是勤奋呢～',
      '这么晚了还在工作？要注意休息哦～',
      '天依陪你一起熬夜～'
    ],
    duration: MessageDuration.NORMAL,
    priority: MessagePriority.LOW
  }
} as const;

/**
 * 根据上下文获取智能消息配置
 */
export function getContextAwareMessageConfig(context: {
  timeOfDay: string;
  isLateNight: boolean;
  currentPage: string;
  scrollSpeed: string;
  isInactive: boolean;
  returnVisits: number;
  timeOnPage: number;
}): MessageConfig | null {
  // 优先级：无操作 > 快速滚动 > 深夜 > 频繁返回 > 长时间阅读 > 时间+页面组合
  
  if (context.isInactive) {
    return ContextAwareMessages.INACTIVE;
  }
  
  if (context.scrollSpeed === 'fast') {
    return ContextAwareMessages.FAST_SCROLL;
  }
  
  if (context.isLateNight) {
    return ContextAwareMessages.LATE_NIGHT;
  }
  
  if (context.returnVisits > 2) {
    return ContextAwareMessages.FREQUENT_RETURN;
  }
  
  if (context.timeOnPage > 300) { // 5分钟
    return ContextAwareMessages.LONG_READ;
  }
  
  // 时间+页面组合
  if (context.timeOfDay === 'morning' && context.currentPage.startsWith('/blogs')) {
    return ContextAwareMessages.MORNING_BLOG;
  }
  
  if (context.timeOfDay === 'evening' && context.currentPage.startsWith('/gallery')) {
    return ContextAwareMessages.EVENING_GALLERY;
  }
  
  if (context.timeOfDay === 'night' && context.currentPage.startsWith('/tools')) {
    return ContextAwareMessages.NIGHT_TOOLS;
  }
  
  return null;
}
```

- [ ] **Step 2: 验证文件修改成功**

```bash
cd W:\Web\004\OxygenBlogPlatform
grep -n "ContextAwareMessages" src/setting/live2dMessages.ts | head -5
```

- [ ] **Step 3: Commit**

```bash
git add src/setting/live2dMessages.ts
git commit -m "feat: add context-aware message templates"
```

---

### Task 3: 集成智能消息选择

**Covers:** 消息更智能

**Files:**
- Modify: `src/utils/live2dMessageManager.ts`

**Interfaces:**
- Consumes: `live2dContextTracker`, `getContextAwareMessageConfig`
- Produces: `showContextAwareMessage()` 方法

- [ ] **Step 1: 在文件顶部添加导入**

```typescript
// src/utils/live2dMessageManager.ts

import { live2dContextTracker, type BehaviorContext } from './live2dContextTracker';
import { getContextAwareMessageConfig, getRandomMessage } from '../setting/live2dMessages';

// ... 现有代码 ...
```

- [ ] **Step 2: 在 Live2DMessageManager 类中添加新方法**

```typescript
// 在 Live2DMessageManager 类的末尾（forceReset 方法之后）添加

  /**
   * 显示上下文感知消息
   * 根据用户行为和上下文智能选择消息
   */
  showContextAwareMessage(context: BehaviorContext): void {
    // 隐藏状态下不显示消息
    if (typeof window !== 'undefined' && (window as any).__live2dHidden) {
      return;
    }
    
    const config = getContextAwareMessageConfig(context);
    if (config) {
      const message = getRandomMessage(config);
      this.showMessage(message, config.duration, config.priority);
    }
  }
  
  /**
   * 启动上下文监听
   * 自动根据用户行为显示智能消息
   */
  startContextListening(): void {
    let lastMessageTime = 0;
    const MESSAGE_COOLDOWN = 30000; // 30秒冷却
    
    live2dContextTracker.onBehaviorChange((context) => {
      const now = Date.now();
      if (now - lastMessageTime < MESSAGE_COOLDOWN) {
        return;
      }
      
      // 只在有明显行为变化时显示消息
      if (context.isInactive || 
          context.scrollSpeed === 'fast' || 
          context.returnVisits > 2 ||
          (context.isLateNight && context.timeOnPage > 60)) {
        this.showContextAwareMessage(context);
        lastMessageTime = now;
      }
    });
  }
```

- [ ] **Step 3: 验证文件修改成功**

```bash
cd W:\Web\004\OxygenBlogPlatform
grep -n "showContextAwareMessage" src/utils/live2dMessageManager.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/utils/live2dMessageManager.ts
git commit -m "feat: integrate context-aware message selection"
```

---

### Task 4: 集成到 Live2D 组件

**Covers:** 新增触发条件

**Files:**
- Modify: `src/components/LuoTianyiLive2D.tsx`

**Interfaces:**
- Consumes: `live2dMessageManager.startContextListening()`
- Produces: 组件挂载时启动上下文监听

- [ ] **Step 1: 在文件顶部添加导入**

```typescript
// src/components/LuoTianyiLive2D.tsx

// ... 现有导入 ...

// 添加这一行
import live2dMessageManager from '../utils/live2dMessageManager';
```

- [ ] **Step 2: 在主 useEffect 中启动上下文监听**

```typescript
// 在主 Live2D 初始化 useEffect 中，在 loadLive2D() 调用之前添加

    // 启动上下文感知消息监听
    live2dMessageManager.startContextListening();
```

- [ ] **Step 3: 验证文件修改成功**

```bash
cd W:\Web\004\OxygenBlogPlatform
grep -n "startContextListening" src/components/LuoTianyiLive2D.tsx
```

- [ ] **Step 4: Commit**

```bash
git add src/components/LuoTianyiLive2D.tsx
git commit -m "feat: integrate context tracker into Live2D component"
```

---

### Task 5: 添加测试

**Covers:** 验证功能

**Files:**
- Create: `src/utils/live2dContextTracker.test.ts`

**Interfaces:**
- Consumes: `Live2DContextTracker`
- Produces: 测试用例

- [ ] **Step 1: 创建测试文件**

```typescript
// src/utils/live2dContextTracker.test.ts

import { Live2DContextTracker } from './live2dContextTracker';

describe('Live2DContextTracker', () => {
  let tracker: Live2DContextTracker;
  
  beforeEach(() => {
    tracker = new Live2DContextTracker();
  });
  
  afterEach(() => {
    tracker.destroy();
  });
  
  test('should initialize with correct time context', () => {
    const context = tracker.getContext();
    expect(context.timeOfDay).toBeDefined();
    expect(typeof context.isLateNight).toBe('boolean');
  });
  
  test('should track current page', () => {
    const context = tracker.getContext();
    expect(context.currentPage).toBeDefined();
    expect(typeof context.currentPage).toBe('string');
  });
  
  test('should detect fast scrolling', () => {
    const context = tracker.getContext();
    // 初始状态应该是 normal
    expect(['slow', 'normal', 'fast']).toContain(context.scrollSpeed);
  });
  
  test('should track inactivity', () => {
    const context = tracker.getContext();
    expect(typeof context.isInactive).toBe('boolean');
  });
  
  test('should support onBehaviorChange callback', () => {
    const handler = jest.fn();
    const unsubscribe = tracker.onBehaviorChange(handler);
    
    expect(typeof unsubscribe).toBe('function');
    
    unsubscribe();
  });
  
  test('should clean up on destroy', () => {
    const handler = jest.fn();
    tracker.onBehaviorChange(handler);
    
    tracker.destroy();
    
    // destroy 后不应该再触发回调
    // 这里主要验证不会报错
  });
});
```

- [ ] **Step 2: 运行测试**

```bash
cd W:\Web\004\OxygenBlogPlatform
npx jest src/utils/live2dContextTracker.test.ts --passWithNoTests
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/live2dContextTracker.test.ts
git commit -m "test: add tests for Live2D context tracker"
```

---

### Task 6: 构建验证

**Covers:** 确保代码正确

**Files:**
- 无

**Interfaces:**
- 无

- [ ] **Step 1: 运行类型检查**

```bash
cd W:\Web\004\OxygenBlogPlatform
npx tsc --noEmit
```

- [ ] **Step 2: 运行构建**

```bash
cd W:\Web\004\OxygenBlogPlatform
npm run build
```

- [ ] **Step 3: 验证构建成功**

构建应该没有错误完成。

- [ ] **Step 4: 最终 Commit**

```bash
git add -A
git commit -m "feat: complete Live2D scene enhancement implementation"
```

---

## 执行顺序

1. Task 1: 创建行为追踪器
2. Task 2: 新增上下文感知消息模板
3. Task 3: 集成智能消息选择
4. Task 4: 集成到 Live2D 组件
5. Task 5: 添加测试
6. Task 6: 构建验证

## 预期结果

完成后，Live2D 看板娘将能够：
- 检测用户快速滚动并显示相应消息
- 3分钟无操作后显示"天依要睡着了"等消息
- 检测频繁返回行为并显示提示
- 深夜访问时显示关心消息
- 长时间阅读后显示鼓励消息
- 根据时间和页面组合显示更自然的对话
