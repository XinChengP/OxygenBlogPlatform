/**
 * 图床管理相关的 Server Actions
 * 提供本地图床的增删改查功能，支持递归扫描所有图片目录
 *
 * 注意：此文件支持两种运行模式
 * 1. 本地开发模式（NEXT_PRIVATE_STATIC_EXPORT !== 'true'）：使用真实的文件系统操作
 * 2. 静态导出模式（NEXT_PRIVATE_STATIC_EXPORT === 'true'）：返回空实现，用于 GitHub Pages 构建
 */

// 检测是否在静态导出模式 - 必须在任何导入之前检测
const isStaticExport = process.env.NEXT_PRIVATE_STATIC_EXPORT === 'true' || process.env.STATIC_EXPORT === 'true';

// 类型定义
export interface UploadResult {
  success: boolean;
  message: string;
  image?: import('@/types/gallery').GalleryImage;
}

export interface UploadMultipleResult {
  success: boolean;
  message: string;
  images: import('@/types/gallery').GalleryImage[];
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

// 使用类型别名引用 GalleryImage
 type GalleryImage = import('@/types/gallery').GalleryImage;

// ============================================
// 静态导出模式：空实现
// ============================================

function getLocalGalleryImagesStatic(subPath?: string): Promise<GalleryImage[]> {
  return Promise.resolve([]);
}

function getLocalGalleryDirectoriesStatic(subPath?: string): Promise<string[]> {
  return Promise.resolve([]);
}

function getLocalGalleryDirectoryTreeStatic(): Promise<DirectoryTree[]> {
  return Promise.resolve([]);
}

function getLocalGallerySubDirectoriesStatic(parentPath?: string): Promise<{
  name: string;
  path: string;
  imageCount: number;
}[]> {
  return Promise.resolve([]);
}

function deleteLocalImageStatic(imagePath: string): Promise<{ success: boolean; message: string }> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function uploadLocalImageStatic(formData: FormData, targetPath?: string): Promise<UploadResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能' });
}

function uploadLocalImagesStatic(formDataList: FormData[], targetPath?: string): Promise<UploadMultipleResult> {
  return Promise.resolve({ success: false, message: '静态导出模式不支持此功能', images: [], failed: [] });
}

function getLocalGalleryStatsStatic(): Promise<GalleryStats> {
  return Promise.resolve({ totalImages: 0, totalSize: 0, directories: 0 });
}

// ============================================
// 本地开发模式：真实实现
// ============================================

// 只有在非静态导出模式下才导入和使用 Server Actions 相关功能
let galleryActionsReal: {
  getLocalGalleryImages: (subPath?: string) => Promise<GalleryImage[]>;
  getLocalGalleryDirectories: (subPath?: string) => Promise<string[]>;
  getLocalGalleryDirectoryTree: () => Promise<DirectoryTree[]>;
  getLocalGallerySubDirectories: (parentPath?: string) => Promise<{ name: string; path: string; imageCount: number }[]>;
  deleteLocalImage: (imagePath: string) => Promise<{ success: boolean; message: string }>;
  uploadLocalImage: (formData: FormData, targetPath?: string) => Promise<UploadResult>;
  uploadLocalImages: (formDataList: FormData[], targetPath?: string) => Promise<UploadMultipleResult>;
  getLocalGalleryStats: () => Promise<GalleryStats>;
} | null = null;

// 动态导入真实实现（只在非静态导出模式下）
if (!isStaticExport) {
  // 使用 eval 包装 require 动态导入，避免 Turbopack 在构建时解析
  try {
    // eslint-disable-next-line no-eval
    const realModule = eval("require('./galleryActions.real')");
    galleryActionsReal = realModule;
  } catch {
    // 如果真实实现模块不存在，使用空实现
    galleryActionsReal = null;
  }
}

// ============================================
// 导出函数：根据环境选择实现
// ============================================

export async function getLocalGalleryImages(subPath?: string): Promise<GalleryImage[]> {
  if (isStaticExport || !galleryActionsReal) {
    return getLocalGalleryImagesStatic(subPath);
  }
  return galleryActionsReal.getLocalGalleryImages(subPath);
}

export async function getLocalGalleryDirectories(subPath?: string): Promise<string[]> {
  if (isStaticExport || !galleryActionsReal) {
    return getLocalGalleryDirectoriesStatic(subPath);
  }
  return galleryActionsReal.getLocalGalleryDirectories(subPath);
}

export async function getLocalGalleryDirectoryTree(): Promise<DirectoryTree[]> {
  if (isStaticExport || !galleryActionsReal) {
    return getLocalGalleryDirectoryTreeStatic();
  }
  return galleryActionsReal.getLocalGalleryDirectoryTree();
}

export async function getLocalGallerySubDirectories(parentPath?: string): Promise<{
  name: string;
  path: string;
  imageCount: number;
}[]> {
  if (isStaticExport || !galleryActionsReal) {
    return getLocalGallerySubDirectoriesStatic(parentPath);
  }
  return galleryActionsReal.getLocalGallerySubDirectories(parentPath);
}

export async function deleteLocalImage(imagePath: string): Promise<{ success: boolean; message: string }> {
  if (isStaticExport || !galleryActionsReal) {
    return deleteLocalImageStatic(imagePath);
  }
  return galleryActionsReal.deleteLocalImage(imagePath);
}

export async function uploadLocalImage(formData: FormData, targetPath?: string): Promise<UploadResult> {
  if (isStaticExport || !galleryActionsReal) {
    return uploadLocalImageStatic(formData, targetPath);
  }
  return galleryActionsReal.uploadLocalImage(formData, targetPath);
}

export async function uploadLocalImages(formDataList: FormData[], targetPath?: string): Promise<UploadMultipleResult> {
  if (isStaticExport || !galleryActionsReal) {
    return uploadLocalImagesStatic(formDataList, targetPath);
  }
  return galleryActionsReal.uploadLocalImages(formDataList, targetPath);
}

export async function getLocalGalleryStats(): Promise<GalleryStats> {
  if (isStaticExport || !galleryActionsReal) {
    return getLocalGalleryStatsStatic();
  }
  return galleryActionsReal.getLocalGalleryStats();
}
