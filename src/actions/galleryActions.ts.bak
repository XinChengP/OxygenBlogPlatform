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
 * 扫描目录获取图片列表
 * @param dirPath 目录路径（相对于 public）
 * @returns 图片列表
 */
async function scanDirectory(dirPath: string): Promise<GalleryImage[]> {
  if (isStaticExport) {
    return [];
  }
  
  const fullPath = path.join(GALLERY_ROOT, dirPath);
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
          category: path.dirname(dirPath) || dirPath,
          subCategory: path.basename(dirPath),
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
      const customPath = path.join(GALLERY_ROOT, scanPath);
      try {
        await fs.access(customPath);
        const images = await scanDirectory(scanPath);
        allImages.push(...images);
      } catch {
        // 目录不存在，跳过
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
    // 安全检查：确保路径在 public 目录下
    const normalizedPath = path.normalize(imagePath).replace(/^\.+(\\|\/)/, '');
    const fullPath = path.join(GALLERY_ROOT, normalizedPath);
    
    // 确保路径在 GALLERY_ROOT 内
    if (!fullPath.startsWith(GALLERY_ROOT)) {
      return { success: false, message: '无效的图片路径' };
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

    // 安全检查路径
    const normalizedPath = path.normalize(uploadPath).replace(/^\.+(\\|\/)/, '');
    const targetDir = path.join(GALLERY_ROOT, normalizedPath);
    
    // 确保路径在 GALLERY_ROOT 内
    if (!targetDir.startsWith(GALLERY_ROOT)) {
      return { success: false, message: '无效的上传路径' };
    }

    // 确保目录存在
    await fs.mkdir(targetDir, { recursive: true });

    // 生成唯一文件名
    const timestamp = Date.now();
    const ext = path.extname(file.name);
    const baseName = path.basename(file.name, ext);
    const safeName = `${baseName}_${timestamp}${ext}`;
    const filePath = path.join(targetDir, safeName);

    // 写入文件
    const bytes = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(bytes));

    // 获取文件信息
    const stats = await fs.stat(filePath);
    const relativePath = path.relative(GALLERY_ROOT, filePath).replace(/\\/g, '/');

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
    const fullPath = path.join(GALLERY_ROOT, basePath);
    
    // 安全检查
    if (!fullPath.startsWith(GALLERY_ROOT)) {
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
    const fullPath = path.join(GALLERY_ROOT, basePath);
    
    // 安全检查
    if (!fullPath.startsWith(GALLERY_ROOT)) {
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
