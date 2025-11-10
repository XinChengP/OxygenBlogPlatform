'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
// 音乐播放器相关组件已隐藏 - 清理导入
// import MusicPlayer from '@/components/MusicPlayer';
// import MusicConfig from '@/components/MusicConfig';
import ScrollToTop from '@/components/ScrollToTop';
// import { Playlist } from '@/components/MusicPlayer';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  // 音乐播放器相关状态已完全移除
  // const [playlists, setPlaylists] = useState<Playlist[]>([]);
  // const [showMusicConfig, setShowMusicConfig] = useState(false);

  // 主题颜色
  const [primaryColor] = useState('#3b82f6');
  const [secondaryColor] = useState('#8b5cf6');
  const [accentColor] = useState('#06b6d4');

  useEffect(() => {
    setMounted(true);
    setIsDark(theme === 'dark');
  }, [theme]);

  // 音乐播放器相关函数已移除
  // const handlePlaylistLoaded = (playlist: Playlist) => {
  //   setPlaylists([playlist]);
  //   setShowMusicConfig(false);
  // };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* 背景装饰元素 - 完全移除 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* 移除所有背景装饰元素 */}
      </div>

      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20">
        {/* 主要内容卡片 - 使用更简洁的样式 */}
        <div className="relative z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* 头部区域 - 使用半透明主题色背景 */}
          <div 
            className="relative p-8 text-white transition-all duration-500 overflow-hidden"
            style={{
              background: `
                linear-gradient(135deg, ${primaryColor}dd 0%, ${accentColor}dd 50%, ${secondaryColor}dd 100%),
                radial-gradient(circle at top left, ${primaryColor}aa 0%, transparent 50%),
                radial-gradient(circle at bottom right, ${secondaryColor}aa 0%, transparent 50%)
              `,
            }}
          >
            {/* 动态光效背景 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10"></div>
            
            {/* 装饰性几何图形 */}
            <div className="absolute top-4 right-4 w-20 h-20 rounded-full opacity-20" 
                 style={{ background: `radial-gradient(circle, ${accentColor}aa, transparent)` }}></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full opacity-15" 
                 style={{ background: `radial-gradient(circle, ${primaryColor}aa, transparent)` }}></div>
            
            <div className="relative z-10">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 drop-shadow-2xl tracking-wide">博客设置</h1>
              <p className="text-lg opacity-90 drop-shadow-lg">自定义您的博客体验</p>
            </div>
          </div>

          {/* 主要内容区域 */}
          <div className="p-8 md:p-10 md:pt-8">
            {/* 模式设置区块 */}
            <div className="mb-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
                      模式设置
                    </h2>
                    <span 
                      className="px-3 py-1 rounded-full text-sm font-medium"
                      style={{
                        backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                        color: isDark ? '#93c5fd' : '#3b82f6'
                      }}
                    >
                      {theme === 'light' ? '浅色模式' : theme === 'dark' ? '深色模式' : '跟随系统'}
                    </span>
                  </div>
                
                {/* 主题选项 - 使用更简洁的样式 */}
                <div className="inline-flex rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
                  {/* 浅色模式选项 */}
                  <div
                    onClick={() => setTheme('light')}
                    className={`group relative overflow-hidden p-4 transition-all duration-300 cursor-pointer ${
                      theme === 'light' 
                        ? 'bg-white dark:bg-gray-800 shadow-lg' 
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {/* 选中指示器 */}
                    {theme === 'light' && (
                      <div className="absolute top-1 right-1">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center mr-2 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>浅色模式</span>
                    </div>
                  </div>
                  
                  {/* 深色模式选项 */}
                  <div
                    onClick={() => setTheme('dark')}
                    className={`group relative overflow-hidden p-4 transition-all duration-300 cursor-pointer border-l border-gray-200 dark:border-gray-700 ${
                      theme === 'dark' 
                        ? 'bg-white dark:bg-gray-800 shadow-lg' 
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {/* 选中指示器 */}
                    {theme === 'dark' && (
                      <div className="absolute top-1 right-1">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center mr-2 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>深色模式</span>
                    </div>
                  </div>
                  
                  {/* 跟随系统选项 */}
                  <div
                    onClick={() => setTheme('system')}
                    className={`group relative overflow-hidden p-4 transition-all duration-300 cursor-pointer border-l border-gray-200 dark:border-gray-700 ${
                      theme === 'system' 
                        ? 'bg-white dark:bg-gray-800 shadow-lg' 
                        : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    {/* 选中指示器 */}
                    {theme === 'system' && (
                      <div className="absolute top-1 right-1">
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                          <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mr-2 shadow-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>跟随系统</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 音乐播放器区块 - 已完全隐藏 */}
            {/* <div className="mb-12">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold" style={{ color: isDark ? '#f1f5f9' : '#1e293b' }}>
                    音乐播放器
                  </h2>
                  <span 
                    className="px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)',
                      color: isDark ? '#93c5fd' : '#3b82f6'
                    }}
                  >
                    {playlists.length > 0 ? `${playlists.length} 个播放列表` : '无播放列表'}
                  </span>
                </div>
                
                <button
                  onClick={() => setShowMusicConfig(!showMusicConfig)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    showMusicConfig
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : isDark
                        ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {showMusicConfig ? '隐藏配置' : '添加歌单'}
                </button>
              </div>
              
              音乐配置面板
              {showMusicConfig && (
                <div className={`mb-6 p-6 rounded-lg ${
                  isDark ? 'bg-gray-700/50' : 'bg-gray-100/50'
                }`}>
                  <MusicConfig onPlaylistLoaded={handlePlaylistLoaded} />
                </div>
              )}
              
              {playlists.length > 0 ? (
                <MusicPlayer playlists={playlists} />
              ) : (
                <div className={`p-8 rounded-lg text-center ${
                  isDark ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100/50 text-gray-600'
                }`}>
                  <p className="mb-4">未添加音乐播放列表</p>
                  <button
                    onClick={() => setShowMusicConfig(true)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDark
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    添加歌单
                  </button>
                </div>
              )}
            </div> */}
          </div>
        </div>
      </div>
      
      {/* 添加页面滚动导航组件 */}
      <ScrollToTop />
    </div>
  );
}