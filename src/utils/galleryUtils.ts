import path from 'path';
import type * as fsType from 'fs';
import type * as httpsType from 'https';
import { GalleryImage, ImageSource, ImageCategory, ImageCategoryTree } from '../types/gallery';
import { getAssetPath } from './assetUtils';
// 共享逻辑统一从同构模块导入：分类映射、目录树解析、浏览器端拉取等
// （该模块零 Node 依赖，可被客户端组件安全导入；本文件仅保留服务端专属逻辑）
import {
  GITHUB_IMAGE_REPO_CONFIG,
  isImageFile,
  generateImageId,
  mapPathToCategory,
  buildCategoryTree,
  filterImagesByCategory,
  getCategorySortOrder,
  parseGitHubTreeToImages,
  GitHubTreeResponse
} from './galleryShared';

// 对外保持原有的导出接口不变：其他模块原先从本文件导入这些成员，
// 现统一转发到共享模块，避免破坏现有引用
export {
  GITHUB_IMAGE_REPO_CONFIG,
  isImageFile,
  generateImageId,
  mapPathToCategory,
  buildCategoryTree,
  filterImagesByCategory,
  getCategorySortOrder,
  getConfiguredMainCategories,
  getAllCategoryConfigs,
  getSubCategories,
  fetchRemoteImagesInBrowser
} from './galleryShared';
export type { GalleryCategoryConfig } from './galleryShared';

// 只在服务器端环境中导入 fs 和 https 模块
let fs: typeof fsType | undefined;
let https: typeof httpsType | undefined;
if (typeof window === 'undefined') {
  fs = require('fs');
  https = require('https');
}

/**
 * HTTPS 响应类型
 */
interface HttpsResponse {
  statusCode?: number;
  statusMessage?: string;
  on(event: 'data', callback: (chunk: string) => void): void;
  on(event: 'end', callback: () => void): void;
}

/**
 * HTTPS 请求类型
 */
interface HttpsRequest {
  on(event: 'error', callback: (error: Error) => void): void;
  setTimeout(timeout: number, callback: () => void): void;
  destroy(): void;
  end(): void;
}

/**
 * 服务端 HTTPS 请求函数
 * @param url - 请求 URL
 * @param headers - 请求头
 * @returns 响应数据
 */
/**
 * 检查主机名是否被错误解析到本地地址
 * @param hostname - 主机名
 * @returns 是否被错误解析
 */
const isHostnameMisconfigured = (hostname: string): boolean => {
  // 检查是否是常见的应该解析到外网但被解析到本地的域名
  const externalDomains = ['api.github.com', 'github.com', 'cdn.jsdelivr.net'];
  return externalDomains.includes(hostname);
};

