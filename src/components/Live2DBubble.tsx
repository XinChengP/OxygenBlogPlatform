'use client';

import React from 'react';

interface Live2DBubbleProps {
  message: string;
  opacity: number;
  isLoading: boolean;
  loadProgress: number;
  isVisible: boolean;
  themeClass: string;
}

/**
 * Live2D 消息气泡组件
 * 显示看板娘的消息提示和加载状态
 */
export default function Live2DBubble({
  message,
  opacity,
  isLoading,
  loadProgress,
  isVisible,
  themeClass,
}: Live2DBubbleProps) {
  return (
    <>
      {isLoading && (
        <div
          className={`loading-overlay ${themeClass}`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '12px',
            zIndex: 10002,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              color: '#66ccff',
              fontSize: '12px',
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(102, 204, 255, 0.3)',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(102, 204, 255, 0.3)',
                borderTop: '3px solid rgba(102, 204, 255, 1)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 6px',
              }}
            />
            <div>加载中... {loadProgress}%</div>
          </div>
        </div>
      )}

      <div
        className={`message ${themeClass}`}
        style={{
          opacity,
          position: 'absolute',
          top: '-20px',
          left: '50px',
          display: message && message.trim() !== '' ? 'block' : 'none',
          transition: 'opacity 0.5s ease-in-out',
          background: 'rgba(102, 204, 255, 0.2)',
          padding: '7px',
          borderRadius: '12px',
          border: '1px solid rgba(102,204,255,.4)',
          boxShadow: '0 3px 15px 2px rgba(102,204,255,.4)',
          color: 'var(--foreground)',
          fontSize: '13px',
          maxWidth: '300px',
          wordWrap: 'break-word',
          zIndex: 10001,
        }}
      >
        {message || ''}
      </div>
    </>
  );
}
