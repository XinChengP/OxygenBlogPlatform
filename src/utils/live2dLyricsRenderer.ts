/**
 * Live2D 歌词渲染器
 * 将当前歌曲的歌词作为 Live2D 看板娘消息气泡内容显示
 * - 直接操作 .message 元素（与 Live2D message.js 共享同一个 DOM 元素）
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

    this.lines = lines;
    this.getCurrentTime = getCurrentTime;
    this.visibleLines = config?.visibleLines ?? 3;
    this.lastLineIndex = -2; // 重置，确保首帧一定渲染
    this.active = true;

    // 注入歌词气泡专用样式（仅一次）
    this.injectStyles();

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
   * 样式作用于 .message 内部的 .lyrics-line 子元素
   * - 当前行：加粗、天依蓝、白边（4 方向白色 text-shadow 模拟描边）+ 天依蓝光晕
   * - 其他行：半透明、缩小，呈现淡出效果
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
      .message .lyrics-line {
        line-height: 1.5;
        text-align: center;
        transition: all 0.3s ease;
        padding: 1px 0;
      }
      .message .lyrics-current {
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
          0 0 10px rgba(102, 204, 255, 0.7);
        transform: scale(1.08);
        opacity: 1 !important;
        /* 细白色描边作为后备方案 */
        -webkit-text-stroke: 0.3px #fff;
      }
      .message .lyrics-fade {
        color: var(--foreground, inherit);
        font-size: 12px;
        opacity: 0.45 !important;
        transform: scale(0.95);
      }
      .message .lyrics-upcoming {
        color: var(--foreground, inherit);
        font-size: 12px;
        opacity: 0.6 !important;
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

    // 退出歌词模式
    live2dMessageManager.exitLyricsMode();

    // 隐藏气泡（直接操作 DOM）
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
    const currentTime = this.getCurrentTime();
    const currentIndex = findCurrentLineIndex(this.lines, currentTime);

    // 行号未变化则不更新 DOM（性能优化）
    if (currentIndex === this.lastLineIndex) return;
    this.lastLineIndex = currentIndex;

    this.renderBubble(currentIndex);
  }

  /**
   * 渲染歌词气泡内容
   * @param currentIndex 当前行索引，-1 表示还没到第一行
   */
  private renderBubble(currentIndex: number): void {
    const bubble = this.getBubbleElement();
    if (!bubble) return;

    // 还没到第一行：显示"♪"占位
    if (currentIndex < 0) {
      bubble.innerHTML = '<div class="lyrics-line lyrics-upcoming">♪</div>';
      bubble.style.opacity = '1';
      bubble.style.display = 'block';
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
    bubble.style.opacity = '1';
    bubble.style.display = 'block';
  }

  /**
   * 隐藏气泡（关闭歌词时调用）
   */
  private hideBubble(): void {
    const bubble = this.getBubbleElement();
    if (!bubble) return;
    // 触发淡出动画后清空内容
    bubble.style.opacity = '0';
    setTimeout(() => {
      // 二次检查：避免在淡出期间歌词被重新启动后误清空
      if (!this.active) {
        bubble.innerHTML = '';
        bubble.style.display = 'none';
      }
    }, 300);
  }

  /**
   * 获取 Live2D 看板娘的气泡元素
   * 优先匹配 jQuery 上下文中的 .message，否则回退到原生 DOM
   */
  private getBubbleElement(): HTMLElement | null {
    if (typeof document === 'undefined') return null;
    return document.querySelector<HTMLElement>('.message');
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
