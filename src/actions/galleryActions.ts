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

// 空实现函数
export async function getLocalGalleryImages(subPath?: string): Promise<GalleryImage[]> {
  return [];
}

export async function getLocalGalleryDirectories(): Promise<string[]> {
  return [];
}

export async function deleteLocalImage(imagePath: string): Promise<{ success: boolean; message: string }> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function uploadLocalImage(formData: FormData, targetPath?: string): Promise<UploadResult> {
  return { success: false, message: '静态导出模式不支持此功能' };
}

export async function uploadLocalImages(formDataList: FormData[], targetPath?: string): Promise<UploadMultipleResult> {
  return { success: false, message: '不支持', images: [], failed: [] };
}

export async function getLocalGalleryStats(): Promise<GalleryStats> {
  return { totalImages: 0, totalSize: 0, directories: 0 };
}
