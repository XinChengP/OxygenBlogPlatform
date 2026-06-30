'use client';

import React from 'react';

interface Live2DControlsProps {
  isVisible: boolean;
  isLoading: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  themeClass: string;
}

/**
 * Live2D 控制按钮组件
 * 包含隐藏/显示按钮和刷新按钮
 */
export default function Live2DControls({
  isVisible,
  isLoading,
  onToggle,
  onRefresh,
  themeClass,
}: Live2DControlsProps) {
  return (
    <>
      <div
        className={`hide-button ${themeClass}`}
        onClick={onToggle}
      >
        隐藏
      </div>

      <div
        className={`refresh-button ${themeClass} ${isLoading ? 'loading' : ''}`}
        onClick={onRefresh}
        title={isLoading ? '加载中...' : '重新加载天依'}
        style={{
          opacity: isLoading ? 0.6 : 1,
          cursor: isLoading ? 'not-allowed' : 'pointer',
          pointerEvents: isLoading ? 'none' : 'auto',
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="refresh-icon"
        >
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        {isLoading ? '加载中' : '刷新'}
      </div>
    </>
  );
}
