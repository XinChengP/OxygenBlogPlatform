import path from 'path';
import { GalleryImage, ImageSource, ImageCategory, ImageCategoryTree } from '../types/gallery';
import { getAssetPath } from './assetUtils';

// 只在服务器端环境中导入 fs 和 https 模块
let fs: any;
let https: any;
if (typeof window === 'undefined') {
  fs = require('fs');
  https = require('https');
}

/**
 * 服务端 HTTPS 请求函数（禁用 SSL 证书验证）
 * @param url - 请求 URL
 * @param headers - 请求头
 * @returns 响应数据
 */
const serverHttpsFetch = (url: string, headers: Record<string, string>): Promise<any> => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: headers,
      rejectUnauthorized: false, // 禁用 SSL 证书验证
      agent: false
    };
    
    const req = https.request(options, (res: any) => {
      let data = '';
      res.on('data', (chunk: any) => {
        data += chunk;
      });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error(`Failed to parse JSON: ${data.substring(0, 100)}`));
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
        }
      });
    });
    
    req.on('error', (e: any) => {
      reject(e);
    });
    
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
};

// 支持的图片扩展名
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];

/**
 * 检查文件是否为图片
 * @param filename - 文件名
 * @returns 是否为图片
 */
const isImageFile = (filename: string): boolean => {
  const ext = path.extname(filename).toLowerCase();
  return IMAGE_EXTENSIONS.includes(ext);
};

/**
 * 生成唯一图片ID
 * @param filePath - 文件路径
 * @returns 唯一ID
 */
// 生成唯一图片ID
const generateImageId = (filePath: string): string => {
  return filePath
    .replace(/[\\/]/g, '-') // 统一替换所有路径分隔符
    .replace(/\./g, '-')
    .toLowerCase();
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
 * 构建树形分类结构
 * @param images - 图片数组
 * @returns 树形分类数组
 */
export const buildCategoryTree = (images: GalleryImage[]): ImageCategoryTree[] => {
  // 1. 按主分类分组
  const mainCategoryMap = new Map<string, GalleryImage[]>();
  
  images.forEach(image => {
    if (!mainCategoryMap.has(image.category)) {
      mainCategoryMap.set(image.category, []);
    }
    mainCategoryMap.get(image.category)?.push(image);
  });
  
  // 2. 构建树形结构
  const categoryTrees: ImageCategoryTree[] = [];
  
  mainCategoryMap.forEach((categoryImages, mainCategoryName) => {
    // 统计主分类图片数量（包含子分类）
    const mainCategoryCount = categoryImages.length;
    
    // 按子分类分组
    const subCategoryMap = new Map<string, GalleryImage[]>();
    
    categoryImages.forEach(image => {
      if (image.subCategory) {
        if (!subCategoryMap.has(image.subCategory)) {
          subCategoryMap.set(image.subCategory, []);
        }
        subCategoryMap.get(image.subCategory)?.push(image);
      }
    });
    
    // 构建子分类数组
    const subCategories: ImageCategoryTree[] = [];
    
    subCategoryMap.forEach((subCategoryImages, subCategoryName) => {
      // 生成子分类 slug
      const subCategorySlug = `${mainCategorySlug}-${subCategoryName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '')}`
        || `subcategory-${Math.random().toString(36).substr(2, 9)}`;
      
      subCategories.push({
        name: subCategoryName,
        slug: subCategorySlug,
        count: subCategoryImages.length,
        source: ImageSource.Remote, // 暂时默认为远程，实际应该根据图片来源判断
        parentCategory: mainCategoryName
      });
    });
    
    // 按排序顺序排序子分类
    subCategories.sort((a, b) => {
      const orderA = getCategorySortOrder(mainCategoryName, a.name);
      const orderB = getCategorySortOrder(mainCategoryName, b.name);
      return orderA - orderB;
    });
    
    // 创建主分类节点
    // 生成 slug：将中文转换为拼音或保留原样，并确保是有效的 URL 片段
    const mainCategorySlug = mainCategoryName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u4e00-\u9fa5_-]/g, '') // 保留中文、字母、数字、下划线和连字符
      || 'category-' + Math.random().toString(36).substr(2, 9); // 如果为空则生成随机 slug
    
    const mainCategoryTree: ImageCategoryTree = {
      name: mainCategoryName,
      slug: mainCategorySlug,
      count: mainCategoryCount,
      source: ImageSource.Remote, // 暂时默认为远程，实际应该根据图片来源判断
      subCategories: subCategories.length > 0 ? subCategories : undefined
    };
    
    categoryTrees.push(mainCategoryTree);
  });
  
  // 3. 按排序顺序排序主分类
  categoryTrees.sort((a, b) => {
    const orderA = getCategorySortOrder(a.name);
    const orderB = getCategorySortOrder(b.name);
    return orderA - orderB;
  });
  
  return categoryTrees;
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
 * 画廊分类配置类型
 */
