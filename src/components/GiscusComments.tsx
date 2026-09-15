'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * Giscus 主题取值
 *
 * 仅使用 Giscus 官方内置的 light / dark 两套主题。
 * 不采用自定义主题 CSS 的原因：自定义主题需要 Giscus 的 iframe 跨域拉取样式表，
 * 对托管环境的 CORS 响应头存在硬性依赖，内置主题没有这层外部依赖，更稳妥。
 */
type GiscusTheme = 'light' | 'dark';

/**
 * Giscus iframe 所属源
 *
 * postMessage 必须给出精确的 targetOrigin。
 * 若写成 '*'，消息可被任意页面读取，属于不必要的安全暴露。
 */
const GISCUS_ORIGIN = 'https://giscus.app';

interface GiscusCommentsProps {
  id: string;
  /**
   * 预留属性
   *
   * 当前不参与 Giscus 任何配置，仅由调用方传入以便后续扩展。
   * 注意：它不参与讨论区匹配，改动它不会影响已加载的评论。
   */
  title?: string;
  type?: 'blog' | 'guestbook';
}

/**
 * 向已加载的 Giscus iframe 热切换主题
 *
 * 为什么用 postMessage 而不是重新插入 script：
 * 重新插入 script 会让 iframe 整体重新加载，评论区会闪白、滚动位置丢失，
 * 并且会重新拉取一次讨论数据；而 setConfig 只调整外观，
 * 不携带任何讨论区匹配信息，因此不会影响已有评论。
 *
 * @param container - 挂载 Giscus 的容器
 * @param theme - 目标主题
 */
function syncIframeTheme(container: HTMLElement | null, theme: GiscusTheme) {
  // Giscus 的 client.js 会在容器内插入一个 class 为 giscus-frame 的 iframe
  const iframe = container?.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
  // contentWindow 为空表示 iframe 尚未完成初始化，此时发送的消息会被直接丢弃
  if (!iframe?.contentWindow) return;

  iframe.contentWindow.postMessage({ giscus: { setConfig: { theme } } }, GISCUS_ORIGIN);
}

export default function GiscusComments({ id, type = 'blog' }: GiscusCommentsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);
  // 记录当前脚本对应的「讨论区标识」，用于区分「只是换了主题」与「换了文章」
  const scriptKeyRef = useRef<string | null>(null);
  // 始终保存最新主题，供 iframe 加载完成后的补发使用
  const latestThemeRef = useRef<GiscusTheme>('light');

  // 站点实际生效的主题（next-themes 会把 system 解析为 light / dark）
  const { resolvedTheme } = useTheme();

  /**
   * 主题是否已解析完成
   *
   * next-themes 需要等到挂载之后才能读出主题值，在此之前无法确定 data-theme。
   * 若此时就创建脚本，读者会看到评论区先按系统主题渲染、再跳成站点主题的闪烁，
   * 因此等到主题就绪再加载脚本。
   *
   * 该标记只会由 false 变为 true 一次，不会因为后续切换主题而反复触发脚本重建。
   */
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    if (resolvedTheme) setThemeReady(true);
  }, [resolvedTheme]);

  // 创建 Giscus 脚本：仅在「首次主题就绪」或「更换了文章 / 用途」时执行
  useEffect(() => {
    const container = ref.current;
    if (!container || !themeReady) return;

    const theme: GiscusTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
    latestThemeRef.current = theme;

    // 同一个讨论区再次进入（说明只是主题在变）时直接返回，
    // 主题同步交给下方独立的 effect 处理，避免 iframe 被重建
    const discussionKey = `${type}:${id}`;
    if (scriptRef.current && scriptKeyRef.current === discussionKey) return;

    // 清理上一次的脚本（仅清理本实例添加的）
    if (scriptRef.current?.parentNode) {
      scriptRef.current.parentNode.removeChild(scriptRef.current);
    }
    container.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://giscus.app/client.js';

    // ↓↓↓ 数据来源配置：共同决定「读取哪一个讨论区」，
    //     直接关系到已有评论能否正常显示，任何情况下都禁止改动 ↓↓↓
    script.setAttribute('data-repo', 'XinChengP/OxygenBlogPlatform');
    script.setAttribute('data-repo-id', 'R_kgDOQQbz2g');
    script.setAttribute('data-category', 'General');
    script.setAttribute('data-category-id', 'DIC_kwDOQQbz2s4CxkZ6');
    script.setAttribute('data-id', id);

    // 讨论区标题的匹配规则：留言板用固定词条，文章按路径匹配，同属数据来源配置
    if (type === 'guestbook') {
      script.setAttribute('data-term', 'guestbook');
      script.setAttribute('data-mapping', 'specific');
    } else {
      script.setAttribute('data-mapping', 'pathname');
    }
    // ↑↑↑ 数据来源配置结束 ↑↑↑

    script.setAttribute('data-strict', '0');
    script.setAttribute('data-reactions-enabled', '1');
    script.setAttribute('data-emit-metadata', '0');
    script.setAttribute('data-input-position', 'top');
    // 跟随站点主题而非操作系统：
    // 读者手动把站点切成暗色时，评论区必须同时变暗，
    // 否则会出现「暗色页面配一块白色评论区」的割裂观感
    script.setAttribute('data-theme', theme);
    script.setAttribute('data-lang', 'zh-CN');
    script.setAttribute('crossorigin', 'anonymous');
    script.setAttribute('async', 'true');

    container.appendChild(script);
    scriptRef.current = script;
    scriptKeyRef.current = discussionKey;

    /**
     * iframe 由 client.js 异步插入，插入时机不确定，
     * 因此用观察器捕获插入动作，并在其加载完成后补发一次当前主题，
     * 覆盖「脚本还在加载时读者就切换了主题」这个短窗口。
     */
    const observer = new MutationObserver(() => {
      const iframe = container.querySelector<HTMLIFrameElement>('iframe.giscus-frame');
      // 只绑定一次，避免观察器每次触发都重复挂载监听
      if (!iframe || iframe.dataset.themeSynced === 'true') return;

      iframe.dataset.themeSynced = 'true';
      iframe.addEventListener('load', () => {
        syncIframeTheme(container, latestThemeRef.current);
      });
    });
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (scriptRef.current?.parentNode) {
        scriptRef.current.parentNode.removeChild(scriptRef.current);
      }
      scriptRef.current = null;
      scriptKeyRef.current = null;
    };
    // resolvedTheme 有意不列入依赖：主题切换由下方 effect 通过 postMessage 完成。
    // 若列入依赖，每次切换主题都会重建 iframe，导致评论区闪烁并重新拉取数据。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type, themeReady]);

  // 主题变化时同步给 iframe：只发消息、不重建脚本，因此不影响已加载的评论
  useEffect(() => {
    if (!resolvedTheme) return;

    const theme: GiscusTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
    latestThemeRef.current = theme;
    syncIframeTheme(ref.current, theme);
  }, [resolvedTheme]);

  return (
    <div className="w-full">
      <div ref={ref} className="w-full" />
    </div>
  );
}
