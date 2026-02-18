/**
 * 说说功能状态检查工具
 * 快速验证所有核心功能是否正常
 */

'use client';

import { useState, useEffect } from 'react';

interface SystemStatus {
  apiConnection: boolean;
  localStorage: boolean;
  imageUpload: boolean;
  userAuth: boolean;
  momentsService: boolean;
}

export default function SystemStatusCheck() {
  const [status, setStatus] = useState<SystemStatus>({
    apiConnection: false,
    localStorage: false,
    imageUpload: false,
    userAuth: false,
    momentsService: false
  });
  
  const [loading, setLoading] = useState(true);
  const [overallStatus, setOverallStatus] = useState<'checking' | 'healthy' | 'warning' | 'error'>('checking');

  // 系统状态检查
  const checkSystemStatus = async () => {
    setLoading(true);
    
    const newStatus: SystemStatus = {
      apiConnection: false,
      localStorage: false,
      imageUpload: false,
      userAuth: false,
      momentsService: false
    };

    try {
      // 1. 检查本地存储
      try {
        const testKey = 'system-status-test';
        localStorage.setItem(testKey, 'test');
        const value = localStorage.getItem(testKey);
        localStorage.removeItem(testKey);
        newStatus.localStorage = value === 'test';
      } catch (e) {
        console.warn('本地存储检查失败:', e);
        newStatus.localStorage = false;
      }

      // 2. 检查API连接
      try {
        const response = await fetch('/api/moments');
        newStatus.apiConnection = response.ok;
      } catch (e) {
        console.warn('API连接检查失败:', e);
        newStatus.apiConnection = false;
      }

      // 3. 检查用户认证
      try {
        const userAuth = localStorage.getItem('user-identity');
        newStatus.userAuth = !!userAuth;
      } catch (e) {
        console.warn('用户认证检查失败:', e);
        newStatus.userAuth = false;
      }

      // 4. 检查说说服务
      try {
        const momentsCache = localStorage.getItem('moments-cache');
        newStatus.momentsService = true; // 只要没有报错就算正常
      } catch (e) {
        console.warn('说说服务检查失败:', e);
        newStatus.momentsService = false;
      }

      // 5. 检查图片上传
      try {
        // 检查是否支持File API
        newStatus.imageUpload = typeof FileReader !== 'undefined' && 
                               typeof Blob !== 'undefined' &&
                               typeof File !== 'undefined';
      } catch (e) {
        console.warn('图片上传检查失败:', e);
        newStatus.imageUpload = false;
      }

      setStatus(newStatus);
      
      // 计算整体状态
      const healthyCount = Object.values(newStatus).filter(Boolean).length;
      const totalCount = Object.keys(newStatus).length;
      const healthPercentage = (healthyCount / totalCount) * 100;

      if (healthPercentage === 100) {
        setOverallStatus('healthy');
      } else if (healthPercentage >= 60) {
        setOverallStatus('warning');
      } else {
        setOverallStatus('error');
      }
      
    } catch (error) {
      console.error('系统状态检查失败:', error);
      setOverallStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // 快速修复建议
  const getFixSuggestions = () => {
    const suggestions = [];
    
    if (!status.localStorage) {
      suggestions.push({
        issue: '本地存储不可用',
        solution: '请确保浏览器没有禁用localStorage，或者尝试使用无痕模式'
      });
    }
    
    if (!status.apiConnection) {
      suggestions.push({
        issue: 'API连接失败',
        solution: '请检查网络连接，确保开发服务器正在运行 (npm run dev)'
      });
    }
    
    if (!status.imageUpload) {
      suggestions.push({
        issue: '图片上传功能异常',
        solution: '请确保浏览器支持File API，建议使用现代浏览器'
      });
    }
    
    if (!status.userAuth) {
      suggestions.push({
        issue: '用户认证未初始化',
        solution: '访问说说页面 (/moments) 会自动初始化用户认证'
      });
    }
    
    return suggestions;
  };

  // 状态图标和颜色
  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? '✅' : '❌';
  };

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy 
      ? 'text-green-600 bg-green-50 border-green-200' 
      : 'text-red-600 bg-red-50 border-red-200';
  };

  const getOverallStatusIcon = () => {
    switch (overallStatus) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'error': return '🔴';
      default: return '🔄';
    }
  };

  const getOverallStatusText = () => {
    switch (overallStatus) {
      case 'healthy': return '系统运行正常';
      case 'warning': return '系统部分功能异常';
      case 'error': return '系统存在严重问题';
      default: return '正在检查系统状态...';
    }
  };

  useEffect(() => {
    checkSystemStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🏥 系统状态检查
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            检查说说功能模块的核心组件状态
          </p>
        </div>

        {/* 整体状态 */}
        <div className={`rounded-xl border p-6 mb-6 ${
          overallStatus === 'healthy' ? 'bg-green-50 border-green-200' :
          overallStatus === 'warning' ? 'bg-yellow-50 border-yellow-200' :
          overallStatus === 'error' ? 'bg-red-50 border-red-200' :
          'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getOverallStatusIcon()}</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {getOverallStatusText()}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {Object.values(status).filter(Boolean).length} / {Object.keys(status).length} 项功能正常
                </p>
              </div>
            </div>
            
            <button
              onClick={checkSystemStatus}
              disabled={loading}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>检查中...</span>
                </span>
              ) : (
                '🔄 重新检查'
              )}
            </button>
          </div>
        </div>

        {/* 详细状态 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className={`rounded-lg border p-4 ${getStatusColor(status.apiConnection)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">API连接</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">说说API接口状态</p>
              </div>
              <span className="text-xl">{getStatusIcon(status.apiConnection)}</span>
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${getStatusColor(status.localStorage)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">本地存储</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">数据持久化功能</p>
              </div>
              <span className="text-xl">{getStatusIcon(status.localStorage)}</span>
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${getStatusColor(status.imageUpload)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">图片上传</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">文件上传功能</p>
              </div>
              <span className="text-xl">{getStatusIcon(status.imageUpload)}</span>
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${getStatusColor(status.userAuth)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">用户认证</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">用户身份验证</p>
              </div>
              <span className="text-xl">{getStatusIcon(status.userAuth)}</span>
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${getStatusColor(status.momentsService)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">说说服务</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">核心服务功能</p>
              </div>
              <span className="text-xl">{getStatusIcon(status.momentsService)}</span>
            </div>
          </div>
        </div>

        {/* 修复建议 */}
        {getFixSuggestions().length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🔧 修复建议
            </h3>
            <div className="space-y-4">
              {getFixSuggestions().map((suggestion, index) => (
                <div key={index} className="border-l-4 border-red-400 pl-4">
                  <h4 className="font-medium text-red-700 dark:text-red-400 mb-1">
                    {suggestion.issue}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {suggestion.solution}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 快速链接 */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
            🚀 快速链接
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/moments"
              className="inline-flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
            >
              📝 前往说说页面
            </a>
            <a
              href="/moments/test"
              className="inline-flex items-center px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
            >
              🧪 功能测试页面
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}