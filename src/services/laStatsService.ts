/**
 * 51la 统计数据服务
 * 
 * 本模块提供从 51la Widget API 获取统计数据的功能
 * 适用于 GitHub Pages 静态部署环境
 * 
 * API 地址: https://v6-widget.51.la/v6/{siteId}/quote.js
 * 
 * @see https://www.51.la/ 51la 统计官网
 */

/**
 * 51la 统计数据接口
 */
export interface LAStatsData {
  /** 最近活跃访客数 */
  recentActive: number;
  /** 今日数据 */
  today: {
    visitors: number;  // 今日访客数 (UV)
    views: number;     // 今日浏览量 (PV)
  };
  /** 昨日数据 */
  yesterday: {
    visitors: number;
    views: number;
  };
  /** 本月浏览量 */
  monthViews: number;
  /** 总浏览量 */
  totalViews: number;
  /** 数据更新时间 */
  updatedAt?: string;
}

/**
 * 51la Widget API 配置
 */
const LA_WIDGET_CONFIG = {
  /** 51la 站点 ID */
  SITE_ID: process.env.NEXT_PUBLIC_51LA_ID || '3PaiTXyPhK9fHSW3',
  /** Widget API 地址 */
  WIDGET_URL: 'https://v6-widget.51.la/v6/',
  /** 请求超时时间 (毫秒) */
  TIMEOUT: 10000,
  /** 缓存时间 (秒) */
  CACHE_TIME: 60,
};

// 缓存
let cachedData: LAStatsData | null = null;
let cacheTimestamp: number = 0;

/**
 * 解析 51la Widget JS 数据
 * 
 * Widget 返回的是 JavaScript 代码，包含 HTML 结构
 * 数据存储在 <span></span><span></span> 格式中
 * 
 * @param jsContent - Widget JS 内容
 * @returns 解析后的数据对象
 */
function parseWidgetData(jsContent: string): Partial<LAStatsData> {
  try {
    // 匹配数据模式: </span><span>数字</span></p>
    // 数据顺序: recentActive, today.visitors, today.views, yesterday.visitors, yesterday.views, monthViews, totalViews
    const regex = /<\/span><span>(\d+)<\/span>/g;
    const matches = [...jsContent.matchAll(regex)];
    
    if (matches.length < 7) {
      console.error('[51la] Widget 数据格式不匹配，可能 API 有更新');
      return {};
    }
    
    const dataMap = matches.map(match => parseInt(match[1], 10) || 0);
    
    return {
      recentActive: dataMap[0] || 0,
      today: {
        visitors: dataMap[1] || 0,
        views: dataMap[2] || 0,
      },
      yesterday: {
        visitors: dataMap[3] || 0,
        views: dataMap[4] || 0,
      },
      monthViews: dataMap[5] || 0,
      totalViews: dataMap[6] || 0,
    };
  } catch (error) {
    console.error('[51la] Widget 数据解析失败:', error);
    return {};
  }
}

/**
 * 获取 51la 统计数据
 * 
 * 从 51la Widget API 获取站点统计数据
 * 结果会被缓存 60 秒以减少 API 调用
 * 
 * @returns 统计数据对象
 */
export async function get51laStats(): Promise<LAStatsData> {
  // 检查缓存
  const now = Date.now();
  if (cachedData && (now - cacheTimestamp) < LA_WIDGET_CONFIG.CACHE_TIME * 1000) {
    return {
      ...cachedData,
      updatedAt: cachedData.updatedAt || new Date(cacheTimestamp).toISOString(),
    };
  }
  
  try {
    const url = `${LA_WIDGET_CONFIG.WIDGET_URL}${LA_WIDGET_CONFIG.SITE_ID}/quote.js`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), LA_WIDGET_CONFIG.TIMEOUT);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.51.la/',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const jsContent = await response.text();
    const data = parseWidgetData(jsContent);
    
    // 更新缓存
    cachedData = {
      recentActive: data.recentActive || 0,
      today: data.today || { visitors: 0, views: 0 },
      yesterday: data.yesterday || { visitors: 0, views: 0 },
      monthViews: data.monthViews || 0,
      totalViews: data.totalViews || 0,
      updatedAt: new Date().toISOString(),
    };
    cacheTimestamp = now;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[51la] 统计数据获取成功:', cachedData);
    }
    
    return cachedData;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[51la] 统计数据获取失败:', error);
    }
    
    // 返回缓存数据（如果有）
    if (cachedData) {
      return {
        ...cachedData,
        updatedAt: cachedData.updatedAt || new Date(cacheTimestamp).toISOString(),
      };
    }
    
    // 返回默认值
    return {
      recentActive: 0,
      today: { visitors: 0, views: 0 },
      yesterday: { visitors: 0, views: 0 },
      monthViews: 0,
      totalViews: 0,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * 获取今日 PV
 * 
 * @returns 今日页面浏览量
 */
export async function getTodayPV(): Promise<number> {
  const stats = await get51laStats();
  return stats.today.views;
}

/**
 * 获取今日 UV
 * 
 * @returns 今日独立访客数
 */
export async function getTodayUV(): Promise<number> {
  const stats = await get51laStats();
  return stats.today.visitors;
}

/**
 * 获取本月 PV
 * 
 * @returns 本月页面浏览量
 */
export async function getMonthPV(): Promise<number> {
  const stats = await get51laStats();
  return stats.monthViews;
}

/**
 * 获取总浏览量
 * 
 * @returns 站点总浏览量
 */
export async function getTotalPV(): Promise<number> {
  const stats = await get51laStats();
  return stats.totalViews;
}

/**
 * 清除统计数据缓存
 */
export function clearStatsCache(): void {
  cachedData = null;
  cacheTimestamp = 0;
}
