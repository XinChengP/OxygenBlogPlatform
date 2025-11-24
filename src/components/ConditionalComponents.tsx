'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import MusicPlayer from './MusicPlayer';
import Live2DController from './Live2DController';
import { getMusicPlayerVisibility, onMusicPlayerVisibilityChange } from '@/utils/musicPlayerVisibility';

export default function ConditionalComponents() {
  const pathname = usePathname();
  const [musicPlayerVisible, setMusicPlayerVisible] = useState(getMusicPlayerVisibility());
  
  // 监听音乐播放器显示状态变化
  useEffect(() => {
    const unsubscribe = onMusicPlayerVisibilityChange((visible) => {
      setMusicPlayerVisible(visible);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // 在首页(/)、404页面(/404)和错误页面隐藏Live2D
  // 但是为了确保音乐播放不中断，我们在所有页面都渲染音乐播放器
  // 通过CSS来控制其可见性
  const hideLive2DAndMusic = pathname === '/' || pathname === '/404' || pathname.startsWith('/_not-found');
  
  return (
    <>
      {/* 音乐播放器 - 在所有页面都渲染，但通过CSS控制可见性 */}
      <div className={hideLive2DAndMusic || !musicPlayerVisible ? 'aplayer-container hidden' : 'aplayer-container'}>
        <MusicPlayer />
      </div>
      {/* 使用Live2DController进行智能路径控制 */}
      <Live2DController />
    </>
  );
}