/**
 * Live2D 歌词渲染器
 * 将当前歌曲的歌词作为 Live2D 看板娘气泡内容显示
 *
 * 【为什么改用独立气泡元素】
 * Live2D 原有的 .message 气泡是 React（Live2DBubble 组件）渲染的，
 * 它的 opacity / display / 文本内容全部由 React state 决定，而本渲染器需要每帧直接改写 DOM，
 * 两者会互相覆盖，导致歌词"有时候"不显示：
 *   1. React 侧 updateMessage 内置 triggerFadeOut，会在 5 秒后把 opacity 置 0；
 *      歌词渲染器只在"歌词行号变化"时才重设 opacity，行号不变（长前奏/长间奏）时
 *      歌词就被隐藏且再也回不来。
 *   2. 只要 React 重渲染 .message（音乐播放/暂停事件、鼠标悬停提示、切歌提示都会触发），
 *      就会用 state 里的旧文本把歌词内容整个冲掉。
 * 因此这里改为自建专属气泡 #live2d-lyrics-bubble，并在歌词期间用
 * html[data-live2d-lyrics="on"] 把原 .message 隐藏，彻底避免两方争抢同一个 DOM 节点。
 *
 * - 通过 requestAnimationFrame 监听 currentTime，计算当前行
 * - 当前行高亮显示，渲染上下多行（最多 5 行）
 * - 自动进入/退出 live2dMessageManager 的 lyrics mode（屏蔽其他消息）
 */

import { LrcLine, findCurrentLineIndex } from './lrcParser';
import live2dMessageManager from './live2dMessageManager';

/**
 * 歌词渲染器配置
 */
export interface LyricsRendererConfig {
  /**
   * 气泡中显示的歌词行数（包含当前行）。
   * 必须是奇数，当前行居中。如 5 表示当前行 + 上下各 2 行。
   */
  visibleLines?: number;
}

/**
 * 歌词渲染器类
 * 单例模式，同一时间只允许一个渲染器在运行
 */
class Live2DLyricsRenderer {
  /** 歌词专属气泡元素的 id（与 injectStyles 中的 CSS 选择器保持一致） */
  private static readonly BUBBLE_ID = 'live2d-lyrics-bubble';
  /** 歌词模式标记：挂在 html 元素上的 data 属性名，CSS 依据它隐藏原生 .message 气泡 */
  private static readonly MODE_ATTR = 'data-live2d-lyrics';
  /**
   * 气泡元素创建失败后的重试间隔（毫秒）。
   * Live2D 是异步加载的，#landlord 容器可能晚于歌词启动才出现，
   * 因此需要在 rAF 循环里节流重试，不能每帧都去查 DOM。
   */
  private static readonly ATTACH_RETRY_INTERVAL_MS = 200;

  /** 解析后的歌词行数组（按时间升序） */
  private lines: LrcLine[] = [];
  /** 获取当前播放时间的回调（由 howlerPlayerManager 提供） */
  private getCurrentTime: (() => number) | null = null;
  /** requestAnimationFrame 的句柄 */
  private rafId: number | null = null;
  /** 上次渲染的行索引（避免重复更新 DOM） */
  private lastLineIndex = -2;
  /** 当前是否处于渲染状态 */
  private active = false;
  /** 气泡中显示的歌词行数（奇数，当前行居中） */
  private visibleLines = 3;
  /** 歌词专属气泡元素（由本渲染器独占管理，React 不参与） */
  private bubbleEl: HTMLElement | null = null;
  /** 上次尝试创建气泡元素的时间戳，用于节流重试 */
  private lastAttachAttemptAt = 0;

