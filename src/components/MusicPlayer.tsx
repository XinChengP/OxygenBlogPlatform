'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { themeColors } from '@/setting/WebSetting';

// 音乐配置
const musicConfig = {
  title: "达拉崩吧",
  artist: "洛天依",
  url: "https://example.com/music/dalabengba.mp3", // 替换为实际音乐链接
  cover: "https://example.com/covers/dalabengba.jpg", // 替换为封面图
  autoPlay: false,
  loop: true,
};

export default function MusicPlayer() {
  const { resolvedTheme } = useTheme();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(musicConfig.autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isHovered, setIsHovered] = useState(false); // 用于显示/隐藏详细控制

  // 主题色处理
  const isDark = resolvedTheme === 'dark';
  const primaryColor = isDark 
    ? adjustBrightness(themeColors.primary, 1.3) 
    : adjustBrightness(themeColors.primary, 0.8);

  // 辅助函数：调整颜色亮度
  const adjustBrightness = (hex: string, factor: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return hex;
    
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    
    const adjust = (value: number) =>
      Math.max(0, Math.min(255, Math.round(value * factor)));

    const newR = adjust(r).toString(16).padStart(2, "0");
    const newG = adjust(g).toString(16).padStart(2, "0");
    const newB = adjust(b).toString(16).padStart(2, "0");

    return `#${newR}${newG}${newB}`;
  };

  // 音频初始化逻辑（保持不变）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = musicConfig.url;
    audio.loop = musicConfig.loop;
    audio.volume = volume;
    audio.muted = isMuted;

    if (musicConfig.autoPlay) {
      audio.play().catch(() => setIsPlaying(false));
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
    };
  }, [volume, isMuted]);

  // 播放控制函数（保持不变）
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    isPlaying ? audio.pause() : audio.play().catch(() => setIsPlaying(false));
    setIsPlaying(!isPlaying);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    audio.currentTime = newTime;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    audio.volume = newVolume;
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    audio.muted = newMuted;
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // 进度条百分比
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div 
      className="fixed bottom-6 right-6 z-50 transition-all duration-300 ease-in-out"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 音频元素 */}
      <audio ref={audioRef} />

      {/* 播放器主体 */}
      <div 
        className={`
          flex items-center gap-3 rounded-full shadow-lg
          transition-all duration-300 ease-in-out
          ${isHovered ? 'px-5 py-3' : 'px-3 py-2'}
          ${isDark ? 'bg-zinc-900/80' : 'bg-white/80'}
          backdrop-blur-md border border-border/20
        `}
      >
        {/* 旋转封面（带动画） */}
        <div className={`
          relative w-12 h-12 rounded-full overflow-hidden shadow-md
          transition-transform duration-300
          ${isPlaying ? 'animate-spin' : ''}
          ${isHovered ? 'scale-110' : ''}
        `}>
          <img 
            src={musicConfig.cover} 
            alt={`${musicConfig.title} - ${musicConfig.artist}`}
            className="w-full h-full object-cover"
          />
          {/* 封面中心装饰 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`w-3 h-3 rounded-full ${isDark ? 'bg-zinc-800' : 'bg-white'}`} />
          </div>
        </div>

        {/* 音乐信息（hover时显示） */}
        {isHovered && (
          <div className="max-w-[180px] overflow-hidden transition-opacity duration-300">
            <p className="text-sm font-medium text-foreground truncate">{musicConfig.title}</p>
            <p className="text-xs text-muted-foreground truncate">{musicConfig.artist}</p>
          </div>
        )}

        {/* 播放/暂停按钮（强调样式） */}
        <button 
          onClick={togglePlay}
          className={`
            w-9 h-9 rounded-full flex items-center justify-center
            transition-all duration-300
            ${isPlaying 
              ? `bg-primary/20 text-primary` 
              : `hover:bg-primary/10 text-foreground`
            }
          `}
          aria-label={isPlaying ? "暂停" : "播放"}
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
              <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
              <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
            </svg>
          )}
        </button>

        {/* 进度条（hover时显示） */}
        {isHovered && (
          <div className="flex items-center gap-2 w-[200px] transition-all duration-300">
            <span className="text-xs text-muted-foreground">{formatTime(currentTime)}</span>
            <div className="relative flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
              {/* 进度条填充 */}
              <div 
                className="absolute left-0 top-0 h-full transition-all duration-200 ease-linear"
                style={{ width: `${progressPercent}%`, backgroundColor: primaryColor }}
              />
              {/* 可点击的进度条轨道 */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleProgressChange}
                className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="进度调节"
              />
            </div>
            <span className="text-xs text-muted-foreground">{formatTime(duration)}</span>
          </div>
        )}

        {/* 音量控制（hover时显示） */}
        {isHovered && (
          <div className="flex items-center gap-2 transition-all duration-300">
            <button 
              onClick={toggleMute}
              className="p-1.5 rounded-full hover:bg-primary/10 transition-colors"
              aria-label={isMuted ? "取消静音" : "静音"}
            >
              {isMuted || volume === 0 ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill={primaryColor} viewBox="0 0 16 16">
                  <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06zm7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.646a.5.5 0 0 1 .708 0z"/>
                  <path d="M11 5.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 .5-.5zM8.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-1 0v-9a.5.5 0 0 1 .5-.5zm-5 0a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-1 0v-9a.5.5 0 0 1 .5-.5z"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill={primaryColor} viewBox="0 0 16 16">
                  <path d="M8 3a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0V8a5 5 0 0 0-5-5zM3 8a3 3 0 0 1 6 0v1a3 3 0 0 1-6 0V8zm10.5 3a.5.5 0 0 1 0 1h2a.5.5 0 0 1 0-1h-2zm0-11a.5.5 0 0 1 0 1h2a.5.5 0 0 1 0-1h-2zm8.5 0a.5.5 0 0 1 0 1h2a.5.5 0 0 1 0-1h-2zM12 1a.5.5 0 0 1 0 1h2a.5.5 0 0 1 0-1h-2zm-9 8a.5.5 0 0 1 0 1h2a.5.5 0 0 1 0-1H3zm0 5a.5.5 0 0 1 0 1h2a.5.5 0 0 1 0-1H3z"/>
                  <path d="M12.736 11.804a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L11 12.793l1.024-1.027a.5.5 0 0 1 .708 0z"/>
                  <path d="M11.707 9.514a.5.5 0 0 1 .708 0l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 0-.708l1.5-1.5z"/>
                  <path d="M10.707 7.32a.5.5 0 0 1 .708 0l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 0-.708l1.5-1.5z"/>
                </svg>
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={handleVolumeChange}
              className="w-[60px] h-1.5 rounded-full bg-muted/50 appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-3
                         [&::-webkit-slider-thumb]:h-3
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-primary
                         [&::-webkit-slider-thumb]:shadow-sm"
              aria-label="音量调节"
            />
          </div>
        )}
      </div>
    </div>
  );
}
