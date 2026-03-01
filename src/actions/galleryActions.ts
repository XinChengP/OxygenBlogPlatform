'use server';

/**
 * 图床管理相关的 Server Actions
 * 提供本地图床的增删改查功能
 */

import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';
import { GalleryImage, ImageSource } from '@/types/gallery';

// 图片存储根目录
const GALLERY_ROOT = path.join(process.cwd(), 'public');

export interface UploadResult {
  success: boolean;
  message: string;
  image?: GalleryImage;
}

export interface UploadMultipleResult {
  success: boolean;
  message: string;
  images: GalleryImage[];
  failed: string[];
}

export interface GalleryStats {
  totalImages: number;
  totalSize: number;
  directories: number;
}

/**
 * 获取本地图床图片列表
 */
export async function getLocalGalleryImages(subPath?: string): Promise<GalleryImage[]> {
  try {
    const targetDir = subPath 
      ? path.join(GALLERY_ROOT, subPath)
      : GALLERY_ROOT;
    
    // 安全检查：确保路径在 GALLERY_ROOT 下
    if (!targetDir.startsWith(GALLERY_ROOT)) {
      return [];
    }

    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    const images: GalleryImage[] = [];

    for (const entry of entries) {
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
          const filePath = path.join(targetDir, entry.name);
          const stats = await fs.stat(filePath);
          const relativePath = path.relative(GALLERY_ROOT, filePath).replace(/\\/g, '/');
          
          images.push({
            id: relativePath,
            src: `/${relativePath}`,
            alt: entry.name,
            source: ImageSource.Local,
            category: subPath || 'root',
            createdAt: stats.birthtime.toISOString(),
            size: stats.size,
          });
        }
      }
    }

    // 按创建时间倒序排列
    return images.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('获取本地图床图片失败:', error);
    return [];
  }
}

/**
 * 获取本地图床目录列表
 */
export async function getLocalGalleryDirectories(): Promise<string[]> {
  try {
    const entries = await fs.readdir(GALLERY_ROOT, { withFileTypes: true });
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name);
    
    return ['root', ...directories];
  } catch (error) {
    console.error('获取本地图床目录失败:', error);
    return ['root'];
  }
}

/**
 * 删除本地图片
 */
export async function deleteLocalImage(imagePath: string): Promise<{ success: boolean; message: string }> {
  try {
    const fullPath = path.join(GALLERY_ROOT, imagePath.replace(/^\//, ''));
    
    // 安全检查：确保路径在 GALLERY_ROOT 下
    if (!fullPath.startsWith(GALLERY_ROOT)) {
      return { success: false, message: '无效的图片路径' };
    }

    await fs.unlink(fullPath);
    revalidatePath('/admin/gallery');
    return { success: true, message: '删除成功' };
  } catch (error) {
    console.error('删除本地图片失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '删除失败' 
    };
  }
}

/**
 * 上传图片到本地图床
 */
export async function uploadLocalImage(formData: FormData, targetPath?: string): Promise<UploadResult> {
  try {
    const file = formData.get('image') as File;
    if (!file) {
      return { success: false, message: '未找到图片文件' };
    }

    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      return { success: false, message: '只能上传图片文件' };
    }

    // 验证文件大小（最大 10MB）
    if (file.size > 10 * 1024 * 1024) {
      return { success: false, message: '图片大小不能超过 10MB' };
    }

    // 确定目标目录
    const targetDir = targetPath 
      ? path.join(GALLERY_ROOT, targetPath)
      : GALLERY_ROOT;

    // 安全检查：确保路径在 GALLERY_ROOT 下
    if (!targetDir.startsWith(GALLERY_ROOT)) {
      return { success: false, message: '无效的目标路径' };
    }

    // 确保目录存在
    await fs.mkdir(targetDir, { recursive: true });

    // 生成文件名
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    
    // 根据文件类型确定扩展名
    let ext = path.extname(file.name);
    if (!ext) {
      // 如果文件名没有扩展名，根据 MIME 类型确定
      const mimeToExt: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
        'image/svg+xml': '.svg',
      };
      ext = mimeToExt[file.type] || '.png';
    }
    
    const fileName = `image-${timestamp}-${random}${ext}`;
    const filePath = path.join(targetDir, fileName);

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
      source: ImageSource.Local,
      category: targetPath || 'root',
      createdAt: stats.birthtime.toISOString(),
      size: stats.size,
    };

    revalidatePath('/admin/gallery');
    return { success: true, message: '上传成功', image };
  } catch (error) {
    console.error('上传本地图片失败:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : '上传失败' 
    };
  }
}

/**
 * 批量上传图片到本地图床
 */
export async function uploadLocalImages(formDataList: FormData[], targetPath?: string): Promise<UploadMultipleResult> {
  const images: GalleryImage[] = [];
  const failed: string[] = [];

  for (const formData of formDataList) {
    const result = await uploadLocalImage(formData, targetPath);
    if (result.success && result.image) {
      images.push(result.image);
    } else {
      failed.push(result.message);
    }
  }

  return {
    success: failed.length === 0,
    message: `成功上传 ${images.length} 张图片${failed.length > 0 ? `，${failed.length} 张失败` : ''}`,
    images,
    failed,
  };
}

/**
 * 获取本地图床统计信息
 */
export async function getLocalGalleryStats(): Promise<GalleryStats> {
  try {
    const images = await getLocalGalleryImages();
    const directories = await getLocalGalleryDirectories();
    
    const totalSize = images.reduce((sum, img) => sum + (img.size || 0), 0);

    return {
      totalImages: images.length,
      totalSize,
      directories: directories.length,
    };
  } catch (error) {
    console.error('获取本地图床统计失败:', error);
    return { totalImages: 0, totalSize: 0, directories: 0 };
  }
}
