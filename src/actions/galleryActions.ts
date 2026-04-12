'use server';

/**
 * 图床管理相关的 Server Actions
 * 提供本地图床的增删改查功能，支持递归扫描所有图片目录
 */

import { revalidatePath } from 'next/cache';
import { promises as fs } from 'fs';
import path from 'path';
import { GalleryImage, ImageSource } from '@/types/gallery';

// 图片存储根目录
const GALLERY_ROOT = path.join(process.cwd(), 'public');

// 支持的图片扩展名列表（更全面的格式支持）
const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
  '.bmp', '.ico', '.avif', '.apng', '.tiff', '.tif'
]);

// 需要排除的目录（这些目录的图片不应通过图床管理）
const EXCLUDED_DIRECTORIES = new Set([
  'luotianyi-live2d-master',  // Live2D资源目录
  'music',                      // 音乐目录（包含.mp3等非图片）
  'tools',                      // 工具目录
  'js',                         // JavaScript目录
  'api',                        // API目录
  'aplayer',                    // 音乐播放器
  'luotianyi-live2d-master',   // 重复排除
]);

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
 * 检查文件是否为支持的图片格式
 * @param ext - 文件扩展名（包含点号）
 */
function isSupportedImage(ext: string): boolean {
  return SUPPORTED_IMAGE_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * 检查目录是否应该被排除
 * @param dirName - 目录名称
 */
function isExcludedDirectory(dirName: string): boolean {
  return EXCLUDED_DIRECTORIES.has(dirName.toLowerCase());
}

/**
 * 递归扫描目录获取所有图片
 * @param targetDir - 目标目录路径
 * @param relativeRoot - 相对根目录的路径（用于构建URL）
 * @returns 图片数组
 */
async function scanDirectoryForImages(
  targetDir: string,
  relativeRoot: string = ''
): Promise<GalleryImage[]> {
  const images: GalleryImage[] = [];

  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        // 递归扫描子目录
        const subRelativePath = relativeRoot
          ? `${relativeRoot}/${entry.name}`
          : entry.name;
        const subImages = await scanDirectoryForImages(fullPath, subRelativePath);
        images.push(...subImages);
      } else if (entry.isFile()) {
        // 检查文件扩展名
        const ext = path.extname(entry.name).toLowerCase();
        if (isSupportedImage(ext)) {
          try {
            const stats = await fs.stat(fullPath);
            const relativePath = relativeRoot
              ? `${relativeRoot}/${entry.name}`
              : entry.name;

            images.push({
              id: relativePath,
              src: `/${relativePath}`,
              alt: entry.name,
              source: ImageSource.Local,
              category: relativeRoot || 'root',
              createdAt: stats.birthtime.toISOString(),
              updatedAt: stats.mtime.toISOString(),
              size: stats.size,
            });
          } catch (statError) {
            // 忽略无法获取文件信息的文件
            console.warn(`无法获取文件信息: ${fullPath}`, statError);
          }
        }
      }
    }
  } catch (error) {
    console.error(`扫描目录失败: ${targetDir}`, error);
  }

  return images;
}

/**
 * 获取目录树结构（用于导航）
 * @param targetDir - 目标目录路径
 * @param relativeRoot - 相对根目录的路径
 * @param maxDepth - 最大递归深度（默认3层）
 */
export interface DirectoryTree {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
  children?: DirectoryTree[];
  imageCount?: number; // 如果是目录，则显示包含的图片数量
}

/**
 * 获取完整的目录树结构
 */
