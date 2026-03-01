'use server';

/**
 * 图床管理 Server Actions
 * 用于本地图床的文件系统操作
 */

import { promises as fs } from 'fs';
import path from 'path';
import { GalleryImage, ImageSource } from '@/types/gallery';

/**
 * 支持的图片格式
 */
const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.bmp', '.ico'];

/**
 * 图片文件信息接口
 */
interface ImageFileInfo {
  name: string;
  path: string;
  fullPath: string;
  size: number;
  modifiedTime: Date;
}

/**
 * 递归获取目录中的所有图片文件
 * @param dirPath - 目录路径（相对于 public）
 * @returns 图片文件信息列表
 */
async function getImagesFromDirectory(dirPath: string): Promise<ImageFileInfo[]> {
  const images: ImageFileInfo[] = [];
  const publicDir = path.join(process.cwd(), 'public');
  const fullDirPath = path.join(publicDir, dirPath);

  try {
    // 检查目录是否存在
    const stats = await fs.stat(fullDirPath);
    if (!stats.isDirectory()) {
      return images;
    }

    // 读取目录内容
    const entries = await fs.readdir(fullDirPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const fullEntryPath = path.join(publicDir, entryPath);

      if (entry.isDirectory()) {
        // 递归处理子目录
        const subImages = await getImagesFromDirectory(entryPath);
        images.push(...subImages);
      } else if (entry.isFile()) {
        // 检查是否是图片文件
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_IMAGE_EXTENSIONS.includes(ext)) {
          const fileStats = await fs.stat(fullEntryPath);
          images.push({
            name: entry.name,
            path: `/${entryPath.replace(/\\/g, '/')}`,
            fullPath: fullEntryPath,
            size: fileStats.size,
            modifiedTime: fileStats.mtime,
          });
        }
      }
    }
  } catch (error) {
    console.error(`读取目录失败: ${dirPath}`, error);
  }

  return images;
}

/**
 * 获取本地图床图片列表
 * @param subPath - 子目录路径（可选）
 * @returns 图片列表
 */
export async function getLocalGalleryImages(subPath: string = ''): Promise<GalleryImage[]> {
  try {
    // 默认扫描的图片目录
    const defaultDirs = ['LTY_Picture', 'Blogabout', 'assets', 'friendlink'];
    const allImages: ImageFileInfo[] = [];

    // 如果指定了子路径，只扫描该路径
    if (subPath) {
      const images = await getImagesFromDirectory(subPath);
      allImages.push(...images);
    } else {
      // 否则扫描所有默认目录
      for (const dir of defaultDirs) {
        const images = await getImagesFromDirectory(dir);
        allImages.push(...images);
      }
    }

    // 转换为 GalleryImage 格式
    const galleryImages: GalleryImage[] = allImages.map((img, index) => ({
      id: `local-${index}-${img.name}`,
      src: img.path,
      alt: img.name,
      source: ImageSource.Local,
      category: path.dirname(img.path).split('/').pop() || '默认',
      createdAt: img.modifiedTime.toISOString(),
      size: img.size,
    }));

    // 按修改时间倒序排列
    galleryImages.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    return galleryImages;
  } catch (error) {
    console.error('获取本地图床图片失败:', error);
    return [];
  }
}

/**
 * 获取本地图床目录列表
 * @returns 目录列表
 */
export async function getLocalGalleryDirectories(): Promise<string[]> {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    const entries = await fs.readdir(publicDir, { withFileTypes: true });
    
    const directories: string[] = [];
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        // 检查目录中是否包含图片
        const dirPath = path.join(publicDir, entry.name);
        const subEntries = await fs.readdir(dirPath, { withFileTypes: true });
        
        // 检查是否有图片文件
        const hasImages = subEntries.some(subEntry => {
          if (subEntry.isFile()) {
            const ext = path.extname(subEntry.name).toLowerCase();
            return SUPPORTED_IMAGE_EXTENSIONS.includes(ext);
          }
          return false;
        });
        
        if (hasImages) {
          directories.push(entry.name);
        }
      }
    }
    
    return directories;
  } catch (error) {
    console.error('获取本地图床目录失败:', error);
    return [];
  }
}

/**
 * 删除本地图片
 * @param imagePath - 图片路径（相对于 public）
 * @returns 操作结果
 */