interface GalleryCategoryConfig {
  pathPattern: string;        // 路径匹配模式（用于匹配文件夹路径）
  mainCategory: string;       // 主分类名称（显示在标签页上）
  subCategory?: string;       // 子分类名称（可选，用于更细粒度的分类）
  sortOrder?: number;         // 排序顺序（数字越小越靠前）
  icon?: string;              // 图标（可选）
  description?: string;       // 描述（可选）
}

/**
 * 画廊分类映射配置
 * 可扩展：只需在此处添加新的路径映射规则
 * 
 * 文件结构示例:
 * LTYpicture/ 
 *   ├── emoticon/ 或 表情包/
 *   │   └── Zi_Series/ 或 Zi系列/
 *   ├── temporary/ 或 临时/
 *   └── wallpapers&illustration/ 或 壁纸插画/
 *       ├── heng/ 或 横屏/
 *       └── shu/ 或 竖屏/
 * 
 * 支持中文路径和英文路径两种形式
 */
const GALLERY_PATH_MAPPINGS: GalleryCategoryConfig[] = [
  // ========== 表情包分类 ==========
  // 英文路径
  {
    pathPattern: 'LTYpicture/emoticon',
    mainCategory: '表情包',
    sortOrder: 1,
    description: '洛天依表情包合集'
  },
  {
    pathPattern: 'LTYpicture/emoticon/Zi_Series',
    mainCategory: '表情包',
    subCategory: 'Zi系列',
    sortOrder: 2,
    description: '活！字！乱！刷！ 来源：B站up主 Armillary_璇玑'
  },
  // 中文路径支持
  {
    pathPattern: 'LTYpicture/表情包',
    mainCategory: '表情包',
    sortOrder: 1,
    description: '洛天依表情包合集'
  },
  {
    pathPattern: 'LTYpicture/表情包/Zi系列',
    mainCategory: '表情包',
    subCategory: 'Zi系列',
    sortOrder: 2,
    description: '活！字！乱！刷！ 来源：B站up主 Armillary_璇玑'
  },
  
  // ========== 美图分类 ==========
  // 英文路径
  {
    pathPattern: 'LTYpicture/wallpapers&illustration',
    mainCategory: '美图',
    sortOrder: 3,
    description: '佬の壁纸和曲绘'
  },
  {
    pathPattern: 'LTYpicture/wallpapers&illustration/heng',
    mainCategory: '美图',
    subCategory: '横屏',
    sortOrder: 4,
    description: '横版壁纸'
  },
  {
    pathPattern: 'LTYpicture/wallpapers&illustration/shu',
    mainCategory: '美图',
    subCategory: '竖屏',
    sortOrder: 5,
    description: '竖版壁纸'
  },
  // 中文路径支持
  {
    pathPattern: 'LTYpicture/壁纸插画',
    mainCategory: '美图',
    sortOrder: 3,
    description: '佬の壁纸和曲绘'
  },
  {
    pathPattern: 'LTYpicture/壁纸插画/横屏',
    mainCategory: '美图',
    subCategory: '横屏',
    sortOrder: 4,
    description: '横版壁纸'
  },
  {
    pathPattern: 'LTYpicture/壁纸插画/竖屏',
    mainCategory: '美图',
    subCategory: '竖屏',
    sortOrder: 5,
    description: '竖版壁纸'
  },
  
  // ========== 其他分类 ==========
  // 英文路径
  {
    pathPattern: 'LTYpicture/temporary',
    mainCategory: '临时',
    sortOrder: 99,
    description: '临时存放的图片'
  },
  // 中文路径支持
  {
    pathPattern: 'LTYpicture/临时',
    mainCategory: '临时',
    sortOrder: 99,
    description: '临时存放的图片'
  },
  // 直接映射 LTYpicture 目录下的其他图片
  {
    pathPattern: 'LTYpicture',
    mainCategory: '默认',
    sortOrder: 100,
    description: '洛天依图片合集'
  },
];
/**
 * 将GitHub仓库路径映射到分类名称
 * @param relativePath - 相对于仓库根目录的路径
 * @returns 包含主分类和子分类的对象
 */
