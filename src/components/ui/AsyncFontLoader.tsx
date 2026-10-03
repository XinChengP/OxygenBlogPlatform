'use client';

import { useEffect } from 'react';

/**
 * 手写字体（Ma Shan Zheng）异步加载器
 *
 * 此前的方案是在 head 里渲染 media="print" 的 <link> 并用内联脚本切回 "all"，
 * 但脚本在 HTML 解析期就改掉了 DOM 属性，React 水合时发现与 JSX 不符，
 * 触发 hydration mismatch 警告（且后续重渲染有被重置回 "print" 的风险）。
 *
 * 现改为水合完成后动态创建 <link> 插入 head：React 不渲染该节点，
 * 无水合比对问题；字体加载发生在首帧之后，天然不阻塞渲染，
 * 手写字体非首屏关键资源，配合 font-display=swap 无可感知影响。
 * preconnect 已在 layout 的 head 中声明，连接建立不落后。
 */
export default function AsyncFontLoader() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap';
    document.head.appendChild(link);
  }, []);

  return null;
}
