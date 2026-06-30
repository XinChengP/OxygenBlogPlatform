import { useMemo, useEffect, useState } from 'react';
import { enableBackground, backgroundImage } from '../setting/WebSetting';

type PageType = 'home' | 'blogs' | 'about' | 'blog-detail' | 'archive' | 'guestbook' | 'tools' | 'gallery' | 'friends' | 'links';

interface StyleConfig {
  className: string;
  style?: React.CSSProperties;
}

/**
 * 背景样式 Hook
 * 处理不同页面类型的背景样式，避免水合错误
 */
export function useBackgroundStyle(_pageType: PageType) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isBackgroundEnabled = isClient && enableBackground && backgroundImage;

  const containerStyle = useMemo((): StyleConfig => ({
    className: isBackgroundEnabled
      ? 'min-h-screen py-8 pt-20'
      : 'min-h-screen bg-background py-8 pt-20',
  }), [isBackgroundEnabled]);

  const sectionStyle = useMemo((): StyleConfig => ({
    className: 'relative z-10',
  }), []);

  const navigationStyle = useMemo((): StyleConfig => ({
    className: 'fixed top-0 left-0 right-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50',
  }), []);

  return {
    containerStyle,
    sectionStyle,
    navigationStyle,
    isBackgroundEnabled,
  };
}
