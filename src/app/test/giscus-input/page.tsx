'use client';

import React, { useState } from 'react';
import { useTheme } from 'next-themes';

export default function GiscusInputTest() {
  const { theme, systemTheme } = useTheme();
  const [testResults, setTestResults] = useState<string[]>([]);
  
  const addTestResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const runTests = async () => {
    addTestResult("开始测试 Giscus 输入功能...");
    
    // 测试1: 检查脚本是否加载
    const script = document.querySelector('script[src*="giscus.app"]');
    if (script) {
      addTestResult("✓ Giscus 脚本已加载");
    } else {
      addTestResult("✗ Giscus 脚本未加载");
    }
    
    // 测试2: 检查iframe是否存在
    setTimeout(() => {
      const iframe = document.querySelector('iframe.giscus-frame') as HTMLIFrameElement;
      if (iframe) {
        addTestResult("✓ Giscus iframe 已创建");
        addTestResult(`iframe src: ${iframe.src}`);
        
        // 测试3: 尝试与iframe通信
        try {
          iframe.contentWindow?.postMessage(
            { giscus: { ping: true } },
            'https://giscus.app'
          );
          addTestResult("✓ 已发送ping消息到iframe");
        } catch (error) {
          addTestResult(`✗ 无法与iframe通信: ${error}`);
        }
      } else {
        addTestResult("✗ Giscus iframe 未创建");
      }
    }, 3000);
    
    // 测试4: 检查是否有错误消息
    setTimeout(() => {
      const errorElements = document.querySelectorAll('.giscus-error');
      if (errorElements.length > 0) {
        addTestResult(`✗ 发现 ${errorElements.length} 个错误元素`);
      } else {
        addTestResult("✓ 未发现错误元素");
      }
    }, 5000);
  };

  const reloadGiscus = () => {
    // 移除现有的Giscus脚本和iframe
    const script = document.querySelector('script[src*="giscus.app"]');
    if (script) {
      script.remove();
    }
    
    const iframe = document.querySelector('iframe.giscus-frame');
    if (iframe) {
      iframe.remove();
    }
    
    // 重置测试结果
    setTestResults([]);
    
    // 重新加载页面组件
    window.location.reload();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Giscus 输入功能测试</h1>
      
      <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">测试控制</h2>
        <div className="flex gap-4 mb-4">
          <button
            onClick={runTests}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            运行测试
          </button>
          <button
            onClick={reloadGiscus}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            重新加载 Giscus
          </button>
        </div>
        
        {testResults.length > 0 && (
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
            <h3 className="font-semibold mb-2">测试结果:</h3>
            <ul className="space-y-1 text-sm font-mono">
              {testResults.map((result, index) => (
                <li key={index}>{result}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Giscus 评论测试</h2>
        <div className="giscus-container" style={{ minHeight: '400px' }}>
          <div 
            ref={(element) => {
              if (!element) return;
              
              // 获取当前主题
              const getCurrentTheme = () => {
                const currentTheme = theme === 'system' ? systemTheme : theme;
                return currentTheme === 'dark' ? 'dark' : 'light';
              };
              
              // 创建 Giscus 脚本
              const script = document.createElement('script');
              script.src = 'https://giscus.app/client.js';
              script.async = true;
              script.crossOrigin = 'anonymous';
              
              // 设置 Giscus 配置
              script.setAttribute('data-repo', 'XinChengP/OxygenBlogPlatform');
              script.setAttribute('data-repo-id', 'R_kgDOQQbz2g');
              script.setAttribute('data-category', 'General');
              script.setAttribute('data-category-id', 'DIC_kwDOQQbz2s4CxkZ6');
              script.setAttribute('data-mapping', 'specific');
              script.setAttribute('data-term', 'giscus-input-test');
              script.setAttribute('data-strict', '0');
              script.setAttribute('data-reactions-enabled', '1');
              script.setAttribute('data-emit-metadata', '0');
              script.setAttribute('data-input-position', 'top');
              script.setAttribute('data-theme', getCurrentTheme());
              script.setAttribute('data-lang', 'zh-CN');
              
              // 添加事件监听器
              script.onload = () => {
                addTestResult("✓ Giscus 脚本加载完成");
              };
              
              script.onerror = (error) => {
                addTestResult(`✗ Giscus 脚本加载失败: ${error}`);
              };
              
              // 清理现有脚本
              const existingScript = element.querySelector('script');
              if (existingScript) {
                existingScript.remove();
              }
              
              // 添加脚本
              element.appendChild(script);
            }}
          />
        </div>
      </div>
      
      <div className="bg-card rounded-lg shadow-sm p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">故障排除指南</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-2">如果无法输入文本，请检查：</h3>
            <ol className="list-decimal list-inside space-y-2">
              <li>确保已登录GitHub账户</li>
              <li>确保浏览器没有禁用第三方Cookie</li>
              <li>检查广告拦截器是否阻止了Giscus</li>
              <li>尝试在无痕模式下打开页面</li>
              <li>检查浏览器控制台是否有错误信息</li>
            </ol>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">常见解决方案：</h3>
            <ul className="list-disc list-inside space-y-2">
              <li>刷新页面并重新登录GitHub</li>
              <li>清除浏览器缓存和Cookie</li>
              <li>禁用浏览器扩展程序</li>
              <li>尝试使用不同的浏览器</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}