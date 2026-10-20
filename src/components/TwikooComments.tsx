'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import { getAssetPath } from '@/utils/assetUtils';
import {
  TWIKOO_ENV_ID,
  TWIKOO_SCRIPT_PATH,
  isTwikooConfigured,
  getCommentPath,
  type CommentType,
} from '@/setting/CommentSetting';
import './twikoo-theme.css';

/**
 * Twikoo 前端脚本暴露的全局对象
 *
 * 只声明本项目用到的部分，避免用 any 让类型检查失效。
 */
declare global {
  interface Window {
    twikoo?: {
      /** 初始化评论区；返回 Promise，失败时 reject */
      init: (options: {
        envId: string;
        el: string | HTMLElement;
        path?: string;
        lang?: string;
      }) => Promise<unknown>;
      version?: string;
    };
  }
}

/**
 * 脚本加载状态：模块级单例
 *
 * 评论区在文章页与留言板页都会出现，若每个组件实例各插一份 <script>，
 * 同一个页面上会重复下载并重复执行同一份脚本。
 * 用模块级 Promise 保证整站只加载一次；失败时清空以便下次重试。
 */
let twikooScriptPromise: Promise<void> | null = null;

/**
 * 按需加载 Twikoo 前端脚本
 *
 * 不用 <Script> 组件而是手工插入，原因有二：
 * 1. 脚本体积约 470KB，只有真正渲染到评论区时才需要，不该进首屏关键路径；
 * 2. Twikoo 通过 window.twikoo 暴露 API，需要在调用前确认脚本已执行完毕，
 *    手工控制 onload 时机比猜测 Next.js 的加载策略更可靠。
 */
function loadTwikooScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  // 脚本可能已由上次挂载加载完成
  if (window.twikoo) return Promise.resolve();
  if (twikooScriptPromise) return twikooScriptPromise;

  twikooScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = getAssetPath(TWIKOO_SCRIPT_PATH);
    script.async = true;
    // 打标记便于排查：确认页面上到底插了几份脚本
    script.dataset.twikooScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => {
      // 允许下次挂载重试，否则一次网络抖动会让评论区整场会话都失效
      twikooScriptPromise = null;
      reject(new Error(`Twikoo 前端脚本加载失败：${script.src}`));
    };
    document.head.appendChild(script);
  });

  return twikooScriptPromise;
}

interface TwikooCommentsProps {
  /** 文章 slug；留言板不使用 */
  id?: string;
  /** 评论区用途，决定评论路径的取值规则 */
  type?: CommentType;
}

/**
 * Twikoo 评论区
 *
 * 【与 giscus 版本的关键差异】
 * giscus 把评论渲染在自己的 iframe 里，所以需要 postMessage 热切换主题、
 * 并借助自定义样式表让 iframe 内部跟随站点配色。
 * Twikoo 直接渲染在当前页面 DOM 中，配色由本站 CSS 令牌自然继承，
 * 因此那套跨域主题同步逻辑整体删除，改由 twikoo-theme.css 做样式覆盖。
 */
