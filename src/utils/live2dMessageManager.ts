/**
 * Live2D消息管理器
 * 用于向洛天依Live2D看板娘发送消息提示
 */

class Live2DMessageManager {
  private static instance: Live2DMessageManager;
  private isInitialized = false;

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
   */
  showMessage(message: string, duration: number = 3000): void {
    if (typeof window === 'undefined') return;

    console.log('尝试显示Live2D消息:', message);
    console.log('window.showMessage 存在:', !!(window as any).showMessage);
    console.log('window.GlobalMessageManager 存在:', !!(window as any).GlobalMessageManager);
    console.log('消息DOM元素存在:', !!document.querySelector('.message'));
    console.log('Live2D容器存在:', !!document.querySelector('#live2d'));
    console.log('所有window对象:', Object.keys(window as any).filter(key => key.toLowerCase().includes('message') || key.toLowerCase().includes('live2d')));

    // 使用原始的 showMessage 函数
    if ((window as any).showMessage) {
      console.log('使用window.showMessage发送消息');
      (window as any).showMessage(message, duration);
      return;
    }

    // 检查是否有消息DOM元素 - 使用更具体的选择器
    const messageElement = document.querySelector('.message');
    if (messageElement) {
      console.log('找到消息DOM元素，直接更新内容');
      (messageElement as HTMLElement).innerHTML = message;
      (messageElement as HTMLElement).style.opacity = '1';
      (messageElement as HTMLElement).style.display = 'block';
      
      // 自动隐藏
      setTimeout(() => {
        (messageElement as HTMLElement).style.opacity = '0';
        setTimeout(() => {
          (messageElement as HTMLElement).style.display = 'none';
        }, 500);
      }, duration);
      return;
    }

    // 尝试查找其他可能的消息元素
    const waifuMessage = document.querySelector('#waifu-tips');
    if (waifuMessage) {
      console.log('找到waifu消息元素');
      (waifuMessage as HTMLElement).innerHTML = message;
      (waifuMessage as HTMLElement).style.display = 'block';
      
      setTimeout(() => {
        (waifuMessage as HTMLElement).style.display = 'none';
      }, duration);
      return;
    }

    // 尝试查找Live2D容器中的消息元素
    const landlordMessage = document.querySelector('#landlord .message');
    if (landlordMessage) {
      console.log('找到landlord消息元素');
      (landlordMessage as HTMLElement).innerHTML = message;
      (landlordMessage as HTMLElement).style.opacity = '1';
      (landlordMessage as HTMLElement).style.display = 'block';
      
      setTimeout(() => {
        (landlordMessage as HTMLElement).style.opacity = '0';
        setTimeout(() => {
          (landlordMessage as HTMLElement).style.display = 'none';
        }, 500);
      }, duration);
      return;
    }

    console.warn('Live2D消息系统未初始化，消息无法显示:', message);
  }

  /**
   * 主动隐藏当前显示的消息
   */
  hideMessage(): void {
    if (typeof window === 'undefined') return;

    const messageElement = document.querySelector('.message');
    if (messageElement) {
      (messageElement as HTMLElement).style.opacity = '0';
      setTimeout(() => {
        (messageElement as HTMLElement).style.display = 'none';
      }, 500);
    }

    const waifuMessage = document.querySelector('#waifu-tips');
    if (waifuMessage) {
      (waifuMessage as HTMLElement).style.display = 'none';
    }

    const landlordMessage = document.querySelector('#landlord .message');
    if (landlordMessage) {
      (landlordMessage as HTMLElement).style.opacity = '0';
      setTimeout(() => {
        (landlordMessage as HTMLElement).style.display = 'none';
      }, 500);
    }
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
    PUBLISH: '发布成功！天依为你鼓掌👏',
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