async function buildDirectoryTree(
  targetDir: string,
  relativeRoot: string = '',
  currentDepth: number = 0,
  maxDepth: number = 3
): Promise<DirectoryTree[]> {
  const tree: DirectoryTree[] = [];

  if (currentDepth > maxDepth) {
    return tree;
  }

  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        // 排除特定目录
        if (isExcludedDirectory(entry.name)) {
          continue;
        }

        const subRelativePath = relativeRoot
          ? `${relativeRoot}/${entry.name}`
          : entry.name;

        // 递归获取子目录结构
        const children = await buildDirectoryTree(
          fullPath,
          subRelativePath,
          currentDepth + 1,
          maxDepth
        );

        // 计算该目录下有多少图片（包括子目录）
        const imageCount = await countImagesInDirectory(fullPath);

        tree.push({
          name: entry.name,
          path: subRelativePath,
          type: 'directory',
          children,
          imageCount,
        });
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (isSupportedImage(ext)) {
          try {
            const stats = await fs.stat(fullPath);
            tree.push({
              name: entry.name,
              path: relativeRoot
                ? `${relativeRoot}/${entry.name}`
                : entry.name,
              type: 'file',
              size: stats.size,
            });
          } catch (statError) {
            // 忽略错误
          }
        }
      }
    }
  } catch (error) {
    console.error(`构建目录树失败: ${targetDir}`, error);
  }

  return tree;
}

/**
 * 统计目录下的图片数量（包括子目录）
 */
async function countImagesInDirectory(targetDir: string): Promise<number> {
  let count = 0;

  try {
    const entries = await fs.readdir(targetDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(targetDir, entry.name);

      if (entry.isDirectory()) {
        if (!isExcludedDirectory(entry.name)) {
          count += await countImagesInDirectory(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (isSupportedImage(ext)) {
          count++;
        }
      }
    }
  } catch (error) {
    console.error(`统计图片数量失败: ${targetDir}`, error);
  }

  return count;
}

/**
 * 获取本地图床图片列表（递归扫描所有子目录）
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

    // 检查目录是否存在
    try {
      await fs.access(targetDir);
    } catch {
      return [];
    }

    // 递归扫描获取所有图片
    const images = await scanDirectoryForImages(targetDir, subPath || '');

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
 * 获取本地图床目录列表（支持递归）
 */
export async function getLocalGalleryDirectories(subPath?: string): Promise<string[]> {
  try {
    const targetDir = subPath
      ? path.join(GALLERY_ROOT, subPath)
      : GALLERY_ROOT;

    // 安全检查：确保路径在 GALLERY_ROOT 下
    if (!targetDir.startsWith(GALLERY_ROOT)) {
      return ['root'];
    }

    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    const directories: string[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() && !isExcludedDirectory(entry.name)) {
        const fullPath = subPath
          ? `${subPath}/${entry.name}`
          : entry.name;
        directories.push(fullPath);

        // 递归获取子目录
        const subDirs = await getLocalGalleryDirectories(fullPath);
        directories.push(...subDirs.filter(d => d !== fullPath));
      }
    }

    return ['root', ...directories];
  } catch (error) {
    console.error('获取本地图床目录失败:', error);
    return ['root'];
  }
}

/**
 * 获取完整的目录树结构（用于UI导航）
 */
export async function getLocalGalleryDirectoryTree(): Promise<DirectoryTree[]> {
  try {
    return await buildDirectoryTree(GALLERY_ROOT);
  } catch (error) {
    console.error('获取目录树失败:', error);
    return [];
  }
}

/**
 * 获取指定目录的直接子目录列表（用于快速导航）
 */
export async function getLocalGallerySubDirectories(parentPath?: string): Promise<{
  name: string;
  path: string;
  imageCount: number;
}[]> {
  try {
    const targetDir = parentPath
      ? path.join(GALLERY_ROOT, parentPath)
      : GALLERY_ROOT;

    // 安全检查
    if (!targetDir.startsWith(GALLERY_ROOT)) {
      return [];
    }

    const entries = await fs.readdir(targetDir, { withFileTypes: true });
    const subDirs: {
      name: string;
      path: string;
      imageCount: number;
    }[] = [];

    for (const entry of entries) {
      if (entry.isDirectory() && !isExcludedDirectory(entry.name)) {
        const fullPath = path.join(targetDir, entry.name);
        const subPath = parentPath
          ? `${parentPath}/${entry.name}`
          : entry.name;

        // 统计该目录下的图片数量
        const imageCount = await countImagesInDirectory(fullPath);

        subDirs.push({
          name: entry.name,
          path: subPath,
          imageCount,
        });
      }
    }

    // 按图片数量排序
    return subDirs.sort((a, b) => b.imageCount - a.imageCount);
  } catch (error) {
    console.error('获取子目录列表失败:', error);
    return [];
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
