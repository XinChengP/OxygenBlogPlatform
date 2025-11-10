"use client";

import { useState } from 'react';
import { useTheme } from 'next-themes';
import { useMusic } from '@/contexts/MusicContext';
import { Playlist } from '@/components/MusicPlayer';
import APlayer from '@/components/APlayer';
import MusicConfig from '@/components/MusicConfig';
import { MusicServer, MusicType } from '@/components/APlayer';

export default function MusicPage() {
  const { resolvedTheme } = useTheme();
  const { setCurrentPlaylist } = useMusic();
  const isDark = resolvedTheme === 'dark';
  
  // 状态
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [fixedMode, setFixedMode] = useState(false);
  const [showLyrics, setShowLyrics] = useState(true);
  
  // 处理歌单加载
  const handlePlaylistLoaded = (playlist: Playlist) => {
    setSelectedPlaylist(playlist);
    setCurrentPlaylist(playlist);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          音乐播放器
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧配置区域 */}
          <div className="lg:col-span-1">
            <MusicConfig onPlaylistLoaded={handlePlaylistLoaded} />
            
            {/* 播放器配置 */}
            <div className={`mt-6 rounded-xl overflow-hidden ${isDark ? 'bg-gray-800/90 text-white' : 'bg-white/90 text-gray-800'} backdrop-blur-sm shadow-lg border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="p-4">
                <h3 className="text-lg font-semibold mb-4">播放器配置</h3>
                
                {/* 吸底模式 */}
                <div className="mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fixedMode}
                      onChange={(e) => setFixedMode(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">吸底模式</span>
                  </label>
                  <p className="text-xs opacity-70 mt-1">开启后播放器将固定在页面底部</p>
                </div>
                
                {/* 歌词显示 */}
                <div className="mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showLyrics}
                      onChange={(e) => setShowLyrics(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium">显示歌词</span>
                  </label>
                  <p className="text-xs opacity-70 mt-1">开启后将在播放器中显示歌词</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* 右侧播放器区域 */}
          <div className="lg:col-span-2">
            {selectedPlaylist ? (
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-2">当前歌单</h2>
                  <div className={`p-4 rounded-lg ${isDark ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm`}>
                    <p className="text-lg font-medium">{selectedPlaylist.name}</p>
                    <p className="text-sm opacity-70">{selectedPlaylist.songs.length} 首歌曲</p>
                  </div>
                </div>
                
                {/* 播放器 */}
                <APlayer
                  playlists={[selectedPlaylist]}
                  fixed={fixedMode}
                  lrcType={showLyrics ? 1 : 0}
                  server={MusicServer.NETEASE}
                  type={MusicType.PLAYLIST}
                  id="167985096"
                />
              </div>
            ) : (
              <div className={`rounded-xl p-8 text-center ${isDark ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm`}>
                <div className="max-w-md mx-auto">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M18 3a1 1 0 00-1.196-.98l-10 2A1 1 0 006 5v9.114A4.369 4.369 0 005 14c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V7.82l8-1.6v5.894A4.37 4.37 0 0015 12c-1.657 0-3 .895-3 2s1.343 2 3 2 3-.895 3-2V3z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">选择一个歌单</h3>
                  <p className="text-sm opacity-70 mb-4">
                    从左侧选择一个音乐平台和歌单，或者搜索你喜欢的音乐
                  </p>
                  <p className="text-xs opacity-50">
                    支持网易云音乐、QQ音乐、酷狗音乐等多个平台
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* 使用说明 */}
        <div className={`mt-12 rounded-xl p-6 ${isDark ? 'bg-gray-800/50' : 'bg-white/50'} backdrop-blur-sm`}>
          <h3 className="text-lg font-semibold mb-4">使用说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2">支持的音乐平台</h4>
              <ul className="text-sm space-y-1 opacity-70">
                <li>• 网易云音乐</li>
                <li>• QQ音乐</li>
                <li>• 酷狗音乐</li>
                <li>• 虾米音乐</li>
                <li>• 百度音乐</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">支持的内容类型</h4>
              <ul className="text-sm space-y-1 opacity-70">
                <li>• 歌曲</li>
                <li>• 歌单</li>
                <li>• 专辑</li>
                <li>• 歌手</li>
                <li>• 搜索结果</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 text-sm opacity-70">
            <p>注意：音乐数据来源于第三方API，可能存在版权限制。请尊重版权，仅用于个人学习和欣赏。</p>
          </div>
        </div>
      </div>
    </div>
  );
}