/**
 * Live2D消息管理器
 * 用于向洛天依Live2D看板娘发送消息提示
 * 重构版本：支持配置化消息、优化的显示逻辑和优先级机制
 */

import {
  MessageConfig,
  getRandomMessage,
  MessagePriority,
  MessageDuration,
  WelcomeMessages,
  InteractionMessages,
  PageMessages,
  TimeMessages,
  ReadingMessages,
  ThemeMessages,
  MusicMessages,
  CopyMessages,
  MarkdownMessages,
  GeneralMessages,
  HolidayMessages,
  HiddenTagEasterEggMessages,
  GalleryMessages,
  MomentsMessages,
  ChangelogsMessages,
  RocoSimulatorMessages,
  getTimeGreetingConfig,
  getPageMessageConfig,
  getHolidayMessageConfig,
  renderMessageTemplate,
  getContextAwareMessageConfig
} from '../setting/live2dMessages';
import { live2dContextTracker, type BehaviorContext } from './live2dContextTracker';

class Live2DMessageManager {
  private static instance: Live2DMessageManager;
  private isInitialized = false;
  private messageQueue: Array<{message: string, duration: number, priority: number}> = [];
  private isDisplayingMessage = false;
  private currentTimeout: NodeJS.Timeout | null = null;
  private lastMessage = '';
  private lastMessageTime = 0;
  private readonly MESSAGE_COOLDOWN = 500; // 消息冷却时间（毫秒）
  private readonly MIN_MESSAGE_INTERVAL = 800; // 消息间最小间隔（毫秒）
  private currentPriority = 0; // 当前显示消息的优先级
  
  // 彩蛋模式状态
  private isEasterEggMode = false;
  // 彩蛋消息优先级阈值
  private readonly EASTER_EGG_PRIORITY = 10;
  // 烟花模式状态（独立于彩蛋模式，优先级更高）
  private isFireworksMode = false;
  // 歌词模式状态：屏蔽所有 showMessage 调用（除歌词自身渲染外）
  private isLyricsMode = false;
  // 歌词模式期间保存的原 window.showMessage，用于退出时恢复
  private originalWindowShowMessage: ((text: string, timeout?: number) => void) | null = null;
  // 歌词模式期间的延迟保护定时器 ID：防 Live2D 异步加载覆盖重写版
  private lyricsProtectInterval: number | null = null;

  // 性能优化：将关键词集合提取为类级别常量，避免每次调用时重新创建
  private static readonly KEYWORD_SET = new Set(['复制', '成功', '完成', '加载', '切换', '模式']);
  private static readonly GREETING_KEYWORDS = new Set(['你好', '洛天依']);

  private constructor() {}

  static getInstance(): Live2DMessageManager {
    if (!Live2DMessageManager.instance) {
      Live2DMessageManager.instance = new Live2DMessageManager();
    }
    return Live2DMessageManager.instance;
  }

