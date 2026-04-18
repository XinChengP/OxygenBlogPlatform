// 静态导出模式 - Server Actions 被替换为静态兼容版本
// 注意：此文件在构建时自动生成，请勿手动修改

import { GalleryImage } from '@/types/gallery';

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

export interface DirectoryTree {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
  children?: DirectoryTree[];
  imageCount?: number;
}

// 空实现函数（不使用 async，不返回 Promise）
export function getLocalGalleryImages(subPath?: string): GalleryImage[] {
  return [];
}

export function getLocalGalleryDirectories(subPath?: string): string[] {
  return [];
}

export function getLocalGalleryDirectoryTree(): DirectoryTree[] {
  return [];
}

export function getLocalGallerySubDirectories(parentPath?: string): {
  name: string;
  path: string;
  imageCount: number;
}[] {
  return [];
}

export function deleteLocalImage(imagePath: string): { success: boolean; message: string } {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function uploadLocalImage(formData: FormData, targetPath?: string): UploadResult {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export function uploadLocalImages(formDataList: FormData[], targetPath?: string): UploadMultipleResult {
  return { success: false, message: '不支持', images: [], failed: [] };
}

export function getLocalGalleryStats(): GalleryStats {
  return { totalImages: 0, totalSize: 0, directories: 0 };
}
