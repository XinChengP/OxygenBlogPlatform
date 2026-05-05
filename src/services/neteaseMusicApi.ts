/**
 * 网易云音乐 API 服务模块
 * 
 * 功能说明：
 * 1. 调用本地 API 路由代理获取网易云音乐数据，解决跨域问题
 * 2. 获取歌单详情和歌曲列表
 * 3. 获取歌曲播放链接
 * 4. 获取歌词信息
 * 5. 错误处理和降级方案
 * 
 * @author 歆橙
 * @version 2.0
 * @date 2026-05-05
 */

import { getBasePath } from '@/utils/assetUtils';

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
 * API 响应接口
 */
interface ApiResponse {
  code: number;
  data: ConvertedNeteaseSong[];
  total: number;
  error?: string;
  message?: string;
}

/**
 * API 配置接口
 */
interface ApiConfig {
  baseUrl: string;
  timeout: number;
}

// 默认 API 配置
const DEFAULT_CONFIG: ApiConfig = {
  // 使用本地 API 路由作为代理，解决跨域问题
  baseUrl: '',
  timeout: 60000, // 60秒超时（获取歌单可能需要较长时间）
};

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
   * 在开发环境使用相对路径，在生产环境考虑 basePath
   * @returns API 路径
   */
  private getApiPath(): string {
    // 使用相对路径，Next.js 会自动处理路由
    return '/api/netease/playlist';
  }

  /**
   * 发送 API 请求
   * @param endpoint API 端点
   * @param params 查询参数
   * @returns 响应数据
   */
  private async request<T>(endpoint: string, params: Record<string, string | number> = {}): Promise<T> {
    // 构建 URL
    const url = new URL(endpoint, window.location.origin);
    
    // 添加查询参数
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
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
      console.log(`[NeteaseMusicApi] 正在获取歌单: ${playlistId}`);

      const data = await this.request<ApiResponse>(this.getApiPath(), {
        id: playlistId,
        limit,
      });

      if (data.code !== 200) {
        throw new Error(data.error || `获取歌单失败，错误码: ${data.code}`);
      }

      console.log(`[NeteaseMusicApi] 成功获取 ${data.data.length} 首歌曲`);
      return data.data;
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
      // 使用一个公开的歌单 ID 进行测试
      await this.request<ApiResponse>(this.getApiPath(), {
        id: '1',
        limit: 1,
      });
      return true;
    } catch {
      return false;
    }
  }
}

// 导出单例实例
export const neteaseMusicApi = new NeteaseMusicApiService();

// 导出类，允许创建新实例
export default NeteaseMusicApiService;