  /**
   * 显示消息给Live2D看板娘
   * @param message 要显示的消息文本
   * @param duration 显示时长（毫秒），默认3000ms
   * @param priority 消息优先级（0-10），数值越高优先级越高，默认1
   */
  showMessage(message: string, duration: number = 3000, priority: number = 1): void {
    if (typeof window === 'undefined') return;

    // 烟花模式下阻塞所有消息（包括彩蛋消息）
    if (this.isFireworksMode) {
      return;
    }

    // 歌词模式下阻塞所有其他消息（歌词自身走直接 DOM 控制，不经过此方法）
    if (this.isLyricsMode) {
      return;
    }

    // 彩蛋消息处理（优先级 >= 10）
    if (priority >= this.EASTER_EGG_PRIORITY) {
      // 进入彩蛋模式：清除队列、中断当前消息、设置标志
      this.enterEasterEggMode();
      // 显示彩蛋消息
      this.displayMessage(message, duration, priority);
      return;
    }

    // 彩蛋模式下屏蔽普通消息
    if (this.isEasterEggMode) {
      return;
    }

    // 防止重复消息和消息洪水 - 增强防重复机制
    const now = Date.now();
    const isSimilarMessage = this.isSimilarToLastMessage(message);
    const timeSinceLastMessage = now - this.lastMessageTime;
    
    // 更严格的重复消息检测
    if (isSimilarMessage && timeSinceLastMessage < this.MESSAGE_COOLDOWN * 2) {
      return;
    }

    // 防止消息洪水 - 限制短时间内消息数量
    if (timeSinceLastMessage < 500 && priority < 3) {
      return;
    }

    // 如果正在显示消息，检查优先级
    if (this.isDisplayingMessage) {
      // 高优先级消息可以中断当前消息
      if (priority > this.currentPriority) {
        this.interruptCurrentMessage();
        this.displayMessage(message, duration, priority);
        return;
      }

      // 低优先级消息加入队列
      this.messageQueue.push({ message, duration, priority });
      // 按优先级排序队列
      this.messageQueue.sort((a, b) => b.priority - a.priority);
      return;
    }

    // 立即显示消息
    this.displayMessage(message, duration, priority);
  }

  /**
   * 内部消息显示方法
   */
  private displayMessage(message: string, duration: number, priority: number = 0): void {
    this.isDisplayingMessage = true;
    this.lastMessage = message;
    this.lastMessageTime = Date.now();
    this.currentPriority = priority;

    // 清除之前的超时
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }

    // 优先调用保存的原 window.showMessage（绕过歌词模式下的重写转发器），
    // 避免 showFireworksMessage 等需要穿透模式屏蔽的内部调用被 canShowMessage 误拦
    const showFn = this.originalWindowShowMessage
      || (typeof window !== 'undefined' ? (window as any).showMessage : null);
    if (typeof showFn === 'function') {
      showFn.call(window, message, duration);
    } else {
      // 降级处理 - 直接操作 DOM
      this.displayMessageDirectly(message);
    }

