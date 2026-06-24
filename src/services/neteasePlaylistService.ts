/**
 * 网易云音乐歌单加载服务
 * 
 * 功能说明：
 * 1. 通过 Meting API 获取网易云音乐歌单数据
 * 2. 将 Meting API 返回的数据格式转换为 APlayer 可用的音频列表格式
 * 3. 提供错误处理和降级机制
 * 4. 支持自定义 Meting API 地址
 * 
 * 实现思路参考 MetingJS：
 * - MetingJS 本质上是通过 Meting API 解析平台歌单，再用 APlayer 播放
 * - 本项目不直接引入 MetingJS 库，而是借鉴其数据获取逻辑
 * - 这样可以将网易云歌单与现有的本地音乐配置无缝融合
 * 
 * @author 歆橙
 * @version 1.0
 * @date 2026-06-24
 */

import type { ProcessedAudioItem } from '@/types/aplayer';

// ==================== 类型定义 ====================

/**
 * Meting API 返回的单首歌曲数据格式
 */
export interface MetingApiSong {
  /** 歌曲标题 */
  title: string;
  /** 歌手/艺术家 */
  author: string;
  /** 音频文件 URL */
  url: string;
  /** 封面图片 URL */
  pic: string;
  /** 歌词文件 URL */
  lrc: string;
}

/**
 * 网易云歌单配置接口
 */
export interface NeteasePlaylistConfig {
  /** 是否启用网易云歌单 */
  enabled: boolean;
  /** 歌单 ID */
  playlistId: string;
  /** Meting API 地址 */
  api: string;
  /** 描述信息 */
  description?: string;
}

/**
 * 歌单加载结果接口
 */
export interface NeteaseLoadResult {
  /** 是否加载成功 */
  success: boolean;
  /** 加载得到的歌曲列表 */
  songs: ProcessedAudioItem[];
  /** 错误信息（加载失败时） */
  error?: string;
}

// ==================== 常量定义 ====================

/** 默认的 Meting API 地址（公共 API，稳定性不保证，建议自建或选择稳定的第三方 API） */
const DEFAULT_METING_API = 'https://api.i-meto.com/meting/api';

/** 默认歌单 ID */
const DEFAULT_PLAYLIST_ID = '14349636887';

/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT_MS = 15000;

// ==================== 服务类 ====================

/**
 * 网易云音乐歌单加载服务
 * 负责从 Meting API 获取歌单数据并转换为播放器可用格式
 */
class NeteasePlaylistService {
  /** 单例实例 */
  private static instance: NeteasePlaylistService;

  /** 缓存的歌单数据 */
  private cachedSongs: ProcessedAudioItem[] | null = null;

  /** 缓存时间戳 */
  private cachedAt: number = 0;

  /** 缓存有效期（毫秒），默认 5 分钟 */
  private cacheExpireMs: number = 5 * 60 * 1000;

  /**
   * 私有构造函数，防止外部实例化
   */
  private constructor() {}

  /**
   * 获取单例实例
   * @returns NeteasePlaylistService 的唯一实例
   */
  static getInstance(): NeteasePlaylistService {
    if (!NeteasePlaylistService.instance) {
      NeteasePlaylistService.instance = new NeteasePlaylistService();
    }
    return NeteasePlaylistService.instance;
  }

  /**
   * 设置缓存过期时间
   * @param ms 过期时间（毫秒）
   */
  setCacheExpireMs(ms: number): void {
    this.cacheExpireMs = ms;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    this.cachedSongs = null;
    this.cachedAt = 0;
  }

  /**
   * 构建 Meting API 请求地址
   * @param config 网易云歌单配置
   * @returns 完整的 API 请求 URL
   */
  private buildApiUrl(config: NeteasePlaylistConfig): string {
    const api = config.api || DEFAULT_METING_API;
    const playlistId = config.playlistId || DEFAULT_PLAYLIST_ID;
    
    // 去除 api 末尾的斜杠，避免重复斜杠
    const baseApi = api.endsWith('/') ? api.slice(0, -1) : api;
    
    // 如果 api 已经包含查询参数，需要追加而不是覆盖
    if (baseApi.includes('?')) {
      return `${baseApi}&server=netease&type=playlist&id=${encodeURIComponent(playlistId)}`;
    }
    
    return `${baseApi}?server=netease&type=playlist&id=${encodeURIComponent(playlistId)}`;
  }

  /**
   * 发起带超时的 fetch 请求
   * @param url 请求地址
   * @returns Promise<Response>
   */
  private fetchWithTimeout(url: string): Promise<Response> {
    return new Promise((resolve, reject) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        reject(new Error('请求超时'));
      }, REQUEST_TIMEOUT_MS);

