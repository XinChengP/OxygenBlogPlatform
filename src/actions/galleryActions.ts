/**
 * 图库管理相关的 Server Actions
 * 提供本地图库图片的增删改查功能
 * 
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

'use server';

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

// 类型定义
import type { ImageSource } from '@/types/gallery';

export interface GalleryImage {
  id: string;
  src: string;
  fallbackSrc?: string;
  thumbnail?: string;
  alt: string;
  source: ImageSource;
  category: string;
  subCategory?: string;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt?: string;
  size?: number;
}

export interface DirectoryTree {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: DirectoryTree[];
}

// 只有在非静态导出模式下才导入和使用 Server Actions 相关功能
import { promises as fs } from 'fs';
import path from 'path';
import { revalidatePath } from 'next/cache';

// 本地图库根目录
const GALLERY_ROOT = path.join(process.cwd(), 'public');

/**
 * 将客户端传入的相对路径解析为 public 目录内的绝对路径
 *
 * 安全要点：
 * 1. 必须使用 path.resolve，它会消解 `..`，传 `../public-evil` 时结果落在 public 之外；
 * 2. 比较边界时必须带路径分隔符，否则 `...\public-evil` 也能通过 `startsWith(root)`；
 * 3. 传入绝对路径时 path.resolve 会直接丢弃 root，同样会被边界判断拦截。
 *
 * @param relativePath 相对于 public 的路径
 * @returns 安全的绝对路径；越界时返回 null
 */
function resolveGalleryPath(relativePath: string): string | null {
  const root = path.resolve(GALLERY_ROOT);
  const target = path.resolve(root, relativePath || '');

  if (target !== root && !target.startsWith(root + path.sep)) {
    return null;
  }

  return target;
}

/**
 * 扫描目录获取图片列表
 * @param dirPath 目录路径（相对于 public）
 * @returns 图片列表
 */
async function scanDirectory(dirPath: string): Promise<GalleryImage[]> {
  if (isStaticExport) {
    return [];
  }
  
  const fullPath = resolveGalleryPath(dirPath);
  if (!fullPath) {
    return [];
  }
  const images: GalleryImage[] = [];

  try {
    const entries = await fs.readdir(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const fullEntryPath = path.join(GALLERY_ROOT, entryPath);

      if (entry.isDirectory()) {
        // 递归扫描子目录
        const subImages = await scanDirectory(entryPath);
        images.push(...subImages);
      } else if (entry.isFile() && isImageFile(entry.name)) {
        // 获取文件信息
        const stats = await fs.stat(fullEntryPath);
        const id = entryPath.replace(/\\/g, '/');
        
        images.push({
          id,
          src: `/${id}`,
          alt: entry.name,
          source: 'local' as ImageSource,
          /*
            分类取路径第一段。原实现用 path.dirname，顶层目录（如 LTY_Picture）
            会返回 "."，导致前端出现名为 "." 的分类。
          */
          category: dirPath.split(/[\\/]/)[0] || '未分类',
          subCategory: dirPath.split(/[\\/]/).slice(1).join('/') || undefined,
          createdAt: stats.birthtime.toISOString(),
          updatedAt: stats.mtime.toISOString(),
          size: stats.size,
        });
      }
    }
  } catch (error) {
    console.error(`扫描目录失败: ${dirPath}`, error);
  }

  return images;
}

/**
 * 检查是否为图片文件
 * @param filename 文件名
 * @returns 是否为图片
 */
function isImageFile(filename: string): boolean {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico'];
  const ext = path.extname(filename).toLowerCase();
  return imageExtensions.includes(ext);
}

/**
 * 获取本地图库图片列表
 * @param scanPath 扫描路径（可选，默认为空表示扫描整个 public 目录）
 * @returns 图片列表
 */