    // 设置消息结束后的处理
    this.currentTimeout = setTimeout(() => {
      this.onMessageComplete();
    }, duration);
  }

  /**
   * 直接操作 DOM 显示消息 - 已废弃，不再直接操作 DOM
   */
  private displayMessageDirectly(message: string): void {
    // 不再直接操作 DOM，而是通过事件或状态管理
    // 如果 window.showMessage 存在，使用它
    if (typeof (window as any).showMessage === 'function') {
      (window as any).showMessage(message, 3000);
    }
  }

  /**
   * 直接显示消息（内部方法） - 已废弃，不再直接操作 DOM
   */
  private showMessageDirectly(message: string): void {
    // 不再直接操作 DOM
    // 如果 window.showMessage 存在，使用它
    if (typeof (window as any).showMessage === 'function') {
      (window as any).showMessage(message, 3000);
    }
  }

  /**
   * 中断当前消息显示
   */
  private interruptCurrentMessage(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    
    // 如果当前是彩蛋消息，退出彩蛋模式
    if (this.currentPriority >= this.EASTER_EGG_PRIORITY) {
      this.exitEasterEggMode();
    }
    
    // 重置状态
    this.isDisplayingMessage = false;
    this.currentPriority = 0;
  }

  /**
   * 进入彩蛋模式
   * 1. 清除消息队列
   * 2. 中断当前消息
   * 3. 设置彩蛋模式标志
   */
  private enterEasterEggMode(): void {
    // 清除消息队列
    this.clearMessageQueue();
    
    // 中断当前消息
    this.interruptCurrentMessage();
    
    // 进入彩蛋模式
    this.isEasterEggMode = true;
  }

  /**
   * 退出彩蛋模式
   * 恢复正常的消息处理流程
   */
  private exitEasterEggMode(): void {
    this.isEasterEggMode = false;
  }

  /**
   * 进入烟花模式
   * 阻塞所有消息（包括彩蛋消息）
   */
  enterFireworksMode(): void {
    // 清除消息队列
    this.clearMessageQueue();
    // 中断当前消息
    this.interruptCurrentMessage();
    // 进入烟花模式
    this.isFireworksMode = true;
  }

  /**
   * 退出烟花模式
   * 恢复正常的消息处理流程
   */
  exitFireworksMode(): void {
    this.isFireworksMode = false;
  }

  /**
   * 检查是否处于烟花模式
   */
  isInFireworksMode(): boolean {
    return this.isFireworksMode;
  }

  /**
   * 进入歌词模式
   * 屏蔽所有 showMessage 调用：
   *   1. live2dMessageManager.showMessage（项目代码入口）已有 isLyricsMode 屏蔽
   *   2. window.showMessage（Live2D 自身 message.js 暴露的全局函数）通过重写 + canShowMessage 统一过滤
   * 歌词自身通过 Live2DLyricsRenderer 直接 innerHTML 到 .message，不依赖 showMessage
   *
   * 关键：使用延迟保护机制防止 Live2D 异步加载完成后覆盖重写版（message.js:742 会执行 window.showMessage = showMessage）
   */
  enterLyricsMode(): void {
    if (this.isLyricsMode) return;

    this.clearMessageQueue();
    this.interruptCurrentMessage();
    this.isLyricsMode = true;

    this.overrideWindowShowMessage();

    // 延迟保护：进入歌词模式后的 1 秒内，每 200ms 检查一次，
    // 如果 window.showMessage 被 Live2D 异步加载覆盖了，重新重写
    // （避免在 Live2D 加载完成前点按钮、加载完成后覆盖重写版的时序问题）
    let checkCount = 0;
    const maxChecks = 5;
    this.lyricsProtectInterval = window.setInterval(() => {
      checkCount++;
      if (!this.isLyricsMode || checkCount > maxChecks) {
        if (this.lyricsProtectInterval !== null) {
          clearInterval(this.lyricsProtectInterval);
          this.lyricsProtectInterval = null;
        }
        return;
      }
      this.overrideWindowShowMessage();
    }, 200);
  }

  /**
   * 退出歌词模式
   * 1. 清除 isLyricsMode 标志
   * 2. 停止延迟保护定时器
   * 3. 恢复原 window.showMessage
   */
  exitLyricsMode(): void {
    this.isLyricsMode = false;

    if (this.lyricsProtectInterval !== null) {
      clearInterval(this.lyricsProtectInterval);
      this.lyricsProtectInterval = null;
    }

    if (typeof window !== 'undefined' && this.originalWindowShowMessage) {
      (window as any).showMessage = this.originalWindowShowMessage;
      this.originalWindowShowMessage = null;
    }
  }

  /**
   * 重写 window.showMessage 为转发器（idempotent，可重复调用）
   * 1. 仅在未保存过原函数时保存（避免重入覆盖）
   * 2. 替换为转发函数：先过 canShowMessage 过滤，通过则调原 Live2D showMessage 显示
   *
   * 不会循环：转发函数直接调 originalWindowShowMessage（原 Live2D showMessage），
   * 不走 manager 内部，不会触发 canShowMessage 再次检查
   */
  private overrideWindowShowMessage(): void {
    if (typeof window === 'undefined') return;
    const w = window as any;
    if (!this.originalWindowShowMessage && typeof w.showMessage === 'function') {
      this.originalWindowShowMessage = w.showMessage;
    }
    // 用箭头函数外加 self 引用，避免 this 绑定问题
    const self = this;
    w.showMessage = function (text: string, timeout?: number) {
      // window.showMessage 是普通消息入口，priority=1
      if (self.canShowMessage(1) && self.originalWindowShowMessage) {
        // 调原 Live2D showMessage 显示，绕过当前重写（避免循环）
        self.originalWindowShowMessage.call(window, text, timeout);
      }
      // canShowMessage 返回 false（歌词/烟花/彩蛋模式）：静默丢弃
    };
  }

  /**
   * 检查是否处于歌词模式
   */
  isInLyricsMode(): boolean {
    return this.isLyricsMode;
  }

  /**
   * 统一的消息显示判定：合并烟花/歌词/彩蛋三个模式的状态检查
   * @param priority 消息优先级（0-10），数值越高越优先
   * @returns 是否允许显示该消息
   *
   * 优先级规则：
   * - 烟花模式：仅允许 priority >= 10（彩蛋）的 showFireworksMessage 穿透
   * - 歌词模式：完全阻塞（歌词自身直接 innerHTML，不走 showMessage）
   * - 彩蛋模式：仅允许 priority >= 10 的彩蛋消息
   * - 正常模式：全部允许
   */
  private canShowMessage(priority: number): boolean {
    if (typeof window === 'undefined') return false;
    if (this.isFireworksMode) {
      return priority >= this.EASTER_EGG_PRIORITY;
    }
    if (this.isLyricsMode) {
      return false;
    }
    if (this.isEasterEggMode && priority < this.EASTER_EGG_PRIORITY) {
      return false;
    }
    return true;
  }

  /**
   * 显示烟花消息（仅在烟花模式下使用）
   * 此方法绕过烟花模式的阻塞，用于显示烟花相关的消息
   */
  showFireworksMessage(message: string, duration: number = 5000): void {
    // 直接显示消息，不经过正常的阻塞检查
    this.displayMessage(message, duration, 10);
  }

  /**
   * 消息显示完成后的处理
   */
  private onMessageComplete(): void {
    // 如果是彩蛋消息结束，退出彩蛋模式
    if (this.currentPriority >= this.EASTER_EGG_PRIORITY) {
      this.exitEasterEggMode();
    }

    this.isDisplayingMessage = false;
    this.currentPriority = 0;

    // 不再直接操作 DOM，让 React 组件自己处理隐藏动画
    // this.fadeOutMessage();

    // 烟花模式下不处理队列中的消息
    if (this.isFireworksMode) {
      return;
    }

    // 检查队列中是否有待显示的消息
    if (this.messageQueue.length > 0) {
      const nextMessage = this.messageQueue.shift();
      if (nextMessage) {
        // 延迟一点时间再显示下一条消息，避免消息闪烁
        setTimeout(() => {
          this.displayMessage(nextMessage.message, nextMessage.duration, nextMessage.priority);
        }, 300);
      }
    }
  }

  /**
   * 淡出消息动画
   */
  private fadeOutMessage(): void {
    const messageElement = document.querySelector('.message');
    const waifuMessage = document.querySelector('#waifu-tips');
    const landlordMessage = document.querySelector('#landlord .message');

    // 淡出动画
    const fadeOut = (element: Element) => {
      if (element) {
        (element as HTMLElement).style.transition = 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        (element as HTMLElement).style.opacity = '0';
      }
    };

    if (messageElement) fadeOut(messageElement);
    if (waifuMessage) fadeOut(waifuMessage);
    if (landlordMessage) fadeOut(landlordMessage);
  }

  /**
   * 淡入消息动画
   */
  private fadeInMessage(element: HTMLElement): void {
    element.style.transition = 'opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    element.style.opacity = '0';
    element.style.display = 'block';
    
    // 强制重绘以触发动画
    void element.offsetHeight;
    
    // 淡入
    requestAnimationFrame(() => {
      element.style.opacity = '1';
    });
  }

  /**
   * 主动隐藏当前显示的消息
   * @param delay 延迟时间（毫秒），默认0立即隐藏
   * @param maxPriority 最大优先级，只有当前消息优先级小于等于此值时才隐藏，默认5（中等优先级）
   */
  hideMessage(delay: number = 0, maxPriority: number = 5): void {
    if (typeof window === 'undefined') return;

    // 检查当前消息的优先级，只有低优先级消息才允许被隐藏
    if (this.currentPriority > maxPriority) {
      return;
    }

    // 如果指定了延迟，使用延迟隐藏
    if (delay > 0) {
      setTimeout(() => {
        // 再次检查，因为延迟期间可能有新消息
        if (this.currentPriority <= maxPriority) {
          this.performHideMessage();
        }
      }, delay);
    } else {
      // 立即隐藏
      this.performHideMessage();
    }
  }

  /**
   * 执行隐藏消息的实际操作
   */
  private performHideMessage(): void {
    // 清除当前超时
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    // 如果当前是彩蛋消息，退出彩蛋模式
    if (this.currentPriority >= this.EASTER_EGG_PRIORITY) {
      this.exitEasterEggMode();
    }

    this.isDisplayingMessage = false;
    this.currentPriority = 0;

    // 不再直接操作DOM，让React组件自己处理隐藏动画
    // this.fadeOutMessage();
    
    // 不再直接操作DOM元素显示状态，让React组件自己处理
    // setTimeout(() => {
    //   const messageElement = document.querySelector('.message');
    //   const waifuMessage = document.querySelector('#waifu-tips');
    //   const landlordMessage = document.querySelector('#landlord .message');

    //   if (messageElement) {
    //     (messageElement as HTMLElement).style.display = 'none';
    //   }
    //   if (waifuMessage) {
    //     (waifuMessage as HTMLElement).style.display = 'none';
    //   }
    //   if (landlordMessage) {
    //     (landlordMessage as HTMLElement).style.display = 'none';
    //   }
    // }, 300);
  }

  /**
   * 清除消息队列
   */
  clearMessageQueue(): void {
    this.messageQueue = [];
  }

  /**
   * 强制重置消息管理器状态
   * 用于处理异常情况或组件卸载时清理状态
   */
  forceReset(): void {
    // 清除所有定时器
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }

    // 退出彩蛋模式
    if (this.isEasterEggMode) {
      this.exitEasterEggMode();
    }

    // 重置所有状态
    this.isDisplayingMessage = false;
    this.currentPriority = 0;
    this.messageQueue = [];
    this.lastMessage = '';
    this.lastMessageTime = 0;
  }

  /**
   * 检查消息是否与上一条消息相似（性能优化版）
   */
  private isSimilarToLastMessage(message: string): boolean {
    if (!this.lastMessage) return false;
    
    // 完全相同的消息 - 最快路径
    if (message === this.lastMessage) return true;
    
    // 性能优化：使用预计算的 Set 进行 O(1) 查找
    const hasGreeting = (msg: string): boolean => {
      let has你好 = false;
      let has天依 = false;
      for (const char of msg) {
        if (char === '你' || char === '好') has你好 = true;
        if (char === '洛' || char === '天' || char === '依') has天依 = true;
        if (has你好 && has天依) return true;
      }
      return false;
    };
    
    // 问候语组合检查
    if (hasGreeting(message) && hasGreeting(this.lastMessage)) {
      return true;
    }
    
    // 关键词匹配：使用 Set 进行 O(1) 查找
    let currentHasKeyword = false;
    let lastHasKeyword = false;
    
    Live2DMessageManager.KEYWORD_SET.forEach(keyword => {
      if (!currentHasKeyword && message.includes(keyword)) {
        currentHasKeyword = true;
      }
      if (!lastHasKeyword && this.lastMessage.includes(keyword)) {
        lastHasKeyword = true;
      }
    });
    
    return currentHasKeyword && lastHasKeyword;
  }

  /**
   * 获取当前状态信息
   */
  getStatus(): { isDisplaying: boolean; queueLength: number; lastMessage: string; isEasterEggMode: boolean; isFireworksMode: boolean } {
    return {
      isDisplaying: this.isDisplayingMessage,
      queueLength: this.messageQueue.length,
      lastMessage: this.lastMessage,
      isEasterEggMode: this.isEasterEggMode,
      isFireworksMode: this.isFireworksMode
    };
  }

  /**
   * 检查Live2D是否可用
   */
  isLive2DAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    
    return !!(
      (window as any).GlobalMessageManager ||
      (window as any).showMessage ||
      document.querySelector('#live2d')
    );
  }

  /**
   * 等待Live2D初始化完成
   * @param timeout 超时时间（毫秒），默认10000ms
   */
  async waitForInitialization(timeout: number = 10000): Promise<boolean> {
    if (this.isInitialized) return true;

    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.isLive2DAvailable()) {
          this.isInitialized = true;
          clearInterval(checkInterval);
          resolve(true);
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          resolve(false);
        }
      }, 100);
    });
  }

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
}

