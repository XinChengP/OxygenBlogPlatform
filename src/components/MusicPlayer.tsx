'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import GlobalMusicPlayerManager from '@/utils/globalMusicPlayerManager';
import type { APlayerNS } from '@/types/aplayer';
import { emitMusicEvent } from '@/utils/live2dEventEmitter';
import { getAssetPath } from '@/utils/assetUtils';

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

// 使用React.memo减少不必要的渲染
const MusicPlayerComponent = function MusicPlayer({ 
  defaultAudioList = [],
  autoPlay = false,
  loop = false 
}: MusicPlayerProps) {
  const aplayerRef = useRef<HTMLDivElement>(null);
  const [currentAudioList, setCurrentAudioList] = useState<AudioItem[]>(defaultAudioList);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 确保客户端挂载完成
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 使用项目中的getAssetPath函数处理资源路径，确保在所有环境下正确访问
  const formatAudioUrl = useCallback((url: string) => {
    if (!isClient) return url; // 服务端渲染时返回原始URL
    
    // 使用项目中已有的assetUtils.getAssetPath函数处理资源路径
    return getAssetPath(url);
  }, [isClient]);

  // 从文件路径中提取显示名称，隐藏"-"后面的所有文字
  const extractDisplayName = useCallback((filePath: string): string => {
    // 提取文件名（去掉路径）
    const fileName = filePath.split('/').pop() || '';
    // 去掉扩展名
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    // 去掉"-"后面的所有文字
    const displayName = nameWithoutExt.split(' - ')[0];
    return displayName;
  }, []);

  // 获取封面文件路径，支持jpg和png格式
  const getCoverPath = useCallback((songFileName: string): string => {
    const baseName = songFileName.replace(/\.[^/.]+$/, '');
    
    // 根据实际文件格式返回正确的路径
    if (baseName === '三月雨 - 洛天依') {
      return '/music/covers/三月雨 - 洛天依.png';
    }
    if (baseName === '白石溪 - 洛天依、乐正绫') {
      return '/music/covers/白石溪 - 洛天依、乐正绫.png';
    }
    
    // 默认返回jpg格式
    return `/music/covers/${baseName}.jpg`;
  }, []);

  // 音乐列表 - 使用extractDisplayName函数自动处理文件名
  const defaultMusicList = useMemo(() => {
    return [
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
  }, [extractDisplayName, formatAudioUrl, getCoverPath]);

  // 切换音乐列表
  const switchAudioList = useCallback((newList: AudioItem[]) => {
    setCurrentAudioList(newList);
  }, []);

  useEffect(() => {
    if (!isClient) return; // 确保客户端挂载完成后再初始化
    
    const globalManager = GlobalMusicPlayerManager.getInstance();
    
    // 检查是否已经初始化过播放器
    if (isInitialized) return;
    
    const initAPlayer = async () => {
      // 动态加载APlayer
      if (typeof window !== 'undefined' && aplayerRef.current) {
        try {
          // 检查是否已经加载过APlayer
          if (!(window as any).APlayer) {
            // 动态加载APlayer脚本和样式（使用本地文件）
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = formatAudioUrl('/aplayer/APlayer.min.css');
            document.head.appendChild(link);

            // 加载APlayer脚本
            const script = document.createElement('script');
            script.src = formatAudioUrl('/aplayer/APlayer.min.js');
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
        lrcType: 3, // 启用歌词显示，使用lrc文件
        listFolded: true, // 折叠列表
        listMaxHeight: 400, // 增加列表最大高度以确保完整显示
        storageName: 'musicPlayer', // 本地存储名称
        // 添加额外配置以确保播放器行为一致
        theme: '#1DA1F2', // 设置主题色以匹配网站主题
        order: 'list', // 列表循环播放模式
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

      // 监听播放开始事件，触发Live2D提示
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

      // 监听暂停事件
      const handlePause = () => {
        emitMusicEvent('pause');
        globalManager.savePlayState();
      };

      // 监听各种播放器事件
      ap.on('play', handlePlayStart);
      ap.on('pause', handlePause);
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

      // 添加歌手名称高亮功能（只高亮特定歌手名字）
      const highlightArtistNames = () => {
        const artistElements = document.querySelectorAll('.aplayer-list-author');
        artistElements.forEach(element => {
          const text = element.textContent || '';
          let highlightedText = text;
          
          // 高亮洛天依
          if (text.includes('洛天依')) {
            highlightedText = highlightedText.replace(/洛天依/g, '<span style="color: #66ccff">洛天依</span>');
          }
          
          // 高亮乐正绫
          if (text.includes('乐正绫')) {
            highlightedText = highlightedText.replace(/乐正绫/g, '<span style="color: #ee0000">乐正绫</span>');
          }
          
          // 高亮言和
          if (text.includes('言和')) {
            highlightedText = highlightedText.replace(/言和/g, '<span style="color: #00ffcc">言和</span>');
          }
          
          // 高亮星尘（第一个字9999ff，第二个字ffff00）
          if (text.includes('星尘')) {
            // 将"星尘"拆分为"星"和"尘"，分别设置不同颜色
            highlightedText = highlightedText.replace(/星尘/g, '<span style="color: #9999ff">星</span><span style="color: #ffff00">尘</span>');
          }
          
          if (highlightedText !== text) {
            // 使用DOMPurify清理HTML内容，防止XSS攻击
            element.innerHTML = DOMPurify.sanitize(highlightedText);
          }
        });
      };

      // 监听列表切换事件，重新应用高亮
      ap.on('listswitch', () => {
        setTimeout(highlightArtistNames, 100);
      });

      // 重写列表显示方法，确保高亮效果
      const originalListShow = ap.list.show;
      ap.list.show = function() {
        originalListShow.call(this);
        setTimeout(highlightArtistNames, 100);
      };

      // 初始应用高亮
      setTimeout(highlightArtistNames, 200);

      // 默认隐藏歌词 - 使用更可靠的方法
      setTimeout(() => {
        if (ap.lrc) {
          ap.lrc.hide();
          // 确保歌词元素被正确隐藏
          const lrcElement = document.querySelector('.aplayer-lrc');
          if (lrcElement) {
            lrcElement.classList.add('aplayer-lrc-hide');
            lrcElement.classList.remove('aplayer-lrc-show');
          }
        }
      }, 100);

      setIsInitialized(true);

      // 设置页面切换监听器，确保播放器在页面切换时保持状态
      const handlePageVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          // 页面隐藏时保存状态，但不暂停播放
          globalManager.savePlayState();
        }
      };
      document.addEventListener('visibilitychange', handlePageVisibilityChange);

      // 清理函数 - 注意：我们不销毁播放器实例，只移除事件监听
      return () => {
        window.removeEventListener('beforeunload', saveStateBeforeUnload);
        document.removeEventListener('visibilitychange', handlePageVisibilityChange);
        // 移除APlayer事件监听器
        ap.off('play', handlePlayStart);
        ap.off('pause', handlePause);
        ap.off('timeupdate', handlePlayerEvent);
        ap.off('volumechange', handlePlayerEvent);
        ap.off('listswitch', handlePlayerEvent);
        // 不调用ap.destroy()，这样播放器实例会保留在全局管理器中
        // 页面切换时音乐不会中断
      };
    }
  };

    initAPlayer();
  }, [isClient, isInitialized, autoPlay, loop, currentAudioList, formatAudioUrl]);

  

  return (
    <div ref={aplayerRef} className="aplayer-container" />
  );
};

// 使用React.memo减少不必要的渲染
export default React.memo(MusicPlayerComponent);