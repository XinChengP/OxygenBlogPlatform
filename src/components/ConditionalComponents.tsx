'use client';

import { usePathname } from 'next/navigation';
import MusicPlayer from './MusicPlayer';
import LuoTianyiLive2D from './LuoTianyiLive2D';

export default function ConditionalComponents() {
  const pathname = usePathname();
  
  // 在首页(/)、404页面(/404)隐藏Live2D和音乐播放器
  const hideLive2DAndMusic = pathname === '/' || pathname === '/404' || pathname.startsWith('/_not-found');
  
  return (
    <>
      {/* 条件渲染音乐播放器 - 在首页隐藏 */}
      {!hideLive2DAndMusic && <MusicPlayer />}
      {/* 条件渲染Live2D - 在首页和404页面隐藏 */}
      {!hideLive2DAndMusic && <LuoTianyiLive2D />}
    </>
  );
}