// 创建单例实例
const live2dMessageManager = Live2DMessageManager.getInstance();

export default live2dMessageManager;

/**
 * 预设的Live2D消息提示 - 保持向后兼容
 * 新代码请使用 src/setting/live2dMessages.ts 中的配置
 */
export const Live2DMessages = {
  // Markdown编辑器相关消息
  MARKDOWN: {
    UNDO: '撤销操作成功～',
    REDO: '重做操作完成！',
    SAVE: '内容已保存，天依帮你保管好了～',
    CLEAR: '编辑器已清空，重新开始吧！',
    SAMPLE: '示例内容加载完成，可以参考一下哦～',
    COPY: '复制成功！代码已复制到剪贴板～',
    PUBLISH: '好耶，发布成功！',
    METADATA_SHOW: '元数据面板已显示～',
    METADATA_HIDE: '元数据面板已隐藏～',
    MODE_EDIT: '切换到编辑模式～',
    MODE_PREVIEW: '切换到预览模式！',
    MODE_SPLIT: '切换到分屏模式，可以同时编辑和预览～',
    MODE_BLOG: '切换到博客预览模式，看看效果如何～',
    PREVIEW_EDIT: '切换到编辑模式～',
    PREVIEW_PREVIEW: '切换到预览模式！',
    PREVIEW_SPLIT: '切换到分屏模式，可以同时编辑和预览～',
    PREVIEW_BLOG: '切换到博客预览模式，看看效果如何～',
    IMPORT_EXPORT: '导入导出功能已打开，支持多种格式哦～'
  },

  // 通用消息
  GENERAL: {
    HELLO: '你好～我是洛天依！',
    CLICK: '想听我唱歌吗？',
    HOVER: '天依在这里等你哦～',
    SUCCESS: '操作成功！',
    ERROR: '好像出了点问题...',
    WARNING: '注意一下哦～',
    INFO: '天依来告诉你一个小秘密～'
  }
} as const;

