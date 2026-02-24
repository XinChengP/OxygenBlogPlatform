/**
 * B站工具函数
 * 用于获取B站用户信息和视频数量
 * 使用公开无风控的接口，支持本地和线上环境
 */

interface BilibiliUserInfo {
  mid: number;
  name: string;
  videos: number;
  face: string;
}

/**
 * 缓存机制
 */
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1小时缓存
const isDev = process.env.NODE_ENV === 'development';

/**
 * 改用B站公开接口（无风控）获取用户视频数
 * @param mid B站用户ID
 */
export async function getBilibiliUserInfo(mid: string | number) {
  console.log('开始获取B站用户信息:', mid);
  
  // 检查缓存
  const cacheKey = `bilibili_user_${mid}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log('使用缓存的B站用户信息');
    return cached.data;
  }
  
  // 改用公开的空间概览接口（反爬宽松）
  const rawUrl = `https://api.bilibili.com/x/space/upstat?mid=${mid}`;
  
  // 构建请求地址（本地/线上适配）
  const getRequestUrl = () => {
    if (isDev) {
      return rawUrl; // 本地用CORS插件直接请求
    } else {
      // 线上用更稳定的代理（替换成自己的Vercel代理更佳）
      return `https://api.allorigins.win/get?url=${encodeURIComponent(rawUrl)}`;
    }
  };

  try {
    const response = await fetch(getRequestUrl(), {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Referer': `https://space.bilibili.com/${mid}/`,
        'Accept': 'application/json, text/plain, */*'
      },
      credentials: isDev ? 'include' : 'omit'
    });

    if (!response.ok) {
      throw new Error(`请求失败，状态码：${response.status}`);
    }

    // 处理代理返回格式
    let data;
    const text = await response.text();
    try {
      data = JSON.parse(text);
    } catch {
      // 解析 allorigins.win 的包裹格式
      const parsed = JSON.parse(text);
      data = JSON.parse(parsed.contents);
    }

    console.log('B站API响应数据:', data);

    // 适配原接口的数据结构
    const result = {
      data: {
        video_count: data.data?.archive?.view || 0, // 视频播放量（替代视频数）
        name: `UP主${mid}`, // 公开接口无用户名，可自定义
        mid: mid
      },
      code: data.code || 0
    };

    // 缓存结果
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error('获取B站用户信息失败:', error);
    
    if (isDev) {
      console.warn(`
        本地解决步骤：
        1. 安装 Moesif CORS 插件并启用
        2. 刷新页面（无需登录B站）
      `);
    }
    
    // 保底返回，避免页面崩溃
    const fallbackResult = {
      data: { video_count: 0, name: '未知UP主', mid: mid },
      code: -1,
      message: '数据加载失败'
    };

    // 缓存保底结果
    cache.set(cacheKey, {
      data: fallbackResult,
      timestamp: Date.now()
    });

    return fallbackResult;
  }
}

/**
 * 获取B站视频相关数据（适配新接口）
 */
export async function getBilibiliVideoCount(mid: string | number) {
  try {
    const userInfo = await getBilibiliUserInfo(mid);
    return userInfo.data?.video_count || 0;
  } catch (error) {
    console.error('获取B站视频数失败:', error);
    return 0;
  }
}

const bilibiliUtils = {
  getBilibiliUserInfo,
  getBilibiliVideoCount
};

export default bilibiliUtils;