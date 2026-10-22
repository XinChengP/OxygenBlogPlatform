'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * 响应式图片（srcset）加载失败时的原图兜底
 *
 * 背景：
 * public/_responsive 体积较大，已被 .gitignore 忽略，由构建前的
 * scripts/generate-responsive-images.js 生成。该脚本会先整体删除产物目录再
 * 逐张生成，若过程中被中断（例如启动窗口被关闭），目录里只会留下半成品，
 * 而 src/data 下的尺寸清单仍是上一轮的，于是组件继续输出指向不存在文件的 srcset。
 *
 * 为什么必须兜底：
 * 浏览器对 srcset 的优先级高于 src，只要 srcset 里的候选被选中并返回 404，
 * 就会直接显示破图，不会自动退回 src 原图。所以即使原图完好，缺变体也会白图。
 *
 * 处理方式：
 * 首次触发 error 时丢弃 srcset/sizes，让 <img> 改用 src 原图；同时返回 imgKey，
 * 组件把它绑定到 <img> 上，失败后 key 变化会重建元素，确保浏览器真正重新发起请求。
 * 只回退一次：若原图本身也 404，继续重试会陷入无限循环。
 *
 * @param srcSet     构建期变体拼出的 srcset，可能是 undefined
 * @param sizes      与 srcset 配套的 sizes，仅在存在 srcset 时有意义
 * @param hasVariant 是否存在「来自构建期变体」的地址需要兜底。
 *                   固定档位模式（ManifestImage 的 fixedVariantWidth）不输出 srcset，
 *                   但 src 直接指向某个变体文件，同样会 404，因此需要单独告知本 hook。
 *                   默认按「有 srcset 就算有变体」判断。
 */
export function useResponsiveImageFallback(
  srcSet?: string,
  sizes?: string,
  hasVariant: boolean = Boolean(srcSet)
) {
  // 是否已经回退到原图
  const [failed, setFailed] = useState(false);
  // 需要绑定到 <img> 上的 ref，用于下面补检水合前就已失败的图片
  const imgRef = useRef<HTMLImageElement | null>(null);

  const onError = useCallback(() => {
    // 没有任何变体引用时，src 本身就是最终地址，无需兜底，也避免无意义的重渲染
    if (!hasVariant) return;
    setFailed((prev) => (prev ? prev : true));
  }, [hasVariant]);

  useEffect(() => {
    if (!hasVariant || failed) return;
    const img = imgRef.current;
    if (!img) return;
    /*
      服务端渲染的 <img> 在浏览器解析 HTML 时就开始请求，可能在水合完成前
      已经 404 并触发 error——那时 React 还没绑定 onError，事件会被错过。
      补检方式：complete 为 true 且 naturalWidth 为 0，表示「已加载结束但没拿到图像」。
    */
    if (img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, [hasVariant, failed, srcSet]);

  return {
    /** 是否已回退到原图，供调用方决定 src 用原图还是变体 */
    failed,
    /** 绑定到 <img ref>，用于水合后的失败补检 */
    imgRef,
    /** 绑定到 <img srcSet> 的最终值 */
    srcSet: failed ? undefined : srcSet,
    /** 绑定到 <img sizes> 的最终值 */
    sizes: failed ? undefined : sizes,
    /** 绑定到 <img key>，失败后变化以强制重建元素并重新请求原图 */
    imgKey: failed ? 'original' : 'responsive',
    /** 绑定到 <img onError> */
    onError,
  };
}