const mapPathToCategory = (relativePath: string): GalleryCategoryConfig => {
  // 按路径长度降序排序，确保更具体的路径优先匹配
  const sortedMappings = [...GALLERY_PATH_MAPPINGS].sort(
    (a, b) => b.pathPattern.length - a.pathPattern.length
  );
  
  // 调试日志：输出正在匹配的路径（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Gallery] 开始匹配路径: "${relativePath}"`);
  }
   
  // 查找匹配的路径（支持精确匹配和前缀匹配）
  for (const config of sortedMappings) {
    const pathPattern = config.pathPattern;
    
    // 处理相对路径为空的情况（根目录）
    if (!relativePath && !pathPattern) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Gallery] 匹配成功（根目录）: ${config.mainCategory}`);
      }
      return {
        mainCategory: config.mainCategory,
        subCategory: config.subCategory,
        sortOrder: config.sortOrder,
        icon: config.icon,
        description: config.description,
        pathPattern: config.pathPattern
      };
    }
    
    // 正常路径匹配
    if (relativePath.startsWith(pathPattern + '/') || relativePath === pathPattern) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Gallery] 匹配成功: "${relativePath}" -> "${pathPattern}" = ${config.mainCategory}${config.subCategory ? '/' + config.subCategory : ''}`);
      }
      return {
        mainCategory: config.mainCategory,
        subCategory: config.subCategory,
        sortOrder: config.sortOrder,
        icon: config.icon,
        description: config.description,
        pathPattern: config.pathPattern
      };
    }
  }
  
  // 处理根目录情况
  if (!relativePath) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Gallery] 未匹配到配置，使用默认分类（根目录）`);
    }
    return {
      mainCategory: '默认',
      sortOrder: 100,
      description: '来自根目录',
      pathPattern: ''
    };
  }
  
  // 智能分类推断：根据路径结构自动推断主分类和子分类
  const parts = relativePath.split('/').filter(Boolean);
  
  // 如果路径以 LTYpicture 开头，使用智能推断逻辑
  if (parts.length >= 2 && parts[0] === 'LTYpicture') {
    const mainCategory = parts[1]; // 第二级作为主分类
    const subCategory = parts.length >= 3 ? parts[parts.length - 1] : undefined; // 最后一级作为子分类
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Gallery] 智能推断分类: 主分类="${mainCategory}", 子分类="${subCategory || '无'}"`);
    }
    
    return {
      mainCategory,
      subCategory,
      sortOrder: 100,
      description: `来自 ${relativePath} 文件夹`,
      pathPattern: ''
    };
  }
  
  // 对于其他路径，使用最后一部分作为主分类
  const lastPart = parts[parts.length - 1] || '默认';
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Gallery] 未匹配到配置，使用路径最后部分作为分类: "${lastPart}"`);
  }
  
  return {
    mainCategory: lastPart,
    sortOrder: 100,
    description: `来自 ${lastPart} 文件夹`,
    pathPattern: ''
  };
};

/**
 * 获取所有已配置的主分类（按排序顺序）
 * @returns 主分类名称数组
 */
export const getConfiguredMainCategories = (): string[] => {
  const mainCategories = new Map<number, string>();
  
  for (const config of GALLERY_PATH_MAPPINGS) {
    if (!mainCategories.has(config.sortOrder || 99)) {
      mainCategories.set(config.sortOrder || 99, config.mainCategory);
    }
  }
  
  // 按排序顺序返回
  return Array.from(mainCategories.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, name]) => name);
};

/**
 * 获取所有分类配置
 * @returns 分类配置数组
 */
export const getAllCategoryConfigs = (): Omit<GalleryCategoryConfig, 'pathPattern'>[] => {
  const categoryMap = new Map<string, Omit<GalleryCategoryConfig, 'pathPattern'>>();
  
  for (const config of GALLERY_PATH_MAPPINGS) {
    const key = config.mainCategory;
    if (!categoryMap.has(key)) {
      categoryMap.set(key, {
        mainCategory: config.mainCategory,
        sortOrder: config.sortOrder,
        description: config.description
      });
    }
  }
  
  return Array.from(categoryMap.values())
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
};

/**
 * 获取指定主分类下的所有子分类
 * @param mainCategory - 主分类名称
 * @returns 子分类配置数组
 */
export const getSubCategories = (mainCategory: string): GalleryCategoryConfig[] => {
  return GALLERY_PATH_MAPPINGS
    .filter(config => config.mainCategory === mainCategory && config.subCategory)
    .sort((a, b) => (a.sortOrder || 99) - (b.sortOrder || 99));
};

/**
 * 获取分类的显示顺序
 * @param mainCategory - 主分类名称
 * @param subCategory - 子分类名称（可选）
 * @returns 排序顺序
 */
export const getCategorySortOrder = (
  mainCategory: string, 
  subCategory?: string
): number => {
  for (const config of GALLERY_PATH_MAPPINGS) {
    if (config.mainCategory === mainCategory) {
      if (!subCategory && !config.subCategory) {
        return config.sortOrder || 99;
      }
      if (subCategory && config.subCategory === subCategory) {
        return config.sortOrder || 99;
      }
    }
  }
  return 99;
};

/**
 * 清除画廊远程图片缓存
 * @param config - GitHub图床配置（可选，不提供则清除所有缓存）
 */
export const clearRemoteImagesCache = (config?: {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}): void => {
  const isBrowser = typeof window !== 'undefined';
  
  if (config) {
    // 清除特定配置的缓存
    const cacheKey = `gallery_remote_images_${config.owner}_${config.repo}_${config.branch}_${config.path}`;
    
    // 清除浏览器缓存
    if (isBrowser) {
      try {
        localStorage.removeItem(cacheKey);
        console.log(`[Gallery] 已清除浏览器缓存: ${cacheKey}`);
      } catch (error) {
        console.warn('[Gallery] 清除浏览器缓存失败:', error);
      }
    }
    
    // 清除服务端缓存
    if (!isBrowser && fs) {
      try {
        const serverCachePath = path.join(process.cwd(), '.next', 'cache', 'gallery');
        const serverCacheFile = path.join(serverCachePath, `${cacheKey}.json`);
        if (fs.existsSync(serverCacheFile)) {
          fs.unlinkSync(serverCacheFile);
          console.log(`[Gallery] 已清除服务端缓存: ${serverCacheFile}`);
        }
      } catch (error) {
        console.warn('[Gallery] 清除服务端缓存失败:', error);
      }
    }
  } else {
    // 清除所有画廊相关的缓存
    if (isBrowser) {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('gallery_remote_images_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log(`[Gallery] 已清除所有浏览器缓存，共 ${keysToRemove.length} 个`);
      } catch (error) {
        console.warn('[Gallery] 清除所有浏览器缓存失败:', error);
      }
    }
  }
};

/**
 * 从GitHub图床获取图片
 * @param config - GitHub图床配置
 * @param options - 可选配置项
 * @returns 远程图片数组
 */
export const getRemoteImages = async (config: {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}, options?: {
  forceRefresh?: boolean; // 是否强制刷新缓存
}): Promise<GalleryImage[]> => {
  // 检测是否在浏览器环境
  const isBrowser = typeof window !== 'undefined';
  const { forceRefresh = false } = options || {};
  
  // 缓存键，用于存储API响应
  const cacheKey = `gallery_remote_images_${config.owner}_${config.repo}_${config.branch}_${config.path}`;
  
  // 服务端文件缓存路径
  const serverCachePath = path.join(process.cwd(), '.next', 'cache', 'gallery');
  const serverCacheFile = path.join(serverCachePath, `${cacheKey}.json`);
  
  // 如果不是强制刷新，尝试从缓存获取
  if (!forceRefresh) {
    // 尝试从服务端文件缓存获取（仅服务端环境）
    if (!isBrowser && fs) {
      try {
        // 确保缓存目录存在
        if (!fs.existsSync(serverCachePath)) {
          fs.mkdirSync(serverCachePath, { recursive: true });
        }
        
        // 检查缓存文件是否存在
        if (fs.existsSync(serverCacheFile)) {
          const cachedData = JSON.parse(fs.readFileSync(serverCacheFile, 'utf-8'));
          // 检查缓存是否在1小时内有效（更长的缓存时间）
          if (cachedData.timestamp && Date.now() - cachedData.timestamp < 60 * 60 * 1000) {
            console.log('[Gallery] Using server file cache for remote images');
            return cachedData.images;
          }
        }
      } catch (error) {
        console.warn('[Gallery] Failed to read server cache:', error);
      }
    }
    
    // 尝试从localStorage获取缓存（仅浏览器环境）
    if (isBrowser) {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cacheData = JSON.parse(cached);
          // 检查缓存是否在24小时内有效
          if (cacheData.timestamp && Date.now() - cacheData.timestamp < 24 * 60 * 60 * 1000) {
            console.log('Using cached remote images');
            return cacheData.images;
          }
        }
      } catch (error) {
        console.warn('Failed to parse cached remote images:', error);
      }
    }
  } else {
    console.log('[Gallery] 强制刷新模式，跳过缓存');
  }
  
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
      
      let treeData: any;
      
      // 服务端使用自定义 HTTPS 请求（禁用 SSL 证书验证）
      // 浏览器端使用 fetch
      if (!isBrowser && https) {
        console.log('[Gallery] Using server-side HTTPS request (Trees API)');
        treeData = await serverHttpsFetch(treesApiUrl, headers);
      } else {
        // 浏览器端使用 fetch
        const fetchOptions: RequestInit = {
          headers,
          mode: 'cors',
          cache: 'force-cache'
        };
        
        const response = await fetch(treesApiUrl, fetchOptions);
        
        if (!response.ok) {
          if (response.status === 403 && retryCount < maxRetries - 1) {
            retryCount++;
            const waitTime = 1000 * Math.pow(2, retryCount);
            console.log(`Rate limited, retrying in ${waitTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue;
          }
          throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }
        
        treeData = await response.json();
      }
      
      const images: GalleryImage[] = [];
      
      // 处理目录树中的所有文件
      // Trees API 返回的是扁平化的文件列表，需要过滤出图片文件
      const basePath = config.path ? config.path.replace(/^\//, '') : '';
      
      for (const item of treeData.tree || []) {
        // 只处理文件（type === 'blob'）
        if (item.type !== 'blob') continue;
        
        // 解码路径中的 URL 编码字符（如中文）
        // GitHub Trees API 返回的路径可能是 URL 编码的
        const decodedPath = decodeURIComponent(item.path);
        
        // 检查是否在指定路径下
        if (basePath && !decodedPath.startsWith(basePath + '/') && decodedPath !== basePath) {
          continue;
        }
        
        // 检查是否为图片文件
        if (!isImageFile(decodedPath)) continue;
        
        // 处理图片文件
        // Trees API 返回的 item.path 是相对于仓库根目录的完整路径
        const fullPath = decodedPath.replace(/^\//, '');
        
        // 获取相对于仓库根目录的目录路径
        let relativePath = path.dirname(fullPath);
        
        // 规范化路径分隔符，将反斜杠转换为正斜杠，确保跨平台兼容性
        relativePath = relativePath.replace(/\\/g, '/');
        
        // 处理根目录情况
        if (relativePath === '.') {
          relativePath = '';
        }
        
        // 调试日志：输出处理后的路径信息（仅在开发环境）
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Gallery] 处理图片路径:`, {
            original: item.path,
            decoded: decodedPath,
            relativePath,
            fullPath
          });
        }
        
        // 使用路径映射函数确定分类
        const { mainCategory, subCategory } = mapPathToCategory(relativePath);
        
        // 构造jsDelivr加速URL
        const encodedImagePath = fullPath.split('/').map(encodeURIComponent).join('/');
        const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/${config.owner}/${config.repo}@${config.branch}/${encodedImagePath}`;
        
        // 构造 GitHub raw URL 作为备用
        const githubRawUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${encodedImagePath}`;
        
        // 从路径中提取文件名
        const fileName = path.basename(fullPath);
        
        images.push({
          id: generateImageId(fullPath), // 使用完整路径生成唯一ID
          src: jsdelivrUrl, // 使用jsDelivr加速URL作为主URL
          fallbackSrc: githubRawUrl, // 使用 GitHub raw URL 作为备用
          alt: fileName.replace(path.extname(fileName), ''),
          source: ImageSource.Remote,
          category: mainCategory, // 使用映射后的分类名称
          subCategory, // 子分类（可选）
          createdAt: undefined, // Trees API 不提供创建时间
          updatedAt: undefined // Trees API 不提供更新时间
        });
      }
      
      // 将结果缓存到localStorage（浏览器环境）
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            images,
            timestamp: Date.now()
          }));
        } catch (error) {
          console.warn('Failed to cache remote images:', error);
        }
      }
      
      // 将结果缓存到服务端文件（服务端环境）
      if (!isBrowser && fs) {
        try {
          // 确保缓存目录存在
          if (!fs.existsSync(serverCachePath)) {
            fs.mkdirSync(serverCachePath, { recursive: true });
          }
          fs.writeFileSync(serverCacheFile, JSON.stringify({
            images,
            timestamp: Date.now()
          }, null, 2));
          console.log('[Gallery] Saved remote images to server file cache');
        } catch (error) {
          console.warn('[Gallery] Failed to save server cache:', error);
        }
      }
      
      return images;
    } catch (error) {
      retryCount++;
      // 输出详细错误信息
      console.error('[Gallery] Fetch error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : 'Unknown',
        cause: error instanceof Error ? (error as any).cause : 'Unknown',
        stack: error instanceof Error ? error.stack : 'No stack trace'
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
  let remoteImages: GalleryImage[] = [];
  try {
    remoteImages = await getRemoteImages({
      owner: 'Eiheir',
      repo: 'Luo_Tianyi_Image',
      branch: 'main',
      path: ''
    }, options);
  } catch (error) {
    console.warn('Failed to fetch remote images, only showing local images:', error);
    // 在开发环境中，如果获取远程图片失败，只显示本地图片
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
 * 按分类过滤图片
 * @param images - 图片数组
 * @param category - 分类名称（null表示所有分类）
 * @param subCategory - 子分类名称（可选，null表示不筛选子分类）
 * @returns 过滤后的图片数组
 */
export const filterImagesByCategory = (images: GalleryImage[], category: string | null, subCategory?: string | null): GalleryImage[] => {
  if (!category) {
    return images;
  }
  
  if (subCategory) {
    return images.filter(image => image.category === category && image.subCategory === subCategory);
  }
  
  return images.filter(image => image.category === category);
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
