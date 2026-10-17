/**
 * 网易云音乐歌单加载服务
 *
 * 功能说明：
 * 1. 通过 Meting API 获取网易云音乐歌单数据
 * 2. 将 Meting API 返回的数据格式转换为播放器可用的音频列表格式
 * 3. 提供错误处理和降级机制
 * 4. 支持自定义 Meting API 地址
 * 5. 内存 + localStorage 双层缓存，减少第三方接口请求
 *
 * 缓存注意事项：
 * Meting 返回的音频 URL 是带时间戳的临时签名地址（实测有效期约 20 分钟），
 * 因此不能做长时间缓存。策略是：
 * - 5 分钟内：直接使用缓存（新鲜）；
 * - 5–15 分钟：接口请求失败时作为降级数据兜底；
 * - 超过 15 分钟：视为不可用，重新请求。
 *
 * 实现思路参考 MetingJS：
 * - MetingJS 本质上是通过 Meting API 解析平台歌单，再用第三方播放器播放
 * - 本项目不直接引入 MetingJS 库，而是借鉴其数据获取逻辑
 * - 这样可以将网易云歌单与现有的本地音乐配置无缝融合
 *
 * @author 歆橙
 * @version 2.0
 * @date 2026-10-17
 */

import type { ProcessedAudioItem } from '@/types/music';

// ==================== 类型定义 ====================

/**
 * Meting API 返回的单首歌曲数据格式
 *
 * 说明：不同 Meting API 实现的字段命名不一致：
 * - 标准 Meting 格式（如 api.injahow.cn）：name / artist / url / pic / lrc
 * - 部分旧版实现：title / author / url / pic / lrc
 * 为保证兼容性，本服务同时支持两种字段命名
 */
export interface MetingApiSong {
  /** 歌曲标题（标准格式字段） */
  name?: string;
  /** 歌曲标题（旧版格式字段） */
  title?: string;
  /** 歌手/艺术家（标准格式字段） */
  artist?: string;
  /** 歌手/艺术家（旧版格式字段） */
  author?: string;
  /** 音频文件 URL */
  url: string;
  /** 封面图片 URL */
  pic: string;
  /** 歌词文件 URL */
  lrc?: string;
}

/**
 * 网易云歌单配置接口
 */
export interface NeteasePlaylistConfig {
  /** 是否启用网易云歌单 */
  enabled: boolean;
  /** 歌单 ID */
  playlistId: string;
  /** Meting API 地址（主 API） */
  api: string;
  /** 备用 Meting API 地址（主 API 失败时按顺序尝试） */
  fallbackApis?: string[];
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

/**
 * localStorage 缓存结构
 */
interface StoredPlaylistCache {
  /** 歌曲列表 */
  songs: ProcessedAudioItem[];
  /** 缓存时间戳 */
  cachedAt: number;
}

// ==================== 常量定义 ====================

/**
 * 默认 Meting API
 *
 * - qijieya：playlist 接口返回完整歌单（实测 839/839 首）；
 * - injahow：备用。其 playlist 接口存在服务端缓存，实测会少 5 首（834/839），
 *   但 url/pic/lrc 接口仍可用，因此保留为降级源。
 */
const DEFAULT_METING_API = 'https://api.qijieya.cn/meting/';

/** 默认备用 Meting API 地址 */
const DEFAULT_FALLBACK_METING_APIS = ['https://api.injahow.cn/meting/'];

/** 默认歌单 ID */
const DEFAULT_PLAYLIST_ID = '14349636887';

/** 单个 API 请求超时时间（毫秒） */
const REQUEST_TIMEOUT_MS = 5000;

/** localStorage 缓存键 */
const CACHE_STORAGE_KEY = 'neteasePlaylistCache:v1';

/** 缓存新鲜期（毫秒），与内存缓存保持一致 */
const DEFAULT_CACHE_EXPIRE_MS = 5 * 60 * 1000;

/** 过期缓存兜底上限（毫秒）：超过后签名 URL 基本已失效，不再使用 */
const MAX_STALE_CACHE_MS = 15 * 60 * 1000;

// ==================== 服务类 ====================

/**
 * 网易云音乐歌单加载服务
 * 负责从 Meting API 获取歌单数据并转换为播放器可用格式
 */
class NeteasePlaylistService {
  /** 单例实例 */
  private static instance: NeteasePlaylistService;

  /** 缓存的歌单数据（内存） */
  private cachedSongs: ProcessedAudioItem[] | null = null;

  /** 内存缓存时间戳 */
  private cachedAt: number = 0;

  /** 缓存新鲜期（毫秒），默认 5 分钟 */
  private cacheExpireMs: number = DEFAULT_CACHE_EXPIRE_MS;

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
   * 清空内存与 localStorage 缓存
   */
  clearCache(): void {
    this.cachedSongs = null;
    this.cachedAt = 0;

    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(CACHE_STORAGE_KEY);
    } catch {
      // localStorage 不可用时忽略
    }
  }

