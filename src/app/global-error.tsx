'use client';

/**
 * 全局错误处理组件
 * 
 * 这是 Next.js 的错误边界组件，用于捕获整个应用的错误。
 * 注意：此组件不能访问 ThemeProvider 的上下文，因为错误可能发生在 Provider 内部。
 * 
 * Next.js 16 + React 19 已知问题：
 * - 在静态生成期间，如果组件使用了 useTheme 等 hooks 但 Provider 未正确挂载，会导致
 *   "Cannot read properties of null (reading 'useContext')" 错误
 * - 此文件作为错误边界，确保即使主题系统出错，用户也能看到友好的错误页面
 */

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台，便于调试
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          padding: 0,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '2rem',
            maxWidth: '500px',
          }}
        >
          <h1
            style={{
              fontSize: '6rem',
              margin: '0 0 1rem',
              background: 'linear-gradient(135deg, #66ccff, #06b6d4)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            错误
          </h1>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
            应用遇到了问题
          </h2>
          <p style={{ color: '#a0a0a0', marginBottom: '2rem', lineHeight: 1.6 }}>
            抱歉，应用程序遇到了意外错误。这可能是由于主题系统初始化失败或网络问题导致的。
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              background: 'linear-gradient(135deg, #66ccff, #06b6d4)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 204, 255, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            重试
          </button>
          <div style={{ marginTop: '2rem', fontSize: '0.875rem', color: '#666' }}>
            <p>如果问题持续存在，请尝试：</p>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem' }}>
              <li>刷新页面</li>
              <li>清除浏览器缓存</li>
              <li>检查网络连接</li>
            </ul>
          </div>
        </div>
      </body>
    </html>
  );
}
