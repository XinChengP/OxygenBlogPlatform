/**
 * Live2D消息管理器
 * 用于向洛天依Live2D看板娘发送消息提示
 */

class Live2DMessageManager {
  private static instance: Live2DMessageManager;
  private isInitialized = false;
  private messageQueue: Array<{message: string, duration: number, priority: number}> = [];
  private isDisplayingMessage = false;
  private currentTimeout: NodeJS.Timeout | null = null;
  private lastMessage = '';
  private lastMessageTime = 0;
  private readonly MESSAGE_COOLDOWN = 500; // 消息冷却时间（毫秒）
  private currentPriority = 0; // 当前显示消息的优先级

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

    // 防止重复消息和消息洪水 - 增强防重复机制
    const now = Date.now();
    const isSimilarMessage = this.isSimilarToLastMessage(message);
    const timeSinceLastMessage = now - this.lastMessageTime;
    
    // 更严格的重复消息检测
    if (isSimilarMessage && timeSinceLastMessage < this.MESSAGE_COOLDOWN * 2) {
      console.log('相似消息跳过显示:', message);
      return;
    }
    
    // 防止消息洪水 - 限制短时间内消息数量
    if (timeSinceLastMessage < 500 && priority < 3) {
      console.log('消息过于频繁，跳过:', message);
      return;
    }

    // 如果正在显示消息，检查优先级
    if (this.isDisplayingMessage) {
      // 高优先级消息可以中断当前消息
      if (priority > this.currentPriority) {
        console.log(`高优先级消息(${priority})中断当前消息(${this.currentPriority}):`, message);
        this.interruptCurrentMessage();
        this.displayMessage(message, duration, priority);
        return;
      }
      
      // 低优先级消息加入队列
      console.log('消息队列中添加消息:', message);
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

    console.log(`显示Live2D消息(优先级${priority}):`, message);

    // 清除之前的超时
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
    }

    // 检查是否有原始的showMessage函数（未被我们重写的）
    const hasOriginalShowMessage = typeof (window as any).showMessage === 'function' && !(window as any).showMessageOverridden;
    
    if (hasOriginalShowMessage) {
      console.log('使用原始window.showMessage发送消息');
      (window as any).showMessage(message, duration);
    } else {
      // 降级处理 - 直接操作DOM
      this.displayMessageDirectly(message);
    }

    // 设置消息结束后的处理
    this.currentTimeout = setTimeout(() => {
      this.onMessageComplete();
    }, duration);
  }

  /**
   * 直接操作DOM显示消息
   */
  private displayMessageDirectly(message: string): void {
    // 先淡出任何现有的消息
    this.fadeOutMessage();
    
    // 短暂延迟后显示新消息，确保淡出动画完成
    setTimeout(() => {
      this.showMessageDirectly(message);
    }, 150);
  }

  /**
   * 直接显示消息（内部方法）
   */
  private showMessageDirectly(message: string): void {
    // 检查是否有消息DOM元素 - 使用更具体的选择器
    const messageElement = document.querySelector('.message');
    if (messageElement) {
      console.log('找到消息DOM元素，直接更新内容');
      (messageElement as HTMLElement).innerHTML = message;
      this.fadeInMessage(messageElement as HTMLElement);
      return;
    }

    // 尝试查找其他可能的消息元素
    const waifuMessage = document.querySelector('#waifu-tips');
    if (waifuMessage) {
      console.log('找到waifu消息元素');
      (waifuMessage as HTMLElement).innerHTML = message;
      this.fadeInMessage(waifuMessage as HTMLElement);
      return;
    }

    // 尝试查找Live2D容器中的消息元素
    const landlordMessage = document.querySelector('#landlord .message');
    if (landlordMessage) {
      console.log('找到landlord消息元素');
      (landlordMessage as HTMLElement).innerHTML = message;
      this.fadeInMessage(landlordMessage as HTMLElement);
      return;
    }

    console.warn('Live2D消息系统未初始化，消息无法显示:', message);
  }

  /**
   * 中断当前消息显示
   */
  private interruptCurrentMessage(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout);
      this.currentTimeout = null;
    }
    
    // 立即淡出当前消息
    this.fadeOutMessage();
    
    // 重置状态
    this.isDisplayingMessage = false;
    this.currentPriority = 0;
  }

  /**
   * 消息显示完成后的处理
   */
  private onMessageComplete(): void {
    this.isDisplayingMessage = false;
    this.currentPriority = 0;
    
    // 先淡出当前消息
    this.fadeOutMessage();
    
    // 检查队列中是否有待显示的消息
    if (this.messageQueue.length > 0) {
      const nextMessage = this.messageQueue.shift();
      if (nextMessage) {
        console.log('从队列中取出下一条消息:', nextMessage.message);
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
      console.log(`当前消息优先级${this.currentPriority}高于最大允许优先级${maxPriority}，不执行隐藏操作`);
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

    // 清空消息队列
    this.messageQueue = [];
    this.isDisplayingMessage = false;

    // 淡出消息
    this.fadeOutMessage();
    
    // 延迟隐藏元素
    setTimeout(() => {
      const messageElement = document.querySelector('.message');
      const waifuMessage = document.querySelector('#waifu-tips');
      const landlordMessage = document.querySelector('#landlord .message');

      if (messageElement) {
        (messageElement as HTMLElement).style.display = 'none';
      }
      if (waifuMessage) {
        (waifuMessage as HTMLElement).style.display = 'none';
      }
      if (landlordMessage) {
        (landlordMessage as HTMLElement).style.display = 'none';
      }
    }, 300);
  }

  /**
   * 清除消息队列
   */
  clearMessageQueue(): void {
    this.messageQueue = [];
    console.log('消息队列已清空');
  }

  /**
   * 检查消息是否与上一条消息相似
   */
  private isSimilarToLastMessage(message: string): boolean {
    if (!this.lastMessage) return false;
    
    // 完全相同的消息
    if (message === this.lastMessage) return true;
    
    // 检查是否是相似的问候语
    const greetings = ['你好', '嗨', '哈喽', '欢迎', '天依'];
    const isCurrentGreeting = greetings.some(greeting => message.includes(greeting));
    const isLastGreeting = greetings.some(greeting => this.lastMessage.includes(greeting));
    
    if (isCurrentGreeting && isLastGreeting) {
      return true;
    }
    
    // 检查消息内容相似度（简单的关键词匹配）
    const keywords = ['复制', '成功', '完成', '加载', '切换', '模式'];
    const currentHasKeyword = keywords.some(keyword => message.includes(keyword));
    const lastHasKeyword = keywords.some(keyword => this.lastMessage.includes(keyword));
    
    if (currentHasKeyword && lastHasKeyword) {
      // 如果两条消息都包含相似的功能性关键词，认为是相似的
      return true;
    }
    
    return false;
  }

  /**
   * 获取当前状态信息
   */
  getStatus(): { isDisplaying: boolean; queueLength: number; lastMessage: string } {
    return {
      isDisplaying: this.isDisplayingMessage,
      queueLength: this.messageQueue.length,
      lastMessage: this.lastMessage
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
}

// 创建单例实例
const live2dMessageManager = Live2DMessageManager.getInstance();

export default live2dMessageManager;

/**
 * 预设的Live2D消息提示
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