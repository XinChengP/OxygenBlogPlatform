/**
 * 网易云音乐 API 服务模块
 * 
 * 功能说明：
 * 1. 调用第三方网易云音乐 API 获取歌单信息
 * 2. 优先使用增强版 API (api-enhanced)，支持歌曲解锁（解灰）和无损音质
 * 3. 开发环境使用本地代理，生产环境直接调用第三方 API
 * 4. 获取歌曲详情和播放链接
 * 5. 获取歌词信息
 * 6. 错误处理和降级方案
 * 
 * 增强版 API 特性：
 * - 歌曲解锁（解灰）：可以播放原本因版权无法播放的歌曲
 * - 无损音质：支持 FLAC 等无损格式
 * - 社区维护：持续更新，稳定性更好
 * 
 * @author 歆橙
 * @version 3.1
 * @date 2026-05-05
 */

/**
 * 网易云歌单详情响应接口
 */
export interface NeteasePlaylistDetail {
  code: number;
  playlist: {
    id: number;
    name: string;
    coverImgUrl: string;
    description: string;
    trackCount: number;
    tracks: NeteaseTrack[];
  };
}

/**
 * 网易云歌曲信息接口
 */
export interface NeteaseTrack {
  id: number;
  name: string;
  ar: Array<{
    id: number;
    name: string;
  }>;
  al: {
    id: number;
    name: string;
    picUrl: string;
  };
  dt: number; // 歌曲时长（毫秒）
}

/**
 * 网易云歌曲 URL 响应接口
 */
export interface NeteaseSongUrlResponse {
  code: number;
  data: Array<{
    id: number;
    url: string | null;
    br: number;
    size: number;
    md5: string;
    code: number;
    expi: number;
    type: string;
    gain: number;
    fee: number;
    uf: null | string;
    payed: number;
    flag: number;
    canExtend: boolean;
  }>;
}

/**
 * 网易云歌词响应接口
 */
export interface NeteaseLyricResponse {
  code: number;
  lrc?: {
    lyric: string;
  };
  tlyric?: {
    lyric: string;
  };
  nolyric?: boolean;
  uncollected?: boolean;
}

/**
 * 转换后的标准歌曲格式接口
 */
export interface ConvertedNeteaseSong {
  id: string;
  name: string;
  artist: string;
  url: string;
  cover: string;
  lrc?: string;
  source: 'netease';
  neteaseId: number;
  duration: number;
}

/**
 * API 配置接口
 */
interface ApiConfig {
  baseUrl: string;
  timeout: number;
  useProxy: boolean; // 是否使用本地代理
}

// 第三方 API 基础 URL（多个备用源）
// 优先使用增强版 API，支持歌曲解锁（解灰）和无损音质
const THIRD_PARTY_API_URLS = [
  'https://api-enhanced.vercel.app',  // 增强版 API，支持解灰
  'https://api.toolkal.com',
  'https://netease-music-api.vercel.app',
  'https://api.imouto.re',
];

// URL 缓存配置
const URL_CACHE_KEY = 'netease_music_url_cache';
const URL_CACHE_EXPIRE_TIME = 12 * 60 * 1000; // 12 分钟过期（网易云链接通常10-15分钟左右过期）
const URL_CACHE_REFRESH_THRESHOLD = 8 * 60 * 1000; // 8 分钟后视为即将过期，需要刷新

/**
 * 缓存的歌曲 URL 接口
 */
interface CachedSongUrl {
  url: string;
  cachedAt: number;
}

// 默认 API 配置
const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: THIRD_PARTY_API_URLS[0],
  timeout: 60000,
  useProxy: false,
};

/**
 * 检测是否在开发环境
 * @returns 是否在开发环境
 */
function isDevelopment(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
}

/**
 * 网易云音乐 API 服务类
 */
class NeteaseMusicApiService {
  private config: ApiConfig;
  private currentApiIndex: number = 0; // 当前使用的 API 源索引
  
  // URL 缓存（内存 + localStorage）
  private urlCache: Map<number, CachedSongUrl> = new Map();

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    
    // 开发环境使用本地代理，生产环境直接调用第三方 API
    this.config.useProxy = isDevelopment();
    
