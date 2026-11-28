'use client';

/**
 * 猜歌片段播放器
 *
 * 为什么不复用全局 HowlerPlayerManager：
 * - 它只有一个 Howl 实例，任何 playAt/init 都会切掉侧边播放器正在听的歌；
 * - 它还会写入播放历史、抢占 Media Session，游戏用完不该留下这些副作用。
 *
 * 所以这里用独立的 HTMLAudioElement 播 5 秒片段：
 * 不影响全局播放器，也天然支持大文件 Range 请求。
 * 唯一需要协调的是「叠音」——片段播放期间暂停侧边播放器，结束后恢复。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { getAssetPath } from '@/utils/assetUtils';
import { howlerPlayerManager } from '@/utils/howlerPlayerManager';
import { SNIPPET_SECONDS, type GuessSong } from './songBank';

export type SnippetStatus = 'idle' | 'loading' | 'playing';

export type SnippetPlaybackReason = 'blocked' | 'load' | 'timeout' | 'invalid';

/** 带失败原因的错误：浏览器拦截播放时不需要刷新曲库，直接提示重试即可 */
export class SnippetPlaybackError extends Error {
  readonly reason: SnippetPlaybackReason;

  constructor(message: string, reason: SnippetPlaybackReason) {
    super(message);
    this.name = 'SnippetPlaybackError';
    this.reason = reason;
  }
}

export interface UseSnippetPlayerResult {
  status: SnippetStatus;
  progress: number;
  error: string | null;
  play: (
    song: GuessSong,
    startRatio: number,
    seconds?: number
  ) => Promise<void>;
  stop: () => void;
  clearError: () => void;
}

/** 元数据迟迟不返回时不要无限转圈 */
const LOAD_TIMEOUT_MS = 12000;

export function useSnippetPlayer(): UseSnippetPlayerResult {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 片段开始前侧边播放器是否在播；结束后只恢复「本来就在播」的情况
  const resumeMusicRef = useRef(false);
  // 每次 play/stop 自增，旧音频的异步回调据此失效
  const playTokenRef = useRef(0);

  const [status, setStatus] = useState<SnippetStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const clearTimers = useCallback(() => {
    if (stopTimerRef.current) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }, []);

  const restoreBackgroundMusic = useCallback(() => {
    if (!resumeMusicRef.current) return;
    resumeMusicRef.current = false;
    try {
      howlerPlayerManager.play();
    } catch {
      // 播放器没初始化或音频已销毁时忽略
    }
  }, []);

  const stopInternal = useCallback(
    (restoreMusic: boolean) => {
      playTokenRef.current += 1;
      clearTimers();

      const audio = audioRef.current;
      audioRef.current = null;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      }

      setStatus('idle');
      setProgress(0);

      if (restoreMusic) {
        restoreBackgroundMusic();
      }
    },
    [clearTimers, restoreBackgroundMusic]
  );

  const stop = useCallback(() => {
    stopInternal(true);
  }, [stopInternal]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const play = useCallback(
    async (song: GuessSong, startRatio: number, seconds = SNIPPET_SECONDS) => {
      // 重新播放时不恢复侧边音乐，避免中间闪一下上一首
      stopInternal(false);
      setError(null);

      const length = Math.max(1, seconds);
      const token = playTokenRef.current;
      const audio = new Audio();
      audio.preload = 'auto';
      audio.volume = 0.85;

      try {
        audio.src = new URL(
          getAssetPath(song.url),
          window.location.href
        ).href;
      } catch {
        setStatus('idle');
        setError('音频地址无效，换一首试试');
        throw new SnippetPlaybackError('音频地址无效，换一首试试', 'invalid');
      }

      audioRef.current = audio;
      setStatus('loading');

      // 片段要盖过背景音乐，先暂停侧边播放器；只恢复原本正在播放的状态
      try {
        if (
          howlerPlayerManager.isPlayerInitialized() &&
          howlerPlayerManager.isPlayingState()
        ) {
          howlerPlayerManager.pause();
          resumeMusicRef.current = true;
        }
      } catch {
        // 忽略播放器状态异常
      }

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        let startTime = 0;

        const cleanupListeners = () => {
          audio.removeEventListener('loadedmetadata', onLoaded);
          audio.removeEventListener('error', onError);
          audio.removeEventListener('ended', onEnded);
        };

        const fail = (
          message: string,
          reason: SnippetPlaybackReason = 'load'
        ) => {
          if (settled) return;
          if (playTokenRef.current !== token) return;

          settled = true;
          cleanupListeners();
          if (loadTimerRef.current) {
            clearTimeout(loadTimerRef.current);
            loadTimerRef.current = null;
          }

          audio.pause();
          audio.removeAttribute('src');
          audio.load();
          if (audioRef.current === audio) {
            audioRef.current = null;
          }

          setStatus('idle');
          setProgress(0);
          setError(message);
          restoreBackgroundMusic();
          reject(new SnippetPlaybackError(message, reason));
        };

        const onError = () => {
          fail('音频加载失败，换一首试试');
        };

        const onEnded = () => {
          if (playTokenRef.current !== token) return;
          stopInternal(true);
          resolve();
        };

        const onLoaded = () => {
          if (settled || playTokenRef.current !== token) return;

          const duration = audio.duration;

          // 前奏模式 startRatio=0 时从 0 秒开始；普通模式避开前奏和结尾
          if (Number.isFinite(duration) && duration > length + 1) {
            if (startRatio <= 0) {
              startTime = 0;
            } else {
              const desired = duration * startRatio;
              startTime = Math.min(
                Math.max(5, desired),
                duration - length - 0.5
              );
            }
          }

          try {
            audio.currentTime = startTime;
          } catch {
            // 少数流媒体不允许 seek，仍从当前位置播放
          }

          audio
            .play()
            .then(() => {
              if (settled || playTokenRef.current !== token) return;

              settled = true;
              cleanupListeners();
              if (loadTimerRef.current) {
                clearTimeout(loadTimerRef.current);
                loadTimerRef.current = null;
              }

              setStatus('playing');
              setProgress(0);

              progressTimerRef.current = setInterval(() => {
                if (playTokenRef.current !== token) return;
                const elapsed = audio.currentTime - startTime;
                setProgress(
                  Math.max(0, Math.min(1, elapsed / length))
                );
              }, 120);

              stopTimerRef.current = setTimeout(() => {
                if (playTokenRef.current !== token) return;
                stopInternal(true);
              }, length * 1000);

              resolve();
            })
            .catch(() => {
              fail('浏览器拦住了播放，再点一次播放片段', 'blocked');
            });
        };

        loadTimerRef.current = setTimeout(() => {
          fail('音频加载超时，换一首试试', 'timeout');
        }, LOAD_TIMEOUT_MS);

        audio.addEventListener('loadedmetadata', onLoaded, { once: true });
        audio.addEventListener('error', onError, { once: true });
        audio.addEventListener('ended', onEnded, { once: true });
      });
    },
    [restoreBackgroundMusic, stopInternal]
  );

  // 离开页面时确保音频和定时器都释放；若暂停过侧边播放器则恢复
  useEffect(() => {
    return () => {
      stopInternal(true);
    };
  }, [stopInternal]);

  return { status, progress, error, play, stop, clearError };
}
