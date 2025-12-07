'use client';

import { useEffect } from 'react';

export default function TestEasterEgg() {
  useEffect(() => {
    // 测试彩蛋触发
    const testEasterEgg = () => {
      console.log('测试彩蛋触发...');
      
      // 模拟触发彩蛋的条件
      if (typeof window !== 'undefined' && window.showMessage) {
        console.log('window.showMessage 可用');
        
        // 测试直接调用
        window.showMessage('🎉 彩蛋测试消息！', 3000);
        
        // 测试复制事件彩蛋
        setTimeout(() => {
          const copyEvent = new ClipboardEvent('copy');
          document.dispatchEvent(copyEvent);
        }, 1000);
        
        // 测试点击事件彩蛋
        setTimeout(() => {
          document.body.click();
        }, 2000);
        
      } else {
        console.log('window.showMessage 不可用');
      }
    };

    // 等待Live2D加载
    const checkLive2D = setInterval(() => {
      if (window.showMessage) {
        clearInterval(checkLive2D);
        testEasterEgg();
      }
    }, 500);

    return () => clearInterval(checkLive2D);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-blue-900">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">
          🎮 彩蛋测试页面
        </h1>
        
        <div className="space-y-4">
          <p className="text-lg text-gray-600 dark:text-gray-300">
            正在测试Live2D彩蛋功能...
          </p>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              测试项目
            </h2>
            
            <div className="space-y-2 text-left">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span className="text-gray-700 dark:text-gray-300">
                  window.showMessage 函数暴露
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                <span className="text-gray-700 dark:text-gray-300">
                  复制事件彩蛋触发
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span className="text-gray-700 dark:text-gray-300">
                  点击事件彩蛋触发
                </span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => {
              if (window.showMessage) {
                window.showMessage('👋 手动测试消息！', 2000);
              }
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            手动触发消息
          </button>
        </div>
        
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <p>查看控制台获取详细日志信息</p>
          <p>等待3秒后会自动触发测试</p>
        </div>
      </div>
    </div>
  );
}