/**
 * 便捷方法：显示配置化消息
 */
export class Live2DMessageHelper {
  /**
   * 显示欢迎消息
   */
  static showWelcomeMessage(type: 'PAGE_LOAD' | 'WELCOME_BACK' = 'PAGE_LOAD'): void {
    const config = WelcomeMessages[type];
    live2dMessageManager.showMessage(
      getRandomMessage(config),
      config.duration,
      config.priority
    );
  }

  /**
   * 显示互动消息
   */
  static showInteractionMessage(
    type: 'TITLE_HOVER' | 'SEARCH_HOVER' | 'NAVIGATION_HOVER' | 'LIVE2D_CLICK',
    data?: { text?: string }
  ): void {
    const config = InteractionMessages[type];
    const message = getRandomMessage(config);
    const renderedMessage = renderMessageTemplate(message, data);
    live2dMessageManager.showMessage(
      renderedMessage,
      config.duration,
      config.priority
    );
  }

  /**
   * 显示页面消息
   */
  static showPageMessage(pageType: string): void {
    const config = getPageMessageConfig(pageType);
    live2dMessageManager.showMessage(
      getRandomMessage(config),
      config.duration,
      config.priority
    );
  }

  /**
   * 显示时间问候
   */
  static showTimeGreeting(hour?: number): void {
    const h = hour ?? new Date().getHours();
    const config = getTimeGreetingConfig(h);
    live2dMessageManager.showMessage(
      getRandomMessage(config),
      config.duration,
      config.priority
    );
  }

