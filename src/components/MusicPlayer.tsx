'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import HowlerPlayerManager from '@/utils/howlerPlayerManager';
import type { PlaybackErrorDetail } from '@/utils/howlerPlayerManager';
import { musicConfigManager, ProcessedAudioItem } from '@/utils/musicConfigManager';
import type { PlayMode } from '@/types/music';
import { emitMusicEvent } from '@/utils/live2dEventEmitter';
import { getMusicPlayerVisibility, onMusicPlayerVisibilityChange } from '@/utils/musicPlayerVisibility';
import MusicPlayerPreloader from '@/utils/musicPlayerPreloader';
import { parseLrc, LrcLine } from '@/utils/lrcParser';
import { live2dLyricsRenderer, refreshLyricsStyles } from '@/utils/live2dLyricsRenderer';
import { getAssetPath } from '@/utils/assetUtils';
import ArtistName from '@/components/music/ArtistName';
import PlaylistPanel from '@/components/music/PlaylistPanel';
import type { PlaylistPanelHandle } from '@/components/music/PlaylistPanel';
import ProgressBar from '@/components/music/ProgressBar';
import VolumeSlider from '@/components/music/VolumeSlider';
import { Z_INDEX } from '@/utils/zIndex';

/**
 * 音乐播放器组件 Props 接口
 */
interface MusicPlayerProps {
  /**
   * 是否自动播放。
   *
   * 不传时由管理器按上次保存的播放状态决定（刷新后尝试恢复播放）；
   * 显式传入 true/false 时以调用方为准。
   */
  autoPlay?: boolean;
  /** 是否隐藏播放器（用于路由级控制），默认 false */
  hidden?: boolean;
}

/**
 * 播放模式显示名称映射
 */
const PLAY_MODE_NAMES: Record<PlayMode, string> = {
  list: '列表循环',
  random: '随机播放',
  single: '单曲循环',
};

/**
 * 播放模式图标（使用 SVG path）
 */
const PLAY_MODE_ICONS: Record<PlayMode, string> = {
  list: 'M4 6h16M4 12h16M4 18h16',
  random: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
  single: 'M4 4h16v16H4z M9 9h6v6H9z',
};

/**
 * 歌曲身份键：与管理器保持一致，用于判断列表是否真的发生变化
 */
function getSongIdentity(song: ProcessedAudioItem): string {
  return `${song.name}|${song.artist}|${song.source || 'local'}`;
}

/**
 * 比较两个播放列表是否等价
 * 避免“本地列表 → 合并列表”内容相同时触发无意义的状态更新。
 */
function arePlaylistsEqual(
  a: ProcessedAudioItem[],
  b: ProcessedAudioItem[]
): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;

  for (let i = 0; i < a.length; i++) {
    if (getSongIdentity(a[i]) !== getSongIdentity(b[i])) return false;
  }

  return true;
}

/**
 * 转换为预加载器使用的资源结构
 */
function toPreloaderPlaylist(list: ProcessedAudioItem[]) {
  return list.map(item => ({
    url: item.url,
    cover: item.cover,
    name: item.name,
    id: `${item.name}-${item.artist}`,
  }));
}

/**
 * 音乐播放器组件
 *
 * 交互设计：
 * 1. 右下角设置按钮控制播放器是否启用；关闭时整个 UI（含提示条）完全隐藏，播放不中断
 * 2. 启用后默认收起在屏幕左边缘外，仅露出 GIF 提示条
 * 3. 鼠标进入屏幕左侧热区时，播放器整体向右滑出并紧贴屏幕左边缘
 * 4. 鼠标离开播放器区域 400ms 后自动滑回隐藏
 * 5. 点击右上角左箭头按钮可立即收起播放器
 * 6. 封面、控制按钮、进度条、音量、播放列表全部直接展示，无展开/折叠状态
 * 7. 播放列表位于主卡片下方，向下展开，超出最大高度时内部滚动
 * 8. 控制栏提供"定位"按钮，手动将当前播放歌曲滚动到播放列表可视区域
 *
 * 性能设计：
 * - 播放器隐藏（未启用或当前路由不显示）时不请求任何歌单数据；
 * - 在线歌单优先，本地歌单仅在线失败时兜底；
 * - 首次初始化等待在线结果，之后按 TTL 后台刷新，并提供手动刷新按钮；
 * - 播放进度改由管理器 timeupdate 事件驱动，不再单独 setInterval 轮询；
 * - 播放列表拆成 memo + 虚拟列表组件，播放进度更新不会重渲染整个歌单；
 * - 进度条/音量条拆成独立组件，指针移动只重渲染自身。
 *
 * @param props 组件属性
 * @returns 音乐播放器组件
 */
/**
 * 进度条订阅组件
 *
 * 播放进度的 timeupdate 每 250ms 触发一次；把订阅与状态放在这个子组件里，
 * 父播放器就不会因为进度变化而整树重渲染。
 */
const ProgressSection = React.memo(function ProgressSection({
  manager,
  onSeek,
}: {
  manager: HowlerPlayerManager;
  onSeek: (time: number) => void;
}) {
  const [currentTime, setCurrentTime] = useState(() => manager.getCurrentTime());
  const [duration, setDuration] = useState(() => manager.getDuration());

  useEffect(() => {
    const sync = () => {
      const nextTime = manager.getCurrentTime();
      const nextDuration = manager.getDuration();
      setCurrentTime(prev => (prev === nextTime ? prev : nextTime));
      setDuration(prev => (prev === nextDuration ? prev : nextDuration));
    };

    manager.addEventListener('timeupdate', sync);
    manager.addEventListener('listswitch', sync);
    sync();

    return () => {
      manager.removeEventListener('timeupdate', sync);
      manager.removeEventListener('listswitch', sync);
    };
  }, [manager]);

  return <ProgressBar currentTime={currentTime} duration={duration} onSeek={onSeek} />;
});

