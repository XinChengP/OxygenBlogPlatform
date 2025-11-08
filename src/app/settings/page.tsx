"use client";

import React from 'react';
import { useTheme } from 'next-themes';
import ScrollToTop from '@/components/ScrollToTop';
import { useBackgroundStyle } from '@/hooks/useBackgroundStyle';
import { useMemo, useEffect, useState } from 'react';
import MusicPlayer from '@/components/MusicPlayer';
import { getMusicPlaylists } from '@/utils/musicUtils';
import { Playlist } from '@/components/MusicPlayer';

export default function SettingsPage() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { containerStyle, isBackgroundEnabled } = useBackgroundStyle('about');
  const [mounted, setMounted] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);

  // 确保组件已挂载
  useEffect(() => {
    setMounted(true);
    
    // 获取音乐播放列表
    const fetchPlaylists = async () => {
      try {
        const musicPlaylists = await getMusicPlaylists();
        setPlaylists(musicPlaylists);
      } catch (error) {
        console.error('Error fetching playlists:', error);
      } finally {
        setIsLoadingPlaylists(false);
      }
    };
    
    // 只在第一次加载时获取播放列表，避免页面切换时重复加载
    if (playlists.length === 0) {
      fetchPlaylists();
    }
  }, []); // 移除playlists依赖，避免循环加载

  const isDark = resolvedTheme === 'dark';

  // 获取 CSS 变量中的主题色
  const getThemeColor = (colorName: string): string => {
    if (typeof window === 'undefined') return '#3b82f6'; // 默认蓝色
    return getComputedStyle(document.documentElement).getPropertyValue(`--theme-${colorName}`).trim() || '#3b82f6';
  };

  // 获取当前主题色
  const primaryColor = getThemeColor('primary');
  const secondaryColor = getThemeColor('secondary');
  const accentColor = getThemeColor('accent');

  /**
   * 生成简化的背景样式
   */
  const backgroundStyle = useMemo(() => {
    // 如果启用了背景图片，返回透明背景
    if (isBackgroundEnabled) {
      return {};
    }
    
    // 否则使用原有的渐变背景
    const baseGradient = isDark 
      ? 'linear-gradient(135deg, rgb(17, 24, 39), rgb(31, 41, 55))'
      : 'linear-gradient(135deg, rgb(249, 250, 251), rgb(229, 231, 235))';

    const themeOverlay = `radial-gradient(ellipse at top left, ${primaryColor}1a, transparent 60%), radial-gradient(ellipse at bottom right, ${secondaryColor}1a, transparent 60%)`;

    return {
      background: `${themeOverlay}, ${baseGradient}`
    };
  }, [primaryColor, secondaryColor, isDark, isBackgroundEnabled]);

  // 如果还没有挂载，显示默认样式避免闪烁
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-8 pt-[65px]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50">
            <div className="p-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      key={`settings-${primaryColor}-${isDark}`}
      className={containerStyle.className}
      style={{...containerStyle.style, ...backgroundStyle}}
    >
      <style jsx>{`
        @keyframes lightMove {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(15deg); }
          50% { transform: translateY(-10px) rotate(15deg); }
        }
      `}</style>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 主要内容卡片 - 毛玻璃效果 */}
        <div className="relative z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          {/* 头部区域 - 使用主题色背景 */}
          <div 
            className="relative p-8 text-white transition-all duration-500 overflow-hidden"
            style={{
              background: `
                linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 50%, ${secondaryColor} 100%),
                radial-gradient(circle at top left, ${primaryColor}80 0%, transparent 50%),
                radial-gradient(circle at bottom right, ${secondaryColor}80 0%, transparent 50%)
              `,
            }}
          >
            {/* 动态光效背景 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10"></div>
            
            {/* 装饰性几何图形 */}
            <div className="absolute top-4 right-4 w-20 h-20 rounded-full opacity-20" 
                 style={{ background: `radial-gradient(circle, ${accentColor}, transparent)` }}></div>
            <div className="absolute bottom-4 left-4 w-16 h-16 rounded-full opacity-15" 
                 style={{ background: `radial-gradient(circle, ${primaryColor}, transparent)` }}></div>
            
            <div className="relative z-10">
              <h1 className="text-2xl md:text-3xl font-bold mb-2 drop-shadow-2xl tracking-wide">博客设置</h1>
              <p className="text-lg opacity-90">自定义您的博客体验</p>
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
                
                {/* 主题选项 - 紧密相连 */}
                <div className="inline-flex rounded-lg overflow-hidden shadow-sm border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                  {/* 浅色模式选项 */}
                  <div
                    onClick={() => setTheme('light')}
                    className={`group relative overflow-hidden p-4 transition-all duration-300 cursor-pointer ${
                      theme === 'light' 
                        ? 'bg-white/90 dark:bg-gray-800/90 shadow-lg' 
                        : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80'
                    } backdrop-blur-sm`}
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
                    className={`group relative overflow-hidden p-4 transition-all duration-300 cursor-pointer border-l border-gray-200/30 dark:border-gray-700/30 ${
                      theme === 'dark' 
                        ? 'bg-white/90 dark:bg-gray-800/90 shadow-lg' 
                        : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80'
                    } backdrop-blur-sm`}
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
                    className={`group relative overflow-hidden p-4 transition-all duration-300 cursor-pointer border-l border-gray-200/30 dark:border-gray-700/30 ${
                      theme === 'system' 
                        ? 'bg-white/90 dark:bg-gray-800/90 shadow-lg' 
                        : 'bg-white/70 dark:bg-gray-800/70 hover:bg-white/80 dark:hover:bg-gray-800/80'
                    } backdrop-blur-sm`}
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
            
            {/* 音乐播放器区块 */}
            <div className="mb-12">
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
              </div>
              
              {isLoadingPlaylists ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                </div>
              ) : playlists.length > 0 ? (
                <MusicPlayer playlists={playlists} />
              ) : (
                <div className={`p-4 rounded-lg text-center ${
                  isDark ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100/50 text-gray-600'
                }`}>
                  <p>未找到音乐文件</p>
                  <p className="text-sm mt-1">请将音乐文件放置在 public/MusicList 目录下的文件夹中</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* 添加页面滚动导航组件 */}
      <ScrollToTop />
    </div>
  );
}