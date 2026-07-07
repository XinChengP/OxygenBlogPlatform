'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import HowlerPlayerManager from '@/utils/howlerPlayerManager';
import type { MusicHistoryItem, MusicHistory } from '@/types/music';

/**
 * useMusicHistory Hook 返回值接口
 * 提供播放历史的访问和管理能力
 */
interface UseMusicHistoryReturn {
  /** 播放历史列表，按播放时间倒序排列 */
  history: MusicHistoryItem[];
  /** 历史记录数量 */
  count: number;
  /** 清除所有播放历史 */
  clearHistory: () => void;
  /** 播放指定历史歌曲 */
  playHistoryItem: (id: string) => void;
  /** 从历史记录中删除指定歌曲 */
  removeHistoryItem: (id: string) => void;
  /** 最大保存历史记录数量 */
  maxItems: number;
}

/** 播放历史在 localStorage 中的存储键名 */
const HISTORY_STORAGE_KEY = 'musicPlayerHistory';

/** 默认最大历史记录数量 */
const DEFAULT_MAX_ITEMS = 50;

/**
 * 音乐播放历史 Hook
 *
 * 提供播放历史的访问和管理能力，包括：
 * - 获取播放历史列表
 * - 清除历史记录
 * - 播放历史歌曲
 * - 删除指定历史记录
 *
 * 播放历史会自动记录每次播放的歌曲，并持久化到 localStorage。
 *
 * @returns 播放历史控制对象和状态
 *
 * @example
 * ```tsx
 * function HistoryPanel() {
 *   const { history, count, clearHistory, playHistoryItem } = useMusicHistory();
 *
 *   return (
 *     <div>
 *       <h3>播放历史 ({count} 首)</h3>
 *       <ul>
 *         {history.map(item => (
 *           <li key={item.id} onClick={() => playHistoryItem(item.id)}>
 *             {item.name} - {item.artist}
 *           </li>
 *         ))}
 *       </ul>
 *       <button onClick={clearHistory}>清除历史</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useMusicHistory(): UseMusicHistoryReturn {
  // ==================== 状态定义 ====================

  /** 播放历史列表 */
  const [history, setHistory] = useState<MusicHistoryItem[]>([]);

  /** 最大历史记录数量 */
  const [maxItems, setMaxItems] = useState(DEFAULT_MAX_ITEMS);

  /** 播放器管理器引用 */
  const managerRef = useRef<ReturnType<typeof HowlerPlayerManager.getInstance> | null>(null);

  /** 是否已初始化 */
  const isInitializedRef = useRef(false);

  // ==================== 本地存储操作 ====================

  /**
   * 从 localStorage 加载播放历史
   * @returns 播放历史对象，如果不存在或解析失败则返回默认值
   */
  const loadHistoryFromStorage = useCallback((): MusicHistory => {
    // 确保在客户端环境
    if (typeof window === 'undefined') {
      return { items: [], maxItems: DEFAULT_MAX_ITEMS };
    }

    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (!stored) {
        return { items: [], maxItems: DEFAULT_MAX_ITEMS };
      }

      const parsed = JSON.parse(stored) as MusicHistory;

      // 验证数据结构
      if (!parsed || !Array.isArray(parsed.items)) {
        return { items: [], maxItems: DEFAULT_MAX_ITEMS };
      }

      return {
        items: parsed.items,
        maxItems: typeof parsed.maxItems === 'number' ? parsed.maxItems : DEFAULT_MAX_ITEMS,
      };
    } catch (error) {
      console.error('加载播放历史失败:', error);
      return { items: [], maxItems: DEFAULT_MAX_ITEMS };
    }
  }, []);

  /**
   * 保存播放历史到 localStorage
   * @param historyData 要保存的播放历史对象
   */
  const saveHistoryToStorage = useCallback((historyData: MusicHistory) => {
    // 确保在客户端环境
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyData));
    } catch (error) {
      console.error('保存播放历史失败:', error);
    }
  }, []);

  // ==================== 历史记录管理方法 ====================

  /**
   * 添加歌曲到播放历史
   * @param song 歌曲信息
   */
  const addToHistory = useCallback((song: { name: string; artist: string; url?: string }) => {
    setHistory(prevHistory => {
      // 生成唯一 ID（使用名称、歌手和时间戳）
      const id = `${song.name}_${song.artist}_${Date.now()}`;

      // 创建新的历史项
      const newItem: MusicHistoryItem = {
        id,
        name: song.name,
        artist: song.artist,
        playedAt: Date.now(),
      };

      // 移除重复项（相同名称和歌手的歌曲只保留最新的）
      const filteredHistory = prevHistory.filter(
        item => !(item.name === song.name && item.artist === song.artist)
      );

      // 将新项添加到开头，并限制最大数量
      const newHistory = [newItem, ...filteredHistory].slice(0, maxItems);

      // 保存到 localStorage
      saveHistoryToStorage({ items: newHistory, maxItems });

      return newHistory;
    });
  }, [maxItems, saveHistoryToStorage]);

  /**
   * 清除所有播放历史
   */
  const clearHistory = useCallback(() => {
    setHistory([]);
    saveHistoryToStorage({ items: [], maxItems });
  }, [maxItems, saveHistoryToStorage]);

  /**
   * 从历史记录中删除指定歌曲
   * @param id 要删除的歌曲 ID
   */
  const removeHistoryItem = useCallback((id: string) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.filter(item => item.id !== id);
      saveHistoryToStorage({ items: newHistory, maxItems });
      return newHistory;
    });
  }, [maxItems, saveHistoryToStorage]);

  /**
   * 播放指定历史歌曲
   * @param id 歌曲 ID
   */
  const playHistoryItem = useCallback((id: string) => {
    const manager = managerRef.current;
    if (!manager) {
      console.warn('播放器未初始化，无法播放历史歌曲');
      return;
    }

    // 在历史记录中查找匹配的歌曲
    const historyItem = history.find(item => item.id === id);
    if (!historyItem) {
      console.warn('未找到指定的历史记录');
      return;
    }

    // 在播放列表中查找对应歌曲
    const playlist = manager.getPlaylist();
    const songIndex = playlist.findIndex(
      audio => audio.name === historyItem.name && audio.artist === historyItem.artist
    );

    if (songIndex !== -1) {
      // 找到歌曲，切换到该歌曲并播放
      manager.init(playlist, { initialIndex: songIndex, autoPlay: true });
    } else {
      console.warn(`在播放列表中未找到歌曲: ${historyItem.name} - ${historyItem.artist}`);
    }
  }, [history]);

  // ==================== 初始化和事件监听 ====================

  useEffect(() => {
    // 确保在客户端环境
    if (typeof window === 'undefined') return;

    // 防止重复初始化
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // 加载历史记录
    const savedHistory = loadHistoryFromStorage();
    setHistory(savedHistory.items);
    setMaxItems(savedHistory.maxItems);

    const manager = HowlerPlayerManager.getInstance();
    managerRef.current = manager;

    /**
     * 设置播放事件监听，自动记录播放历史
     */
    const setupPlayerListeners = () => {
      // 监听播放事件，记录到历史
      manager.addEventListener('play', () => {
        const currentSong = manager.getCurrentSong();
        if (currentSong) {
          addToHistory({
            name: currentSong.name,
            artist: currentSong.artist,
            url: currentSong.url,
          });
        }
      });
    };

    // 检查播放器是否已初始化
    if (manager.isPlayerInitialized()) {
      setupPlayerListeners();
    } else {
      // 等待播放器初始化完成
      manager.onInit(() => {
        setupPlayerListeners();
      });
    }

    // 清理函数
    return () => {
      isInitializedRef.current = false;
    };
  }, [loadHistoryFromStorage, addToHistory]);

  // ==================== 返回值 ====================

  return {
    history,
    count: history.length,
    clearHistory,
    playHistoryItem,
    removeHistoryItem,
    maxItems,
  };
}

export default useMusicHistory;
