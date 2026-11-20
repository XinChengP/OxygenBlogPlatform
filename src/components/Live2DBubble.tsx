'use client';

import React from 'react';

interface Live2DBubbleProps {
  message: string;
  opacity: number;
  isLoading: boolean;
  loadProgress: number;
  isVisible: boolean;
  themeClass: string;
  /**
   * 气泡的点击动作；为 null 时气泡是纯文本。
   * 目前只有「继续阅读」消息会带动作，点击即跳回上次阅读位置。
   */
  onAction?: (() => void) | null;
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
  onAction = null,
}: Live2DBubbleProps) {
  // 有动作时把气泡当成按钮：键盘可聚焦、回车/空格也能触发
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onAction) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onAction();
    }
  };
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
              background: 'var(--live2d-bubble-bg, transparent)',
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(102, 204, 255, 0.3)',
              textShadow: '0 1px 3px rgba(0, 0, 0, 0.7)',
              transition: 'background-color 0.3s ease, border-color 0.3s ease',
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
        className={`message live2d-bubble ${themeClass}`}
        onClick={onAction ?? undefined}
        onKeyDown={handleKeyDown}
        role={onAction ? 'button' : undefined}
        tabIndex={onAction ? 0 : undefined}
        title={onAction ? '点击回到上次阅读的位置' : undefined}
        style={{
          opacity,
          position: 'absolute',
          top: '-20px',
          left: '50px',
          display: message && message.trim() !== '' ? 'block' : 'none',
          zIndex: 10001,
          // 可点击消息给出手型光标与虚点下划线，明确「这句话能点」
          cursor: onAction ? 'pointer' : 'default',
          textDecoration: onAction ? 'underline' : undefined,
          textDecorationStyle: onAction ? 'dotted' : undefined,
          textUnderlineOffset: onAction ? '3px' : undefined,
        }}
      >
        {message || ''}
      </div>
    </>
  );
}