export default function TwikooComments({ id, type = 'blog' }: TwikooCommentsProps) {
  /**
   * 外层容器由 React 持有，内层节点由本组件手工创建后交给 Twikoo。
   *
   * 为什么需要两层：Twikoo 是 Vue 2 应用，其 $mount(el) 的语义是**替换**挂载节点
   * （见 twikoo.min.js 中的 `u.$mount(n.el || "#twikoo")`）。
   * 若直接把 React 的 ref 节点交给它，该节点会被 Twikoo 从 DOM 中替换掉，
   * React 后续对这个节点的更新与卸载都会作用在一个已经脱离文档的节点上。
   * 让 Twikoo 只替换内层节点，外层容器始终留在文档中，问题就不存在了。
   */
  const wrapperRef = useRef<HTMLDivElement>(null);
  /**
   * 观察用的外层容器。
   *
   * 评论区在文章/留言板底部，脚本约 470KB，不能在挂载时就和正文抢带宽。
   * 用 IntersectionObserver 提前 400px 预加载；容器保留 min-height，
   * 避免从占位切到真实评论区时把页面下方内容顶开。
   */
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  // 站点实际生效的主题（next-themes 会把 system 解析为 light / dark）
  const { resolvedTheme } = useTheme();

  // 主题是否已解析完成。next-themes 要等挂载后才能读出主题，
  // 在此之前容器上的 data-theme 会是错的，会让 Twikoo 自带的表情弹窗用错配色。
  const [themeReady, setThemeReady] = useState(false);

  /** 脚本或初始化失败时的提示文案 */
  const [error, setError] = useState<string | null>(null);

  // 评论路径在客户端才能确定（文章页取 location.pathname）
  const [path, setPath] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 老浏览器没有 IntersectionObserver：直接加载，避免评论区永远空白
    if (typeof IntersectionObserver === 'undefined') {
      setShouldLoad(true);
      return;
    }

    const target = containerRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px 0px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setPath(getCommentPath(type, id));
  }, [type, id]);

  useEffect(() => {
    if (resolvedTheme) setThemeReady(true);
  }, [resolvedTheme]);

  // 创建并初始化评论区：进入预加载范围、路径变化或主题就绪后执行
  useEffect(() => {
    if (!shouldLoad) return;

    const wrapper = wrapperRef.current;
    if (!wrapper || !themeReady || !path) return;
    if (!isTwikooConfigured) return;

    let cancelled = false;

    // 每次初始化前清空外层容器，丢弃上一次的内层节点
    // （切换文章时必须重建，否则会残留上一篇文章的评论 DOM）
    wrapper.innerHTML = '';
    const inner = document.createElement('div');
    wrapper.appendChild(inner);

    const init = () => {
      // 组件已卸载或路径已变化，放弃这次初始化
      if (cancelled) return;
      if (!window.twikoo) {
        setError('Twikoo 脚本未能加载，评论区暂不可用。');
        return;
      }
      setError(null);
      // init 返回的 Promise 在缺少 envId 等配置问题时会 reject，
      // 不接住会变成未处理的 Promise 拒绝，只在控制台留一行难以定位的报错。
      window.twikoo
        .init({
          envId: TWIKOO_ENV_ID,
          el: inner,
          path,
          // Twikoo 内部会把 lang 转成小写再查表，zh-cn 是它的默认回退语言，
          // 这里显式传入是为了不依赖浏览器语言设置（本站内容全为中文）。
          lang: 'zh-CN',
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof Error ? err.message : '评论区初始化失败。');
        });
    };

    loadTwikooScript().then(init).catch((err: unknown) => {
      if (cancelled) return;
      setError(err instanceof Error ? err.message : 'Twikoo 脚本加载失败。');
    });

    return () => {
      cancelled = true;
    };
  }, [path, themeReady, shouldLoad]);

  // 未配置后端时不渲染空白，而是给出明确原因，便于区分「没配」与「配错」
  if (!isTwikooConfigured) {
    return (
      <div className="w-full rounded-xl border border-dashed border-border/60 bg-muted/30 p-6 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">评论区尚未配置</p>
        <p className="mt-1.5 leading-relaxed">
          需要在环境变量中设置 <code className="rounded bg-muted px-1.5 py-0.5">NEXT_PUBLIC_TWIKOO_ENV_ID</code>
          为 Twikoo 后端地址，然后重新构建。部署步骤见
          <code className="mx-1 rounded bg-muted px-1.5 py-0.5">cloudflare/twikoo/README.md</code>。
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full min-h-[240px]">
      {!shouldLoad && (
        <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-border/50 bg-muted/20 text-sm text-muted-foreground">
          评论加载中…
        </div>
      )}

      {/*
        data-theme 供 Twikoo 自带样式使用：
        它的 CSS 里有一组以 [data-theme="dark"] 为祖先选择器的规则（覆盖表情弹窗配色），
        挂上该属性即可让这部分跟随站点主题，而不是跟随操作系统。
        评论区主体的配色由 twikoo-theme.css 按 .dark 作用域覆盖。
      */}
      {shouldLoad && (
        <div ref={wrapperRef} className="w-full" data-theme={resolvedTheme === 'dark' ? 'dark' : 'light'} />
      )}

      {error && (
        <p className="mt-3 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
