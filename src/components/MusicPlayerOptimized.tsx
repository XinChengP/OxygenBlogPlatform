'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import GlobalMusicPlayerManager from '@/utils/globalMusicPlayerManager';
import type { APlayerNS } from '@/types/aplayer';
import { emitMusicEvent } from '@/utils/live2dEventEmitter';

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

// 缓存管理器
class MusicPlayerCache {
  private static instance: MusicPlayerCache;
  private audioListCache: Map<string, AudioItem[]> = new Map();
  private urlCache: Map<string, string> = new Map();
  private basePathCache: string | null = null;

  static getInstance() {
    if (!this.instance) {
      this.instance = new MusicPlayerCache();
    }
    return this.instance;
  }

  getCachedAudioList(key: string): AudioItem[] | undefined {
    return this.audioListCache.get(key);
  }

  setCachedAudioList(key: string, list: AudioItem[]) {
    this.audioListCache.set(key, list);
  }

  getCachedUrl(key: string): string | undefined {
    return this.urlCache.get(key);
  }

  setCachedUrl(key: string, url: string) {
    this.urlCache.set(key, url);
  }

  getCachedBasePath(): string | null {
    return this.basePathCache;
  }

  setCachedBasePath(path: string) {
    this.basePathCache = path;
  }

  clear() {
    this.audioListCache.clear();
    this.urlCache.clear();
    this.basePathCache = null;
  }
}