    // 从 localStorage 加载 URL 缓存
    this.loadUrlCacheFromStorage();
  }
  
  /**
   * 从 localStorage 加载 URL 缓存
   */
  private loadUrlCacheFromStorage(): void {
    try {
      const cachedData = localStorage.getItem(URL_CACHE_KEY);
      if (cachedData) {
        const cache = JSON.parse(cachedData) as Record<string, CachedSongUrl>;
        const now = Date.now();
        
        for (const [id, data] of Object.entries(cache)) {
          // 检查缓存是否过期
          if (now - data.cachedAt < URL_CACHE_EXPIRE_TIME) {
            this.urlCache.set(Number(id), data);
          }
        }
        
        console.log(`[NeteaseMusicApi] 从本地加载了 ${this.urlCache.size} 个缓存的 URL`);
      }
    } catch (error) {
      console.warn('[NeteaseMusicApi] 加载 URL 缓存失败:', error);
    }
  }
  
  /**
   * 保存 URL 缓存到 localStorage
   */
  private saveUrlCacheToStorage(): void {
    try {
      const cacheObj: Record<string, CachedSongUrl> = {};
      
      for (const [id, data] of this.urlCache.entries()) {
        cacheObj[id.toString()] = data;
      }
      
      localStorage.setItem(URL_CACHE_KEY, JSON.stringify(cacheObj));
    } catch (error) {
      console.warn('[NeteaseMusicApi] 保存 URL 缓存失败:', error);
    }
  }
  
  /**
   * 获取当前使用的 API 基础 URL
   */
  private getCurrentBaseUrl(): string {
    return THIRD_PARTY_API_URLS[this.currentApiIndex] || THIRD_PARTY_API_URLS[0];
  }
  
  /**
   * 切换到下一个 API 源
   */
  private switchToNextApi(): void {
    this.currentApiIndex = (this.currentApiIndex + 1) % THIRD_PARTY_API_URLS.length;
    console.log(`[NeteaseMusicApi] 切换到备用 API: ${this.getCurrentBaseUrl()}`);
  }

  /**
   * 设置 API 配置
   * @param config 部分配置项
   */
  setConfig(config: Partial<ApiConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * 获取 API 基础 URL
   * @returns API 基础 URL
   */
  getBaseUrl(): string {
    return this.config.baseUrl;
  }

  /**
   * 获取 API 路径
   * @returns API 路径
   */
  private getApiUrl(endpoint: string): string {
    if (this.config.useProxy) {
      // 开发环境使用本地代理
      return `${window.location.origin}/api/netease/playlist`;
    } else {
      // 生产环境使用当前 API 源
      return `${this.getCurrentBaseUrl()}${endpoint}`;
    }
  }

  /**
   * 发送 API 请求
   * @param endpoint API 端点
   * @param params 查询参数
   * @returns 响应数据
   */
  private async request<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    const url = new URL(this.getApiUrl(endpoint));
    
    // 添加查询参数
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    // 添加时间戳防止缓存
    url.searchParams.append('timestamp', Date.now().toString());

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
        mode: 'cors',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('请求超时，请检查网络连接');
        }
        throw new Error(`API 请求失败: ${error.message}`);
      }
      throw new Error('API 请求失败: 未知错误');
    }
  }

  /**
   * 获取歌单所有歌曲
   * @param playlistId 歌单 ID
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 歌曲列表
   */
  private async getPlaylistTracks(
    playlistId: number | string,
    limit: number = 100,
    offset: number = 0
  ): Promise<NeteaseTrack[]> {
    const data = await this.request<{
      code: number;
      songs: NeteaseTrack[];
    }>('/playlist/track/all', {
      id: playlistId,
      limit,
      offset,
    });

    if (data.code !== 200) {
      throw new Error(`获取歌单歌曲失败，错误码: ${data.code}`);
    }

    return data.songs || [];
  }

  /**
   * 获取歌曲播放链接
   * @param songIds 歌曲 ID 数组
   * @param level 音质等级
   * @returns 歌曲 URL 信息
   */
  private async getSongUrls(
    songIds: number[],
    level: 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' = 'exhigh'
  ): Promise<Map<number, string>> {
    const ids = songIds.join(',');
    
    // 检查缓存中是否已有这些歌曲的 URL
    const cachedUrls = new Map<number, string>();
    const uncachedIds: number[] = [];
    
    for (const id of songIds) {
      const cache = this.urlCache.get(id);
      if (cache && Date.now() - cache.cachedAt < URL_CACHE_EXPIRE_TIME) {
        cachedUrls.set(id, cache.url);
      } else {
        uncachedIds.push(id);
      }
    }
    
    // 如果所有歌曲都有缓存，直接返回
    if (uncachedIds.length === 0) {
      console.log(`[NeteaseMusicApi] ${songIds.length} 首歌曲的 URL 全部来自缓存`);
      return cachedUrls;
    }
    
    // 只有未缓存的歌曲才需要请求 API
    const uncachedIdsStr = uncachedIds.join(',');
    
    // 尝试多个 API 源
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < THIRD_PARTY_API_URLS.length; attempt++) {
      try {
        console.log(`[NeteaseMusicApi] 尝试获取 URL（第 ${attempt + 1} 次尝试）...`);
        
        // 构建请求参数
        // 增强版 API 支持 enableUnblock 参数启用歌曲解锁（解灰）功能
        const params: Record<string, string | number> = {
          id: uncachedIdsStr,
          level,
        };
        
        // 如果是增强版 API（第一个源），添加解灰参数
        if (attempt === 0) {
          params.enableUnblock = 'true';
          console.log('[NeteaseMusicApi] 使用增强版 API，启用歌曲解锁功能');
        }
        
        const data = await this.request<NeteaseSongUrlResponse>('/song/url/v1', params);

        if (data.code !== 200) {
          throw new Error(`获取歌曲链接失败，错误码: ${data.code}`);
        }

        const urlMap = new Map<number, string>();
        
        // 合并缓存和新的 URL
        for (const item of data.data) {
          if (item.url) {
            urlMap.set(item.id, item.url);
            
            // 更新缓存
            this.urlCache.set(item.id, {
              url: item.url.replace(/^http:/, 'https:'),
              cachedAt: Date.now(),
            });
          }
        }
        
        // 保存缓存到 localStorage
        this.saveUrlCacheToStorage();
        
        console.log(`[NeteaseMusicApi] 成功获取 ${urlMap.size} 首歌曲的 URL，其中 ${cachedUrls.size} 首来自缓存`);
        return urlMap;
      } catch (error) {
        lastError = error as Error;
        console.warn(`[NeteaseMusicApi] API 源 ${THIRD_PARTY_API_URLS[attempt]} 请求失败:`, error);
        
        // 切换到下一个 API 源
        this.switchToNextApi();
      }
    }
    
    // 所有 API 源都失败
    console.error('[NeteaseMusicApi] 所有 API 源均获取失败:', lastError);
    throw new Error(`获取歌曲链接失败: ${lastError?.message}`);
  }

  /**
   * 获取歌词
   * @param songId 歌曲 ID
   * @returns 歌词内容
   */
  private async getLyric(songId: number): Promise<string | undefined> {
    try {
      const data = await this.request<NeteaseLyricResponse>('/lyric', {
        id: songId,
      });

      if (data.code !== 200) {
        return undefined;
      }

      if (data.lrc?.lyric) {
        return data.lrc.lyric;
      }

      return undefined;
    } catch (error) {
      console.warn(`[NeteaseMusicApi] 获取歌词失败: ${songId}`, error);
      return undefined;
    }
  }

  /**
   * 转换网易云歌曲为标准格式
   * @param track 网易云歌曲信息
   * @param songUrl 歌曲播放链接
   * @param lyric 歌词内容
   * @returns 标准格式的歌曲信息
   */
  private convertToStandardFormat(
    track: NeteaseTrack,
    songUrl: string,
    lyric?: string
  ): ConvertedNeteaseSong {
    const artistNames = track.ar.map((artist) => artist.name).join('、');

    return {
      id: `netease-${track.id}`,
      name: track.name,
      artist: artistNames,
      url: songUrl,
      cover: track.al.picUrl,
      lrc: lyric,
      source: 'netease',
      neteaseId: track.id,
      duration: Math.floor(track.dt / 1000),
    };
  }

  /**
   * 获取完整歌单歌曲（包含播放链接）
   * @param playlistId 歌单 ID
   * @param limit 限制数量
   * @param forceRefresh 是否强制刷新，忽略缓存（默认 false）
   * @returns 标准格式的歌曲列表
   */
  async getFullPlaylistSongs(
    playlistId: number | string,
    limit: number = 100,
    forceRefresh: boolean = false
  ): Promise<ConvertedNeteaseSong[]> {
    try {
      console.log(`[NeteaseMusicApi] 正在获取歌单：${playlistId}, 使用代理：${this.config.useProxy}, 强制刷新：${forceRefresh}`);

      // 获取歌单歌曲列表
      const tracks = await this.getPlaylistTracks(playlistId, limit);

      if (tracks.length === 0) {
        return [];
      }

      // 获取歌曲 ID 列表
      const songIds = tracks.map((track) => track.id);

      // 如果强制刷新，先清除缓存
      if (forceRefresh) {
        this.clearUrlCache();
        console.log('[NeteaseMusicApi] 已清除旧缓存，获取全新链接');
      }

      // 获取歌曲播放链接
      const urlMap = await this.getSongUrls(songIds);

      // 转换为标准格式
      const songs: ConvertedNeteaseSong[] = [];

      for (const track of tracks) {
        const songUrl = urlMap.get(track.id);
        if (!songUrl) {
          console.warn(`[NeteaseMusicApi] 歌曲无播放链接: ${track.name} (${track.id})`);
          continue;
        }

        // 获取歌词（可选，失败不影响主流程）
        let lyric: string | undefined;
        try {
          lyric = await this.getLyric(track.id);
        } catch {
          // 歌词获取失败继续
        }

        const convertedSong = this.convertToStandardFormat(track, songUrl, lyric);
        songs.push(convertedSong);
      }

      console.log(`[NeteaseMusicApi] 成功获取 ${songs.length}/${tracks.length} 首歌曲`);
      return songs;
    } catch (error) {
      console.error('[NeteaseMusicApi] 获取歌单歌曲失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个歌曲的最新播放链接
   * 用于刷新已过期的音频链接
   * @param songId 歌曲 ID
   * @param level 音质等级
   * @returns 最新的播放链接
   */
  async getFreshSongUrl(
    songId: number,
    level: 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' = 'exhigh'
  ): Promise<string | null> {
    // 先检查缓存
    const cache = this.urlCache.get(songId);
    if (cache && Date.now() - cache.cachedAt < URL_CACHE_EXPIRE_TIME) {
      console.log(`[NeteaseMusicApi] 从缓存获取歌曲链接: ${songId}`);
      return cache.url;
    }
    
    // 尝试多个 API 源
    for (let attempt = 0; attempt < THIRD_PARTY_API_URLS.length; attempt++) {
      try {
        console.log(`[NeteaseMusicApi] 尝试刷新歌曲链接（第 ${attempt + 1} 次尝试）: ${songId}`);
        
        // 构建请求参数
        // 增强版 API 支持 enableUnblock 参数启用歌曲解锁（解灰）功能
        const params: Record<string, string | number> = {
          id: songId,
          level,
        };
        
        // 如果是增强版 API（第一个源），添加解灰参数
        if (attempt === 0) {
          params.enableUnblock = 'true';
          console.log('[NeteaseMusicApi] 使用增强版 API，启用歌曲解锁功能');
        }
        
        const data = await this.request<NeteaseSongUrlResponse>('/song/url/v1', params);

        if (data.code !== 200 || !data.data || data.data.length === 0) {
          return null;
        }

        const songData = data.data[0];
        if (songData.url) {
          const freshUrl = songData.url.replace(/^http:/, 'https:');
          
          // 更新缓存
          this.urlCache.set(songId, {
            url: freshUrl,
            cachedAt: Date.now(),
          });
          
          // 保存缓存到 localStorage
          this.saveUrlCacheToStorage();
          
          console.log(`[NeteaseMusicApi] 成功获取新链接: ${songId}`);
          return freshUrl;
        }
        return null;
      } catch (error) {
        console.warn(`[NeteaseMusicApi] API 源 ${THIRD_PARTY_API_URLS[attempt]} 刷新失败: ${songId}`, error);
        this.switchToNextApi();
      }
    }
    
    // 所有 API 源都失败，返回缓存的 URL（即使过期）
    if (cache) {
      console.warn(`[NeteaseMusicApi] 所有 API 源刷新失败，使用过期缓存: ${songId}`);
      return cache.url;
    }
    
    return null;
  }

  /**
   * 测试 API 连接
   * @returns 是否连接成功
   */
  async testConnection(): Promise<boolean> {
    // 尝试所有 API 源
    for (const apiUrl of THIRD_PARTY_API_URLS) {
      try {
        const originalBaseUrl = this.getCurrentBaseUrl();
        
        // 临时切换到指定 API 源
        const index = THIRD_PARTY_API_URLS.indexOf(apiUrl);
        if (index >= 0) {
          this.currentApiIndex = index;
        }
        
        await this.request('/banner');
        console.log(`[NeteaseMusicApi] API 连接成功: ${apiUrl}`);
        return true;
      } catch {
        console.warn(`[NeteaseMusicApi] API 连接失败: ${apiUrl}`);
      }
    }
    
    return false;
  }

  /**
   * 清除 URL 缓存
   */
  clearUrlCache(): void {
    this.urlCache.clear();
    localStorage.removeItem(URL_CACHE_KEY);
    console.log('[NeteaseMusicApi] URL 缓存已清除');
  }
  
  /**
   * 初始化时自动清除缓存
   * 在页面加载时调用，确保使用全新链接
   * 注意：总是清除缓存，避免使用可能已过期的链接
   */
  async initialize(): Promise<void> {
    console.log('[NeteaseMusicApi] 初始化，清除所有缓存...');
    
    // 总是清除缓存，确保使用全新链接
    this.clearUrlCache();
    console.log('[NeteaseMusicApi] 缓存已清除，将获取全新链接');
  }
  
  /**
   * 获取缓存统计信息
   * @returns 缓存数据
   */
  getCacheStats(): { count: number; expireTimeMs: number } {
    return {
      count: this.urlCache.size,
      expireTimeMs: URL_CACHE_EXPIRE_TIME,
    };
  }

  /**
   * 检查 URL 是否需要刷新
   * @param songId 歌曲 ID
   * @returns 是否需要刷新
   */
  isUrlNeedRefresh(songId: number): boolean {
    const cache = this.urlCache.get(songId);
    if (!cache) return true; // 没有缓存，需要获取
    
    const age = Date.now() - cache.cachedAt;
    return age > URL_CACHE_REFRESH_THRESHOLD; // 超过阈值需要刷新
  }

  /**
   * 智能获取歌曲 URL
   * 如果缓存即将过期，自动刷新链接
   * @param songId 歌曲 ID
   * @param level 音质等级
   * @returns 播放链接
   */
  async getSmartSongUrl(
    songId: number,
    level: 'standard' | 'higher' | 'exhigh' | 'lossless' | 'hires' = 'exhigh'
  ): Promise<string | null> {
    // 检查现有缓存
    const cache = this.urlCache.get(songId);
    
    if (cache) {
      const age = Date.now() - cache.cachedAt;
      
      // 如果缓存还很新（小于 8 分钟），直接返回
      if (age < URL_CACHE_REFRESH_THRESHOLD) {
        console.log(`[NeteaseMusicApi] 使用缓存链接（${Math.floor(age / 1000 / 60)} 分钟前获取）: ${songId}`);
        return cache.url;
      }
      
      // 如果缓存即将过期（8-12 分钟），尝试刷新
      if (age < URL_CACHE_EXPIRE_TIME) {
        console.log(`[NeteaseMusicApi] 链接即将过期，尝试刷新: ${songId}`);
        try {
          const freshUrl = await this.getFreshSongUrl(songId, level);
          if (freshUrl) {
            return freshUrl;
          }
          // 刷新失败但缓存仍有效，返回旧链接
          console.warn(`[NeteaseMusicApi] 刷新失败，使用即将过期的缓存: ${songId}`);
          return cache.url;
        } catch (error) {
          console.warn(`[NeteaseMusicApi] 刷新链接失败，使用缓存: ${songId}`, error);
          return cache.url;
        }
      }
    }
    
    // 没有缓存或已过期，获取新链接
    console.log(`[NeteaseMusicApi] 获取新链接: ${songId}`);
    return this.getFreshSongUrl(songId, level);
  }

  /**
   * 后台静默刷新多个 URL
   * 用于播放器空闲时预刷新即将过期的链接
   * @param songIds 歌曲 ID 数组
   */
  async backgroundRefreshUrls(songIds: number[]): Promise<void> {
    const needRefresh = songIds.filter(id => this.isUrlNeedRefresh(id));
    
    if (needRefresh.length === 0) {
      return;
    }
    
    console.log(`[NeteaseMusicApi] 后台刷新 ${needRefresh.length} 个即将过期的链接`);
    
    // 限制并发数量，避免过多请求
    const batchSize = 3;
    for (let i = 0; i < needRefresh.length; i += batchSize) {
      const batch = needRefresh.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (id) => {
          try {
            await this.getFreshSongUrl(id);
            console.log(`[NeteaseMusicApi] 后台刷新成功: ${id}`);
          } catch (error) {
            console.warn(`[NeteaseMusicApi] 后台刷新失败: ${id}`, error);
          }
        })
      );
      
      // 批次间添加小延迟，避免请求过快
      if (i + batchSize < needRefresh.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`[NeteaseMusicApi] 后台刷新完成`);
  }
}

// 导出单例实例
export const neteaseMusicApi = new NeteaseMusicApiService();

// 导出类，允许创建新实例
export default NeteaseMusicApiService;
