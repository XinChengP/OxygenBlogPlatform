'use client';

import { useEffect, useState } from 'react';
import { getAssetPath } from '@/utils/assetUtils';

export default function TestPinyinPage() {
  const [testResult, setTestResult] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const testPinyinConverter = async () => {
      try {
        addLog('开始测试拼音转换器...');
        
        // 获取脚本路径
        const scriptPath = getAssetPath('/tools/pinyin-converter.js');
        addLog(`脚本路径: ${scriptPath}`);
        
        // 创建脚本元素
        const script = document.createElement('script');
        script.src = scriptPath;
        script.type = 'text/javascript';
        script.async = true;
        
        script.onload = async () => {
          try {
            addLog('脚本加载成功');
            
            // 检查全局变量
            const pinyinLib = (window as any).PinyinConverter;
            addLog(`window.PinyinConverter: ${pinyinLib ? '存在' : '不存在'}`);
            
            if (pinyinLib) {
              addLog(`getPinyinConverter 函数: ${typeof pinyinLib.getPinyinConverter}`);
              
              if (typeof pinyinLib.getPinyinConverter === 'function') {
                const converter = await pinyinLib.getPinyinConverter();
                addLog('拼音转换器实例创建成功');
                
                // 测试转换
                const testText = '你好世界';
                const result = converter.convertToString(testText);
                addLog(`测试结果: "${testText}" -> "${result}"`);
                
                setTestResult(`成功: "${testText}" -> "${result}"`);
              } else {
                addLog('错误: getPinyinConverter 不是函数');
                setTestResult('错误: getPinyinConverter 函数不存在');
              }
            } else {
              addLog('错误: PinyinConverter 对象不存在');
              setTestResult('错误: PinyinConverter 对象不存在');
            }
          } catch (error) {
            addLog(`错误: ${error}`);
            setTestResult(`错误: ${error}`);
          }
        };
        
        script.onerror = () => {
          addLog('脚本加载失败');
          setTestResult('脚本加载失败');
        };
        
        addLog('开始加载脚本...');
        document.head.appendChild(script);
        
        return () => {
          if (document.head.contains(script)) {
            document.head.removeChild(script);
          }
        };
      } catch (error) {
        addLog(`测试失败: ${error}`);
        setTestResult(`测试失败: ${error}`);
      }
    };

    testPinyinConverter();
  }, [isClient]);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">拼音转换器测试</h1>
        
        <div className="grid gap-6">
          <div className="bg-card rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-foreground">测试结果</h2>
            <div className="text-lg font-mono text-primary">
              {testResult || (isClient ? '测试中...' : '等待客户端加载...')}
            </div>
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-foreground">测试日志</h2>
            <div className="text-sm font-mono text-muted-foreground max-h-60 overflow-y-auto">
              {logs.map((log, index) => (
                <div key={index} className="mb-1">{log}</div>
              ))}
            </div>
          </div>
          
          <div className="bg-card rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-foreground">调试信息</h2>
            <div className="text-sm text-muted-foreground space-y-2">
              <div>环境: {process.env.NODE_ENV}</div>
              <div>状态: {isClient ? '客户端已加载' : '服务端渲染中'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}