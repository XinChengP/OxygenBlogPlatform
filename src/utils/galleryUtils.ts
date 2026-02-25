import path from 'path';
import { GalleryImage, ImageSource, ImageCategory } from '../types/gallery';
import { getAssetPath } from './assetUtils';

// 只在服务器端环境中导入 fs 模块
let fs: any;
if (typeof window === 'undefined') {
  fs = require('fs');
}

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
    
    items.forEach(item => {
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
 *   ├── emoticon/ 
 *   │   └── Zi_Series/ 
 *   ├── temporary/ 
 *   └── wallpapers&illustration/ 
 *       ├── heng/ 
 *       └── shu/ 
 */
const GALLERY_PATH_MAPPINGS: GalleryCategoryConfig[] = [
  // ========== 表情包分类 ==========
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
  
  // ========== 美图分类 ==========
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
  
  // ========== 其他分类 ==========
  {
    pathPattern: 'LTYpicture/temporary',
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
   
   // 查找匹配的路径（支持精确匹配和前缀匹配）
  for (const config of sortedMappings) {
    const pathPattern = config.pathPattern;
    
    // 处理相对路径为空的情况（根目录）
    if (!relativePath && !pathPattern) {
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
     return {
       mainCategory: '默认',
       sortOrder: 100,
       description: '来自根目录',
       pathPattern: ''
     };
   }
   
   // 默认返回路径的最后部分作为分类
   const parts = relativePath.split('/').filter(Boolean);
   const lastPart = parts[parts.length - 1] || '默认';
   
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
 * 从GitHub图床获取图片
 * @param config - GitHub图床配置
 * @returns 远程图片数组
 */
export const getRemoteImages = async (config: {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}): Promise<GalleryImage[]> => {
  // 在开发环境中，跳过远程图片加载以避免SSL证书问题
  if (process.env.NODE_ENV === 'development') {
    console.log('Skipping remote image loading in development environment');
    return [];
  }
  
  // 缓存键，用于存储API响应
  const cacheKey = `gallery_remote_images_${config.owner}_${config.repo}_${config.branch}_${config.path}`;
  
  // 尝试从localStorage获取缓存
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const cacheData = JSON.parse(cached);
        // 检查缓存是否在24小时内有效
        if (cacheData.timestamp && Date.now() - cacheData.timestamp < 24 * 60 * 60 * 1000) {
          console.log('Using cached remote images');
          return cacheData.images;
        }
      } catch (error) {
        console.warn('Failed to parse cached remote images:', error);
      }
    }
  }
  
  // 重试机制，最多重试3次
  const maxRetries = 3;
  let retryCount = 0;
  
  while (retryCount < maxRetries) {
    try {
      // GitHub API URL
      const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${config.path}?ref=${config.branch}`;
      
      // 调用GitHub API获取目录内容
      const response = await fetch(apiUrl, {
        // 添加请求头，提高GitHub API请求成功率
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28' // 使用最新的GitHub API版本
        },
        // 使用cors模式确保跨域请求正常工作
        mode: 'cors',
        cache: 'force-cache' // 允许浏览器缓存响应
      });
      
      if (!response.ok) {
        // 如果是403（速率限制），等待一段时间后重试
        if (response.status === 403 && retryCount < maxRetries - 1) {
          retryCount++;
          const waitTime = 1000 * Math.pow(2, retryCount); // 指数退避
          console.log(`Rate limited, retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
      }
      
      const contents = await response.json();
      const images: GalleryImage[] = [];
      
      // 处理目录内容
      for (const item of contents) {
        if (item.type === 'dir') {
          // 递归处理子目录
          const subDirImages = await getRemoteImages({
            ...config,
            path: `${config.path}/${item.name}`
          });
          images.push(...subDirImages);
        } else if (isImageFile(item.name)) {
          // 处理图片文件
          // 构建完整路径，确保不包含开头的斜杠
          let fullPath = config.path ? `${config.path}/${item.name}` : item.name;
          fullPath = fullPath.replace(/^\//, '');
          
          // 获取相对于仓库根目录的目录路径
          let relativePath = path.dirname(fullPath);
          
          // 规范化路径分隔符，将反斜杠转换为正斜杠，确保跨平台兼容性
          relativePath = relativePath.replace(/\\/g, '/');
          
          // 处理根目录情况
          if (relativePath === '.') {
            relativePath = '';
          }
          
          // 使用路径映射函数确定分类
          const { mainCategory, subCategory } = mapPathToCategory(relativePath);
          
          // 构造jsDelivr加速URL
          let fullImagePath = config.path ? `${config.path}/${item.name}` : item.name;
          // 确保路径不包含开头的斜杠
          fullImagePath = fullImagePath.replace(/^\//, '');
          // 编码URL中的特殊字符
          const encodedImagePath = fullImagePath.split('/').map(encodeURIComponent).join('/');
          const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/${config.owner}/${config.repo}@${config.branch}/${encodedImagePath}`;
          
          // 调试：打印URL信息
          console.log(`[Gallery] 构建图片URL:`);
          console.log(`  原始路径: ${fullImagePath}`);
          console.log(`  编码路径: ${encodedImagePath}`);
          console.log(`  jsDelivr URL: ${jsdelivrUrl}`);
          console.log(`  GitHub URL: ${item.download_url}`);
          
          images.push({
            id: generateImageId(fullPath), // 使用完整路径生成唯一ID
            src: jsdelivrUrl, // 使用jsDelivr加速URL作为主URL
            fallbackSrc: item.download_url, // 保存原始GitHub URL作为备用
            alt: item.name.replace(path.extname(item.name), ''),
            source: ImageSource.Remote,
            category: mainCategory, // 使用映射后的分类名称
            subCategory, // 子分类（可选）
            createdAt: item.created_at,
            updatedAt: item.updated_at
          });
        }
      }
      
      // 将结果缓存到localStorage
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
      
      return images;
    } catch (error) {
      retryCount++;
      if (retryCount >= maxRetries) {
        // 所有重试都失败，返回友好错误
        console.warn(
          'Failed to load remote images from GitHub after multiple attempts:',
          error instanceof Error ? error.message : 'Unknown error'
        );
        return [];
      }
      
      // 等待一段时间后重试
      const waitTime = 1000 * Math.pow(2, retryCount);
      console.log(`Retrying remote image loading in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  return [];
};

/**
 * 获取所有图片（本地+远程）
 * @returns 所有图片数组
 */
export const getAllImages = async (): Promise<GalleryImage[]> => {
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
    });
  } catch (error) {
    console.warn('Failed to fetch remote images, only showing local images:', error);
    // 在开发环境中，如果获取远程图片失败，只显示本地图片
  }
  
  // 合并所有图片
  return [...localImages, ...remoteImages];
};

/**
 * 按分类过滤图片
 * @param images - 图片数组
 * @param category - 分类名称（null表示所有分类）
 * @returns 过滤后的图片数组
 */
export const filterImagesByCategory = (images: GalleryImage[], category: string | null): GalleryImage[] => {
  if (!category) {
    return images;
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