export async function getLocalGalleryImages(scanPath: string = ''): Promise<GalleryImage[]> {
  if (isStaticExport) {
    return [];
  }
  
  try {
    // 默认扫描几个常用图片目录
    const defaultPaths = ['LTY_Picture', 'Blogabout', 'Momentsabout', 'assets'];
    const allImages: GalleryImage[] = [];

    for (const dir of defaultPaths) {
      const dirFullPath = path.join(GALLERY_ROOT, dir);
      try {
        await fs.access(dirFullPath);
        const images = await scanDirectory(dir);
        allImages.push(...images);
      } catch {
        // 目录不存在，跳过
      }
    }

    // 如果指定了扫描路径，额外扫描该路径
    if (scanPath) {
      const customPath = resolveGalleryPath(scanPath);
      // 越界路径直接忽略，避免通过 ../ 枚举项目外目录
      if (!customPath) {
        console.warn('拒绝扫描越界路径:', scanPath);
      } else {
        try {
          await fs.access(customPath);
          const images = await scanDirectory(scanPath);
          allImages.push(...images);
        } catch {
          // 目录不存在，跳过
        }
      }
    }

    // 去重并按时间倒序排列
    const uniqueImages = Array.from(new Map(allImages.map(img => [img.id, img])).values());
    uniqueImages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return uniqueImages;
  } catch (error) {
    console.error('获取本地图库图片失败:', error);
    return [];
  }
}

/**
 * 删除本地图片
 * @param imagePath 图片路径
 * @returns 操作结果
 */
export async function deleteLocalImage(imagePath: string): Promise<{ success: boolean; message: string }> {
  if (isStaticExport) {
    return { success: false, message: '静态导出模式不支持此功能' };
  }
  
  try {
    // 使用统一的路径解析：拦截 ../ 穿越与绝对路径
    const fullPath = resolveGalleryPath(imagePath);
    if (!fullPath || fullPath === path.resolve(GALLERY_ROOT)) {
      return { success: false, message: '无效的图片路径' };
    }

    // 只允许删除图片文件，避免通过构造路径删除 robots.txt 等站点关键静态文件
    if (!isImageFile(fullPath)) {
      return { success: false, message: '只能删除图片文件' };
    }

    await fs.access(fullPath);
    await fs.unlink(fullPath);

    revalidatePath('/admin/gallery');
    revalidatePath('/gallery');

    return { success: true, message: '图片删除成功' };
  } catch (error) {
    console.error('删除图片失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '删除图片失败' 
    };
  }
}

/**
 * 获取本地图库统计信息
 * @returns 统计信息
 */
export async function getLocalGalleryStats(): Promise<{ 
  success: boolean; 
  message: string; 
  data: { total: number; used: number; remaining: number } 
}> {
  if (isStaticExport) {
    return { 
      success: false, 
      message: '静态导出模式不支持此功能', 
      data: { total: 0, used: 0, remaining: 0 } 
    };
  }
  
  try {
    const images = await getLocalGalleryImages();
    const totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0);
    
    // 假设总容量为 500MB
    const maxSize = 500 * 1024 * 1024;
    
    return {
      success: true,
      message: '获取统计信息成功',
      data: {
        total: maxSize,
        used: totalSize,
        remaining: maxSize - totalSize,
      },
    };
  } catch (error) {
    console.error('获取图库统计失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '获取统计信息失败',
      data: { total: 0, used: 0, remaining: 0 }
    };
  }
}

/**
 * 上传本地图片
 * @param formData 包含图片文件的表单数据
 * @param uploadPath 上传路径（相对于 public）
 * @returns 操作结果
 */