export default function MusicPlayerOptimized({ 
  defaultAudioList = [],
  autoPlay = false,
  loop = false 
}: MusicPlayerProps) {
  const aplayerRef = useRef<HTMLDivElement>(null);
  const [currentAudioList, setCurrentAudioList] = useState<AudioItem[]>(defaultAudioList);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const cacheRef = useRef(MusicPlayerCache.getInstance());

  // 确保客户端挂载完成
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 优化的basePath获取 - 使用缓存
  const getBasePath = useCallback(() => {
    if (!isClient) return '';
    
    const cached = cacheRef.current.getCachedBasePath();
    if (cached !== null) return cached;
    
    if (typeof window !== 'undefined') {
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        cacheRef.current.setCachedBasePath('');
        return '';
      }
      
      const pathArray = window.location.pathname.split('/');
      if (pathArray.length > 1 && pathArray[1]) {
        const basePath = `/${pathArray[1]}`;
        cacheRef.current.setCachedBasePath(basePath);
        return basePath;
      }
    }
    
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
    cacheRef.current.setCachedBasePath(basePath);
    return basePath;
  }, [isClient]);

  // 优化的URL格式化 - 使用缓存
  const formatAudioUrl = useCallback((url: string) => {
    if (!isClient) return url;
    
    const cacheKey = url;
    const cached = cacheRef.current.getCachedUrl(cacheKey);
    if (cached) return cached;
    
    let result: string;
    
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      result = url.startsWith('/') ? url : `/${url}`;
    } else if (url.startsWith('http')) {
      result = url;
    } else {
      const basePath = getBasePath();
      const cleanUrl = url.startsWith('/') ? url : `/${url}`;
      result = basePath ? `${basePath}${cleanUrl}` : cleanUrl;
    }
    
    cacheRef.current.setCachedUrl(cacheKey, result);
    return result;
  }, [isClient, getBasePath]);

  // 缓存音乐列表处理
  const processedMusicList = useMemo(() => {
    const cacheKey = 'defaultMusicList';
    const cached = cacheRef.current.getCachedAudioList(cacheKey);
    if (cached) return cached;

    // 从文件路径中提取显示名称，隐藏"-"后面的所有文字
    const extractDisplayName = (filePath: string): string => {
      const fileName = filePath.split('/').pop() || '';
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
      return nameWithoutExt.split(' - ')[0];
    };

    // 获取封面文件路径，支持jpg和png格式
    const getCoverPath = (songFileName: string): string => {
      const baseName = songFileName.replace(/\.[^/.]+$/, '');
      
      if (baseName === '三月雨 - 洛天依') {
        return '/music/covers/三月雨 - 洛天依.png';
      }
      if (baseName === '白石溪 - 洛天依、乐正绫') {
        return '/music/covers/白石溪 - 洛天依、乐正绫.png';
      }
      
      return `/music/covers/${baseName}.jpg`;
    };

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
      "/music/白石溪 - 洛天依、乐正绫.mp3"
    ].map(filePath => {
      const songName = extractDisplayName(filePath);
      const fullFileName = filePath.split('/').pop() || '';
      const nameWithoutExt = fullFileName.replace(/\.[^/.]+$/, '');
      
      return {
        name: songName,
        artist: nameWithoutExt.includes('乐正绫') ? '洛天依、乐正绫' : '洛天依',
        url: filePath,
        cover: formatAudioUrl(getCoverPath(fullFileName)),
        lrc: formatAudioUrl(`/music/lyrics/${nameWithoutExt}.lrc`)
      };
    });

    cacheRef.current.setCachedAudioList(cacheKey, defaultMusicList);
    return defaultMusicList;
  }, [formatAudioUrl]);

  // 优化的APlayer初始化
  useEffect(() => {
    if (!isClient || !aplayerRef.current) return;
    
    const globalManager = GlobalMusicPlayerManager.getInstance();
    let isMounted = true;
    
    const initAPlayer = async () => {
      try {
        // 检查是否已经加载过APlayer
        if (!(window as any).APlayer) {
          await loadAPlayerResources();
        }
        
        if (!isMounted) return;
        
        // 检查是否有全局实例
        if (globalManager.isPlayerInitialized()) {
          useExistingPlayer();
        } else {
          initializePlayer();
        }
      } catch (error) {
        console.error('加载APlayer失败:', error);
      }
    };

    const loadAPlayerResources = async () => {
      return new Promise<void>((resolve, reject) => {
        // 检查资源是否已加载
        if (document.querySelector('link[href*="APlayer.min.css"]')) {
          resolve();
          return;
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = formatAudioUrl('/aplayer/APlayer.min.css');
        
        const script = document.createElement('script');
        script.src = formatAudioUrl('/aplayer/APlayer.min.js');
        
        let loadedCount = 0;
        const checkComplete = () => {
          loadedCount++;
          if (loadedCount === 2) resolve();
        };
        
        link.onload = checkComplete;
        script.onload = checkComplete;
        link.onerror = () => reject(new Error('CSS加载失败'));
        script.onerror = () => reject(new Error('脚本加载失败'));
        
        document.head.appendChild(link);
        document.head.appendChild(script);
      });
    };

    const useExistingPlayer = () => {
      if (!globalManager.isPlayerInitialized()) return;
      
      const ap = globalManager.getPlayer();
      
      // 将现有播放器容器移动到当前组件的DOM位置
      if (aplayerRef.current && ap.container !== aplayerRef.current) {
        while (aplayerRef.current.firstChild) {
          aplayerRef.current.removeChild(aplayerRef.current.firstChild);
        }
        
        while (ap.container.firstChild) {
          aplayerRef.current.appendChild(ap.container.firstChild);
        }
        
        ap.container = aplayerRef.current;
      }
      
      if (isMounted) setIsInitialized(true);
    };

    const initializePlayer = () => {
      if (!(window as any).APlayer || !aplayerRef.current) return;
      
      const APlayer = (window as any).APlayer;
      const savedPlayInfo = globalManager.restorePlayState();
      const { index: initialIndex = 0, currentTime: initialTime = 0, paused: initialPaused = true } = savedPlayInfo || {};

      // 处理音频列表
      const processedAudioList = (currentAudioList.length > 0 ? currentAudioList : processedMusicList).map(audio => ({
        ...audio,
        url: formatAudioUrl(audio.url)
      }));

      // 创建APlayer实例
      const ap = new APlayer({
        container: aplayerRef.current,
        audio: processedAudioList,
        fixed: true,
        autoplay: autoPlay,
        loop: loop,
        preload: 'metadata', // 只预加载元数据，减少初始加载
        volume: 0.7,
        mutex: true,
        lrcType: 3,
        listFolded: true,
        listMaxHeight: 400,
        storageName: 'musicPlayer',
        theme: '#1DA1F2',
        order: 'list',
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

      // 优化的歌词隐藏
      setTimeout(() => {
        if (ap.lrc) {
          ap.lrc.hide();
          const lrcElement = document.querySelector('.aplayer-lrc');
          if (lrcElement) {
            lrcElement.classList.add('aplayer-lrc-hide');
            lrcElement.classList.remove('aplayer-lrc-show');
          }
        }
      }, 100);

      setupEventListeners(ap);
      setupArtistHighlighting(ap);
      
      globalManager.setPlayer(ap);
      (window as any).globalAPlayer = ap;
      
      if (isMounted) setIsInitialized(true);
    };

    const setupEventListeners = (ap: any) => {
      // 优化的播放事件处理
      const handlePlayStart = () => {
        const currentAudio = ap.list.audios[ap.list.index];
        if (currentAudio) {
          emitMusicEvent('play', {
            title: currentAudio.name || '',
            artist: currentAudio.artist || ''
          });
        }
        globalManager.savePlayState();
      };

      const handlePause = () => {
        emitMusicEvent('pause');
        globalManager.savePlayState();
      };

      const handlePlayerEvent = () => {
        globalManager.savePlayState();
      };

      // 使用防抖的事件处理
      let saveTimeout: NodeJS.Timeout;
      const debouncedSave = () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => globalManager.savePlayState(), 100);
      };

      ap.on('play', handlePlayStart);
      ap.on('pause', handlePause);
      ap.on('timeupdate', debouncedSave);
      ap.on('volumechange', debouncedSave);
      ap.on('listswitch', debouncedSave);

      // 页面可见性变化处理
      const handlePageVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          debouncedSave();
        }
      };
      
      document.addEventListener('visibilitychange', handlePageVisibilityChange);

      // 保存清理函数
      (ap as any)._cleanupFunctions = [
        () => document.removeEventListener('visibilitychange', handlePageVisibilityChange),
        () => clearTimeout(saveTimeout)
      ];
    };

    const setupArtistHighlighting = (ap: any) => {
      // 优化的歌手名称高亮
      const highlightArtistNames = () => {
        const artistElements = document.querySelectorAll('.aplayer-list-author');
        
        artistElements.forEach(element => {
          const text = element.textContent || '';
          if ((element as any)._highlighted) return; // 避免重复处理
          
          let highlightedText = text;
          
          if (text.includes('洛天依')) {
            highlightedText = highlightedText.replace(/洛天依/g, '<span style="color: #66ccff">洛天依</span>');
          }
          if (text.includes('乐正绫')) {
            highlightedText = highlightedText.replace(/乐正绫/g, '<span style="color: #ee0000">乐正绫</span>');
          }
          if (text.includes('言和')) {
            highlightedText = highlightedText.replace(/言和/g, '<span style="color: #00ffcc">言和</span>');
          }
          if (text.includes('星尘')) {
            highlightedText = highlightedText.replace(/星尘/g, '<span style="color: #9999ff">星</span><span style="color: #ffff00">尘</span>');
          }
          
          if (highlightedText !== text) {
            element.innerHTML = highlightedText;
            (element as any)._highlighted = true;
          }
        });
      };

      // 批量处理高亮
      const debouncedHighlight = () => {
        requestAnimationFrame(highlightArtistNames);
      };

      ap.on('listswitch', debouncedHighlight);
      
      const originalListShow = ap.list.show;
      ap.list.show = function() {
        originalListShow.call(this);
        debouncedHighlight();
      };

      // 初始高亮
      setTimeout(debouncedHighlight, 200);
    };

    initAPlayer();

    return () => {
      isMounted = false;
      
      // 清理事件监听器
      if ((window as any).globalAPlayer?._cleanupFunctions) {
        (window as any).globalAPlayer._cleanupFunctions.forEach((fn: Function) => fn());
      }
    };
  }, [isClient, autoPlay, loop, currentAudioList, processedMusicList, formatAudioUrl]);

  // 切换音乐列表
  const switchAudioList = useCallback((newList: AudioItem[]) => {
    setCurrentAudioList(newList);
    cacheRef.current.clear(); // 清除缓存
  }, []);

  return (
    <div ref={aplayerRef} className="aplayer-container" />
  );
}