  /**
   * 构建 Meting API 请求地址列表（主 API + 备用 API）
   *
   * @param config 网易云歌单配置
   * @param forceRefresh 是否追加时间戳参数，绕过浏览器/CDN 缓存
   * @returns 按优先级排列的完整 API URL 列表
   */
  private buildApiUrls(config: NeteasePlaylistConfig, forceRefresh: boolean = false): string[] {
    const primary = (config.api || DEFAULT_METING_API).trim();
    const fallbacks = (
      config.fallbackApis && config.fallbackApis.length > 0
        ? config.fallbackApis
        : DEFAULT_FALLBACK_METING_APIS
    )
      .map(api => api.trim())
      .filter(Boolean);

    const apis = [...new Set([primary, ...fallbacks].filter(Boolean))];
    return apis.map(api => this.buildSingleApiUrl(api, config, forceRefresh));
  }

  /**
   * 构建单个 API 的请求地址
   */
  private buildSingleApiUrl(
    api: string,
    config: NeteasePlaylistConfig,
    forceRefresh: boolean
  ): string {
    const playlistId = config.playlistId || DEFAULT_PLAYLIST_ID;

    // 注意：保留 API 地址末尾的斜杠原样拼接
    // 例如 api.injahow.cn/meting/ 必须带斜杠访问，去掉斜杠会触发 301 重定向，增加延迟且可能超时

    // 如果 api 已经包含查询参数，需要追加而不是覆盖
    const baseUrl = api.includes('?')
      ? `${api}&server=netease&type=playlist&id=${encodeURIComponent(playlistId)}`
      : `${api}?server=netease&type=playlist&id=${encodeURIComponent(playlistId)}`;

    // 强制刷新时追加时间戳，避免中间的浏览器缓存/代理缓存返回旧歌单
    return forceRefresh ? `${baseUrl}&_t=${Date.now()}` : baseUrl;
  }

