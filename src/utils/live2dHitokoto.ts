/**
 * 一言 API 客户端
 * 从 message.js 迁移而来（原 $.getJSON + 45s interval），
 * 改用原生 fetch，由 React 组件生命周期托管定时器
 */

const HITOKOTO_URL = 'https://v1.hitokoto.cn/';

/**
 * 获取一条随机一言
 * @returns 一言文本，失败或无效时返回 null
 */
export async function fetchHitokoto(): Promise<string | null> {
  try {
    const controller = new AbortController();
    // 8 秒超时，避免 API 不可用时定时器无限等待
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(HITOKOTO_URL, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[Live2D] 一言 API 响应异常:', response.status);
      return null;
    }

    const data = await response.json();
    const text = data?.hitokoto;
    if (typeof text === 'string' && text.trim() !== '') {
      return text.trim();
    }
    return null;
  } catch (error) {
    // 网络错误、CORS、abort 等一律静默，不打日志避免刷屏
    return null;
  }
}
