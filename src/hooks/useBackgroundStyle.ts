import { useMemo } from 'react';
import { enableBackground, backgroundImage } from '../setting/WebSetting';

type PageType = 'home' | 'blogs' | 'about' | 'blog-detail' | 'archive' | 'guestbook' | 'tools' | 'gallery' | 'friends' | 'links';

interface StyleConfig {
  className: string;
  style?: React.CSSProperties;
}

/**
 * 背景样式 Hook
 * 处理不同页面类型的背景样式
 */
export function useBackgroundStyle(_pageType: PageType) {
  /*
    背景开关是构建期常量，SSR 与客户端渲染结果天然一致，
    不需要再用 isClient 状态翻转：
    旧实现首帧（挂载前）输出不透明的 bg-background、挂载后才变透明，
    直达或刷新页面时会先闪一瞬白底再透出背景图。
    现在首帧即输出最终 className，与服务端 HTML 一致，无水合差异。
  */
  const isBackgroundEnabled = enableBackground && !!backgroundImage;

  const containerStyle = useMemo((): StyleConfig => ({
    className: isBackgroundEnabled
      ? 'min-h-screen py-8 pt-20'
      : 'min-h-screen bg-background py-8 pt-20',
  }), [isBackgroundEnabled]);

  const sectionStyle = useMemo((): StyleConfig => ({
    className: 'relative z-10',
  }), []);

  const navigationStyle = useMemo((): StyleConfig => ({
    className: 'fixed top-0 left-0 right-0 z-50 glass-card border-b',
  }), []);

  return {
    containerStyle,
    sectionStyle,
    navigationStyle,
    isBackgroundEnabled,
  };
}
