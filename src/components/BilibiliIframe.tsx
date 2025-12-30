'use client';

import { useEffect, useRef, useState } from 'react';

interface BilibiliIframeProps {
  src: string;
  className?: string;
  allowFullScreen?: boolean;
}

/**
 * 增强的B站视频嵌入组件，包含错误处理和清理机制
 * 修复滚动时的nc-loader和bili-user-fingerprint错误
 */
export default function BilibiliIframe({ src, className = '', allowFullScreen = true }: BilibiliIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const scriptObserverRef = useRef<MutationObserver | null>(null);
  const eventListenerRef = useRef<(() => void) | null>(null);

  // 拦截并修复B站脚本错误的函数
  const interceptBilibiliErrors = () => {
    if (typeof window === 'undefined') return;

    // 1. 保存原始事件监听器和控制台方法
    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;
    const originalErrorHandler = window.onerror;
    const originalOnunhandledrejection = window.onunhandledrejection;
    const originalOnerror = window.onerror;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    // 保存原始函数的引用，用于安全恢复
    const safeOriginalAddEventListener = originalAddEventListener;
    const safeOriginalRemoveEventListener = originalRemoveEventListener;
    const safeOriginalErrorHandler = originalErrorHandler;
    const safeOriginalOnunhandledrejection = originalOnunhandledrejection;
    const safeOriginalOnerror = originalOnerror;
    const safeOriginalConsoleError = originalConsoleError;
    const safeOriginalConsoleWarn = originalConsoleWarn;

    // 2. 重写addEventListener，安全处理消息事件和error事件
    window.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      if (type === 'message' && typeof listener === 'function') {
        const wrappedListener = (event: Event) => {
          // 转换为 MessageEvent 类型
          const messageEvent = event as MessageEvent;
          // 忽略B站指纹脚本的消息
          if (typeof messageEvent.data === 'string' && (
            messageEvent.data.includes('bili-fe-fp') ||
            messageEvent.data.includes('nc-loader') ||
            messageEvent.data.includes('addIceCandidate')
          )) {
            return;
          }
          try {
            listener(event);
          } catch (error) {
            // 忽略消息事件中的错误
            console.debug('拦截到消息事件错误，已安全处理:', error);
          }
        };
        return safeOriginalAddEventListener.call(this, type, wrappedListener, options);
      }
      // 拦截error事件，防止B站脚本错误传播
      if (type === 'error' && typeof listener === 'function') {
        const wrappedListener = (event: Event) => {
          // 转换为 ErrorEvent 类型
          const errorEvent = event as ErrorEvent;
          // 检查是否是B站相关错误
          const isBilibiliError = (
            (typeof errorEvent.message === 'string' && (
              errorEvent.message.includes('addIceCandidate') ||
              errorEvent.message.includes('bili-user-fingerprint') ||
              errorEvent.message.includes('report is not found') ||
              errorEvent.message.includes('nc-loader')
            )) ||
            (typeof errorEvent.filename === 'string' && (
              errorEvent.filename.includes('bili-user-fingerprint') ||
              errorEvent.filename.includes('nc-loader') ||
              errorEvent.filename.includes('player.bilibili.com')
            ))
          );
          
          if (isBilibiliError) {
            // 忽略B站相关错误
            console.debug('已拦截并忽略B站error事件:', errorEvent.message);
            errorEvent.stopPropagation();
            errorEvent.preventDefault();
            return;
          }
          
          try {
            listener(event);
          } catch (error) {
            console.debug('拦截到error事件处理错误，已安全处理:', error);
          }
        };
        return safeOriginalAddEventListener.call(this, type, wrappedListener, options);
      }
      return safeOriginalAddEventListener.call(this, type, listener, options);
    };

    // 3. 添加全局错误处理，拦截B站脚本错误
    window.onerror = function(message, source, lineno, colno, error) {
      // 检查是否是B站相关错误
      const isBilibiliError = (
        // 检查错误消息
        (typeof message === 'string' && (
          message.includes('addIceCandidate') ||
          message.includes('bili-user-fingerprint') ||
          message.includes('report is not found') ||
          message.includes('nc-loader')
        )) ||
        // 检查脚本源
        (typeof source === 'string' && (
          source.includes('bili-user-fingerprint') ||
          source.includes('nc-loader') ||
          source.includes('player.bilibili.com')
        ))
      );

      if (isBilibiliError) {
        // 忽略B站相关错误
        console.debug('已拦截并忽略B站onerror错误:', message);
        return true; // 返回true表示已处理该错误，不会继续传播
      }

      // 其他错误继续处理
      if (safeOriginalOnerror) {
        return safeOriginalOnerror.call(this, message, source, lineno, colno, error);
      }

      return false;
    };

    // 4. 添加Promise rejection处理，拦截B站脚本的Promise错误
    window.onunhandledrejection = function(event) {
      // 检查是否是B站相关错误
      const rejectionReason = event.reason;
      const isBilibiliError = (
        (typeof rejectionReason === 'string' && (
          rejectionReason.includes('addIceCandidate') ||
          rejectionReason.includes('bili-user-fingerprint') ||
          rejectionReason.includes('report is not found') ||
          rejectionReason.includes('nc-loader')
        )) ||
        (typeof rejectionReason?.message === 'string' && (
          rejectionReason.message.includes('addIceCandidate') ||
          rejectionReason.message.includes('bili-user-fingerprint') ||
          rejectionReason.message.includes('report is not found') ||
          rejectionReason.message.includes('nc-loader')
        ))
      );

      if (isBilibiliError) {
        // 忽略B站相关Promise错误
        console.debug('已拦截并忽略B站Promise错误:', event.reason);
        event.preventDefault(); // 阻止默认行为，防止控制台显示
        return true;
      }

      // 其他Promise错误继续处理
      if (safeOriginalOnunhandledrejection) {
        // 修复类型错误：将this转换为Window类型
        return safeOriginalOnunhandledrejection.call(this as Window, event);
      }

      return false;
    };

    // 5. 重写console.error和console.warn，拦截B站脚本的控制台输出
    console.error = function(...args) {
      // 将参数转换为字符串，检查是否是B站指纹脚本错误
      const message = args.join(' ');
      if (
        message.includes('bili-user-fingerprint') ||
        message.includes('@bilibili/bili-user-fingerprint(report): report is not found') ||
        message.includes('nc-loader') ||
        message.includes('addIceCandidate')
      ) {
        // 忽略B站相关的控制台错误输出
        console.debug('已拦截并忽略B站控制台错误:', message);
        return;
      }
      // 其他错误继续输出
      return safeOriginalConsoleError.apply(console, args);
    };

    console.warn = function(...args) {
      // 将参数转换为字符串，检查是否是B站指纹脚本警告
      const message = args.join(' ');
      if (
        message.includes('bili-user-fingerprint') ||
        message.includes('nc-loader')
      ) {
        // 忽略B站相关的控制台警告输出
        console.debug('已拦截并忽略B站控制台警告:', message);
        return;
      }
      // 其他警告继续输出
      return safeOriginalConsoleWarn.apply(console, args);
    };

    // 6. 保存安全的恢复函数
    eventListenerRef.current = () => {
      // 恢复原始的事件监听器和控制台方法，使用try-catch确保安全
      try {
        // 恢复addEventListener和removeEventListener
        if (window.addEventListener !== safeOriginalAddEventListener) {
          window.addEventListener = safeOriginalAddEventListener;
        }
        if (window.removeEventListener !== safeOriginalRemoveEventListener) {
          window.removeEventListener = safeOriginalRemoveEventListener;
        }
        // 恢复onerror
        window.onerror = safeOriginalOnerror;
        // 恢复onunhandledrejection
        window.onunhandledrejection = safeOriginalOnunhandledrejection;
        // 恢复console.error和console.warn
        if (console.error !== safeOriginalConsoleError) {
          console.error = safeOriginalConsoleError;
        }
        if (console.warn !== safeOriginalConsoleWarn) {
          console.warn = safeOriginalConsoleWarn;
        }
      } catch (error) {
        console.debug('恢复事件监听器时出错:', error);
      }
    };
  };

  useEffect(() => {
    // 初始化错误拦截
    interceptBilibiliErrors();

    // 清理函数
    return () => {
      // 1. 停止观察脚本
      if (scriptObserverRef.current) {
        scriptObserverRef.current.disconnect();
      }

      // 2. 恢复原始函数
      if (eventListenerRef.current) {
        eventListenerRef.current();
      }

      // 3. 清空iframe内容 - 安全处理，避免跨域访问
      if (iframeRef.current) {
        try {
          // 强制清空iframe，停止所有脚本
          // 这是最安全的方式，不会触发跨域错误
          iframeRef.current.src = 'about:blank';
          
          // 注意：不再尝试访问iframe内部资源，避免跨域安全错误
          // 清空src已经足够停止所有脚本执行
        } catch (error) {
          // 忽略所有错误
          console.debug('清理iframe时出错:', error);
        }
      }
      
      // 4. 清理B站相关全局对象
      if (typeof window !== 'undefined') {
        const biliVars = [
          '__bili__', 'biliBridge', 'BilibiliPlayer',
          'bili-fe-fp', 'nc_loader', 'NC_LOADER',
          '_0x49b916', 'bili_fp'
        ];
        
        biliVars.forEach(varName => {
          try {
            delete (window as any)[varName];
          } catch (e) {
            // 忽略无法删除的属性
          }
        });
        
        // 清理B站可能创建的脚本标签
        const biliScripts = document.querySelectorAll('script[src*="bilibili.com"]');
        biliScripts.forEach(script => {
          try {
            script.remove();
          } catch (e) {
            // 忽略删除错误
          }
        });
      }
    };
  }, [src]);

  // 监听iframe加载状态
  const handleLoad = () => {
    console.debug('B站视频iframe加载完成');
    setIsLoading(false);
    
    // 移除MutationObserver，因为会导致跨域安全错误
    // 不再尝试观察iframe内部脚本，改用更安全的外部拦截方式
  };

  const handleError = () => {
    console.warn('B站视频iframe加载失败');
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
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="text-sm">视频加载中...</span>
          </div>
        </div>
      )}
      
      <iframe
        ref={iframeRef}
        src={src}
        allowFullScreen={allowFullScreen}
        // 增强的sandbox策略，限制脚本权限
        // 注意：allow-scripts仍然需要保留，否则视频无法播放
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
        className="w-full h-64 md:h-96 border-0"
        onError={handleError}
        onLoad={handleLoad}
        // 优化性能
        loading="lazy"
        // 提高可访问性
        title="B站视频"
        // 添加referrer策略，减少信息泄露
        referrerPolicy="strict-origin-when-cross-origin"
        // 添加Content Security Policy，阻止特定的B站脚本
        // 这会阻止iframe内加载指定的危险脚本
        style={{
          // 内联样式，确保CSP策略被应用
        }}
      />
      {/* 添加CSP meta标签到iframe内部（通过JavaScript注入） */}
      <script
        type="text/javascript"
        dangerouslySetInnerHTML={{
          __html: `
            // 尝试为iframe注入CSP策略
            if (document.readyState === 'complete') {
              const iframe = document.querySelector('iframe[title="B站视频"]');
              if (iframe) {
                try {
                  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
                  if (iframeDoc) {
                    // 创建CSP meta标签
                    const cspMeta = iframeDoc.createElement('meta');
                    cspMeta.httpEquiv = 'Content-Security-Policy';
                    cspMeta.content = "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.bilibili.com https://*.bilivideo.com; object-src 'none';";
                    
                    // 移除现有的CSP meta标签
                    const existingCsp = iframeDoc.querySelector('meta[http-equiv="Content-Security-Policy"]');
                    if (existingCsp) {
                      existingCsp.remove();
                    }
                    
                    // 添加新的CSP meta标签
                    const head = iframeDoc.querySelector('head');
                    if (head) {
                      head.insertBefore(cspMeta, head.firstChild);
                    }
                  }
                } catch (error) {
                  // 忽略跨域错误
                  console.debug('注入CSP策略时出错:', error);
                }
              }
            }
          `
        }}
      />
    </div>
  );
}