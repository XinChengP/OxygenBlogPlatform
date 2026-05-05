/**
 * 网易云音乐 API 服务模块
 * 
 * 功能说明：
 * 1. 调用第三方网易云音乐 API 获取歌单信息
 * 2. 开发环境使用本地代理，生产环境直接调用第三方 API
 * 3. 获取歌曲详情和播放链接
 * 4. 获取歌词信息
 * 5. 错误处理和降级方案
 * 
 * @author 歆橙
 * @version 3.0
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

// 第三方 API 基础 URL
const THIRD_PARTY_API_URL = 'https://api.toolkal.com';

// 默认 API 配置
const DEFAULT_CONFIG: ApiConfig = {
  baseUrl: THIRD_PARTY_API_URL,
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

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };
    
    // 开发环境使用本地代理，生产环境直接调用第三方 API
    this.config.useProxy = isDevelopment();
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
      // 生产环境直接调用第三方 API
      return `${this.config.baseUrl}${endpoint}`;
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
    const data = await this.request<NeteaseSongUrlResponse>('/song/url/v1', {
      id: ids,
      level,
    });

    if (data.code !== 200) {
      throw new Error(`获取歌曲链接失败，错误码: ${data.code}`);
    }

    const urlMap = new Map<number, string>();
    data.data.forEach((item) => {
      if (item.url) {
        urlMap.set(item.id, item.url);
      }
    });

    return urlMap;
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
   * @returns 标准格式的歌曲列表
   */
  async getFullPlaylistSongs(
    playlistId: number | string,
    limit: number = 100
  ): Promise<ConvertedNeteaseSong[]> {
    try {
      console.log(`[NeteaseMusicApi] 正在获取歌单: ${playlistId}, 使用代理: ${this.config.useProxy}`);

      // 获取歌单歌曲列表
      const tracks = await this.getPlaylistTracks(playlistId, limit);

      if (tracks.length === 0) {
        return [];
      }

      // 获取歌曲 ID 列表
      const songIds = tracks.map((track) => track.id);

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
   * 测试 API 连接
   * @returns 是否连接成功
   */
  async testConnection(): Promise<boolean> {
    try {
      this.resetApi();
      await this.request('/banner');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 重置 API 到主 API
   */
  private resetApi(): void {
    this.config.baseUrl = THIRD_PARTY_API_URL;
  }
}

// 导出单例实例
export const neteaseMusicApi = new NeteaseMusicApiService();

// 导出类，允许创建新实例
export default NeteaseMusicApiService;
