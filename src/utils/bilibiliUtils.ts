/**
 * B站工具函数
 * 用于获取B站用户信息和视频数量
 * 
 * 注意：由于项目使用静态导出（output: "export"），所有请求都在客户端进行
 * B站 API 不允许跨域请求，因此需要使用 CORS 代理
 */

interface BilibiliUserInfo {
  mid: number;
  name: string;
  videos: number;
  face: string;
}

/**
 * 缓存机制
 * 避免短时间内重复请求
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
const CACHE_DURATION = 60 * 60 * 1000; // 1小时缓存

/**
 * CORS 代理列表
 * 按优先级排序，如果一个失败则尝试下一个
 */
const CORS_PROXIES = [
  // 代理1：corsproxy.io - 稳定性较好
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  // 代理2：allorigins.win - 备用
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  // 代理3：cors-anywhere 需要临时访问权限，作为最后备选
  // (url: string) => `https://cors-anywhere.herokuapp.com/${url}`,
];

/**
 * 检测当前环境
 * 静态导出项目始终返回 false（没有服务端运行时）
 */
const isDev = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

/**
 * 使用指定的代理发起请求
 * @param url 目标 URL
 * @param proxyIndex 代理索引
 */
async function fetchWithProxy(url: string, proxyIndex: number = 0): Promise<Response | null> {
  // 如果已经尝试完所有代理，返回 null
  if (proxyIndex >= CORS_PROXIES.length) {
    return null;
  }

  const proxyUrl = CORS_PROXIES[proxyIndex](url);
  
  try {
    // 设置超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

    const response = await fetch(proxyUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/plain, */*',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return response;
    }
    
    // 当前代理失败，尝试下一个
    console.warn(`代理 ${proxyIndex + 1} 请求失败，状态码：${response.status}`);
    return fetchWithProxy(url, proxyIndex + 1);
  } catch (error) {
    // 请求出错，尝试下一个代理
    console.warn(`代理 ${proxyIndex + 1} 请求出错:`, error instanceof Error ? error.message : '未知错误');
    return fetchWithProxy(url, proxyIndex + 1);
  }
}

/**
 * 获取B站用户信息
 * 使用多代理重试机制，确保请求稳定性
 * @param mid B站用户ID
 */
export interface BilibiliUserInfoResult {
  data: { video_count: number; name: string; mid: string | number };
  code: number;
  message?: string;
}

export async function getBilibiliUserInfo(mid: string | number): Promise<BilibiliUserInfoResult> {
  // 检查缓存
  const cacheKey = `bilibili_user_${mid}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as BilibiliUserInfoResult;
  }

  // B站公开接口（无风控）
  const rawUrl = `https://api.bilibili.com/x/space/upstat?mid=${mid}`;

  try {
    // 使用代理发起请求
    const response = await fetchWithProxy(rawUrl);

    if (!response) {
      throw new Error('所有代理请求均失败');
    }

    // 解析响应
    const text = await response.text();
    let data;

    try {
      data = JSON.parse(text);
    } catch {
      // 尝试处理可能的 JSONP 或其他格式
      throw new Error('响应格式解析失败');
    }

    // 检查 B站 API 返回状态
    if (data.code !== 0) {
      console.warn('B站 API 返回错误:', data.message);
      throw new Error(data.message || 'B站 API 错误');
    }

    // 构建结果
    const result = {
      data: {
        video_count: data.data?.archive?.view || 0, // 视频播放量
        name: `UP主${mid}`,
        mid: mid
      },
      code: 0
    };

    // 缓存成功结果
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    // 静默处理错误，不影响用户体验
    console.warn('获取B站用户信息失败:', error instanceof Error ? error.message : '未知错误');

    // 返回保底结果
    const fallbackResult = {
      data: { video_count: 0, name: '未知UP主', mid: mid },
      code: -1,
      message: '数据加载失败'
    };

    // 短时间缓存失败结果（5分钟），避免频繁重试
    cache.set(cacheKey, {
      data: fallbackResult,
      timestamp: Date.now() - CACHE_DURATION + 5 * 60 * 1000
    });

    return fallbackResult;
  }
}

/**
 * 获取B站视频播放量
 * @param mid B站用户ID
 */
export async function getBilibiliVideoCount(mid: string | number): Promise<number> {
  try {
    const userInfo = await getBilibiliUserInfo(mid);
    return userInfo.data?.video_count || 0;
  } catch {
    return 0;
  }
}

/**
 * 检查 B站数据是否可用
 * 用于判断是否显示相关 UI
 */
export async function checkBilibiliAvailable(mid: string | number): Promise<boolean> {
  const info = await getBilibiliUserInfo(mid);
  return info.code === 0;
}

const bilibiliUtils = {
  getBilibiliUserInfo,
  getBilibiliVideoCount,
  checkBilibiliAvailable
};

export default bilibiliUtils;