  /**
   * 启动渲染器
   * @param lines 解析后的歌词行数组
   * @param getCurrentTime 获取当前播放时间（秒）的回调
   * @param config 渲染器配置
   */
  start(
    lines: LrcLine[],
    getCurrentTime: () => number,
    config?: LyricsRendererConfig
  ): void {
    // 停掉旧实例
    this.stop();

    // 【防呆保护】歌词为空时不进入歌词模式
    // 如果传给渲染器的是空数组（歌曲没有 LRC 歌词），直接放弃渲染
    // 否则会进入歌词模式（enterLyricsMode），把所有 Live2D message 永久屏蔽！
    if (!lines || lines.length === 0) {
      return;
    }

    this.lines = lines;
    this.getCurrentTime = getCurrentTime;
    this.visibleLines = config?.visibleLines ?? 3;
    this.lastLineIndex = -2; // 重置，确保首帧一定渲染
    this.active = true;

    // 注入歌词气泡专用样式
    this.injectStyles();

    // 尝试创建专属气泡元素。
    // Live2D 尚未加载出 #landlord 时这里会失败，此时由 tick() 在后续帧节流重试，
    // 因此不能把失败当作启动失败而放弃。
    this.ensureBubbleElement();

    // 进入歌词模式：屏蔽其他 showMessage
    live2dMessageManager.enterLyricsMode();

    // 立即渲染一帧（避免首帧空白）
    this.tick();

    // 启动 requestAnimationFrame 循环
    this.rafId = requestAnimationFrame(this.loop);
  }