  /**
   * 发起带超时的单次 fetch 请求
   * @param url 请求地址
   * @param noStore 是否禁用浏览器缓存
   * @returns Promise<Response>
   */
  private fetchOnce(url: string, noStore: boolean = false): Promise<Response> {
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
        // 普通加载优先使用缓存；强制刷新时完全跳过缓存
        cache: noStore ? 'no-store' : 'default'
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
   * 带超时的请求
   *
   * 不再做单 API 自动重试：主 API 失败会直接切到备用 API，
   * 避免两个 5 秒超时叠加成更长的等待。
   */
  private async fetchWithTimeout(url: string, noStore: boolean = false): Promise<Response> {
    return this.fetchOnce(url, noStore);
  }

  /**
   * 验证 Meting API 返回的歌曲数据是否有效
   *
   * 兼容两种字段命名：
   * - 标准格式：name（标题）/ artist（歌手）
   * - 旧版格式：title（标题）/ author（歌手）
   *
   * @param song 待验证的歌曲数据
   * @returns 是否有效
   */
  private validateMetingSong(song: unknown): song is MetingApiSong {
    if (typeof song !== 'object' || song === null) {
      return false;
    }

    const s = song as Record<string, unknown>;

    // 标题字段兼容：优先 name，其次 title
    const title = s.name ?? s.title;
    // 歌手字段兼容：优先 artist，其次 author
    const artist = s.artist ?? s.author;

    // 必需字段检查（标题、歌手、音频URL、封面URL 均为非空字符串）
    if (
      typeof title !== 'string' || title.trim() === '' ||
      typeof artist !== 'string' || artist.trim() === '' ||
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
   * @returns 处理后的音频项
   */
  private convertToAudioItem(song: MetingApiSong): ProcessedAudioItem {
    // 标题字段兼容：优先标准格式 name，其次旧版格式 title
    const title = song.name ?? song.title ?? '';
    // 歌手字段兼容：优先标准格式 artist，其次旧版格式 author
    const artist = song.artist ?? song.author ?? '';

    return {
      name: title.trim(),
      artist: artist.trim(),
      url: song.url.trim(),
      cover: song.pic.trim(),
      // 歌词可选，如果存在则使用
      lrc: song.lrc ? song.lrc.trim() : undefined,
      // 标记来源为网易云，便于播放器区分
      source: 'netease',
    };
  }

  /**
   * 从 localStorage 读取缓存
   *
   * @returns 缓存数据；不存在/损坏时返回 null
   */
  private readStoredCache(): StoredPlaylistCache | null {
    if (typeof window === 'undefined') return null;

    try {
      const raw = localStorage.getItem(CACHE_STORAGE_KEY);
      if (!raw) return null;

      const parsed = JSON.parse(raw) as StoredPlaylistCache;
      if (
        !parsed ||
        !Array.isArray(parsed.songs) ||
        parsed.songs.length === 0 ||
        typeof parsed.cachedAt !== 'number'
      ) {
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * 写入 localStorage 缓存
   *
   * 歌单约 260KB，远低于 localStorage 5MB 限额；
   * 写入失败（隐私模式/配额不足）不影响播放。
   */
  private writeStoredCache(songs: ProcessedAudioItem[], cachedAt: number): void {
    if (typeof window === 'undefined') return;

    try {
      const payload: StoredPlaylistCache = { songs, cachedAt };
      localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // 忽略写入失败
    }
  }

  /**
   * 把缓存写入内存并返回歌曲副本
   */
  private applyCache(cache: StoredPlaylistCache, source: string): NeteaseLoadResult {
    this.cachedSongs = cache.songs;
    this.cachedAt = cache.cachedAt;

    console.log(`[NeteasePlaylistService] 使用${source}缓存，共 ${cache.songs.length} 首歌曲`);
    return {
      success: true,
      songs: [...cache.songs],
    };
  }

  /**
   * 从 Meting API 加载网易云歌单
   *
   * @param config 网易云歌单配置
   * @param options.forceRefresh 是否忽略内存/localStorage 缓存并强制请求最新数据
   * @returns Promise<NeteaseLoadResult> 加载结果
   */
  async loadPlaylist(
    config: NeteasePlaylistConfig,
    options: { forceRefresh?: boolean } = {}
  ): Promise<NeteaseLoadResult> {
    // 如果未启用，直接返回空列表
    if (!config.enabled) {
      return {
        success: true,
        songs: [],
      };
    }

    const forceRefresh = options.forceRefresh === true;
    const now = Date.now();

    // 1. 内存缓存新鲜期（强制刷新时跳过）
    if (
      !forceRefresh &&
      this.cachedSongs &&
      this.cachedSongs.length > 0 &&
      now - this.cachedAt < this.cacheExpireMs
    ) {
      return this.applyCache(
        { songs: this.cachedSongs, cachedAt: this.cachedAt },
        '内存'
      );
    }

    // 2. localStorage 缓存新鲜期（跨整页刷新复用；强制刷新时跳过）
    const storedCache = this.readStoredCache();
    if (
      !forceRefresh &&
      storedCache &&
      now - storedCache.cachedAt < this.cacheExpireMs
    ) {
      return this.applyCache(storedCache, '本地');
    }

    const apiUrls = this.buildApiUrls(config, forceRefresh);
    let lastError: Error | null = null;

    // 按 主 API → 备用 API 的顺序尝试
    for (const apiUrl of apiUrls) {
      try {
        console.log(
          `[NeteasePlaylistService] ${forceRefresh ? '强制刷新' : '正在加载'}网易云歌单: ${config.playlistId} (${apiUrl})`
        );

        const response = await this.fetchWithTimeout(apiUrl, forceRefresh);

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
            songs.push(this.convertToAudioItem(item));
          } else {
            console.warn(`[NeteasePlaylistService] 跳过无效的歌曲数据，索引: ${i}`);
          }
        }

        if (songs.length === 0) {
          throw new Error('歌单中没有有效的歌曲数据');
        }

        // 更新内存缓存
        this.cachedSongs = songs;
        this.cachedAt = now;

        // 写入 localStorage（短 TTL，避免签名 URL 过期）
        this.writeStoredCache(songs, now);

        console.log(`[NeteasePlaylistService] 歌单加载成功，共 ${songs.length} 首歌曲`);

        return {
          success: true,
          songs,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        lastError = error instanceof Error ? error : new Error(errorMessage);
        console.warn(`[NeteasePlaylistService] Meting API 加载失败 (${apiUrl}):`, errorMessage);
        // 继续尝试下一个 API
      }
    }

    const errorMessage = lastError?.message || '未知错误';
    console.error('[NeteasePlaylistService] 所有 Meting API 均加载失败:', errorMessage);

    // 3. 降级：使用过期但仍在签名有效期内（15 分钟）的缓存
    if (
      this.cachedSongs &&
      this.cachedSongs.length > 0 &&
      now - this.cachedAt < MAX_STALE_CACHE_MS
    ) {
      return this.applyCache(
        { songs: this.cachedSongs, cachedAt: this.cachedAt },
        '过期内存'
      );
    }

    if (
      storedCache &&
      now - storedCache.cachedAt < MAX_STALE_CACHE_MS
    ) {
      return this.applyCache(storedCache, '过期本地');
    }

    return {
      success: false,
      songs: [],
      error: errorMessage,
    };
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
      fallbackApis: [...DEFAULT_FALLBACK_METING_APIS],
      description: '网易云音乐歌单（通过 Meting API 加载）',
    };
  }
}

// 导出单例实例
export const neteasePlaylistService = NeteasePlaylistService.getInstance();

// 导出类
export default NeteasePlaylistService;
