/**
 * 图床管理器联动工具
 *
 * 「洛佬の美图」是一个独立的本地图床管理服务（默认 http://127.0.0.1:3210），
 * 提供批量上传、自动分类归档、重复检测、批量取链与 Git 同步等能力。
 * 博客后台已不再内置 GitHub Token 远程图床，统一跳转到该管理器完成图片管理。
 *
 * 本模块集中处理三件事：
 * 1. 管理器地址的读取与保存（localStorage，后台可配置，端口变化时可自行修改）
 * 2. 地址规范化与合法性校验（只允许 http/https，避免把非法值塞进 href）
 * 3. 在线探活（管理器未启动时，后台据此给出启动指引）
 */

/**
 * 图床管理器默认地址
 * 与「洛佬の美图」manager/config.json 的 host/port 默认值保持一致
 */
export const DEFAULT_GALLERY_MANAGER_URL = 'http://127.0.0.1:3210';

/**
 * localStorage 中保存管理器地址的键名
 * 说明：后台认证 Token 存 sessionStorage，但这里只是「站点配置」，
 * 允许长期保留，符合项目对 localStorage 的使用约定。
 */
const STORAGE_KEY = 'admin_gallery_manager_url';

/**
 * 规范化用户输入的管理器地址
 *
 * 处理规则：
 * - 去除首尾空白与末尾的连续斜杠，避免拼接 /api/health 时出现双斜杠
 * - 用户只输入 127.0.0.1:3210 时自动补上 http://，降低填写门槛
 * - 仅接受 http/https 协议（阻止 javascript: 等危险协议进入 href）
 *
 * @param input 原始输入
 * @returns 规范化后的地址；非法输入返回 null
 */
export function normalizeGalleryManagerUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 未写协议时按本机服务习惯补 http://
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return null;
  }

  // 只允许 http/https，其余协议（如 javascript:、file:）一律拒绝
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

  // 使用 origin + 去除末尾斜杠的路径，保证地址可直接用于 fetch 与 window.open
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
}

/**
 * 读取已保存的管理器地址
 * 没有保存值、保存值非法或 localStorage 不可用时，均回退到默认地址
 */
export function getGalleryManagerUrl(): string {
  // 服务端渲染阶段没有 localStorage，直接返回默认值，避免 ReferenceError
  if (typeof window === 'undefined') return DEFAULT_GALLERY_MANAGER_URL;

  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_GALLERY_MANAGER_URL;
    return normalizeGalleryManagerUrl(saved) || DEFAULT_GALLERY_MANAGER_URL;
  } catch {
    // 隐私模式等场景下 localStorage 可能抛错，回退默认值，不影响页面渲染
    return DEFAULT_GALLERY_MANAGER_URL;
  }
}

/**
 * 保存管理器地址
 *
 * @param input 用户输入的地址
 * @returns 规范化后的地址；输入非法时返回 null 且不写入存储
 */
export function saveGalleryManagerUrl(input: string): string | null {
  const normalized = normalizeGalleryManagerUrl(input);
  if (!normalized) return null;

  try {
    window.localStorage.setItem(STORAGE_KEY, normalized);
  } catch {
    // 存储不可用时仍返回规范化地址，当前页面可继续使用该地址
  }

  return normalized;
}

/**
 * 恢复默认管理器地址（清除自定义配置）
 * @returns 默认地址
 */
export function resetGalleryManagerUrl(): string {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 忽略存储异常，返回值仍为默认地址
  }
  return DEFAULT_GALLERY_MANAGER_URL;
}

/**
 * 检测图床管理器是否在线
 *
 * 实现说明：
 * - 请求 /api/health 端点，该端点在管理器中不校验访问令牌，适合做探活；
 * - 图床管理器未开放 CORS，因此必须使用 mode: 'no-cors'：
 *   响应内容不可读（opaque），但只要 fetch 正常 resolve，就说明端口上有服务在监听；
 * - 使用 AbortController 做超时保护，避免服务假死时页面一直处于「检测中」。
 *
 * 注意：生产环境（https 页面）访问 http://127.0.0.1 会被浏览器的混合内容策略拦截，
 * 探活会返回 false。后台管理本身仅在本地开发环境使用，不影响实际功能。
 *
 * @param url 管理器地址
 * @param timeoutMs 超时时间（毫秒），默认 2500
 * @returns 是否在线
 */
export async function checkGalleryManagerOnline(
  url: string,
  timeoutMs = 2500,
): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    await fetch(`${url.replace(/\/+$/, '')}/api/health`, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    return true;
  } catch {
    // 连接被拒绝、超时或被内核拦截，均视为未启动
    return false;
  } finally {
    clearTimeout(timer);
  }
}
