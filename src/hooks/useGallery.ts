'use client';

/**
 * 本地图床管理 Hook
 *
 * 【改造说明】
 * 后台原先的「远程图床」依赖 GitHub Token 与 githubApi 服务，现已统一由
 * 独立的本地图床管理器（洛佬の美图，http://127.0.0.1:3210）接管。
 * 因此本 Hook 只保留本地图床（public 目录图片）的浏览、上传与删除能力，
 * 不再包含任何 GitHub 远程逻辑，避免留下永不执行的死分支。
 */

import { useState, useEffect, useCallback } from 'react';
import { GalleryImage } from '@/types/gallery';
import { copyToClipboard } from '@/utils/adminUtils';
import { validateImageFile } from '@/utils/imageUtils';
import {
  getLocalGalleryImages,
  deleteLocalImage,
  uploadLocalImage,
} from '@/actions/galleryActions';

/**
 * Hook 选项接口
 */
export interface UseGalleryOptions {
  /** 初始扫描路径（可选，空字符串表示整个 public 目录） */
  path?: string;
  /** 是否在挂载后自动加载 */
  autoLoad?: boolean;
}

/**
 * 上传进度接口
 */
export interface UploadProgress {
  /** 文件名 */
  fileName: string;
  /** 进度百分比 (0-100) */
  progress: number;
  /** 上传状态 */
  status: 'pending' | 'uploading' | 'success' | 'error';
  /** 错误信息 */
  error?: string;
}

/**
 * Hook 返回值接口
 */
export interface UseGalleryReturn {
  /** 图片列表 */
  images: GalleryImage[];
  /** 加载状态 */
  loading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 上传单张图片 */
  uploadImage: (file: File, path?: string) => Promise<boolean>;
  /** 批量上传图片（串行执行） */
  uploadImages: (files: File[], path?: string) => Promise<boolean>;
  /** 删除单张图片 */
  deleteImage: (path: string) => Promise<boolean>;
  /** 批量删除图片 */
  deleteImages: (paths: string[]) => Promise<boolean>;
  /** 重新扫描本地图片 */
  refresh: () => void;
  /** 复制图片链接 */
  copyImageLink: (image: GalleryImage) => Promise<boolean>;
  /** 上传进度列表 */
  uploadProgress: UploadProgress[];
}

/**
 * 本地图床管理 Hook
 *
 * @param options - Hook 选项
 * @returns 本地图床管理功能和状态
 *
 * @example
 * ```tsx
 * const { images, loading, uploadImage, deleteImage, refresh } = useGallery({
 *   autoLoad: true,
 * });
 * ```
 */
export function useGallery(options: UseGalleryOptions): UseGalleryReturn {
  const { path = '', autoLoad = true } = options;

  // 状态管理
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);

  /**
   * 通过 Server Action 扫描 public 目录下的本地图片
   */
  const loadImages = useCallback(async () => {
    if (!autoLoad) return;

    setLoading(true);
    setError(null);

    try {
      const localImages = await getLocalGalleryImages(path);
      setImages(localImages);
    } catch (err) {
      // 本地读取失败时保留原始错误信息，便于定位目录权限等问题
      const errorMessage = err instanceof Error ? err.message : '加载图片失败';
      setError(errorMessage);
      console.error('加载本地图片失败:', err);
    } finally {
      setLoading(false);
    }
  }, [path, autoLoad]);

  /**
   * 组件挂载或路径变化时自动加载
   * 改造后不再等待 GitHub 配置初始化，直接扫描本地目录
   */
  useEffect(() => {
    if (autoLoad) {
      loadImages();
    }
  }, [autoLoad, loadImages]);

  /**
   * 上传单张图片到本地 public 目录
   */
  const uploadImage = useCallback(async (file: File, uploadPath?: string): Promise<boolean> => {
    // 复用统一的图片校验（格式、体积等）
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || '文件验证失败');
      return false;
    }

    // 先插入一条「上传中」进度项
    setUploadProgress(prev => [...prev, {
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    }]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // 未指定目录时使用本地图床的默认目录
      const targetPath = uploadPath || 'LTY_Picture';
      const result = await uploadLocalImage(formData, targetPath);

      if (!result.success || !result.image) {
        throw new Error(result.message || '上传失败');
      }

      // 标记进度完成
      setUploadProgress(prev => prev.map(p =>
        p.fileName === file.name ? { ...p, progress: 100, status: 'success' } : p
      ));

      // 新图片置于列表首位
      setImages(prev => [result.image!, ...prev]);

      // 3 秒后移除已完成进度项
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.fileName !== file.name));
      }, 3000);

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '上传失败';
      setError(errorMessage);

      // 保留失败进度项并展示原因，方便用户重试
      setUploadProgress(prev => prev.map(p =>
        p.fileName === file.name ? { ...p, status: 'error', error: errorMessage } : p
      ));

      return false;
    }
  }, []);

  /**
   * 批量上传图片
   * 串行执行，避免多个 Server Action 同时写目录造成文件覆盖
   */
  const uploadImages = useCallback(async (files: File[], uploadPath?: string): Promise<boolean> => {
    let successCount = 0;

    for (const file of files) {
      const success = await uploadImage(file, uploadPath);
      if (success) successCount++;
    }

    return successCount === files.length;
  }, [uploadImage]);

  /**
   * 删除单张本地图片
   */
  const deleteImage = useCallback(async (imagePath: string): Promise<boolean> => {
    try {
      const result = await deleteLocalImage(imagePath);
      if (!result.success) {
        setError(result.message);
        return false;
      }

      // 从列表中移除（本地图片的 src 即文件路径）
      setImages(prev => prev.filter(img => img.src !== imagePath));
      return true;
    } catch (err) {
      setError('删除本地图片失败');
      return false;
    }
  }, []);

  /**
   * 批量删除图片
   */
  const deleteImages = useCallback(async (paths: string[]): Promise<boolean> => {
    let successCount = 0;

    for (const imagePath of paths) {
      const success = await deleteImage(imagePath);
      if (success) successCount++;
    }

    return successCount === paths.length;
  }, [deleteImage]);

  /**
   * 重新扫描本地图片
   */
  const refresh = useCallback(() => {
    loadImages();
  }, [loadImages]);

  /**
   * 复制图片链接（统一走 adminUtils 的剪贴板实现）
   */
  const copyImageLink = useCallback(async (image: GalleryImage): Promise<boolean> => {
    return copyToClipboard(image.src);
  }, []);

  return {
    images,
    loading,
    error,
    uploadImage,
    uploadImages,
    deleteImage,
    deleteImages,
    refresh,
    copyImageLink,
    uploadProgress,
  };
}

export default useGallery;
