'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// 动态导入音乐播放器 - 减少初始包大小
const MusicPlayer = dynamic(
  () => import('./MusicPlayer'),
  { 
    ssr: false,
    loading: () => null // 不显示加载状态
  }
);

// 动态导入Live2D控制器 - 减少初始包大小
const Live2DController = dynamic(
  () => import('./Live2DController'),
  { 
    ssr: false,
    loading: () => null
  }
);

// 轻量级的条件渲染包装器
function ConditionalWrapper({ children, condition }: { children: React.ReactNode; condition: boolean }) {
  return condition ? null : <>{children}</>;
}

export default function ConditionalComponents() {
  // 使用动态导入的组件
  return (
    <Suspense fallback={null}>
      <MusicPlayer />
      <Live2DController />
    </Suspense>
  );
}