  /**
   * 显示阅读进度消息
   */
  static showReadingProgress(progress: number): void {
    let config;
    if (progress >= 75) {
      config = ReadingMessages.THREE_QUARTERS;
    } else if (progress >= 50) {
      config = ReadingMessages.HALF;
    } else if (progress >= 25) {
      config = ReadingMessages.QUARTER;
    } else {
      return;
    }
    live2dMessageManager.showMessage(
      getRandomMessage(config),
      config.duration,
      config.priority
    );
  }

  /**
   * 显示主题切换消息
   */
  static showThemeMessage(theme: 'light' | 'dark' | 'system'): void {
    const config = ThemeMessages[theme.toUpperCase() as keyof typeof ThemeMessages];
    if (config) {
      live2dMessageManager.showMessage(
        getRandomMessage(config),
        config.duration,
        config.priority
      );
    }
  }

  /**
   * 显示音乐消息
   */
  static showMusicMessage(action: 'PLAY' | 'PAUSE'): void {
    const config = MusicMessages[action];
    live2dMessageManager.showMessage(
      getRandomMessage(config),
      config.duration,
      config.priority
    );
  }

  /**
   * 显示复制消息
   */
  static showCopyMessage(): void {
    const config = CopyMessages.COPY;
    live2dMessageManager.showMessage(
      getRandomMessage(config),
      config.duration,
      config.priority
    );
  }

