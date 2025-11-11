'use client';

import { useEffect, useRef, useState } from 'react';

interface AudioItem {
  name: string;
  artist: string;
  url: string;
  cover?: string;
  lrc?: string;
}

interface MusicPlayerProps {
  defaultAudioList?: AudioItem[];
  autoPlay?: boolean;
  loop?: boolean;
}

export default function MusicPlayer({ 
  defaultAudioList = [],
  autoPlay = false,
  loop = false 
}: MusicPlayerProps) {
  const aplayerRef = useRef<HTMLDivElement>(null);
  const [currentAudioList, setCurrentAudioList] = useState<AudioItem[]>(defaultAudioList);
  const [isInitialized, setIsInitialized] = useState(false);

  // 获取正确的basePath，处理GitHub Pages部署
  const getBasePath = () => {
    if (typeof window !== 'undefined') {
      // 在开发模式下（localhost），不需要basePath
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return '';
      }
      
      // GitHub Pages部署时，使用固定的basePath
      // GitHub Pages的basePath通常是仓库名
      const pathArray = window.location.pathname.split('/');
      // GitHub Pages通常将仓库名作为第一个路径段
      // 例如：https://xinchengp.github.io/OxygenBlogPlatform/blogs/
      // 其中"OxygenBlogPlatform"是仓库名
      if (pathArray.length > 1 && pathArray[1]) {
        return `/${pathArray[1]}`;
      }
    }
    // 在服务器端，使用构建时的basePath
    return process.env.NEXT_PUBLIC_BASE_PATH || '';
  };

  // 格式化音频URL，确保在GitHub Pages上正确访问
  const formatAudioUrl = (url: string) => {
    // 在开发模式下（localhost），直接返回原始URL
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return url;
    }
    
    // 在生产模式下，处理basePath
    const basePath = getBasePath();
    if (url.startsWith('http')) {
      return url; // 外部URL直接返回
    }
    
    // 确保路径以/开头
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return basePath ? `${basePath}${cleanUrl}` : cleanUrl;
  };

  // 从文件路径中提取显示名称，隐藏"-"后面的所有文字
  const extractDisplayName = (filePath: string): string => {
    // 提取文件名（去掉路径）
    const fileName = filePath.split('/').pop() || '';
    // 去掉扩展名
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    // 去掉"-"后面的所有文字
    const displayName = nameWithoutExt.split(' - ')[0];
    return displayName;
  };

  // 音乐列表 - 使用extractDisplayName函数自动处理文件名
  const defaultMusicList: AudioItem[] = [
    "/music/一半一半 - 洛天依.mp3",
    "/music/三月雨 - 洛天依.mp3",
    "/music/夏虫 - 洛天依.mp3",
    "/music/天星问 - 洛天依.mp3",
    "/music/流光 (Light Me Up) - 洛天依.mp3",
    "/music/啥啊 - 洛天依.mp3",
    "/music/异样的风暴中心 - 洛天依.mp3",
    "/music/歌行四方 - 洛天依.mp3",
    "/music/蝴蝶 - 洛天依.mp3",
    "/music/珍珠.mp3"
  ].map(filePath => ({
    name: extractDisplayName(filePath),
    artist: "洛天依",
    url: filePath,
    cover: "/placeholder-album.png"
  }));

  useEffect(() => {
    const initAPlayer = async () => {
      // 动态加载APlayer
      if (typeof window !== 'undefined' && aplayerRef.current) {
        try {
          // 检查是否已经加载过APlayer
          if (!(window as any).APlayer) {
            // 动态加载APlayer脚本和样式
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.css';
            document.head.appendChild(link);

            // 加载APlayer脚本
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/aplayer@1.10.1/dist/APlayer.min.js';
            script.onload = () => {
              initializePlayer();
            };
            script.onerror = () => {
              console.error('加载APlayer脚本失败，请检查网络连接');
            };
            document.head.appendChild(script);
          } else {
            // APlayer已经加载，直接初始化
            initializePlayer();
          }
        } catch (error) {
          console.error('加载APlayer失败:', error);
        }
      }
    };

    const initializePlayer = () => {
      if (typeof window !== 'undefined' && (window as any).APlayer && aplayerRef.current) {
        const APlayer = (window as any).APlayer;
        
        // 获取保存的播放状态
        const savedPlayInfo = localStorage.getItem('musicPlayerState');
        let initialIndex = 0;
        let initialTime = 0;
        let initialPaused = true;

        if (savedPlayInfo) {
          try {
            const playInfo = JSON.parse(savedPlayInfo);
            initialIndex = playInfo.index || 0;
            initialTime = playInfo.currentTime || 0;
            initialPaused = playInfo.paused !== false;
          } catch (e) {
            console.error('解析保存的播放状态失败:', e);
          }
        }

        // 处理音频列表，确保路径正确
        const processedAudioList = (currentAudioList.length > 0 ? currentAudioList : defaultMusicList).map(audio => ({
          ...audio,
          url: formatAudioUrl(audio.url)
        }));

        // 创建APlayer实例
        const ap = new APlayer({
          container: aplayerRef.current,
          audio: processedAudioList,
          fixed: true, // 吸底模式
          autoplay: autoPlay,
          loop: loop,
          preload: 'metadata',
          volume: 0.7,
          mutex: true, // 阻止其他播放器同时播放
          lrcType: 0, // 禁用歌词显示
          listFolded: true, // 折叠列表
          listMaxHeight: 300, // 增加列表最大高度以显示更多歌曲
          storageName: 'musicPlayer', // 本地存储名称
        });

        // 设置初始播放状态
        if (initialIndex > 0) {
          ap.list.switch(initialIndex);
        }
        if (initialTime > 0) {
          ap.seek(initialTime);
        }
        if (!initialPaused) {
          ap.play();
        }

        // 监听播放状态变化并保存
        const savePlayState = () => {
          const playState = {
            index: ap.list.index,
            currentTime: ap.audio.currentTime,
            paused: ap.paused,
            volume: ap.volume,
            muted: ap.muted
          };
          localStorage.setItem('musicPlayerState', JSON.stringify(playState));
        };

        ap.on('play', savePlayState);
        ap.on('pause', savePlayState);
        ap.on('timeupdate', savePlayState);
        ap.on('volumechange', savePlayState);

        // 页面卸载前保存状态
        window.addEventListener('beforeunload', savePlayState);

        // 监听歌曲切换（使用正确的事件名）
        ap.on('listswitch', () => {
          savePlayState();
        });

        setIsInitialized(true);
      }
    };

    initAPlayer();

    // 清理函数
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', () => {});
      }
    };
  }, [autoPlay, loop, currentAudioList, defaultMusicList]);

  // 切换音乐列表
  const switchAudioList = (newList: AudioItem[]) => {
    setCurrentAudioList(newList);
  };

  return (
    <div ref={aplayerRef} className="aplayer-container" />
  );
}