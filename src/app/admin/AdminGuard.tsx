'use client';

/**
 * Admin 守卫组件
 * 检查是否在静态导出模式，如果是则显示提示信息
 */

import React, { useEffect, useState } from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

interface AdminGuardProps {
  children: React.ReactNode;
}

/**
 * 检测是否在静态导出模式
 * 
 * 检测逻辑：
 * 1. 首先检查环境变量 NEXT_PUBLIC_IS_STATIC_EXPORT
 * 2. 如果没有设置，则根据当前运行环境判断
 *    - 如果是本地开发环境（localhost/127.0.0.1），默认不是静态导出
 *    - 如果是生产环境域名，可能是静态导出
 * 3. 检查是否存在 Server Actions 支持（静态导出不支持 Server Actions）
 */
function checkIsStaticExport(): boolean {
  // 优先检查环境变量
  const envStaticExport = process.env.NEXT_PUBLIC_IS_STATIC_EXPORT;
  if (envStaticExport === 'true') {
    return true;
  }
  if (envStaticExport === 'false') {
    return false;
  }

  // 如果没有设置环境变量，根据当前环境判断
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const port = window.location.port;

    // 本地开发环境（包括默认3000端口和其他常见开发端口）
    const isLocalhost = hostname === 'localhost' || 
                        hostname === '127.0.0.1' || 
                        hostname === '::1' ||
                        hostname.endsWith('.localhost');
    
    const isDevPort = ['3000', '3001', '3002', '3003', '8080', '5173', '4173'].includes(port);

    // 如果是本地开发环境，认为不是静态导出
    if (isLocalhost || isDevPort) {
      return false;
    }

    // GitHub Pages 域名特征
    const isGitHubPages = hostname.endsWith('.github.io') || 
                          hostname.includes('github.io');
    
    if (isGitHubPages) {
      return true;
    }
  }

  // 默认情况下，如果没有明确标记为静态导出，且是开发环境，则允许访问
  return false;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [isStaticExport, setIsStaticExport] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // 检查是否在静态导出模式
    const staticExport = checkIsStaticExport();
    setIsStaticExport(staticExport);
  }, []);

  // 服务端渲染时显示加载状态
  if (!isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66ccff]" />
      </div>
    );
  }

  // 静态导出模式显示提示
  if (isStaticExport) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            管理后台不可用
          </h1>
          
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            当前部署在 GitHub Pages 静态托管上，管理后台功能需要服务端支持。
            请在本地开发环境使用管理后台功能。
          </p>
          
          <div className="space-y-3">
            <a
              href="https://github.com/XinChengP/OxygenBlogPlatform"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center w-full px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#55bbee] transition-colors"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              查看项目源码
            </a>
            
            <a
              href="/"
              className="inline-flex items-center justify-center w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              返回首页
            </a>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-500">
              提示：在本地运行 <code className="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded">npm run dev</code> 即可使用完整的管理功能
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 正常渲染子组件
  return <>{children}</>;
}
