'use client';

import { useEffect, useState } from 'react';
import { getAssetPath, isGitHubPages, getBasePath } from '@/utils/assetUtils';

export default function DebugPage() {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  useEffect(() => {
    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    const logs: string[] = [];
    
    console.log = (...args) => {
      logs.push(`[LOG] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}`);
      originalLog.apply(console, args);
    };
    
    console.error = (...args) => {
      logs.push(`[ERROR] ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ')}`);
      originalError.apply(console, args);
    };

    const info = {
      windowLocation: {
        href: window.location.href,
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        origin: window.location.origin
      },
      nextData: (window as any).__NEXT_DATA__ || {},
      runtimeConfig: (window as any).__NEXT_DATA__?.runtimeConfig || {},
      isGitHubPages: isGitHubPages(),
      basePath: getBasePath(),
      testPaths: {
        live2d: getAssetPath('/luotianyi-live2d-master/live2d/js/live2d.js'),
        message: getAssetPath('/luotianyi-live2d-master/live2d/js/message.js'),
        pinyin: getAssetPath('/tools/pinyin-converter.js')
      },
      env: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_GITHUB_REPO_NAME: process.env.NEXT_PUBLIC_GITHUB_REPO_NAME,
        NEXT_PUBLIC_BASE_PATH: process.env.NEXT_PUBLIC_BASE_PATH,
        IS_STATIC_EXPORT: process.env.IS_STATIC_EXPORT
      }
    };
    
    console.log('Debug Info:', info);
    setDebugInfo(info);
    setConsoleLogs(logs);
    
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-foreground">Debug Information</h1>
        
        <div className="space-y-6">
          <div className="bg-card rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Window Location</h2>
            <pre className="text-sm text-muted-foreground overflow-x-auto">
              {JSON.stringify(debugInfo.windowLocation, null, 2)}
            </pre>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Runtime Config</h2>
            <pre className="text-sm text-muted-foreground overflow-x-auto">
              {JSON.stringify(debugInfo.runtimeConfig, null, 2)}
            </pre>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Path Tests</h2>
            <pre className="text-sm text-muted-foreground overflow-x-auto">
              {JSON.stringify(debugInfo.testPaths, null, 2)}
            </pre>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Environment</h2>
            <pre className="text-sm text-muted-foreground overflow-x-auto">
              {JSON.stringify(debugInfo.env, null, 2)}
            </pre>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-foreground">GitHub Pages Check</h2>
            <div className="text-lg font-medium text-foreground">
              {debugInfo.isGitHubPages ? '✅ Is GitHub Pages' : '❌ Not GitHub Pages'}
            </div>
          </div>

          <div className="bg-card rounded-lg p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Console Logs</h2>
            <div className="text-sm text-muted-foreground max-h-40 overflow-y-auto">
              {consoleLogs.length > 0 ? (
                consoleLogs.map((log, index) => (
                  <div key={index} className="font-mono text-xs mb-1">{log}</div>
                ))
              ) : (
                <p className="text-gray-500">No logs</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}