  /**
   * 注入歌词气泡的 CSS 样式到 head 中
   * 每次启动都先移除旧 style 标签再重新注入，确保 CSS 是最新版本
   * （避免 dev 时 HMR 不会更新已注入的 style 标签，导致代码改了不生效）
   *
   * 样式分为三部分：
   * 1. #live2d-lyrics-bubble 本体：外观对齐原 .message 气泡，保证视觉一致
   * 2. html[data-live2d-lyrics="on"] .message：歌词期间隐藏 React 渲染的原生气泡，
   *    避免两个气泡叠在一起。用 !important 是因为原生气泡的 display/opacity
   *    是 React 写在内联 style 上的，普通选择器优先级不够
   * 3. 歌词行：当前行加粗+天依蓝+白边描边+光晕，其他行半透明缩小呈现淡出效果
   */
  private injectStyles(): void {
    if (typeof document === 'undefined') return;

    // 先移除已存在的 style 标签（如果存在），确保覆盖旧版
    const existing = document.getElementById('live2d-lyrics-style');
    if (existing) {
      existing.remove();
    }

    const style = document.createElement('style');
    style.id = 'live2d-lyrics-style';
    style.textContent = `
      /* 歌词专属气泡本体：外观沿用原 .message 气泡的视觉参数 */
      #live2d-lyrics-bubble {
        position: absolute;
        top: -20px;
        left: 50px;
        width: 240px;
        max-width: 300px;
        padding: 7px;
        border: 1px solid rgba(102, 204, 255, .4);
        border-radius: 12px;
        background: rgba(102, 204, 255, .2);
        box-shadow: 0 3px 15px 2px rgba(102, 204, 255, .4);
        color: var(--foreground, #333);
        font-size: 13px;
        font-weight: 500;
        text-align: center;
        line-height: 1.4;
        word-wrap: break-word;
        overflow: hidden;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        /* 初始状态为隐藏，交给 renderBubble 控制显示 */
        opacity: 0;
        display: none;
        z-index: 10001;
        /* 不拦截鼠标事件，避免挡住看板娘的点击互动 */
        pointer-events: none;
        transition: opacity .4s ease-in-out;
      }

      /* 歌词期间隐藏 React 渲染的原生 .message 气泡（内联样式需要 !important 才能覆盖） */
      html[data-live2d-lyrics="on"] .message {
        display: none !important;
        opacity: 0 !important;
      }

      #live2d-lyrics-bubble .lyrics-line {
        line-height: 1.5;
        text-align: center;
        transition: all .3s ease;
        padding: 1px 0;
      }
      #live2d-lyrics-bubble .lyrics-current {
        color: #0099cc;
        font-weight: 700;
        font-size: 15px;
        /* 白边：用 4 个方向的白色 text-shadow 叠加模拟细描边（1px），
           再叠加天依蓝光晕，让"正在唱"这一行在气泡中更突出 */
        text-shadow:
          -1px -1px 0 #fff,
          1px -1px 0 #fff,
          -1px 1px 0 #fff,
          1px 1px 0 #fff,
          0 0 10px rgba(102, 204, 255, .7);
        transform: scale(1.08);
        opacity: 1 !important;
        /* 细白色描边作为后备方案 */
        -webkit-text-stroke: .3px #fff;
      }
      #live2d-lyrics-bubble .lyrics-fade {
        color: var(--foreground, inherit);
        font-size: 12px;
        opacity: .45 !important;
        transform: scale(.95);
      }
      #live2d-lyrics-bubble .lyrics-upcoming {
        color: var(--foreground, inherit);
        font-size: 12px;
        opacity: .6 !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 停止渲染器
   * 退出歌词模式，恢复正常消息显示，隐藏歌词气泡
   */
  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.active = false;
    this.lines = [];
    this.getCurrentTime = null;
    this.lastLineIndex = -2;
    this.lastAttachAttemptAt = 0;

    // 退出歌词模式
    live2dMessageManager.exitLyricsMode();

    // 隐藏歌词气泡，同时解除对原生 .message 气泡的隐藏。
    // 气泡元素本身保留在 DOM 中（只是隐藏），下次开始歌词时直接复用，避免反复建删节点
    this.hideBubble();
  }

  /**
   * rAF 主循环
   */
  private loop = (): void => {
    if (!this.active) return;
    this.tick();
    this.rafId = requestAnimationFrame(this.loop);
  };

  /**
   * 单帧渲染：计算当前行，更新气泡 DOM
   */
  private tick(): void {
    if (!this.getCurrentTime) return;

    // 确保气泡元素存在。Live2D 是异步加载的，#landlord 容器可能比歌词启动晚出现，
    // 所以这里按固定间隔重试创建，而不是只在 start() 时尝试一次。
    // 【关键】气泡未就绪时直接返回且不更新 lastLineIndex，
    // 保证气泡就绪后一定会补渲染当前行（否则会因"行号未变化"被永久跳过）
    if (!this.bubbleEl || !this.bubbleEl.isConnected) {
      if (
        Date.now() - this.lastAttachAttemptAt >=
        Live2DLyricsRenderer.ATTACH_RETRY_INTERVAL_MS
      ) {
        this.ensureBubbleElement();
      }
      if (!this.bubbleEl) return;
    }

    const currentTime = this.getCurrentTime();
    const currentIndex = findCurrentLineIndex(this.lines, currentTime);

    // 行号未变化则不更新 DOM（性能优化）
    if (currentIndex === this.lastLineIndex) return;
    this.lastLineIndex = currentIndex;

    this.renderBubble(currentIndex);
  }

  /**
   * 渲染歌词气泡内容
   * 只改自己专属气泡元素，不碰 React 渲染的 .message，因此不会被 React 重渲染覆盖
   * @param currentIndex 当前行索引，-1 表示还没到第一行
   */
  private renderBubble(currentIndex: number): void {
    const bubble = this.bubbleEl;
    if (!bubble) return;

    // 还没到第一行：显示"♪"占位
    if (currentIndex < 0) {
      bubble.innerHTML = '<div class="lyrics-line lyrics-upcoming">♪</div>';
      this.showBubble(bubble);
      return;
    }

    // 超过最后一行：保持显示最后一行（暂停/结束态）
    const totalLines = this.lines.length;
    const displayIndex = Math.min(currentIndex, totalLines - 1);

    // 计算可见行的范围（当前行居中）
    const half = Math.floor(this.visibleLines / 2);
    const startIndex = Math.max(0, displayIndex - half);
    const endIndex = Math.min(totalLines - 1, displayIndex + half);

    // 拼装 HTML：当前行高亮，其他行淡出
    const htmlParts: string[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      const line = this.lines[i];
      const isCurrent = i === displayIndex;
      const text = this.escapeHtml(line.text) || '♪';
      const cls = isCurrent ? 'lyrics-line lyrics-current' : 'lyrics-line lyrics-fade';
      htmlParts.push(`<div class="${cls}">${text}</div>`);
    }

    bubble.innerHTML = htmlParts.join('');
    this.showBubble(bubble);
  }

  /**
   * 显示气泡
   * 先切 display:block 并强制一次重排，再改 opacity。
   * 否则从 display:none 恢复可见时浏览器会把 opacity 变化与 display 变化合并到同一帧，
   * CSS transition 被跳过，气泡会生硬闪现
   */
  private showBubble(bubble: HTMLElement): void {
    bubble.style.display = 'block';
    void bubble.offsetHeight;
    bubble.style.opacity = '1';
  }

  /**
   * 隐藏气泡（关闭歌词时调用）
   */
  private hideBubble(): void {
    // 解除歌词模式标记，让 React 渲染的原生 .message 气泡恢复显示
    this.setLyricsModeAttribute(false);

    const bubble = this.bubbleEl;
    if (!bubble) return;
    // 触发淡出动画后清空内容
    bubble.style.opacity = '0';
    setTimeout(() => {
      // 二次检查：避免在淡出期间歌词被重新启动后误清空
      if (!this.active && this.bubbleEl === bubble) {
        bubble.innerHTML = '';
        bubble.style.display = 'none';
      }
    }, 300);
  }

  /**
   * 确保歌词专属气泡元素存在（幂等，可反复调用）
   * - 气泡挂在 #landlord（Live2D 看板娘容器）内部，与看板娘一同显示/隐藏
   * - 容器尚未渲染出来时返回 null，由调用方在后续帧重试
   */
  private ensureBubbleElement(): HTMLElement | null {
    if (typeof document === 'undefined') return null;

    this.lastAttachAttemptAt = Date.now();

    // 已有且仍在文档中则直接复用（DOM 被整体重建时 isConnected 会变为 false）
    if (this.bubbleEl && this.bubbleEl.isConnected) {
      this.setLyricsModeAttribute(true);
      return this.bubbleEl;
    }

    const landlord = document.getElementById('landlord');
    if (!landlord) {
      // Live2D 尚未加载完成，放弃本次创建，等待后续重试
      this.bubbleEl = null;
      return null;
    }

    let bubble = document.getElementById(Live2DLyricsRenderer.BUBBLE_ID);
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.id = Live2DLyricsRenderer.BUBBLE_ID;
      landlord.appendChild(bubble);
    }

    this.bubbleEl = bubble;
    this.setLyricsModeAttribute(true);
    return bubble;
  }

  /**
   * 切换歌词模式标记（挂在 html 元素的 data 属性上）
   * 之所以不挂在 #landlord 的 class 上：该元素的 className 由 React 控制，
   * 主题切换时 React 会整体重写 className，把外部添加的类名一并抹掉；
   * 而 data-* 属性 React 不参与维护，因此更可靠
   */
  private setLyricsModeAttribute(on: boolean): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (on) {
      root.setAttribute(Live2DLyricsRenderer.MODE_ATTR, 'on');
    } else {
      root.removeAttribute(Live2DLyricsRenderer.MODE_ATTR);
    }
  }

  /**
   * HTML 转义：避免歌词内容破坏 DOM 结构
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

/**
 * 全局单例
 * 暴露 refreshStyles 方法供组件挂载时主动调用，
 * 确保 dev 改 CSS 后进入页面就能看到新样式（不依赖用户触发 start()）
 */
export const live2dLyricsRenderer = new Live2DLyricsRenderer();

/**
 * 公开方法：刷新歌词样式（移除旧 style 标签 + 重新注入最新 CSS）
 * MusicPlayer 组件挂载时调用一次，确保 dev HMR 不会导致 CSS 缓存
 */
export function refreshLyricsStyles(): void {
  live2dLyricsRenderer['injectStyles']();
}