const serverHttpsFetch = <T = unknown>(url: string, headers: Record<string, string>): Promise<T> => {
  return new Promise((resolve, reject) => {
    if (!https) {
      reject(new Error('HTTPS module not available'));
      return;
    }

    const parsedUrl = new URL(url);

    // 调试日志：输出解析后的URL信息
    console.log('[Gallery] HTTPS请求配置:', {
      原始URL: url,
      主机名: parsedUrl.hostname,
      端口: parsedUrl.port || 443,
      路径: parsedUrl.pathname + parsedUrl.search,
      NODE_ENV: process.env.NODE_ENV
    });

    // 动态导入 https 模块以获取 Agent 类
    const httpsModule = require('https');

    // 创建自定义 HTTPS Agent，在开发环境中允许自签名证书
    // 这可以解决 "unable to verify the first certificate" 错误
    const agent = new httpsModule.Agent({
      rejectUnauthorized: process.env.NODE_ENV === 'production', // 生产环境严格验证，开发环境允许自签名证书
      // 设置超时时间
      timeout: 30000,
    });

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443, // 使用URL中指定的端口，如果没有则默认使用443
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: headers,
      agent: agent, // 使用自定义 agent 替代默认的 false
      // 添加lookup选项以使用IPv4优先，避免某些网络环境下的DNS解析问题
      family: 4
    };

    const req = https.request(options, (res: import('http').IncomingMessage) => {
      let data = '';
      res.on('data', (chunk: string) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data) as T);
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${data.substring(0, 100)}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });

    req.on('error', (e: Error) => {
      // 详细记录错误信息以便诊断
      // 使用 warn 级别：环境类网络问题（如 hosts 劫持、代理未启动）属于预期内降级场景，
      // error 级别会触发 Next.js 开发面板的红色报错干扰开发
      console.warn('[Gallery] HTTPS请求错误:', {
        错误消息: e.message,
        错误名称: e.name,
        主机名: parsedUrl.hostname,
        端口: parsedUrl.port || 443,
        原始URL: url
      });

      // 检查是否是连接被拒绝错误，且主机名是应该解析到外网的域名
      if (e.message.includes('ECONNREFUSED 127.0.0.1') && isHostnameMisconfigured(parsedUrl.hostname)) {
        // 典型场景：Watt Toolkit（Steam++）等加速工具在 hosts 中把域名劫持到 127.0.0.1，
        // 但工具未运行或对应加速开关未开启，本地无服务监听导致连接被拒
        console.warn(
          `[Gallery] ${parsedUrl.hostname} 被解析到 127.0.0.1 但本地无服务监听（连接被拒）。` +
          `若使用 Watt Toolkit 等加速工具，请启动它并开启 GitHub 加速；否则请检查 hosts 文件`
        );
        reject(new Error(`ECONNREFUSED_HOSTS: ${parsedUrl.hostname} 被劫持到本地但无服务监听`));
      } else {
        reject(e);
      }
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
};

/**
 * 判断错误是否为 GitHub API 限流（HTTP 403 rate limit exceeded）
 * 限流窗口按整点重置（未认证 60 次/小时/IP），几秒的退避不会恢复配额，
 * 因此限流时应直接降级而不是重试——重试只会继续消耗剩余配额
 */
const isRateLimitError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes('403') || /rate limit/i.test(message);
};

/**
 * 判断错误是否为"重试也无法恢复"的环境类网络错误
 * 包括：hosts 劫持导致的连接拒绝、DNS 解析失败等。
 * 这类错误由本机网络环境决定，短时间内重试结果完全相同，
 * 快速失败可以立即降级为本地图片，避免用户白等指数退避的 7 秒
 */
const isNonRetryableNetworkError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('ECONNREFUSED') ||      // 连接被拒（含 ECONNREFUSED_HOSTS 标记）
    message.includes('ENOTFOUND') ||         // 域名不存在
    message.includes('getaddrinfo') ||       // Node DNS 解析底层错误前缀
    message.includes('Request timeout')      // 请求超时（网络不可达）
  );
};

/**
 * 递归扫描目录中的所有图片文件
 * @param dir - 要扫描的目录路径
 * @param baseDir - 基础目录路径，用于计算相对路径和分类
 * @returns 包含所有图片信息的数组
 */
const scanImageFiles = (dir: string, baseDir: string): GalleryImage[] => {
  const results: GalleryImage[] = [];

  try {
    if (!fs) {
      return results;
    }

    const items = fs.readdirSync(dir);

    items.forEach((item: string) => {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);

      if (stat.isDirectory()) {
        // 递归扫描子目录
        results.push(...scanImageFiles(itemPath, baseDir));
      } else if (isImageFile(item)) {
        // 找到图片文件
        const relativePath = path.relative(baseDir, itemPath);
        const fullPath = relativePath.replace(/\\/g, '/'); // 规范化路径分隔符
        const directoryPath = path.dirname(fullPath); // 只使用目录路径进行分类映射
        const normalizedDirPath = directoryPath.replace(/\\/g, '/'); // 确保目录路径分隔符一致
        const filename = path.basename(itemPath);

        // 生成图片URL（相对于public目录）
        const imageUrl = `/gallery/${relativePath}`;

        // 使用分类映射系统确定分类
        const { mainCategory, subCategory } = mapPathToCategory(normalizedDirPath);

        results.push({
          id: generateImageId(relativePath),
          src: getAssetPath(imageUrl),
          alt: filename.replace(path.extname(filename), ''),
          source: ImageSource.Local,
          category: mainCategory, // 使用映射后的主分类
          subCategory, // 使用映射后的子分类（可选）
          createdAt: new Date().toISOString(), // 添加创建时间
        });
      }
    });
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }

  return results;
};

