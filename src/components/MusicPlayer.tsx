'use client';

import { useEffect, useRef, useState } from 'react';
import GlobalMusicPlayerManager from '@/utils/globalMusicPlayerManager';

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
    const globalManager = GlobalMusicPlayerManager.getInstance();
    
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
            // APlayer已经加载，检查是否有全局实例
            if (globalManager.isPlayerInitialized()) {
              // 已有全局实例，直接使用
              useExistingPlayer();
            } else {
              // 没有全局实例，创建新的
              initializePlayer();
            }
          }
        } catch (error) {
          console.error('加载APlayer失败:', error);
        }
      }
    };

    const useExistingPlayer = () => {
      if (typeof window !== 'undefined' && globalManager.isPlayerInitialized()) {
        const ap = globalManager.getPlayer();
        
        // 将现有播放器容器移动到当前组件的DOM位置
        if (aplayerRef.current && ap.container !== aplayerRef.current) {
          // 清空当前容器
          while (aplayerRef.current.firstChild) {
            aplayerRef.current.removeChild(aplayerRef.current.firstChild);
          }
          // 将播放器DOM移动到新容器
          while (ap.container.firstChild) {
            aplayerRef.current.appendChild(ap.container.firstChild);
          }
          // 更新播放器的容器引用
          ap.container = aplayerRef.current;
        }
        
        setIsInitialized(true);
      }
    };

    const initializePlayer = () => {
    if (typeof window !== 'undefined' && (window as any).APlayer && aplayerRef.current) {
      const APlayer = (window as any).APlayer;
      
      // 获取保存的播放状态
      const savedPlayInfo = globalManager.restorePlayState();
      const { index: initialIndex = 0, currentTime: initialTime = 0, paused: initialPaused = true } = savedPlayInfo || {};

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

      // 监听播放事件，保存状态
      const handlePlayerEvent = () => {
        globalManager.savePlayState();
      };

      // 监听各种播放器事件
      ap.on('play', handlePlayerEvent);
      ap.on('pause', handlePlayerEvent);
      ap.on('timeupdate', handlePlayerEvent);
      ap.on('volumechange', handlePlayerEvent);
      ap.on('listswitch', handlePlayerEvent);

      // 页面卸载前保存状态
      const saveStateBeforeUnload = () => {
        globalManager.savePlayState();
      };
      window.addEventListener('beforeunload', saveStateBeforeUnload);

      // 设置播放器实例到全局管理器
      globalManager.setPlayer(ap);
      (window as any).globalAPlayer = ap;

      setIsInitialized(true);

      // 设置页面切换监听器，确保播放器在页面切换时保持状态
      const handlePageVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          // 页面隐藏时保存状态
          globalManager.savePlayState();
        }
      };
      document.addEventListener('visibilitychange', handlePageVisibilityChange);

      // 清理函数 - 注意：我们不销毁播放器实例，只移除事件监听
      return () => {
        window.removeEventListener('beforeunload', saveStateBeforeUnload);
        document.removeEventListener('visibilitychange', handlePageVisibilityChange);
        // 移除APlayer事件监听器
        ap.off('play', handlePlayerEvent);
        ap.off('pause', handlePlayerEvent);
        ap.off('timeupdate', handlePlayerEvent);
        ap.off('volumechange', handlePlayerEvent);
        ap.off('listswitch', handlePlayerEvent);
        // 不调用ap.destroy()，这样播放器实例会保留在全局管理器中
        // 页面切换时音乐不会中断
      };
    }
  };

    initAPlayer();
  }, [autoPlay, loop, currentAudioList, defaultMusicList]);

  // 切换音乐列表
  const switchAudioList = (newList: AudioItem[]) => {
    setCurrentAudioList(newList);
  };

  return (
    <div ref={aplayerRef} className="aplayer-container" />
  );
}