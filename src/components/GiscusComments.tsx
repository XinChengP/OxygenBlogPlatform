'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { getAssetPath } from '@/utils/assetUtils';

/**
 * Giscus 主题取值
 *
 * 这里保存的是「站点主题」这个语义，而不是直接传给 Giscus 的值。
 * 实际传给 Giscus 的会是下方 resolveGiscusTheme() 算出的自定义主题样式表地址。
 */
type GiscusTheme = 'light' | 'dark';

/**
 * 站点主题 → 自定义主题样式表
 *
 * Giscus 官方支持把 data-theme 直接写成一个 CSS 文件的地址，
 * 它会据此在自身 iframe 的 <head> 末尾插入：
 *   <link id="giscus-theme" rel="stylesheet" crossorigin="anonymous" href="...">
 * 样式表内的变量作用在 iframe 内部，不会影响博客其他区域。
 * 官方说明：https://github.com/giscus/giscus/blob/main/ADVANCED-USAGE.md
 *
 * 因此本字段只负责「读哪一份样式」，不参与任何讨论区匹配，改动它不会影响已有评论。
 */
const GISCUS_THEME_FILES: Record<GiscusTheme, string> = {
  light: '/giscus-theme/giscus-light.css',
  dark: '/giscus-theme/giscus-dark.css',
};

/**
 * 把站点主题解析为 Giscus 认识的取值
 *
 * 必须返回完整绝对地址：目标样式表是由 giscus.app 域下的 iframe 去加载的，
 * 若只给相对路径，浏览器会把它拼到 giscus.app 上，必然 404。
 * 因此这里拼上当前站点源，并用 getAssetPath 补上 GitHub Pages 所需的仓库名前缀，
 * 保证部署到子路径时依然能找到文件。
 *
 * 服务端渲染阶段拿不到 window，此时退回内置主题名，避免报错。
 */
function resolveGiscusTheme(theme: GiscusTheme): string {
  if (typeof window === 'undefined') return theme;
  return `${window.location.origin}${getAssetPath(GISCUS_THEME_FILES[theme])}`;
}

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
 * @param theme - 目标主题，此处需传入已解析好的自定义样式表地址
 */
function syncIframeTheme(container: HTMLElement | null, theme: string) {
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
  // 当前主题与最新主题都用 ref 保存：
  // 创建脚本的 effect 因此无需依赖主题值，主题切换就不会重建 iframe
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

  /**
   * 主题同步：把 next-themes 的值写入 ref，并推送给已存在的 iframe
   *
   * 这段逻辑同时承担两件事，因此合并为一个 effect：
   * 1. 首次解析出主题时放行脚本创建（setThemeReady 传相同值时 React 会跳过重渲染，不会造成多余渲染）；
   * 2. 之后每次切换主题时只发消息给 iframe，不触碰脚本。
   *
   * 用「只发消息」而非「重建脚本」的方式切换主题：
   * 重建会让 iframe 整体重新加载，评论区会闪白、滚动位置丢失，
   * 而 setConfig 只调整外观、不携带任何讨论区匹配信息，因此不会影响已有评论。
   */
  useEffect(() => {
    if (!resolvedTheme) return;

    const theme: GiscusTheme = resolvedTheme === 'dark' ? 'dark' : 'light';
    latestThemeRef.current = theme;
    setThemeReady(true);
    // 传给 iframe 的必须是解析后的样式表地址，此处才在浏览器环境中取值
    syncIframeTheme(ref.current, resolveGiscusTheme(theme));
  }, [resolvedTheme]);

  // 创建 Giscus 脚本：仅在「首次主题就绪」或「更换了文章 / 用途」时执行
  useEffect(() => {
    const container = ref.current;
    if (!container || !themeReady) return;

    // 同一个讨论区再次进入时直接返回，交由上方 effect 通过 postMessage 同步主题
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
    // 否则会出现「暗色页面配一块白色评论区」的割裂观感。
    // 此处传入的是自定义主题样式表地址，而非内置的 'light' / 'dark'。
    script.setAttribute('data-theme', resolveGiscusTheme(latestThemeRef.current));
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
        // 同样是样式表地址，与另外两处调用保持一致
        syncIframeTheme(container, resolveGiscusTheme(latestThemeRef.current));
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
    // 依赖中不含主题值：主题变化由上方 effect 通过 postMessage 处理，
    // 若把主题列入依赖，每次切换主题都会重建 iframe，导致评论区闪烁并重新拉取数据。
  }, [id, type, themeReady]);

  return (
    <div className="w-full">
      <div ref={ref} className="w-full" />
    </div>
  );
}
