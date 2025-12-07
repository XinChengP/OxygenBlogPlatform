'use client';

import { useEffect, useState } from 'react';

export default function DebugMessage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [messageCount, setMessageCount] = useState(0);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    // 重定向控制台日志
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      addLog(`LOG: ${args.join(' ')}`);
      originalLog.apply(console, args);
    };

    console.warn = (...args) => {
      addLog(`WARN: ${args.join(' ')}`);
      originalWarn.apply(console, args);
    };

    console.error = (...args) => {
      addLog(`ERROR: ${args.join(' ')}`);
      originalError.apply(console, args);
    };

    // 监听消息事件
    const handleMessageShow = (event: any) => {
      addLog(`📢 Live2D消息显示: ${event.detail.message}`);
      setMessageCount(prev => prev + 1);
    };

    const handleMessageHide = (event: any) => {
      addLog(`🚫 Live2D消息隐藏`);
    };

    document.addEventListener('live2d-message-show', handleMessageShow);
    document.addEventListener('live2d-message-hide', handleMessageHide);

    // 检查全局函数
    addLog(`🔍 检查全局函数状态:`);
    addLog(`- window.showMessage: ${typeof (window as any).showMessage}`);
    addLog(`- window.GlobalMessageManager: ${typeof (window as any).GlobalMessageManager}`);
    addLog(`- window.live2dOptimized: ${typeof (window as any).live2dOptimized}`);

    // 延迟检查消息容器
    setTimeout(() => {
      const messageContainer = document.getElementById('live2d-message-container');
      const messageElement = document.getElementById('live2d-message');
      const originalMessage = document.querySelector('.message');
      
      addLog(`📦 消息容器检查:`);
      addLog(`- live2d-message-container: ${messageContainer ? '存在' : '不存在'}`);
      addLog(`- live2d-message: ${messageElement ? '存在' : '不存在'}`);
      addLog(`- .message (原始): ${originalMessage ? '存在' : '不存在'}`);
      
      if (messageElement) {
        addLog(`- live2d-message 样式: ${messageElement.className}`);
        addLog(`- live2d-message 显示状态: ${window.getComputedStyle(messageElement).display}`);
      }
      
      if (originalMessage) {
        addLog(`- .message 样式: ${originalMessage.className}`);
        addLog(`- .message 显示状态: ${window.getComputedStyle(originalMessage).display}`);
      }
    }, 2000);

    // 测试消息显示
    const testMessages = () => {
      addLog('🧪 开始测试消息显示...');
      
      // 测试原始showMessage
      if (typeof (window as any).showMessage === 'function') {
        try {
          (window as any).showMessage('测试消息 1: 原始showMessage', 3000);
          addLog('✅ 原始showMessage调用成功');
        } catch (error) {
          addLog(`❌ 原始showMessage调用失败: ${error}`);
        }
      } else {
        addLog('❌ 原始showMessage函数不存在');
      }

      // 测试GlobalMessageManager
      if (typeof (window as any).GlobalMessageManager === 'object') {
        try {
          (window as any).GlobalMessageManager.show('测试消息 2: GlobalMessageManager', 3000);
          addLog('✅ GlobalMessageManager.show调用成功');
        } catch (error) {
          addLog(`❌ GlobalMessageManager.show调用失败: ${error}`);
        }
      } else {
        addLog('❌ GlobalMessageManager不存在');
      }

      // 测试live2dOptimized
      if (typeof (window as any).live2dOptimized === 'object') {
        try {
          (window as any).live2dOptimized.showMessage('测试消息 3: live2dOptimized', 3000);
          addLog('✅ live2dOptimized.showMessage调用成功');
        } catch (error) {
          addLog(`❌ live2dOptimized.showMessage调用失败: ${error}`);
        }
      } else {
        addLog('❌ live2dOptimized不存在');
      }
    };

    // 延迟执行测试
    setTimeout(testMessages, 3000);

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
      document.removeEventListener('live2d-message-show', handleMessageShow);
      document.removeEventListener('live2d-message-hide', handleMessageHide);
    };
  }, []);

  const clearLogs = () => {
    setLogs([]);
    setMessageCount(0);
  };

  const manualTest = () => {
    addLog('🔄 手动测试消息显示...');
    
    // 测试复制事件
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(document.body);
      selection.addRange(range);
      
      try {
        document.execCommand('copy');
        addLog('📋 复制事件已触发');
      } catch (error) {
        addLog(`❌ 复制事件触发失败: ${error}`);
      }
      
      selection.removeAllRanges();
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Live2D消息系统调试面板</h1>
        
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-4">
            <span className="text-lg">消息计数: <span className="font-bold text-primary">{messageCount}</span></span>
            <button 
              onClick={manualTest}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              测试复制事件
            </button>
            <button 
              onClick={clearLogs}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
            >
              清空日志
            </button>
          </div>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-4">调试日志</h2>
          <div className="bg-muted rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">等待日志输出...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1 text-xs">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 bg-card rounded-lg border p-4">
          <h2 className="text-xl font-semibold mb-4">测试区域</h2>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              选择并复制这段文字来测试复制事件:
            </p>
            <div className="bg-muted p-3 rounded border">
              <code className="text-sm">
                function hello() {'{'}\n  console.log('Hello, 洛天依!');\n{'}'}
              </code>
            </div>
            <p className="text-muted-foreground">
              或者点击下面的按钮来测试消息显示:
            </p>
            <div className="flex space-x-2">
              <button 
                onClick={() => {
                  if (typeof (window as any).showMessage === 'function') {
                    (window as any).showMessage('这是一条测试消息！', 3000);
                    addLog('🧪 手动触发原始showMessage');
                  }
                }}
                className="px-3 py-2 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
              >
                测试原始showMessage
              </button>
              <button 
                onClick={() => {
                  if (typeof (window as any).GlobalMessageManager === 'object') {
                    (window as any).GlobalMessageManager.show('这是一条GlobalMessageManager测试消息！', 3000);
                    addLog('🧪 手动触发GlobalMessageManager');
                  }
                }}
                className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
              >
                测试GlobalMessageManager
              </button>
              <button 
                onClick={() => {
                  if (typeof (window as any).live2dOptimized === 'object') {
                    (window as any).live2dOptimized.showMessage('这是一条live2dOptimized测试消息！', 3000);
                    addLog('🧪 手动触发live2dOptimized');
                  }
                }}
                className="px-3 py-2 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
              >
                测试live2dOptimized
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}