/**
 * 获取所有本地图片
 * @returns 本地图片数组
 */
export const getAllLocalImages = (): GalleryImage[] => {
  try {
    if (!fs) {
      return [];
    }

    const galleryDir = path.join(process.cwd(), 'public', 'gallery');

    if (!fs.existsSync(galleryDir)) {
      // 如果gallery目录不存在，返回空数组
      return [];
    }

    // 递归扫描所有图片文件
    const images = scanImageFiles(galleryDir, galleryDir);

    return images;
  } catch (error) {
    console.error('Error getting all local images:', error);
    return [];
  }
};

/**
 * 按分类分组图片
 * @param images - 图片数组
 * @returns 分类数组
 */
export const getImageCategories = (images: GalleryImage[]): ImageCategory[] => {
  const categoryMap = new Map<string, number>();

  // 统计每个分类的图片数量
  images.forEach(image => {
    const count = categoryMap.get(image.category) || 0;
    categoryMap.set(image.category, count + 1);
  });

  // 转换为分类数组
  const categories: ImageCategory[] = [];
  categoryMap.forEach((count, name) => {
    categories.push({
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      count,
      source: ImageSource.Local
    });
  });

  // 按名称排序
  return categories.sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * 清除画廊远程图片缓存（已弃用）
 * 现在图片缓存完全依赖 CDN 和浏览器的原生 HTTP 缓存机制
 * 此函数保留用于兼容旧代码，不再执行任何操作
 * @deprecated 使用 CDN 的缓存策略替代
 */
export const clearRemoteImagesCache = (config?: {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}): void => {
  // 缓存机制已移除，此函数不再执行任何操作
  // 图片缓存现在完全依赖 jsDelivr CDN 的 HTTP 缓存头控制
  console.log('[Gallery] clearRemoteImagesCache 已弃用，缓存现由 CDN 统一管理');
};

/**
 * 从GitHub图床获取图片（服务端构建期使用）
 * @param config - GitHub图床配置
 * @param options - 可选配置项
 * @returns 远程图片数组
 * @description 图片缓存完全依赖 jsDelivr CDN 的 HTTP 缓存机制，不再使用 localStorage 或服务端文件缓存
 */
export const getRemoteImages = async (config: {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}, options?: {
  forceRefresh?: boolean; // 是否强制刷新（通过添加时间戳查询参数实现）
}): Promise<GalleryImage[]> => {
  // 检测是否在浏览器环境
  const isBrowser = typeof window !== 'undefined';
  const { forceRefresh = false } = options || {};

  // 重试机制，最多重试3次
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      // 使用 GitHub Trees API 一次性获取整个目录树，减少 API 调用次数
      // Trees API 可以递归获取所有文件，避免多次调用 Contents API
      const treesApiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${config.branch}?recursive=1`;

      // 请求头 - 添加 GitHub Token 认证以提高 API 限制
      const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      };

      // 如果有 GitHub Token，添加到请求头（仅服务端环境）
      if (!isBrowser && process.env.GITHUB_TOKEN) {
        headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
        console.log('[Gallery] Using GitHub Token for authentication');
      }

      let treeData: GitHubTreeResponse;

      // 服务端使用自定义 HTTPS 请求（禁用 SSL 证书验证）
      // 浏览器端使用 fetch
      if (!isBrowser && https) {
        console.log('[Gallery] Using server-side HTTPS request (Trees API)');
        treeData = await serverHttpsFetch<GitHubTreeResponse>(treesApiUrl, headers);
      } else {
        // 浏览器端使用 fetch
        const fetchOptions: RequestInit = {
          headers,
          mode: 'cors',
          cache: forceRefresh ? 'no-cache' : 'default' // 强制刷新时使用 no-cache
        };

        const response = await fetch(treesApiUrl, fetchOptions);

        if (!response.ok) {
          // 403/限流直接抛出，由外层统一降级处理（重试无意义）
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        treeData = await response.json();
      }

      // 目录树解析逻辑已抽离为共享纯函数（服务端与浏览器端共用），
      // forceRefresh 语义与原实现一致：管理场景强制刷新时给图片 URL 追加时间戳绕过 CDN 缓存
      return parseGitHubTreeToImages(treeData, config, forceRefresh);
    } catch (error) {
      // 限流是预期中的降级场景：配额按整点重置，退避重试无法恢复，
      // 直接降级为仅本地图片，并用 warn 级别记录（避免 Next.js dev overlay 报 Console Error）
      if (isRateLimitError(error)) {
        console.warn('[Gallery] GitHub API 限流（403 rate limit exceeded），本次仅显示本地图片。', {
          提示: '未认证配额为 60 次/小时/IP，整点重置；可在 .env 配置 GITHUB_TOKEN 提升至 5000 次/小时',
        });
        return [];
      }

      // 环境类网络错误（hosts 劫持、DNS 失败、超时）重试无意义，立即快速失败降级
      if (isNonRetryableNetworkError(error)) {
        console.warn('[Gallery] 网络环境问题导致图床请求失败，本次仅显示本地图片。', {
          错误消息: error instanceof Error ? error.message : '未知错误',
          提示: '若使用 Watt Toolkit 等加速工具，请确认其正在运行且开启了 GitHub 加速',
        });
        return [];
      }

      retryCount++;
      // 输出详细错误信息（warn 级别，避免污染 Next.js dev overlay）
      console.warn('[Gallery] Fetch error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        cause: error instanceof Error ? (error as any).cause : 'Unknown',
      });
      if (retryCount >= maxRetries) {
        console.warn(
          'Failed to load remote images from GitHub after multiple attempts:',
          error instanceof Error ? error.message : 'Unknown error'
        );
        return [];
      }

      const waitTime = 1000 * Math.pow(2, retryCount);
      console.log(`Retrying remote image loading in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  return [];
};

/**
 * 获取所有图片（本地+远程）
 * @param options - 可选配置项
 * @returns 所有图片数组
 */
export const getAllImages = async (options?: {
  forceRefresh?: boolean; // 是否强制刷新远程图片缓存
}): Promise<GalleryImage[]> => {
  // 获取本地图片
  const localImages = getAllLocalImages();

  // 获取远程图片（GitHub图床）
  // 配置统一引用共享常量，与浏览器端实时刷新保持同一数据源，避免多处硬编码
  let remoteImages: GalleryImage[] = [];
  try {
    remoteImages = await getRemoteImages({ ...GITHUB_IMAGE_REPO_CONFIG }, options);
  } catch (error) {
    // 详细记录错误信息
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('[Gallery] 获取远程图片失败，仅显示本地图片:', errorMessage);

    // 如果是 hosts 劫持导致的连接拒绝，给出更明确的操作指引
    if (errorMessage.includes('ECONNREFUSED_HOSTS')) {
      console.warn('[Gallery] 提示: hosts 把 GitHub 域名指向了本地但无服务监听，请启动 Watt Toolkit 并开启 GitHub 加速，或清理 hosts 条目');
    }

    // 远程图片获取失败时，只返回本地图片
    remoteImages = [];
  }

  // 合并所有图片
  return [...localImages, ...remoteImages];
};

/**
 * 获取所有分类（树形结构）
 * @param images - 图片数组
 * @returns 树形分类数组
 */
export const getAllCategories = (images: GalleryImage[]): ImageCategoryTree[] => {
  return buildCategoryTree(images);
};

/**
 * 预加载图片
 * @param images - 图片数组
 * @param count - 预加载数量（默认10）
 */
export const preloadImages = (images: GalleryImage[], count: number = 10): void => {
  const imagesToPreload = images.slice(0, count);

  imagesToPreload.forEach(image => {
    const img = new Image();
    img.src = image.src;
  });
};