const MusicPlayerComponent = function MusicPlayer({
  autoPlay,
  hidden = false,
}: MusicPlayerProps) {
  // ==================== 状态定义 ====================

  /** 处理后的音频列表（本地 + 在线合并） */
  const [audioList, setAudioList] = useState<ProcessedAudioItem[]>([]);

  /** 当前歌曲的解析后歌词行（按时间升序） */
  const [currentLyrics, setCurrentLyrics] = useState<LrcLine[]>([]);

  /** 播放器是否已初始化 */
  const [isInitialized, setIsInitialized] = useState(false);

  /** 是否在客户端环境 */
  const [isClient, setIsClient] = useState(false);

  /** 配置加载是否失败（用于显示错误提示） */
  const [configLoadError, setConfigLoadError] = useState(false);

  /** 是否正在加载播放器（用于显示加载状态提示） */
  const [isLoading, setIsLoading] = useState(true);

  /** 当前播放模式（默认随机播放，与管理器保持一致） */
  const [playMode, setPlayMode] = useState<PlayMode>('random');

  /** 是否正在播放 */
  const [isPlaying, setIsPlaying] = useState(false);

  /** 当前播放索引 */
  const [currentIndex, setCurrentIndex] = useState(0);

  /** 当前音量（0-1） */
  const [volume, setVolume] = useState(0.7);

  /** 是否静音 */
  const [isMuted, setIsMuted] = useState(false);

  /** 用户通过设置页控制的播放器可见性 */
  const [userVisible, setUserVisible] = useState(false);

  /** 歌词显示状态（与 howlerPlayerManager 同步） */
  const [isLyricsVisible, setIsLyricsVisible] = useState(false);

  /** 当前鼠标是否悬停在播放器区域（用于控制滑出/隐藏） */
  const [isHovered, setIsHovered] = useState(false);

  /** 键盘焦点是否在播放器内部（用于保持展开） */
  const [isFocused, setIsFocused] = useState(false);

  /** 搜索框是否聚焦（用于保持展开） */
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  /**
   * 是否处于“收起动画进行中”状态。
   *
   * 播放器失去焦点/鼠标移开后，外层容器需要 300ms 才能滑回左侧；
   * 如果这时立刻把播放列表从完整列表切成单行，卡片高度会先变小，
   * 看起来就是“还没缩回去就变小了”。这里用 320ms 的缓冲让面板
   * 等滑出动画结束后再折叠。
   */
  const [isCollapsing, setIsCollapsing] = useState(false);

  /** 播放错误提示（自动消失） */
  const [playbackError, setPlaybackError] = useState<PlaybackErrorDetail | null>(null);

  /** 当前封面是否加载失败 */
  const [coverError, setCoverError] = useState(false);

  /** 重试计数器：递增时重新执行歌单加载 effect */
  const [reloadToken, setReloadToken] = useState(0);

  /** 当前是否在使用本地兜底歌单（在线歌单加载失败/为空） */
  const [isOnlineFallback, setIsOnlineFallback] = useState(false);

  /** 是否正在手动刷新在线歌单 */
  const [isRefreshingOnline, setIsRefreshingOnline] = useState(false);

  // ==================== 引用定义 ====================

  /** 播放器管理器引用 */
  const managerRef = useRef(HowlerPlayerManager.getInstance());

  /** 上次因在线 URL 过期而刷新歌单的时间，避免连续失败时反复请求 */
  const lastOnlineRefreshRef = useRef(0);

  /** 播放器外层容器 DOM 引用 */
  const playerWrapperRef = useRef<HTMLDivElement>(null);

  /** 播放列表面板引用（定位按钮使用） */
  const playlistPanelRef = useRef<PlaylistPanelHandle>(null);

  /** 鼠标离开后的自动隐藏定时器 ID */
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 标记是否已经启动过播放器加载 */
  const hasLoadedRef = useRef(false);

  /** 记录上一次的 isVisible，用于区分“首次挂载”和“从展开到收起” */
  const wasVisibleRef = useRef(false);

  /** 歌词缓存：URL → 解析结果 */
  const lyricsCacheRef = useRef<Map<string, LrcLine[]>>(new Map());

  /** 歌词请求去重：URL → Promise */
  const lyricsPendingRef = useRef<Map<string, Promise<LrcLine[]>>>(new Map());

  /** 下一首歌词预取定时器 */
  const prefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 错误提示自动消失定时器 */
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 最后一次非零音量（音量拖到 0 后点击静音按钮可恢复） */
  const lastNonZeroVolumeRef = useRef(0.7);

  // ==================== 派生状态 ====================

  // 最终是否隐藏：路由级隐藏 或 用户在设置页关闭
  const isHidden = hidden || !userVisible;

  // 滑出状态：未隐藏，且鼠标悬停 / 键盘聚焦 / 搜索框聚焦
  const isVisible = !isHidden && (isHovered || isFocused || isSearchFocused);

  // 播放列表面板是否保持展开：滑出动画期间继续展开，避免卡片先变矮
  const isPanelExpanded = !isHidden && (isVisible || isCollapsing);

  const currentSong = audioList[currentIndex];

  /**
   * 收起时延迟折叠播放列表
   *
   * isVisible 变为 false 后，外层容器还需要 300ms 滑出；
   * 这期间保持面板展开，等动画结束再切回单行，避免“没缩回去就变小”。
   */
  useLayoutEffect(() => {
    if (isHidden) {
      setIsCollapsing(false);
      wasVisibleRef.current = false;
      return;
    }

    if (isVisible) {
      setIsCollapsing(false);
      wasVisibleRef.current = true;
      return;
    }

    // 只有在“刚刚从展开变为收起”时才启动延迟
    if (!wasVisibleRef.current) {
      setIsCollapsing(false);
      return;
    }

    wasVisibleRef.current = false;
    setIsCollapsing(true);

    const timeoutId = setTimeout(() => {
      setIsCollapsing(false);
    }, 320);

    return () => clearTimeout(timeoutId);
  }, [isVisible, isHidden]);

  // ==================== 状态同步 ====================

  /**
   * 从管理器同步状态到 React 状态
   */
  const syncStateFromManager = useCallback(() => {
    const manager = managerRef.current;
    setIsPlaying(manager.isPlayingState());
    setCurrentIndex(manager.getCurrentIndex());
    setVolume(manager.getVolume());
    setIsMuted(manager.isMuted());
    setPlayMode(manager.getPlayMode());
    setIsLyricsVisible(manager.isLyricsVisible());
  }, []);

  /**
   * 把最新歌单同步给管理器与预加载器
   *
   * 只有列表真正变化时才更新：updatePlaylist 会重新洗牌随机队列并清空
   * “上一首”历史，如果每次从首页返回都无条件调用，用户的随机/历史状态
   * 会被无意义地重置。
   */
  const syncManagerPlaylist = useCallback((list: ProcessedAudioItem[]) => {
    const manager = managerRef.current;
    if (!manager.isPlayerInitialized()) return;

    const currentPlaylist = manager.getPlaylist();
    if (arePlaylistsEqual(currentPlaylist, list)) return;

    manager.updatePlaylist(list);
    MusicPlayerPreloader.getInstance().updatePlaylist(
      toPreloaderPlaylist(list),
      manager.getCurrentIndex(),
      manager.getPlayMode()
    );
    syncStateFromManager();
  }, [syncStateFromManager]);

  // ==================== 客户端挂载检测 ====================

  useEffect(() => {
    setIsClient(true);
    setUserVisible(getMusicPlayerVisibility());

    const unsubscribe = onMusicPlayerVisibilityChange((visible) => {
      setUserVisible(visible);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // ==================== 歌词加载（带缓存与预取） ====================

  /**
   * 加载并解析 LRC（带内存缓存与并发去重）
   */
  const loadLyrics = useCallback(async (url: string): Promise<LrcLine[]> => {
    const cached = lyricsCacheRef.current.get(url);
    if (cached) return cached;

    const pending = lyricsPendingRef.current.get(url);
    if (pending) return pending;

    const promise = fetch(url, { cache: 'default' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((text) => {
        const parsed = parseLrc(text);
        lyricsCacheRef.current.set(url, parsed);
        return parsed;
      })
      .finally(() => {
        lyricsPendingRef.current.delete(url);
      });

    lyricsPendingRef.current.set(url, promise);
    return promise;
  }, []);

  /**
   * 当 currentIndex / 列表变化时加载对应歌词，并预取下一首
   */
  useEffect(() => {
    if (!isClient || audioList.length === 0) {
      setCurrentLyrics([]);
      return;
    }

    const song = audioList[currentIndex];
    const lrcUrl = song?.lrc ? getAssetPath(song.lrc) : '';
    let cancelled = false;

    if (!lrcUrl) {
      setCurrentLyrics([]);
    } else {
      const cached = lyricsCacheRef.current.get(lrcUrl);
      if (cached) {
        setCurrentLyrics(cached);
      } else {
        loadLyrics(lrcUrl)
          .then((parsed) => {
            if (!cancelled) setCurrentLyrics(parsed);
          })
          .catch(() => {
            if (!cancelled) setCurrentLyrics([]);
          });
      }
    }

    // 预取下一首歌词：延迟 2 秒，避开当前歌曲/歌词加载高峰
    const nextIndex = managerRef.current.getUpcomingIndex();
    const nextSong = nextIndex >= 0 && nextIndex !== currentIndex
      ? audioList[nextIndex]
      : undefined;

    if (nextSong?.lrc) {
      const nextUrl = getAssetPath(nextSong.lrc);
      if (
        !lyricsCacheRef.current.has(nextUrl) &&
        !lyricsPendingRef.current.has(nextUrl)
      ) {
        prefetchTimeoutRef.current = setTimeout(() => {
          if (!cancelled) {
            loadLyrics(nextUrl).catch(() => {
              // 预取失败静默处理
            });
          }
        }, 2000);
      }
    }

    return () => {
      cancelled = true;
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
        prefetchTimeoutRef.current = null;
      }
    };
  }, [isClient, audioList, currentIndex, isInitialized, loadLyrics]);

  // ==================== 歌单加载（在线优先 + 本地兜底） ====================

  /**
   * 重新加载歌单（错误提示中的“重新加载”）
   */
  const handleRetry = useCallback(() => {
    musicConfigManager.reset();
    setConfigLoadError(false);
    setPlaybackError(null);
    setIsLoading(true);
    setIsInitialized(false);
    hasLoadedRef.current = false;
    setReloadToken(token => token + 1);
  }, []);

  /**
   * 手动刷新在线歌单
   *
   * 强制绕过内存/localStorage 缓存并请求 Meting API，成功后原地替换列表；
   * 当前歌曲仍在歌单中时不会中断播放。
   */
  const handleRefreshOnline = useCallback(async () => {
    if (isRefreshingOnline) return;

    setIsRefreshingOnline(true);
    try {
      const onlineList = await musicConfigManager.loadOnlineProcessedAudioListAsync({
        forceRefresh: true,
      });

      if (onlineList.length > 0) {
        const nextList = musicConfigManager.getProcessedAudioList();
        setAudioList(prev => (
          arePlaylistsEqual(prev, nextList) ? prev : nextList
        ));
        syncManagerPlaylist(nextList);
        setIsOnlineFallback(false);
      } else {
        setIsOnlineFallback(
          musicConfigManager.getOnlineProcessedAudioList().length === 0 &&
          musicConfigManager.getLocalProcessedAudioList().length > 0
        );
      }
    } finally {
      setIsRefreshingOnline(false);
    }
  }, [isRefreshingOnline, syncManagerPlaylist]);

  /**
   * 加载歌单
   *
   * 规则：
   * 1. 在线歌单是主列表，本地歌单只在在线加载失败时兜底；
   * 2. 首次初始化会等待在线歌单结果（forceRefresh），避免先把本地歌单
   *    当成网易云歌单展示；
   * 3. 管理器已初始化时（例如从首页切回内容页）立即使用现有列表，
   *    在线歌单按 TTL 在后台刷新，不阻塞、不闪烁。
   */
  useEffect(() => {
    if (!isClient) return;

    // 播放器未启用，或当前路由不显示播放器：不请求任何歌单数据
    if (isHidden) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadMusic = async () => {
      const manager = managerRef.current;

      try {
        // 本地配置先读出来，只作为在线失败时的兜底，不直接展示
        const localList = await musicConfigManager.getLocalProcessedAudioListAsync();
        if (cancelled) return;

        // 管理器已初始化（典型场景：从首页切回内容页）：
        // 立即使用现有列表，在线歌单在后台按 TTL 刷新，避免页面闪烁。
        if (manager.isPlayerInitialized()) {
          const currentList = musicConfigManager.getProcessedAudioList();
          const initialList = currentList.length > 0 ? currentList : localList;

          if (initialList.length > 0) {
            setAudioList(prev => (
              arePlaylistsEqual(prev, initialList) ? prev : initialList
            ));
            setConfigLoadError(false);
            // 立即让管理器/预加载器与界面列表保持一致
            syncManagerPlaylist(initialList);
          }

          setIsLoading(false);
          setIsOnlineFallback(
            musicConfigManager.getOnlineProcessedAudioList().length === 0 &&
            localList.length > 0
          );

          const onlineList = await musicConfigManager.loadOnlineProcessedAudioListAsync();
          if (cancelled || onlineList.length === 0) return;

          const nextList = musicConfigManager.getProcessedAudioList();
          setAudioList(prev => (
            arePlaylistsEqual(prev, nextList) ? prev : nextList
          ));
          syncManagerPlaylist(nextList);
          setIsOnlineFallback(false);
          return;
        }

        // 首次初始化：等待在线歌单结果。
        // 使用 2 分钟 TTL 缓存，避免每次整页刷新都强制打第三方接口；
        // 缓存过期或为空时才重新请求，失败时用本地列表兜底。
        setIsLoading(true);
        const onlineList = await musicConfigManager.loadOnlineProcessedAudioListAsync();
        if (cancelled) return;

        const onlineSucceeded = onlineList.length > 0;
        const finalList = onlineSucceeded
          ? musicConfigManager.getProcessedAudioList()
          : localList;

        if (finalList.length > 0) {
          setAudioList(prev => (
            arePlaylistsEqual(prev, finalList) ? prev : finalList
          ));
          setConfigLoadError(false);
        } else {
          setConfigLoadError(true);
        }

        setIsOnlineFallback(!onlineSucceeded && localList.length > 0);
        setIsLoading(false);
      } catch (error) {
        if (cancelled) return;
        console.error('[MusicPlayer] 加载音乐配置失败:', error);
        setConfigLoadError(true);
        setIsLoading(false);
      }
    };

    loadMusic();

    return () => {
      cancelled = true;
    };
  }, [isClient, isHidden, reloadToken, syncManagerPlaylist]);

  // ==================== 播放器初始化 ====================

  useEffect(() => {
    if (!isClient || audioList.length === 0 || isInitialized || isHidden) return;

    const manager = managerRef.current;

    // 全局已有实例且已初始化时，只需同步状态与列表
    if (manager.isPlayerInitialized()) {
      setIsInitialized(true);
      setIsLoading(false);
      syncManagerPlaylist(audioList);
      syncStateFromManager();
      return;
    }

    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    try {
      // autoPlay 为 undefined 时，由管理器根据上次保存的 paused 状态决定
      manager.init(audioList, autoPlay === undefined ? {} : { autoPlay });
      setIsInitialized(true);
      setIsLoading(false);
      syncStateFromManager();

      // 设置预加载器（当前歌曲由 Howler 加载，预加载器只负责下一首）
      MusicPlayerPreloader.getInstance().setupPlaylist(
        toPreloaderPlaylist(audioList),
        manager.getCurrentIndex(),
        manager.getPlayMode()
      );
    } catch (error) {
      console.error('[MusicPlayer] 初始化 Howler 播放器失败:', error);
      setConfigLoadError(true);
      setIsLoading(false);
    }
  }, [isClient, audioList, isInitialized, autoPlay, isHidden, syncStateFromManager, syncManagerPlaylist]);

  // ==================== 管理器事件订阅 ====================

  /**
   * 清除错误提示
   */
  const clearPlaybackError = useCallback(() => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    setPlaybackError(null);
  }, []);

  /**
   * 展示错误提示（6 秒后自动消失）
   */
  const showPlaybackError = useCallback((detail: PlaybackErrorDetail) => {
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
    }
    setPlaybackError(detail);
    errorTimeoutRef.current = setTimeout(() => {
      setPlaybackError(null);
      errorTimeoutRef.current = null;
    }, 6000);
  }, []);

  useEffect(() => {
    if (!isClient || !isInitialized) return;

    const manager = managerRef.current;

    const handlePlay = () => {
      const song = manager.getCurrentSong();
      setIsPlaying(true);
      clearPlaybackError();
      if (song) {
        emitMusicEvent('play', { title: song.name, artist: song.artist });
      }
    };

    const handlePause = () => {
      setIsPlaying(false);
      emitMusicEvent('pause');
    };

    const handleListSwitch = () => {
      setCurrentIndex(manager.getCurrentIndex());
      setCoverError(false);
    };

    const handleVolumeChange = () => {
      setVolume(manager.getVolume());
      setIsMuted(manager.isMuted());
    };

    const handlePlayModeChange = (detail: { mode: PlayMode }) => {
      setPlayMode(detail.mode);
    };

    const handleLyricsToggle = (detail: { visible: boolean }) => {
      setIsLyricsVisible(detail.visible);
    };

    const handleError = (detail: PlaybackErrorDetail) => {
      // 网易云签名 URL 约 20 分钟过期：加载失败时静默刷新歌单并重试当前歌曲
      if (
        detail.type === 'load' &&
        detail.source === 'netease' &&
        Date.now() - lastOnlineRefreshRef.current > 60000
      ) {
        lastOnlineRefreshRef.current = Date.now();
        void musicConfigManager
          .loadOnlineProcessedAudioListAsync({ forceRefresh: true })
          .then((list) => {
            if (list.length === 0) return;
            syncManagerPlaylist(musicConfigManager.getProcessedAudioList());
            manager.resetFailureState();
            manager.reloadCurrentSong();
          })
          .catch((error) => {
            console.error('[MusicPlayer] 在线歌单刷新失败:', error);
          });
      }

      showPlaybackError(detail);
    };

    const handleAutoplayBlocked = () => {
      showPlaybackError({
        type: 'play',
        message: '浏览器拦截了自动播放，点击播放按钮即可继续',
      });
    };

    manager.addEventListener('play', handlePlay);
    manager.addEventListener('pause', handlePause);
    manager.addEventListener('listswitch', handleListSwitch);
    manager.addEventListener('volumechange', handleVolumeChange);
    manager.addEventListener('play-mode-change', handlePlayModeChange);
    manager.addEventListener('lyrics-toggle', handleLyricsToggle);
    manager.addEventListener('error', handleError);
    manager.addEventListener('autoplay-blocked', handleAutoplayBlocked);

    return () => {
      manager.removeEventListener('play', handlePlay);
      manager.removeEventListener('pause', handlePause);
      manager.removeEventListener('listswitch', handleListSwitch);
      manager.removeEventListener('volumechange', handleVolumeChange);
      manager.removeEventListener('play-mode-change', handlePlayModeChange);
      manager.removeEventListener('lyrics-toggle', handleLyricsToggle);
      manager.removeEventListener('error', handleError);
      manager.removeEventListener('autoplay-blocked', handleAutoplayBlocked);
    };
  }, [isClient, isInitialized, clearPlaybackError, showPlaybackError, syncManagerPlaylist]);

  // ==================== 歌词显示控制 ====================

  /**
   * 监听 isLyricsVisible 状态变化，控制 Live2D 歌词渲染器
   * - 开启时：启动渲染器（rAF 监听 currentTime，更新 .message DOM）
   * - 关闭时：停止渲染器（清理 rAF、退出歌词模式、隐藏气泡）
   * - 歌曲切换时（currentIndex/currentLyrics 变化且歌词仍显示中）：重启渲染器
   */
  useEffect(() => {
    const isMobileViewport = typeof window !== 'undefined'
      && window.matchMedia('(max-width: 767px)').matches;

    if (!isLyricsVisible || !isClient || isHidden || isMobileViewport) {
      // 关闭歌词/播放器隐藏/移动端：停止渲染器，避免无意义的 rAF 循环
      live2dLyricsRenderer.stop();
      return;
    }

    // 启动/重启渲染器
    live2dLyricsRenderer.start(
      currentLyrics,
      () => managerRef.current.getCurrentTime()
    );
  }, [isLyricsVisible, isClient, currentLyrics, isHidden]);

  // 组件卸载时清理：避免离开页面后 rAF 仍在运行
  useEffect(() => {
    return () => {
      live2dLyricsRenderer.stop();
    };
  }, []);

  // 组件挂载时立即刷新一次歌词样式（确保最新 CSS 已注入到 head）
  // 解决 dev 改 CSS 后 HMR 不会更新已注入的 style 标签的问题
  useEffect(() => {
    refreshLyricsStyles();
  }, []);

  // 当前歌曲换封面时重置加载失败标记
  useEffect(() => {
    setCoverError(false);
  }, [currentSong?.cover]);

  // 记录最后一次非零音量，音量被拖到 0 后点击静音按钮可恢复
  useEffect(() => {
    if (volume > 0) {
      lastNonZeroVolumeRef.current = volume;
    }
  }, [volume]);

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // ==================== 播放控制 ====================

  const handleTogglePlay = useCallback(() => {
    managerRef.current.toggle();
  }, []);

  const handleNext = useCallback(() => {
    managerRef.current.next();
  }, []);

  const handlePrev = useCallback(() => {
    managerRef.current.prev();
  }, []);

  /**
   * 处理播放列表中的歌曲点击
   * 点击当前歌曲：切换播放/暂停
   * 点击其他歌曲：跳转到该歌曲并从头开始播放
   */
  const handleSwitchSong = useCallback((index: number) => {
    const manager = managerRef.current;
    if (index === manager.getCurrentIndex()) {
      // 重复点击当前歌曲：切换播放/暂停状态
      manager.toggle();
    } else {
      // 切到其他歌曲：使用 playAt 直接加载并从头播放
      // 避免调用 init 触发 restorePlayState 导致跳到上次保存的进度
      manager.playAt(index, true);
    }
  }, []);

  /**
   * 处理定位按钮点击
   * 将播放列表中当前播放的歌曲滚动到可视区域中央
   */
  const handleLocateCurrentSong = useCallback(() => {
    playlistPanelRef.current?.locateCurrent();
  }, []);

  /**
   * 进度条跳转
   */
  const handleSeek = useCallback((time: number) => {
    managerRef.current.seek(time);
  }, []);

  /**
   * 音量变化
   */
  const handleVolumeChange = useCallback((nextVolume: number) => {
    const manager = managerRef.current;
    manager.setVolume(nextVolume);
    if (nextVolume > 0 && manager.isMuted()) {
      manager.setMuted(false);
    }
    setVolume(nextVolume);
    setIsMuted(manager.isMuted());
  }, []);

  /**
   * 静音切换
   * 音量为 0 时点击按钮恢复上次非零音量，而不是“取消静音但仍然是 0”。
   */
  const handleToggleMute = useCallback(() => {
    const manager = managerRef.current;

    if (manager.getVolume() === 0) {
      const restored = lastNonZeroVolumeRef.current || 0.7;
      manager.setVolume(restored);
      manager.setMuted(false);
      setVolume(restored);
      setIsMuted(false);
      return;
    }

    manager.setMuted(!manager.isMuted());
    setIsMuted(manager.isMuted());
  }, []);

  // ==================== 播放模式 / 歌词切换 ====================

  const handleTogglePlayMode = useCallback(() => {
    const manager = managerRef.current;
    const newMode = manager.togglePlayMode();
    setPlayMode(newMode);
  }, []);

  /**
   * 切换歌词显示状态
   * 调用管理器的 toggleLyrics，事件 lyrics-toggle 触发后自动同步到本地 state
   */
  const handleToggleLyrics = useCallback(() => {
    managerRef.current.toggleLyrics();
  }, []);

  // ==================== 播放错误重试 ====================

  const handleRetryPlayback = useCallback(() => {
    clearPlaybackError();
    managerRef.current.playAt(managerRef.current.getCurrentIndex(), true);
  }, [clearPlaybackError]);

  // ==================== 悬停/隐藏交互 ====================

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  /**
   * 处理鼠标进入播放器区域
   * 清除自动隐藏定时器并标记悬停状态，使播放器滑出
   */
  const handleMouseEnter = useCallback(() => {
    clearHideTimeout();
    setIsHovered(true);
  }, [clearHideTimeout]);

  /**
   * 处理鼠标离开播放器区域
   * 延迟 400ms 后隐藏播放器（键盘焦点/搜索框聚焦时会保持展开）
   */
  const handleMouseLeave = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 400);
  }, [clearHideTimeout]);

  /**
   * 焦点进入播放器：只有键盘焦点（:focus-visible）才保持展开。
   *
   * 鼠标点击列表行/按钮时浏览器也会把焦点移入容器，如果无条件保持展开，
   * 用户点完歌单再移开鼠标，播放器会一直停在那里。用 :focus-visible 区分后，
   * 键盘 Tab 仍能保持展开，鼠标操作则恢复正常自动收起。
   */
  const handleFocusCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (
      target &&
      typeof target.matches === 'function' &&
      target.matches(':focus-visible')
    ) {
      setIsFocused(true);
    }
  }, []);

  /**
   * 焦点离开播放器：只有焦点真正移出容器才收起
   */
  const handleBlurCapture = useCallback((event: React.FocusEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget as Node | null;
    if (!nextTarget || !event.currentTarget.contains(nextTarget)) {
      setIsFocused(false);
    }
  }, []);

  /**
   * 点击/键盘展开按钮
   * 展开后把焦点移到播放器容器，避免按钮卸载后焦点丢失到 body
   */
  const handleExpand = useCallback(() => {
    setIsHovered(true);
    requestAnimationFrame(() => {
      playerWrapperRef.current?.focus();
    });
  }, []);

  /**
   * 处理手动收起按钮点击
   * 立即收起播放器，并取消热区触发状态
   */
  const handleManualHide = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHovered(false);
    setIsFocused(false);
    setIsSearchFocused(false);
    clearHideTimeout();
  }, [clearHideTimeout]);

  // ==================== 渲染辅助 ====================

  // 空播放列表提示
  if (audioList.length === 0 && !isLoading && !configLoadError) {
    return (
      <div
        className={`fixed top-1/2 left-0 -translate-y-1/2 z-[9999] transition-all duration-300 ease-out motion-reduce:transition-none ${
          isHidden
            ? '-translate-x-full opacity-0 pointer-events-none'
            : isVisible
            ? 'translate-x-0 opacity-100'
            : '-translate-x-[calc(100%-8px)] opacity-100'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="ml-2 flex items-center gap-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-xl border border-[#66ccff]/30 px-4 py-3 text-slate-600 dark:text-slate-300">
          {/* 复用封面占位处的音符图标，保持视觉语言一致，避免纯文字空状态显得突兀 */}
          <svg className="w-4 h-4 flex-shrink-0 text-[#66ccff]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
          <span className="text-sm">暂无可用歌曲</span>
        </div>
      </div>
    );
  }

  // ==================== 渲染 ====================

  return (
    <>
      <div
        ref={playerWrapperRef}
        tabIndex={-1}
        role="region"
        aria-label="音乐播放器"
        inert={isHidden || !isVisible ? true : undefined}
        style={{ zIndex: Z_INDEX.floatingControls }}
        className={`fixed top-1/2 left-0 -translate-y-1/2 transition-all duration-300 ease-out motion-reduce:transition-none focus:outline-none ${
          isHidden
            ? '-translate-x-full opacity-0 pointer-events-none'
            : isVisible
            ? 'translate-x-0 opacity-100'
            : '-translate-x-full opacity-100 pointer-events-none'
        }`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onPointerDownCapture={() => setIsFocused(false)}
        onFocusCapture={handleFocusCapture}
        onBlurCapture={handleBlurCapture}
      >
        {/* 外层相对定位容器：加载提示、错误提示等需要以此容器为基准 */}
        <div className="relative flex items-center">
          {/* 主播放器卡片 + 播放列表容器：直接贴屏幕左边缘 */}
          <div className="relative">
            {/* 主播放器卡片：用 min-h 让卡片保持修长比例，内容在其中垂直居中。
                高度不能去掉——否则卡片会塌缩到内容高度，与左侧 GIF 入口的视觉重心不匹配。
                不加 overflow-hidden，否则内部绝对定位的播放列表与悬停气泡会被裁剪。 */}
            <div className="relative w-[280px] sm:w-[340px] min-h-[360px] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-2xl shadow-xl border border-[#66ccff]/30 flex flex-col justify-center">
              {/* 手动隐藏按钮：右上角左箭头，点击立即收起 */}
              <button
                type="button"
                onClick={handleManualHide}
                className="absolute top-2 right-2 p-1 rounded-full text-slate-400 hover:text-[#66ccff] hover:bg-[#66ccff]/10 transition-colors z-20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70"
                aria-label="收起播放器"
                title="收起播放器"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>

              {/* 顶部控制栏：封面 + 歌曲信息 + 控制按钮 */}
              <div className="flex items-center gap-3 p-3 pr-8">
                {/* 封面：用圆形裁切，避免方形图片旋转时四角周期性扫出造成视觉噪点（也契合唱片隐喻） */}
                <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 shadow-md">
                  {currentSong?.cover && !coverError ? (
                    <img
                      src={currentSong.cover}
                      alt={currentSong.name}
                      width={48}
                      height={48}
                      decoding="async"
                      draggable={false}
                      onError={() => setCoverError(true)}
                      className={`w-full h-full object-cover ${isPlaying ? 'animate-spin motion-reduce:animate-none' : ''}`}
                      style={{ animationDuration: '8s' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#66ccff]/30 to-[#0099cc]/30 flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#66ccff]" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  )}
                  {/* 播放状态指示器 */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity">
                    <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                      {isPlaying ? (
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                  </div>
                </div>

                {/* 歌曲信息 */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {currentSong?.name || '未播放'}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {currentSong ? <ArtistName text={currentSong.artist} /> : '-'}
                  </div>
                </div>

                {/* 迷你控制按钮 */}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="p-1.5 rounded-full hover:bg-[#66ccff]/10 dark:hover:bg-[#66ccff]/20 text-slate-600 dark:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70"
                    aria-label="上一首"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleTogglePlay}
                    className="p-2 rounded-full bg-[#66ccff] hover:bg-[#4db8ff] text-white shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70"
                    aria-label={isPlaying ? '暂停' : '播放'}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      {isPlaying ? (
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      ) : (
                        <path d="M8 5v14l11-7z" />
                      )}
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="p-1.5 rounded-full hover:bg-[#66ccff]/10 dark:hover:bg-[#66ccff]/20 text-slate-600 dark:text-slate-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70"
                    aria-label="下一首"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 进度条区块：由独立组件订阅 timeupdate，避免整卡片每 250ms 重渲染 */}
              <ProgressSection
                manager={managerRef.current}
                onSeek={handleSeek}
              />

              {/* 播放错误提示：6 秒后自动消失，可手动重试 */}
              {playbackError && (
                <div
                  className="mx-3 mb-2 flex items-center gap-1.5 rounded-lg bg-red-500/90 px-2.5 py-1.5 text-[11px] text-white"
                  role="status"
                  aria-live="polite"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span
                    className="min-w-0 flex-1 truncate"
                    title={`${playbackError.message || '播放失败'}${playbackError.song ? `：${playbackError.song}` : ''}`}
                  >
                    {playbackError.message || '播放失败'}
                    {playbackError.song ? `：${playbackError.song}` : ''}
                  </span>
                  <button
                    type="button"
                    onClick={handleRetryPlayback}
                    className="flex-shrink-0 rounded px-1.5 py-0.5 bg-white/20 hover:bg-white/30 transition-colors"
                  >
                    重试
                  </button>
                </div>
              )}

              {/* 控制区：播放模式、音量控制放在同一行 */}
              <div className="p-3 pt-2">
                <div className="flex items-center justify-between">
                  {/* 播放模式 */}
                  <button
                    type="button"
                    onClick={handleTogglePlayMode}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-slate-600 dark:text-slate-300 hover:bg-[#66ccff]/10 dark:hover:bg-[#66ccff]/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70"
                    aria-label={PLAY_MODE_NAMES[playMode]}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d={PLAY_MODE_ICONS[playMode]} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>{PLAY_MODE_NAMES[playMode]}</span>
                  </button>

                  {/* 音量控制 - 静音按钮 + 短音量条，可拖拽精细调节 */}
                  <VolumeSlider
                    volume={volume}
                    isMuted={isMuted}
                    onVolumeChange={handleVolumeChange}
                    onToggleMute={handleToggleMute}
                  />

                  {/* 右侧：定位 + 歌词按钮（与播放模式左右对称） */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    {/* 定位按钮：将当前播放歌曲滚动到播放列表可视区域；无歌曲时禁用 */}
                    <button
                      type="button"
                      onClick={handleLocateCurrentSong}
                      disabled={audioList.length === 0}
                      className={`p-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70 ${
                        audioList.length === 0
                          ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                          : 'hover:bg-[#66ccff]/10 dark:hover:bg-[#66ccff]/20 text-slate-600 dark:text-slate-300'
                      }`}
                      aria-label="定位当前歌曲"
                      title={audioList.length === 0 ? '暂无可定位的歌曲' : '定位当前歌曲'}
                    >
                      {/* 准星图标：外圆 + 十字线 + 中心点，更符合"定位"语义 */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="7" />
                        <line x1="12" y1="2" x2="12" y2="5" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                        <line x1="2" y1="12" x2="5" y2="12" />
                        <line x1="19" y1="12" x2="22" y2="12" />
                        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                      </svg>
                    </button>

                    {/* 显示歌词按钮：点击切换歌词显示状态；激活时高亮（与当前播放歌曲高亮色一致） */}
                    <button
                      type="button"
                      onClick={handleToggleLyrics}
                      className={`p-1.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70 ${
                        isLyricsVisible
                          ? 'bg-[#66ccff]/20 text-[#0099cc] dark:text-[#66ccff]'
                          : 'hover:bg-[#66ccff]/10 dark:hover:bg-[#66ccff]/20 text-slate-600 dark:text-slate-300'
                      }`}
                      aria-label={isLyricsVisible ? '隐藏歌词' : '显示歌词'}
                      aria-pressed={isLyricsVisible}
                      title={isLyricsVisible ? '隐藏歌词' : '显示歌词'}
                    >
                      {/* 引号图标：双引号代表"歌词文本" */}
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 7c-1.66 0-3 1.34-3 3v4c0 1.66 1.34 3 3 3h1c.55 0 1-.45 1-1s-.45-1-1-1H6c-.55 0-1-.45-1-1v-1h2c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2H6zm0 2h1v3H6V9zm9-2c-1.66 0-3 1.34-3 3v4c0 1.66 1.34 3 3 3h1c.55 0 1-.45 1-1s-.45-1-1-1h-1c-.55 0-1-.45-1-1v-1h2c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-1zm0 2h1v3h-1V9z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* 播放列表：虚拟列表 + 搜索（仅展开时渲染完整列表，保留反爬意图） */}
              {audioList.length > 0 ? (
                <PlaylistPanel
                  ref={playlistPanelRef}
                  songs={audioList}
                  currentIndex={currentIndex}
                  isPlaying={isPlaying}
                  expanded={isPanelExpanded}
                  isOnlineFallback={isOnlineFallback}
                  isRefreshingOnline={isRefreshingOnline}
                  onSwitchSong={handleSwitchSong}
                  onSearchFocusChange={setIsSearchFocused}
                  onRefreshOnline={handleRefreshOnline}
                />
              ) : (
                <div className="mt-2 h-14 rounded-b-2xl border-t border-[#66ccff]/20 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                  {isLoading ? '正在加载歌单...' : '暂无可用歌曲'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 加载提示：定位在播放器卡片上方，仅在播放器滑出后可见（与提示条/卡片间距对齐） */}
        {isLoading && !configLoadError && (
          <div className="absolute -top-10 left-2 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-lg shadow-lg border border-[#66ccff]/30 px-3 py-2 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 whitespace-nowrap z-30">
            <svg className="w-4 h-4 animate-spin text-[#66ccff]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            加载音乐中...
          </div>
        )}

        {/* 错误提示：定位到播放器卡片右侧（absolute 相对播放器外层），不再跨屏到右下角 */}
        {configLoadError && isClient && (
          <div
            className="absolute top-0 left-full ml-3 bg-red-500/95 text-white px-4 py-3 rounded-lg text-sm z-50 flex flex-col gap-2 shadow-lg backdrop-blur-sm w-64"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>歌单加载失败</span>
            </div>
            {/* 说明真实原因：在线歌单与本地歌单是两条独立来源，只有两条都取不到才会走到这里 */}
            <div className="text-xs text-white/80">在线与本地歌单均未读取成功，请检查网络后重试</div>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-1 w-full bg-white/20 hover:bg-white/30 transition-colors duration-200 px-3 py-1.5 rounded text-xs font-medium flex items-center justify-center gap-1"
              aria-label="重新加载音乐播放器"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              重新加载
            </button>
          </div>
        )}
      </div>

      {/* 独立展开按钮：仅在播放器启用且收起时显示，固定在屏幕最左侧，hover 触发滑出。
          必须在播放器 div 之外（独立 fixed），否则会被播放器一起 translate-x 移走看不到。
          极简设计：只保留动画本身 + 鼠标 hover 时整体放大（当前按用户要求保持静态）。
          关键：z-index 必须高于主播放器 (z-[9999])，否则收起时主播放器 div 会覆盖按钮。 */}
      {!isHidden && !isVisible && (
        <button
          key="music-expand-gif-btn-v3"
          type="button"
          onMouseEnter={handleMouseEnter}
          onClick={handleExpand}
          className="h-32 pr-2 flex items-center cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#66ccff]/70"
          style={{
            position: 'fixed',
            left: '0', // 物理定位贴紧屏幕最左边缘
            top: '50%',
            // 关键：translateX(-39px) 把按钮整体向左推 39px，让动画视觉左边缘贴紧屏幕。
            // 原因：clip-path: inset(0 0 0 35%) 裁掉了元素自身左侧 35%（112*35%≈39.2px），
            //       这部分"被裁掉的空白"原本在按钮内 39px 处，导致视觉左边缘在屏幕 left:39px 位置。
            transform: 'translate(-39px, -50%)',
            zIndex: Z_INDEX.floatingControls + 1, // 高于主播放器，避免被覆盖
          }}
          aria-label="展开音乐播放器"
          title="展开音乐播放器"
        >
          {}
          <img
            src={getAssetPath('/music.gif')}
            alt="音乐"
            width={112}
            height={112}
            className="w-28 h-28 shrink-0"
            style={{ clipPath: 'inset(0 0 0 35%)' }}
            draggable={false}
            decoding="async"
          />
        </button>
      )}
    </>
  );
};

// 使用 React.memo 减少不必要的渲染
export default React.memo(MusicPlayerComponent);
