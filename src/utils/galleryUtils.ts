import fs from 'fs';
import path from 'path';
import { GalleryImage, ImageSource, ImageCategory } from '../types/gallery';
import { getAssetPath } from './assetUtils';

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
const generateImageId = (filePath: string): string => {
  return filePath
    .replace(/\//g, '-')
    .replace(/\\/g, '-')
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
        const category = path.dirname(relativePath) || 'default';
        const filename = path.basename(itemPath);
        
        // 生成图片URL（相对于public目录）
        const imageUrl = `/gallery/${relativePath}`;
        
        results.push({
          id: generateImageId(relativePath),
          src: getAssetPath(imageUrl),
          alt: filename.replace(path.extname(filename), ''),
          source: ImageSource.Local,
          category: category === '.' ? 'default' : category,
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
          const category = path.basename(config.path);
          
          // 构造jsDelivr加速URL
          const jsdelivrUrl = `https://cdn.jsdelivr.net/gh/${config.owner}/${config.repo}@${config.branch}/${config.path}/${item.name}`;
          
          images.push({
            id: generateImageId(`${config.path}/${item.name}`),
            src: jsdelivrUrl, // 使用jsDelivr加速URL作为主URL
            fallbackSrc: item.download_url, // 保存原始GitHub URL作为备用
            alt: item.name.replace(path.extname(item.name), ''),
            source: ImageSource.Remote,
            category: category || 'default',
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