  /**
   * 显示Markdown编辑器消息
   */
  static showMarkdownMessage(
    action: keyof typeof MarkdownMessages
  ): void {
    const config = MarkdownMessages[action];
    if (config) {
      live2dMessageManager.showMessage(
        getRandomMessage(config),
        config.duration,
        config.priority
      );
    }
  }

  /**
   * 显示通用消息
   */
  static showGeneralMessage(
    type: 'SUCCESS' | 'ERROR' | 'WARNING' | 'INFO'
  ): void {
    const config = GeneralMessages[type];
    live2dMessageManager.showMessage(
      getRandomMessage(config),
      config.duration,
      config.priority
    );
  }

  /**
   * 显示节日或特殊日期消息
   * 返回是否显示了节日消息
   */
  static showHolidayMessage(month?: number, date?: number): boolean {
    const now = new Date();
    const m = month ?? (now.getMonth() + 1);
    const d = date ?? now.getDate();
    const config = getHolidayMessageConfig(m, d);
    
    if (config) {
      live2dMessageManager.showMessage(
        getRandomMessage(config),
        config.duration,
        config.priority
      );
      return true;
    }
    return false;
  }

  /**
   * 显示页面停留时间消息
   */
  static showStayTimeMessage(minutes: number): void {
    let config;
    if (minutes >= 30) {
      config = TimeMessages.STAY_TIME.THIRTY_MINUTES;
    } else if (minutes >= 15) {
      config = TimeMessages.STAY_TIME.FIFTEEN_MINUTES;
    } else if (minutes >= 10) {
      config = TimeMessages.STAY_TIME.TEN_MINUTES;
    } else if (minutes >= 5) {
      config = TimeMessages.STAY_TIME.FIVE_MINUTES;
    } else {
      return;
    }
    live2dMessageManager.showMessage(
      getRandomMessage(config),
      config.duration,
      config.priority
    );
  }

