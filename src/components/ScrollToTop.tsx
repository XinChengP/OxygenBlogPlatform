'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { ChevronUpIcon, ChevronDownIcon, SunIcon, MoonIcon, AdjustmentsHorizontalIcon, PlayIcon, PauseIcon, ForwardIcon } from '@heroicons/react/24/outline';
import { useMusic } from '@/contexts/MusicContext';

/**
 * 页面导航组件
 * 
 * 提供转到页首、页底和主题切换的功能
 * - 支持深色/浅色主题
 * - 平滑滚动效果
 * - 响应式设计
 * - 方形按钮风格
 * - 页面顶端时按钮向右隐藏
 * - 点击设置按钮显示主题切换选项
 */
export default function ScrollToTop() {
  const { theme, setTheme } = useTheme();
  const { isPlaying, togglePlayPause, currentSong, playNext } = useMusic();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);
  const [showThemeButton, setShowThemeButton] = useState(false);
  const [showNextButton, setShowNextButton] = useState(false);
  const [isHoveringPlayButton, setIsHoveringPlayButton] = useState(false);
  const [isHoveringNextButton, setIsHoveringNextButton] = useState(false);
  const [extractedCover, setExtractedCover] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 从音频文件中提取封面
  const extractCoverFromAudio = async (songUrl: string) => {
    if (!songUrl) return;
    
    try {
      // 构建API请求URL，移除开头的斜杠以匹配相对路径
      const apiUrl = `/api/music/metadata?path=${encodeURIComponent(songUrl.substring(1))}`;
      const response = await fetch(apiUrl);
      
      if (response.ok) {
        const metadata = await response.json();
        if (metadata.cover) {
          setExtractedCover(metadata.cover);
          return;
        }
      } else {
        console.error('API response not OK:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error extracting cover:', error);
    }
    
    // 如果提取失败，使用默认封面
    setExtractedCover('/placeholder-album.svg');
  };
  
  // 当歌曲改变时，提取封面
  useEffect(() => {
    if (currentSong) {
      extractCoverFromAudio(currentSong.url);
    } else {
      setExtractedCover(null);
    }
  }, [currentSong]);
  
  // 处理下一首按钮的显示/隐藏逻辑
  useEffect(() => {
    // 如果鼠标悬停在任一按钮上，显示下一首按钮
    if (isHoveringPlayButton || isHoveringNextButton) {
      setShowNextButton(true);
      // 清除任何现有的定时器
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } else {
      // 如果鼠标不在任一按钮上，设置一个延迟后隐藏按钮
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setShowNextButton(false);
      }, 300); // 300ms延迟
    }
    
    // 清理函数
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isHoveringPlayButton, isHoveringNextButton]);

  // 监听滚动事件
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // 判断是否在页面顶部
      setIsAtTop(scrollTop < 50);
      
      // 判断是否显示"回到顶部"按钮 - 现在始终显示
      setShowScrollTop(true);
      
      // 判断是否在页面底部
      setIsAtBottom(scrollTop + windowHeight >= documentHeight - 50);
      
      // 如果在页面顶部，自动收起设置（隐藏主题切换按钮）
      if (scrollTop < 50) {
        setShowThemeButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // 初始检查
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 滚动到顶部
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // 滚动到底部
  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth'
    });
  };

  // 切换主题
  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  // 切换主题按钮显示
  const toggleThemeButton = () => {
    setShowThemeButton(!showThemeButton);
  };

  return (
    <div className={`fixed bottom-6 z-50 transition-all duration-300 ${isAtTop ? 'right-[-80px]' : 'right-6'}`}>
      {/* 下一首按钮 - 悬停时显示，独立于其他按钮 */}
      {showNextButton && (
        <div 
          className={`absolute bottom-0 flex items-center transition-opacity duration-300 ${
            showNextButton ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ right: '56px' }}
          onMouseEnter={() => setIsHoveringNextButton(true)}
          onMouseLeave={() => setIsHoveringNextButton(false)}
        >
          <button
            onClick={playNext}
            className={`p-3 ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110`}
            aria-label="下一首歌曲"
            title="下一首歌曲"
          >
            <ForwardIcon className="h-5 w-5" />
          </button>
        </div>
      )}
      
      <div className="flex flex-col space-y-2">
        {/* 主题切换按钮 - 条件显示 */}
        {showThemeButton && (
          <button
            onClick={toggleTheme}
            className={`p-3 ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 animate-[fadeIn_0.2s_ease-in-out]`}
            aria-label="切换主题"
            title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
            style={{ animation: 'fadeIn 0.2s ease-in-out' }}
          >
            {theme === 'dark' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
          </button>
        )}
        
        {/* 设置按钮 - 方形风格 */}
        <button
          onClick={toggleThemeButton}
          className={`p-3 ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110`}
          aria-label="设置"
          title="设置"
        >
          <AdjustmentsHorizontalIcon className="h-5 w-5" />
        </button>
        
        {/* 回到顶部按钮 - 方形风格 - 在页面顶部时禁用 */}
        {showScrollTop && (
          <button
            onClick={scrollToTop}
            className={`p-3 bg-primary text-primary-foreground rounded-lg shadow-lg hover:bg-primary/90 transition-all duration-300 transform hover:scale-110 ${
              isAtTop ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            aria-label="回到顶部"
            title="回到顶部"
            disabled={isAtTop}
          >
            <ChevronUpIcon className="h-5 w-5" />
          </button>
        )}
        
        {/* 转到页底按钮 - 方形风格 */}
        <button
          onClick={scrollToBottom}
          className={`p-3 ${theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 ${isAtBottom ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="转到页底"
          title="转到页底"
          disabled={isAtBottom}
        >
          <ChevronDownIcon className="h-5 w-5" />
        </button>
        
        {/* 播放/暂停音乐按钮 - 方形风格 */}
        <button
          onClick={togglePlayPause}
          onMouseEnter={() => setIsHoveringPlayButton(true)}
          onMouseLeave={() => setIsHoveringPlayButton(false)}
          className={`relative p-3 ${currentSong ? 'bg-primary text-primary-foreground hover:bg-primary/90' : theme === 'dark' ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 ${!currentSong ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label={isPlaying ? "暂停音乐" : "播放音乐"}
          title={isPlaying ? "暂停音乐" : "播放音乐"}
          disabled={!currentSong}
        >
          {/* 歌曲封面 - 优先使用提取的封面，如果没有则使用歌曲的cover属性 */}
          {currentSong && (extractedCover || currentSong.cover) && (
            <img 
              src={extractedCover || currentSong.cover} 
              alt={currentSong.title} 
              className="absolute inset-0 w-full h-full object-cover rounded-lg"
            />
          )}
          {/* 播放/暂停图标 - 添加半透明背景以确保图标可见 */}
          <div className={`relative z-10 ${currentSong && (extractedCover || currentSong.cover) ? 'bg-black/30 rounded-lg' : ''}`}>
            {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
          </div>
        </button>
      </div>
    </div>
  );
}