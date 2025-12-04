/**
 * 浏览器兼容性警告组件
 * 当浏览器不支持 Live2D 时显示友好提示
 */

'use client';

import { useState, useEffect } from 'react';
import { live2DBrowserCompatibility, type BrowserCompatibility } from '../utils/browserCompatibility';
import { cn } from '../utils/cn';

interface BrowserCompatibilityWarningProps {
  className?: string;
  onDismiss?: () => void;
}

export default function BrowserCompatibilityWarning({ 
  className, 
  onDismiss 
}: BrowserCompatibilityWarningProps) {
  const [compatibility, setCompatibility] = useState<BrowserCompatibility | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const detector = live2DBrowserCompatibility;
    const result = detector.detectCompatibility();
    setCompatibility(result);
    
    // 如果不支持或有兼容性问题，显示警告
    if (!result.isSupported || result.issues.length > 0) {
      setIsVisible(true);
    }
  }, []);
  
  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };
  
  if (!isVisible || !compatibility) {
    return null;
  }
  
  const { browser, version, issues, recommendations } = compatibility;
  
  return (
    <div className={cn(
      "fixed top-4 left-1/2 transform -translate-x-1/2 z-50",
      "bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg",
      "dark:bg-yellow-900/20 dark:border-yellow-800",
      "p-4 max-w-md mx-4",
      "animate-in fade-in slide-in-from-top-2 duration-300",
      className
    )}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            浏览器兼容性提示
          </h3>
          
          <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
            <p className="mb-2">
              检测到您正在使用 <strong>{browser} {version}</strong>
            </p>
            
            {issues.length > 0 && (
              <div className="mb-2">
                <p className="font-medium mb-1">检测到的问题：</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {recommendations.length > 0 && (
              <div>
                <p className="font-medium mb-1">建议：</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-200 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}