export async function uploadLocalImage(
  formData: FormData,
  uploadPath: string = ''
): Promise<{ success: boolean; message: string; image?: GalleryImage }> {
  if (isStaticExport) {
    return { success: false, message: '静态导出模式不支持此功能' };
  }
  
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, message: '未找到上传的文件' };
    }

    // 验证文件类型
    if (!isImageFile(file.name)) {
      return { success: false, message: '不支持的文件类型' };
    }

    // 限制单文件体积，避免一次性把超大文件读入内存
    const MAX_FILE_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return { success: false, message: '图片大小不能超过 10MB' };
    }

    // 安全解析上传目录，拦截 ../ 与绝对路径
    const targetDir = resolveGalleryPath(uploadPath);
    if (!targetDir) {
      return { success: false, message: '无效的上传路径' };
    }

    // 确保目录存在
    await fs.mkdir(targetDir, { recursive: true });

    // 生成唯一文件名
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const baseName = path.basename(file.name, ext);
    // 过滤 Windows 文件名非法字符，避免在本地写入失败
    const safeBaseName = baseName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').trim() || 'image';
    const safeName = `${safeBaseName}_${timestamp}${ext}`;
    const filePath = path.join(targetDir, safeName);

    // 写入文件
    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    // 获取文件信息
    const stats = await fs.stat(filePath);
    const relativePath = path.relative(GALLERY_ROOT, filePath).replace(/\\/g, '/');

    // 上传路径相对 public，用于生成图片分类与访问地址
    const normalizedPath = path.relative(path.resolve(GALLERY_ROOT), targetDir).replace(/\\/g, '/');

    const image: GalleryImage = {
      id: relativePath,
      src: `/${relativePath}`,
      alt: file.name,
      source: 'local' as ImageSource,
      category: normalizedPath || '未分类',
      createdAt: stats.birthtime.toISOString(),
      updatedAt: stats.mtime.toISOString(),
      size: stats.size,
    };

    revalidatePath('/admin/gallery');
    revalidatePath('/gallery');

    return { success: true, message: '图片上传成功', image };
  } catch (error) {
    console.error('上传图片失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '上传图片失败' 
    };
  }
}

/**
 * 获取目录树结构
 * @param basePath 基础路径（相对于 public）
 * @returns 目录树
 */
export async function getLocalGalleryDirectoryTree(
  basePath: string = ''
): Promise<{ success: boolean; message: string; data: DirectoryTree[] }> {
  if (isStaticExport) {
    return { success: false, message: '静态导出模式不支持此功能', data: [] };
  }
  
  try {
    const fullPath = resolveGalleryPath(basePath);
    
    // 安全检查：拦截 ../ 穿越与绝对路径
    if (!fullPath) {
      return { success: false, message: '无效的路径', data: [] };
    }

    const buildTree = async (dirPath: string, relativePath: string = ''): Promise<DirectoryTree[]> => {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const result: DirectoryTree[] = [];

      for (const entry of entries) {
        const entryRelativePath = path.join(relativePath, entry.name).replace(/\\/g, '/');
        
        if (entry.isDirectory()) {
          const children = await buildTree(path.join(dirPath, entry.name), entryRelativePath);
          result.push({
            name: entry.name,
            path: entryRelativePath,
            type: 'directory',
            children,
          });
        } else if (isImageFile(entry.name)) {
          result.push({
            name: entry.name,
            path: entryRelativePath,
            type: 'file',
          });
        }
      }

      return result;
    };

    const tree = await buildTree(fullPath, basePath);
    
    return {
      success: true,
      message: '获取目录树成功',
      data: tree,
    };
  } catch (error) {
    console.error('获取目录树失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '获取目录树失败',
      data: [] 
    };
  }
}

/**
 * 获取子目录列表
 * @param basePath 基础路径（相对于 public）
 * @returns 子目录列表
 */
export async function getLocalGallerySubDirectories(
  basePath: string = ''
): Promise<{ success: boolean; message: string; data: string[] }> {
  if (isStaticExport) {
    return { success: false, message: '静态导出模式不支持此功能', data: [] };
  }
  
  try {
    const fullPath = resolveGalleryPath(basePath);
    
    // 安全检查：拦截 ../ 穿越与绝对路径
    if (!fullPath) {
      return { success: false, message: '无效的路径', data: [] };
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => path.join(basePath, entry.name).replace(/\\/g, '/'));

    return {
      success: true,
      message: '获取子目录成功',
      data: directories,
    };
  } catch (error) {
    console.error('获取子目录失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '获取子目录失败',
      data: [] 
    };
  }
}