  /**
   * 智能页面消息：优先显示节日消息，然后是页面消息，最后是时间问候
   */
  static showSmartPageMessage(pageType: string): void {
    // 先尝试显示节日消息
    if (this.showHolidayMessage()) {
      return;
    }
    
    // 30% 概率显示时间问候，70% 概率显示页面消息
    if (Math.random() < 0.3) {
      this.showTimeGreeting();
    } else {
      this.showPageMessage(pageType);
    }
  }

  /**
   * 显示隐藏标签博客的彩蛋消息
   * 当用户打开带有 hidden 标签的博客时触发
   */
  static showHiddenTagEasterEgg(): void {
    // 随机选择发现消息或特别提示
    const useDiscovery = Math.random() < 0.6; // 60% 概率显示发现消息

    if (useDiscovery) {
      const config = HiddenTagEasterEggMessages.DISCOVERY;
      live2dMessageManager.showMessage(
        getRandomMessage(config),
        config.duration,
        config.priority
      );
    } else {
      const config = HiddenTagEasterEggMessages.SPECIAL_NOTE;
      live2dMessageManager.showMessage(
        getRandomMessage(config),
        config.duration,
        config.priority
      );
    }
  }

  /**
   * 显示画廊页面消息
   * @param type 消息类型（PAGE_VISIT, CATEGORY_CHANGE, IMAGE_CLICK, IMAGE_PREVIEW, PREVIEW_CLOSE, SCROLL）
   * @param data 可选数据，用于模板渲染（如 {category} 占位符替换）
   */
  static showGalleryMessage(
    type: 'PAGE_VISIT' | 'CATEGORY_CHANGE' | 'IMAGE_CLICK' | 'IMAGE_PREVIEW' | 'PREVIEW_CLOSE' | 'SCROLL',
    data?: { category?: string }
  ): void {
    const config = GalleryMessages[type];
    if (!config) return;

    let message = getRandomMessage(config);

    // 处理模板占位符
    if (type === 'CATEGORY_CHANGE' && data?.category) {
      message = renderMessageTemplate(message, { text: data.category });
    }

    live2dMessageManager.showMessage(
      message,
      config.duration,
      config.priority
    );
  }

  /**
   * 显示个人动态页面消息
   * @param type 消息类型（目前仅支持 PAGE_VISIT）
   */
  static showMomentsMessage(type: 'PAGE_VISIT'): void {
    const config = MomentsMessages[type];
    if (!config) return;

    live2dMessageManager.showMessage(
      getRandomMessage(config),
      config.duration,
      config.priority
    );
  }

  /**
   * 显示更新日志页面消息
   * @param type 消息类型（目前仅支持 PAGE_VISIT）
   */
  static showChangelogsMessage(type: 'PAGE_VISIT'): void {
    const config = ChangelogsMessages[type];
    if (!config) return;

    live2dMessageManager.showMessage(
      getRandomMessage(config),
      config.duration,
      config.priority
    );
  }

  /**
   * 显示洛克王国宠物模拟器消息
   * @param type 消息类型（PAGE_VISIT, ADD_TO_LINEUP, REMOVE_FROM_LINEUP, SWITCH_SKIN, SELECT_TALENT, CLEAR_LINEUP, BAN_PET, UNBAN_PET, LINEUP_FULL, EXCLUSIVE_CONFLICT, MAGIC_OVER_LIMIT）
   */
  static showRocoSimulatorMessage(
    type: 'PAGE_VISIT' | 'ADD_TO_LINEUP' | 'REMOVE_FROM_LINEUP' | 'SWITCH_SKIN' | 'SELECT_TALENT' | 'CLEAR_LINEUP' | 'BAN_PET' | 'UNBAN_PET' | 'LINEUP_FULL' | 'EXCLUSIVE_CONFLICT' | 'MAGIC_OVER_LIMIT'
  ): void {
    const config = RocoSimulatorMessages[type];
    if (!config) return;

    live2dMessageManager.showMessage(
      getRandomMessage(config),
      config.duration,
      config.priority
    );
  }
}