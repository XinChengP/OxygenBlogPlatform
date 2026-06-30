'use client';

import { useRef, useState } from 'react';

interface BilibiliIframeProps {
  src: string;
  className?: string;
  allowFullScreen?: boolean;
}

/**
 * B站视频嵌入组件
 * 使用 sandbox 限制 iframe 权限，避免全局污染
 */
export default function BilibiliIframe({
  src,
  className = '',
  allowFullScreen = true,
}: BilibiliIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div className={`my-8 rounded-xl overflow-hidden shadow-lg bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="w-full h-64 md:h-96 flex items-center justify-center text-center p-8">
          <div className="space-y-4">
            <div className="text-4xl">📺</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">视频加载失败</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">B站视频暂时无法加载，请刷新页面重试</p>
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm"
            >
              在B站打开
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`my-8 rounded-xl overflow-hidden shadow-lg relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 flex items-center justify-center z-10">
          <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            <span className="text-sm">视频加载中...</span>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        allowFullScreen={allowFullScreen}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
        className="w-full h-64 md:h-96 border-0"
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        title="B站视频"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
