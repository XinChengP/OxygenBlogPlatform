'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

// 歌单配置 - 替换为实际音乐链接
const playList = [
  {
    id: 1,
    title: "达拉崩吧",
    artist: "洛天依",
    url: "https://example.com/music/dalabengba.mp3",
  },
  {
    id: 2,
    title: "千年食谱颂",
    artist: "洛天依",
    url: "https://example.com/music/qiannian.mp3",
  },
  {
    id: 3,
    title: "普通DISCO",
    artist: "洛天依、言和",
    url: "https://example.com/music/disico.mp3",
  },
  {
    id: 4,
    title: "蝴蝶",
    artist: "洛天依",
    url: "https://example.com/music/gongyongzhe.mp3",
  },
];

export default function MusicPlayer() {
  const { resolvedTheme } = useTheme();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // 播放器状态管理
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'player' | 'playlist'>('player');

  // 当前播放歌曲
  const currentSong = playList[currentSongIndex];

  // 主题适配
  const isDark = resolvedTheme === 'dark';
  const primaryColor = isDark ? 'var(--theme-primary)' : 'var(--theme-primary)';

  // 播放控制函数
  const playNextSong = () => {
    const newIndex = (currentSongIndex + 1) % playList.length;
    setCurrentSongIndex(newIndex);
    setIsPlaying(true);
  };

  // 音频初始化与事件监听
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong.url) return;

    audio.src = currentSong.url;
    audio.volume = volume;
    audio.muted = isMuted;

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleEnded = () => playNextSong();

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      if (audio) audio.pause();
    };
  }, [currentSong, volume, isMuted, isPlaying, playNextSong]);

  // 播放控制函数
  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    isPlaying ? audio.pause() : audio.play().catch(() => setIsPlaying(false));
    setIsPlaying(!isPlaying);
  };

  const changeSong = (index: number) => {
    setCurrentSongIndex(index);
    setIsPlaying(true);
    setIsSidebarOpen(false);
  };

  const playPrevSong = () => {
    const newIndex = (currentSongIndex - 1 + playList.length) % playList.length;
    setCurrentSongIndex(newIndex);
    setIsPlaying(true);
  };

  // 进度与音量控制
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
    setIsMuted(!isMuted);
    audio.muted = !isMuted;
  };

  // 时间格式化
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <>
      {/* 音频元素 */}
      <audio ref={audioRef} />

      {/* 侧边栏展开按钮 */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className={`
          fixed top-1/2 left-2 -translate-y-1/2 z-40 p-2 rounded-full
          ${isDark ? 'bg-zinc-900/80' : 'bg-white/80'}
          backdrop-blur-md border border-border/30 shadow-lg transition-all duration-300
          hover:bg-primary/10 text-foreground hover:text-primary
        `}
        aria-label="打开音乐播放器"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
          <path d="M8 3v10l6-5z" fill="currentColor" />
        </svg>
      </button>

      {/* 左侧侧边栏 */}
      <div 
        className={`
          fixed top-0 left-0 h-full z-40 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isDark ? 'bg-zinc-900/95' : 'bg-white/95'}
          backdrop-blur-md border-r border-border/30 w-72 shadow-xl
        `}
      >
        {/* 侧边栏头部 */}
        <div className="p-4 border-b border-border/20 flex items-center justify-between">
          <h3 className="font-medium text-lg text-foreground">音乐播放器</h3>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1.5 rounded-full hover:bg-primary/10 text-muted-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
              <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" fill="currentColor" />
            </svg>
          </button>
        </div>

        {/* 标签切换 */}
        <div className="flex border-b border-border/20">
          <button
            onClick={() => setActiveTab('player')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'player' 
                ? `text-primary border-b-2 border-primary` 
                : `text-muted-foreground hover:text-foreground`
            }`}
          >
            正在播放
          </button>
          <button
            onClick={() => setActiveTab('playlist')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'playlist' 
                ? `text-primary border-b-2 border-primary` 
                : `text-muted-foreground hover:text-foreground`
            }`}
          >
            歌单列表
          </button>
        </div>

        {/* 正在播放面板 */}
        {activeTab === 'player' && (
          <div className="p-4">
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h4 className="text-lg font-medium text-foreground">{currentSong.title}</h4>
                <p className="text-sm text-muted-foreground">{currentSong.artist}</p>
              </div>

              {/* 播放控制按钮 */}
              <div className="flex justify-center gap-4 py-4">
                <button 
                  onClick={playPrevSong}
                  className="p-2.5 rounded-full hover:bg-primary/10 text-foreground transition-colors"
                  aria-label="上一首"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                    <path d="M9.5 3.5L7 6H2v4h5l2.5 2.5L9 10.5l-3-3 3-3L9.5 3.5zm-7 0L.5 5.5 3.5 8.5.5 11.5 2.5 13.5l4-4-4-4z" fill="currentColor" />
                  </svg>
                </button>
                <button 
                  onClick={togglePlay}
                  className={`p-3.5 rounded-full transition-colors ${
                    isPlaying ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                  }`}
                  aria-label={isPlaying ? "暂停" : "播放"}
                >
                  {isPlaying ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                      <path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                      <path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z" fill="currentColor" />
                    </svg>
                  )}
                </button>
                <button 
                  onClick={playNextSong}
                  className="p-2.5 rounded-full hover:bg-primary/10 text-foreground transition-colors"
                  aria-label="下一首"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 16 16">
                    <path d="M6.5 12.5L9 10H14V6H9L6.5 3.5L7 2.5l4 4-4 4L6.5 12.5zm7-10L13.5 5.5 10.5 8.5 13.5 11.5 15.5 13.5l-4-4 4-4z" fill="currentColor" />
                  </svg>
                </button>
              </div>

              {/* 进度条 */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="relative h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full transition-all duration-200 ease-linear"
                    style={{ width: `${progressPercent}%`, backgroundColor: primaryColor }}
                  />
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
              </div>

              {/* 音量控制 */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={toggleMute}
                  className="p-1.5 rounded-full hover:bg-primary/10 transition-colors"
                  aria-label={isMuted ? "取消静音" : "静音"}
                >
                  {isMuted || volume === 0 ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06zm7.137 2.096a.5.5 0 0 1 0 .708L12.207 8l1.647 1.646a.5.5 0 0 1-.708.708L11.5 8.707l-1.646 1.647a.5.5 0 0 1-.708-.708L10.793 8 9.146 6.354a.5.5 0 1 1 .708-.708L11.5 7.293l1.646-1.646a.5.5 0 0 1 .708 0z" fill="currentColor" />
                      <path d="M11 5.5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 .5-.5zM8.5 3a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-1 0v-9a.5.5 0 0 1 .5-.5zm-5 0a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-1 0v-9a.5.5 0 0 1 .5-.5z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                      <path d="M8 3a5 5 0 0 0-5 5v1a5 5 0 0 0 10 0V8a5 5 0 0 0-5-5zM3 8a3 3 0 0 1 6 0v1a3 3 0 0 1-6 0V8z" fill="currentColor" />
                      <path d="M12.736 11.804a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 .708-.708L11 12.793l1.024-1.027a.5.5 0 0 1 .708 0z" fill="currentColor" />
                      <path d="M11.707 9.514a.5.5 0 0 1 .708 0l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 0-.708l1.5-1.5z" fill="currentColor" />
                      <path d="M10.707 7.32a.5.5 0 0 1 .708 0l1.5 1.5a.5.5 0 0 1 0 .708l-1.5 1.5a.5.5 0 0 1-.708 0l-1.5-1.5a.5.5 0 0 1 0-.708l1.5-1.5z" fill="currentColor" />
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
                  className="w-full h-1.5 rounded-full bg-muted/50 appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none
                             [&::-webkit-slider-thumb]:w-3
                             [&::-webkit-slider-thumb]:h-3
                             [&::-webkit-slider-thumb]:rounded-full
                             [&::-webkit-slider-thumb]:bg-primary
                             [&::-webkit-slider-thumb]:shadow-sm"
                  aria-label="音量调节"
                />
              </div>
            </div>
          </div>
        )}

        {/* 歌单列表面板 */}
        {activeTab === 'playlist' && (
          <div className="max-h-[calc(100vh-110px)] overflow-y-auto">
            <ul className="divide-y divide-border/20">
              {playList.map((song, index) => (
                <li 
                  key={song.id}
                  onClick={() => changeSong(index)}
                  className={`
                    p-3 flex items-center justify-between cursor-pointer transition-colors
                    ${currentSongIndex === index 
                      ? `bg-primary/10 text-primary` 
                      : `hover:bg-accent/5 text-foreground`
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  {currentSongIndex === index && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                      <path d="m12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L8.885 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z" fill="currentColor" />
                    </svg>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