      fetch(url, { 
        signal: controller.signal,
        // 使用 cors 模式，允许跨域请求公共 API
        mode: 'cors',
        // 优先使用缓存，减少重复请求
        cache: 'default'
      })
        .then((response) => {
          clearTimeout(timeoutId);
          resolve(response);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * 验证 Meting API 返回的歌曲数据是否有效
   * @param song 待验证的歌曲数据
   * @returns 是否有效
   */
  private validateMetingSong(song: unknown): song is MetingApiSong {
    if (typeof song !== 'object' || song === null) {
      return false;
    }

    const s = song as Record<string, unknown>;

    // 必需字段检查
    if (
      typeof s.title !== 'string' || s.title.trim() === '' ||
      typeof s.author !== 'string' || s.author.trim() === '' ||
      typeof s.url !== 'string' || s.url.trim() === '' ||
      typeof s.pic !== 'string' || s.pic.trim() === ''
    ) {
      return false;
    }

    return true;
  }

  /**
   * 将 Meting API 歌曲数据转换为播放器可用的音频项
   * @param song Meting API 返回的歌曲数据
   * @param index 歌曲在歌单中的索引，用于生成唯一 ID
   * @returns 处理后的音频项
   */
  private convertToAudioItem(song: MetingApiSong, index: number): ProcessedAudioItem {
    return {
      name: song.title.trim(),
      artist: song.author.trim(),
      url: song.url.trim(),
      cover: song.pic.trim(),
      // 歌词可选，如果存在则使用
      lrc: song.lrc ? song.lrc.trim() : undefined,
      // 标记来源为网易云，便于播放器区分
      source: 'netease',
    };
  }

  /**
   * 从 Meting API 加载网易云歌单
   * @param config 网易云歌单配置
   * @returns Promise<NeteaseLoadResult> 加载结果
   */
  async loadPlaylist(config: NeteasePlaylistConfig): Promise<NeteaseLoadResult> {
    // 如果未启用，直接返回空列表
    if (!config.enabled) {
      return {
        success: true,
        songs: [],
      };
    }

    // 检查缓存是否有效
    const now = Date.now();
    if (
      this.cachedSongs &&
      this.cachedSongs.length > 0 &&
      now - this.cachedAt < this.cacheExpireMs
    ) {
      console.log('[NeteasePlaylistService] 使用缓存的网易云歌单数据');
      return {
        success: true,
        songs: [...this.cachedSongs],
      };
    }

    const apiUrl = this.buildApiUrl(config);

    try {
      console.log(`[NeteasePlaylistService] 正在加载网易云歌单: ${config.playlistId}`);
      
      const response = await this.fetchWithTimeout(apiUrl);

      if (!response.ok) {
        throw new Error(`Meting API 请求失败: HTTP ${response.status}`);
      }

      const data: unknown = await response.json();

      // 验证返回数据是否为数组
      if (!Array.isArray(data)) {
        throw new Error('Meting API 返回的数据格式不正确，期望为数组');
      }

      // 过滤并转换有效的歌曲数据
      const songs: ProcessedAudioItem[] = [];
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (this.validateMetingSong(item)) {
          songs.push(this.convertToAudioItem(item, i));
        } else {
          console.warn(`[NeteasePlaylistService] 跳过无效的歌曲数据，索引: ${i}`);
        }
      }

      if (songs.length === 0) {
        throw new Error('歌单中没有有效的歌曲数据');
      }

      // 更新缓存
      this.cachedSongs = songs;
      this.cachedAt = now;

      console.log(`[NeteasePlaylistService] 歌单加载成功，共 ${songs.length} 首歌曲`);

      return {
        success: true,
        songs,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('[NeteasePlaylistService] 加载网易云歌单失败:', errorMessage);

      // 如果有缓存（即使过期），也作为降级方案返回
      if (this.cachedSongs && this.cachedSongs.length > 0) {
        console.log('[NeteasePlaylistService] 使用过期的缓存数据作为降级方案');
        return {
          success: true,
          songs: [...this.cachedSongs],
        };
      }

      return {
        success: false,
        songs: [],
        error: errorMessage,
      };
    }
  }

  /**
   * 获取默认的网易云歌单配置
   * @returns NeteasePlaylistConfig 默认配置
   */
  getDefaultConfig(): NeteasePlaylistConfig {
    return {
      enabled: true,
      playlistId: DEFAULT_PLAYLIST_ID,
      api: DEFAULT_METING_API,
      description: '网易云音乐歌单（通过 Meting API 加载）',
    };
  }
}

// 导出单例实例
export const neteasePlaylistService = NeteasePlaylistService.getInstance();

// 导出类
export default NeteasePlaylistService;