export async function deleteLocalImage(imagePath: string): Promise<{ success: boolean; message: string }> {
  try {
    // 安全检查：确保路径在 public 目录内
    const publicDir = path.join(process.cwd(), 'public');
    const fullPath = path.join(publicDir, imagePath.replace(/^\//, ''));
    
    // 解析路径，防止目录遍历攻击
    const resolvedPath = path.resolve(fullPath);
    const resolvedPublicDir = path.resolve(publicDir);
    
    if (!resolvedPath.startsWith(resolvedPublicDir)) {
      return { success: false, message: '无效的图片路径' };
    }

    // 检查文件是否存在
    const stats = await fs.stat(resolvedPath);
    if (!stats.isFile()) {
      return { success: false, message: '文件不存在' };
    }

    // 删除文件
    await fs.unlink(resolvedPath);
    
    return { success: true, message: '图片删除成功' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '删除失败';
    console.error('删除本地图片失败:', error);
    return { success: false, message: `删除失败: ${errorMessage}` };
  }
}

/**
 * 上传图片到本地图床
 * @param formData - 包含图片文件的 FormData
 * @param targetPath - 目标路径（相对于 public）
 * @returns 上传结果
 */
export async function uploadLocalImage(
  formData: FormData,
  targetPath: string = 'LTY_Picture'
): Promise<{ success: boolean; message: string; image?: GalleryImage }> {
  try {
    // 获取上传的文件
    const file = formData.get('file') as File;
    
    if (!file) {
      return { success: false, message: '未找到上传的文件' };
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/avif'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, message: '不支持的文件类型' };
    }

    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { success: false, message: '文件大小超过 10MB 限制' };
    }

    // 安全检查：确保目标路径在 public 目录内
    const publicDir = path.join(process.cwd(), 'public');
    const fullTargetDir = path.join(publicDir, targetPath);
    
    // 解析路径，防止目录遍历攻击
    const resolvedTargetDir = path.resolve(fullTargetDir);
    const resolvedPublicDir = path.resolve(publicDir);
    
    if (!resolvedTargetDir.startsWith(resolvedPublicDir)) {
      return { success: false, message: '无效的目标路径' };
    }

    // 确保目标目录存在
    await fs.mkdir(resolvedTargetDir, { recursive: true });

    // 生成文件名（保留原始扩展名）
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '-');
    const extension = path.extname(file.name);
    const fileName = `${originalName}-${timestamp}${extension}`;
    
    // 完整的文件路径
    const fullFilePath = path.join(resolvedTargetDir, fileName);
    
    // 将文件写入磁盘
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(fullFilePath, buffer);

    // 获取文件信息
    const stats = await fs.stat(fullFilePath);
    
    // 构建图片访问路径（相对于 public）
    const relativePath = `/${targetPath}/${fileName}`.replace(/\\/g, '/');
    
    // 构建返回的图片信息
    const image: GalleryImage = {
      id: `local-${timestamp}-${fileName}`,
      src: relativePath,
      alt: file.name.replace(extension, ''),
      source: ImageSource.Local,
      category: targetPath.split('/')[0] || '默认',
      createdAt: stats.mtime.toISOString(),
      size: stats.size,
    };

    return { 
      success: true, 
      message: '图片上传成功', 
      image 
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '上传失败';
    console.error('上传本地图片失败:', error);
    return { success: false, message: `上传失败: ${errorMessage}` };
  }
}

/**
 * 批量上传图片到本地图床
 * @param formDataList - 包含多个图片文件的 FormData 数组
 * @param targetPath - 目标路径（相对于 public）
 * @returns 上传结果
 */
export async function uploadLocalImages(
  formDataList: FormData[],
  targetPath: string = 'LTY_Picture'
): Promise<{ success: boolean; message: string; images: GalleryImage[]; failed: string[] }> {
  const images: GalleryImage[] = [];
  const failed: string[] = [];

  for (const formData of formDataList) {
    const result = await uploadLocalImage(formData, targetPath);
    if (result.success && result.image) {
      images.push(result.image);
    } else {
      const file = formData.get('file') as File;
      failed.push(file?.name || '未知文件');
    }
  }

  return {
    success: failed.length === 0,
    message: `成功上传 ${images.length} 张图片，失败 ${failed.length} 张`,
    images,
    failed,
  };
}

/**
 * 获取本地图片统计信息
 * @returns 统计信息
 */
export async function getLocalGalleryStats(): Promise<{
  totalImages: number;
  totalSize: number;
  directories: number;
}> {
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
