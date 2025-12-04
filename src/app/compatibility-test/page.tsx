/**
 * 浏览器兼容性测试页面
 * 用于测试 Live2D 在不同浏览器中的兼容性
 */

'use client';

import { useState, useEffect } from 'react';
import { live2DBrowserCompatibility, type BrowserCompatibility } from '../../utils/browserCompatibility';
import { cn } from '../../lib/utils';

export default function CompatibilityTestPage() {
  const [compatibility, setCompatibility] = useState<BrowserCompatibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [testResults, setTestResults] = useState<string[]>([]);
  
  useEffect(() => {
    const runCompatibilityTest = async () => {
      setIsLoading(true);
      
      try {
        const detector = live2DBrowserCompatibility;
        const result = detector.detectCompatibility();
        setCompatibility(result);
        
        // 运行额外测试
        const results = await runAdditionalTests();
        setTestResults(results);
        
      } catch (error) {
        console.error('兼容性测试失败:', error);
        setTestResults(['测试过程中出现错误']);
      } finally {
        setIsLoading(false);
      }
    };
    
    runCompatibilityTest();
  }, []);
  
  /**
   * 运行额外测试
   */
  const runAdditionalTests = async (): Promise<string[]> => {
    const results: string[] = [];
    
    // WebGL 详细测试
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (gl && 'getExtension' in gl) {
        const webglGl = gl as WebGLRenderingContext;
        const info = webglGl.getExtension('WEBGL_debug_renderer_info');
        if (info) {
          const renderer = webglGl.getParameter(info.UNMASKED_RENDERER_WEBGL);
          const vendor = webglGl.getParameter(info.UNMASKED_VENDOR_WEBGL);
          results.push(`WebGL 渲染器: ${renderer}`);
          results.push(`WebGL 供应商: ${vendor}`);
        }
        
        // 检查 WebGL 扩展
        const extensions = [
          'OES_texture_float',
          'OES_texture_half_float',
          'WEBGL_depth_texture',
          'OES_element_index_uint'
        ];
        
        const supportedExtensions = extensions.filter(ext => 
          webglGl.getExtension(ext)
        );
        
        results.push(`支持的 WebGL 扩展: ${supportedExtensions.length}/${extensions.length}`);
        
        if (supportedExtensions.length > 0) {
          results.push(`具体扩展: ${supportedExtensions.join(', ')}`);
        }
      }
    } catch {
      results.push('WebGL 详细测试失败');
    }
    
    // LocalStorage 容量测试
    try {
      let storageSize = 0;
      const testKey = '__storage_test__';
      const testData = 'x'.repeat(1024); // 1KB 测试数据
      
      for (let i = 0; i < 100; i++) { // 最多测试 100KB
        try {
          localStorage.setItem(`${testKey}${i}`, testData);
          storageSize += 1;
        } catch {
          break;
        }
      }
      
      // 清理测试数据
      for (let i = 0; i < storageSize; i++) {
        localStorage.removeItem(`${testKey}${i}`);
      }
      
      results.push(`LocalStorage 容量: ${storageSize}KB`);
    } catch {
      results.push('LocalStorage 容量测试失败');
    }
    
    // 性能测试
    try {
      if (typeof window !== 'undefined' && window.performance) {
        const start = performance.now();
        
        // 执行一些计算
        for (let i = 0; i < 1000000; i++) {
          Math.sqrt(i);
        }
        
        const end = performance.now();
        const duration = end - start;
        
        results.push(`性能测试耗时: ${duration.toFixed(2)}ms`);
        
        if (duration > 100) {
          results.push('性能警告: 计算性能较低');
        }
      }
    } catch {
      results.push('性能测试失败');
    }
    
    return results;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 dark:border-blue-800 border-t-blue-500 dark:border-t-blue-400 rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">正在检测浏览器兼容性...</h2>
          <p className="text-gray-600 dark:text-gray-400">请稍等片刻</p>
        </div>
      </div>
    );
  }
  
  if (!compatibility) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">检测失败</h2>
          <p className="text-gray-600 dark:text-gray-400">无法获取浏览器兼容性信息</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-200 mb-4">
            🌐 浏览器兼容性测试
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            测试您的浏览器对 Live2D 功能的支持情况
          </p>
        </div>
        
        {/* 主要兼容性结果 */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg border border-white/20 dark:border-gray-700/50">
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            检测结果
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">浏览器信息</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">浏览器:</span>
                  <span className="font-medium">{compatibility.browser} {compatibility.version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">支持状态:</span>
                  <span className={cn(
                    "font-medium",
                    compatibility.isSupported ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {compatibility.isSupported ? '✅ 支持' : '❌ 不支持'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">功能支持</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">WebGL:</span>
                  <span className={cn(
                    "font-medium",
                    compatibility.webglSupport ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {compatibility.webglSupport ? '✅ 支持' : '❌ 不支持'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">LocalStorage:</span>
                  <span className={cn(
                    "font-medium",
                    compatibility.localStorageSupport ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {compatibility.localStorageSupport ? '✅ 支持' : '❌ 不支持'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">性能API:</span>
                  <span className={cn(
                    "font-medium",
                    compatibility.performanceSupport ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}>
                    {compatibility.performanceSupport ? '✅ 支持' : '❌ 不支持'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 问题和建议 */}
        {(compatibility.issues.length > 0 || compatibility.recommendations.length > 0) && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg border border-white/20 dark:border-gray-700/50">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              问题与建议
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {compatibility.issues.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-3">检测到的问题</h3>
                  <ul className="space-y-2">
                    {compatibility.issues.map((issue, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-red-500 mt-1">•</span>
                        <span className="text-gray-700 dark:text-gray-300">{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {compatibility.recommendations.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-3">建议</h3>
                  <ul className="space-y-2">
                    {compatibility.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <span className="text-blue-500 mt-1">•</span>
                        <span className="text-gray-700 dark:text-gray-300">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* 详细测试结果 */}
        {testResults.length > 0 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-white/20 dark:border-gray-700/50">
            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
              详细测试结果
            </h2>
            
            <div className="space-y-2">
              {testResults.map((result, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-green-500">✓</span>
                  <span className="text-gray-700 dark:text-gray-300">{result}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 推荐浏览器 */}
        <div className="mt-8 text-center">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            推荐浏览器
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: 'Chrome', icon: '🌐', version: '60+' },
              { name: 'Firefox', icon: '🦊', version: '55+' },
              { name: 'Safari', icon: '🧭', version: '11+' },
              { name: 'Edge', icon: '🌊', version: '79+' }
            ].map((browser) => (
              <div key={browser.name} className="bg-white/60 dark:bg-gray-700/60 rounded-lg p-4 text-center">
                <div className="text-3xl mb-2">{browser.icon}</div>
                <h4 className="font-medium text-gray-800 dark:text-gray-200">{browser.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{browser.version}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}