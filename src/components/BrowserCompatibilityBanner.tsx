/**
 * 浏览器兼容性横幅组件
 * 在页面顶部显示浏览器兼容性状态
 */

'use client';

import { useState, useEffect } from 'react';
import { live2DBrowserCompatibility } from '../utils/browserCompatibility';
import { cn } from '@/lib/utils';

interface BrowserCompatibilityBannerProps {
  className?: string;
}

export default function BrowserCompatibilityBanner({ 
  className 
}: BrowserCompatibilityBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [browserInfo, setBrowserInfo] = useState<string>('');
  
  useEffect(() => {
    const detector = live2DBrowserCompatibility;
    const compatibility = detector.detectCompatibility();
    
    if (!compatibility.isSupported || compatibility.issues.length > 0) {
      setIsVisible(true);
      setBrowserInfo(`${compatibility.browser} ${compatibility.version}`);
    }
  }, []);
  
  if (!isVisible) {
    return null;
  }
  
  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-400 to-orange-400",
      "dark:from-yellow-600 dark:to-orange-600",
      "text-white shadow-lg transform transition-transform duration-300",
      "animate-in slide-in-from-top",
      className
    )}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            
            <div className="text-sm font-medium">
              <span className="font-semibold">浏览器兼容性提示</span>
              <span className="mx-2">•</span>
              <span className="opacity-90">{browserInfo}</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <a
              href="/compatibility-test"
              className="text-xs font-medium px-3 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            >
              查看详情
            </a>
            
            <button
              onClick={() => setIsVisible(false)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}