'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { GalleryImage, ImageSource } from '@/types/gallery';
import {
  getDecryptedToken,
  getAdminConfig,
  formatFileSize,
  generateImageFileName,
  copyToClipboard,
} from '@/utils/adminUtils';
import {
  validateImageFile,
  compressImage,
  blobToBase64,
  getImageDimensions,
} from '@/utils/imageUtils';
import {
  getImagesFromRepo,
  uploadImageToGitHub,
  deleteImageFromGitHub,
  getImageDownloadUrl,
  getRepositoryInfo,
  handleGitHubError,
  GitHubConfig,
} from '@/services/githubApi';

/**
 * 图床配置接口
 */
export interface GalleryConfig {
  /** GitHub 仓库所有者 */
  owner: string;
  /** GitHub 仓库名称 */
  repo: string;
  /** GitHub 分支名称 */
  branch: string;
  /** 默认上传路径 */
  defaultPath: string;
}

/**
 * Hook 选项接口
 */
export interface UseGalleryOptions {
  /** 图片来源：本地或远程 */
  source: 'local' | 'remote';
  /** 初始路径（可选） */
  path?: string;
  /** 是否自动加载 */
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
  /** 上传图片 */
  uploadImage: (file: File, path?: string) => Promise<boolean>;
  /** 批量上传图片 */
  uploadImages: (files: File[], path?: string) => Promise<boolean>;
  /** 删除图片 */
  deleteImage: (path: string, sha?: string) => Promise<boolean>;
  /** 批量删除图片 */
  deleteImages: (images: Array<{ path: string; sha?: string }>) => Promise<boolean>;
  /** 刷新图片列表 */
  refresh: () => void;
  /** 复制图片链接 */
  copyImageLink: (image: GalleryImage) => Promise<boolean>;
  /** 上传进度列表 */
  uploadProgress: UploadProgress[];
  /** 是否已配置 */
  isConfigured: boolean;
  /** 图床配置 */
  config: GalleryConfig | null;
  /** 存储统计 */
  storageStats: {
    totalImages: number;
    totalSize: string;
    localCount: number;
    remoteCount: number;
  };
}

/**
 * 默认图床配置
 */
const DEFAULT_GALLERY_CONFIG: GalleryConfig = {
  owner: 'Eiheir',
  repo: 'Luo_Tianyi_Image',
  branch: 'main',
  defaultPath: 'LTYpicture',
};

/**
 * 图床管理 Hook
 * 用于管理本地和远程图床的图片资源
 * 
 * @param options - Hook 选项
 * @returns 图床管理功能和状态
 * 
 * @example
 * ```tsx
 * const { images, loading, uploadImage, deleteImage, refresh } = useGallery({
 *   source: 'remote',
 *   autoLoad: true,
 * });
 * ```
 */
export function useGallery(options: UseGalleryOptions): UseGalleryReturn {
  const { source, path = '', autoLoad = true } = options;

  // 状态管理
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [config, setConfig] = useState<GalleryConfig | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  /**
   * 初始化配置
   * 从本地存储加载图床配置
   */
  useEffect(() => {
    const loadConfig = () => {
      try {
        // 尝试从本地存储获取配置
        const adminConfig = getAdminConfig();
        
        if (adminConfig && adminConfig.imageRepo) {
          // 解析 imageRepo 格式：owner/repo
          const [owner, repo] = adminConfig.imageRepo.split('/');
          setConfig({
            owner: owner || DEFAULT_GALLERY_CONFIG.owner,
            repo: repo || DEFAULT_GALLERY_CONFIG.repo,
            branch: adminConfig.githubBranch || DEFAULT_GALLERY_CONFIG.branch,
            defaultPath: DEFAULT_GALLERY_CONFIG.defaultPath,
          });
        } else {
          // 使用默认配置
          setConfig(DEFAULT_GALLERY_CONFIG);
        }
        
        // 检查是否已配置 Token
        const token = getDecryptedToken();
        setIsConfigured(!!token);
      } catch (err) {
        console.error('加载图床配置失败:', err);
        setConfig(DEFAULT_GALLERY_CONFIG);
        setIsConfigured(false);
      }
    };

    loadConfig();
  }, []);

  /**
   * 获取 GitHub 配置
   */
  const getGitHubConfig = useCallback((): GitHubConfig | null => {
    const token = getDecryptedToken();
    if (!token || !config) {
      return null;
    }

    return {
      owner: config.owner,
      repo: config.repo,
      branch: config.branch,
      token,
    };
  }, [config]);

  /**
   * 加载图片列表
   */
  const loadImages = useCallback(async () => {
    if (!autoLoad) return;

    setLoading(true);
    setError(null);

    try {
      if (source === 'remote') {
        // 加载远程图片
        const githubConfig = getGitHubConfig();
        
        if (!githubConfig) {
          // 如果没有配置 Token，使用公开 API 获取图片列表
          const imagesData = await getImagesFromRepo({
            owner: config?.owner || DEFAULT_GALLERY_CONFIG.owner,
            repo: config?.repo || DEFAULT_GALLERY_CONFIG.repo,
            branch: config?.branch || DEFAULT_GALLERY_CONFIG.branch,
            token: '', // 公开仓库不需要 Token
          }, path);

          const galleryImages: GalleryImage[] = imagesData.map((item: any) => ({
            id: item.sha || item.path,
            src: getImageDownloadUrl({
              owner: config?.owner || DEFAULT_GALLERY_CONFIG.owner,
              repo: config?.repo || DEFAULT_GALLERY_CONFIG.repo,
              branch: config?.branch || DEFAULT_GALLERY_CONFIG.branch,
              token: '',
            }, item.path),
            alt: item.name,
            source: ImageSource.Remote,
            category: path.split('/')[0] || '默认',
            createdAt: new Date().toISOString(),
          }));

          setImages(galleryImages);
        } else {
          // 使用认证 API 获取图片列表
          const imagesData = await getImagesFromRepo(githubConfig, path);

          const galleryImages: GalleryImage[] = imagesData.map((item: any) => ({
            id: item.sha || item.path,
            src: getImageDownloadUrl(githubConfig, item.path),
            alt: item.name,
            source: ImageSource.Remote,
            category: path.split('/')[0] || '默认',
            createdAt: new Date().toISOString(),
          }));

          setImages(galleryImages);
        }
      } else {
        // 本地图片通过 API 获取
        try {
          const response = await fetch('/api/gallery/local');
          if (response.ok) {
            const data = await response.json();
            setImages(data.images || []);
          } else {
            setImages([]);
          }
        } catch {
          // 如果 API 不存在，使用空数组
          setImages([]);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载图片失败';
      setError(handleGitHubError(err) || errorMessage);
      console.error('加载图片失败:', err);
    } finally {
      setLoading(false);
    }
  }, [source, path, autoLoad, config, getGitHubConfig]);

  /**
   * 组件挂载时自动加载
   */
  useEffect(() => {
    if (autoLoad && config) {
      loadImages();
    }
  }, [autoLoad, config, loadImages]);

  /**
   * 上传单个图片
   */
  const uploadImage = useCallback(async (file: File, uploadPath?: string): Promise<boolean> => {
    if (source === 'local') {
      setError('本地图床暂不支持上传，请使用远程图床');
      return false;
    }

    const githubConfig = getGitHubConfig();
    if (!githubConfig) {
      setError('请先配置 GitHub Token');
      return false;
    }

    // 验证文件
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || '文件验证失败');
      return false;
    }

    // 添加上传进度
    const progressId = `${file.name}-${Date.now()}`;
    setUploadProgress(prev => [...prev, {
      fileName: file.name,
      progress: 0,
      status: 'uploading',
    }]);

    try {
      // 压缩图片
      const compressedBlob = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.85,
        format: 'image/webp',
      });

      // 更新进度
      setUploadProgress(prev => prev.map(p => 
        p.fileName === file.name ? { ...p, progress: 50 } : p
      ));

      // 生成文件名
      const fileName = generateImageFileName(file.name);
      const targetPath = uploadPath || config?.defaultPath || '';
      const fullPath = targetPath ? `${targetPath}/${fileName}` : fileName;

      // 上传到 GitHub
      const result = await uploadImageToGitHub(githubConfig, file, fullPath);

      // 更新进度为成功
      setUploadProgress(prev => prev.map(p => 
        p.fileName === file.name ? { ...p, progress: 100, status: 'success' } : p
      ));

      // 添加到图片列表
      const newImage: GalleryImage = {
        id: result.sha,
        src: result.url,
        alt: fileName,
        source: ImageSource.Remote,
        category: targetPath.split('/')[0] || '默认',
        createdAt: new Date().toISOString(),
      };

      setImages(prev => [newImage, ...prev]);

      // 3秒后移除进度项
      setTimeout(() => {
        setUploadProgress(prev => prev.filter(p => p.fileName !== file.name));
      }, 3000);

      return true;
    } catch (err) {
      const errorMessage = handleGitHubError(err) || '上传失败';
      setError(errorMessage);
      
      // 更新进度为失败
      setUploadProgress(prev => prev.map(p => 
        p.fileName === file.name ? { ...p, status: 'error', error: errorMessage } : p
      ));

      return false;
    }
  }, [source, config, getGitHubConfig]);

  /**
   * 批量上传图片
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
   * 删除单个图片
   */
  const deleteImage = useCallback(async (imagePath: string, sha?: string): Promise<boolean> => {
    if (source === 'local') {
      setError('本地图床暂不支持删除，请手动删除文件');
      return false;
    }

    const githubConfig = getGitHubConfig();
    if (!githubConfig) {
      setError('请先配置 GitHub Token');
      return false;
    }

    try {
      await deleteImageFromGitHub(githubConfig, imagePath, sha);
      
      // 从列表中移除
      setImages(prev => prev.filter(img => {
        const imgPath = img.src.split('/').slice(-2).join('/');
        return imgPath !== imagePath;
      }));

      return true;
    } catch (err) {
      setError(handleGitHubError(err) || '删除失败');
      return false;
    }
  }, [source, getGitHubConfig]);

  /**
   * 批量删除图片
   */
  const deleteImages = useCallback(async (imageList: Array<{ path: string; sha?: string }>): Promise<boolean> => {
    let successCount = 0;
    
    for (const image of imageList) {
      const success = await deleteImage(image.path, image.sha);
      if (success) successCount++;
    }

    return successCount === imageList.length;
  }, [deleteImage]);

  /**
   * 刷新图片列表
   */
  const refresh = useCallback(() => {
    loadImages();
  }, [loadImages]);

  /**
   * 复制图片链接
   */
  const copyImageLink = useCallback(async (image: GalleryImage): Promise<boolean> => {
    const link = image.src;
    return copyToClipboard(link);
  }, []);

  /**
   * 计算存储统计
   */
  const storageStats = useMemo(() => {
    const localImages = images.filter(img => img.source === ImageSource.Local);
    const remoteImages = images.filter(img => img.source === ImageSource.Remote);

    return {
      totalImages: images.length,
      totalSize: formatFileSize(images.length * 500 * 1024), // 估算大小
      localCount: localImages.length,
      remoteCount: remoteImages.length,
    };
  }, [images]);

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
    isConfigured,
    config,
    storageStats,
  };
}

/**
 * 图床设置 Hook
 * 用于管理图床配置和连接状态
 */
export function useGallerySettings() {
  const [token, setToken] = useState<string>('');
  const [config, setConfig] = useState<GalleryConfig>(DEFAULT_GALLERY_CONFIG);
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [repoInfo, setRepoInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载已保存的配置
   */
  useEffect(() => {
    const savedToken = getDecryptedToken();
    if (savedToken) {
      setToken(savedToken);
    }

    const adminConfig = getAdminConfig();
    if (adminConfig) {
      setConfig(prev => ({
        ...prev,
        owner: adminConfig.githubOwner || prev.owner,
        repo: adminConfig.githubRepo?.split('/')[1] || prev.repo,
        branch: adminConfig.githubBranch || prev.branch,
      }));
    }
  }, []);

  /**
   * 测试 GitHub 连接
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!token) {
      setError('请输入 GitHub Token');
      return false;
    }

    setIsTesting(true);
    setError(null);

    try {
      const githubConfig: GitHubConfig = {
        owner: config.owner,
        repo: config.repo,
        branch: config.branch,
        token,
      };

      const info = await getRepositoryInfo(githubConfig);
      setRepoInfo(info);
      setIsConnected(true);
      return true;
    } catch (err) {
      setError(handleGitHubError(err) || '连接失败');
      setIsConnected(false);
      return false;
    } finally {
      setIsTesting(false);
    }
  }, [token, config]);

  /**
   * 保存配置
   */
  const saveConfig = useCallback(async (): Promise<boolean> => {
    // 先测试连接
    const success = await testConnection();
    if (!success) return false;

    // 保存 Token
    const { encryptAndStoreToken, saveAdminConfig } = await import('@/utils/adminUtils');
    encryptAndStoreToken(token);
    
    saveAdminConfig({
      githubOwner: config.owner,
      githubRepo: `${config.owner}/${config.repo}`,
      githubBranch: config.branch,
      imageRepo: `${config.owner}/${config.repo}`,
      theme: 'system',
    });

    return true;
  }, [token, config, testConnection]);

  /**
   * 清除配置
   */
  const clearConfig = useCallback(() => {
    setToken('');
    setConfig(DEFAULT_GALLERY_CONFIG);
    setIsConnected(false);
    setRepoInfo(null);
    
    const { clearStoredToken } = require('@/utils/adminUtils');
    clearStoredToken();
  }, []);

  return {
    token,
    setToken,
    config,
    setConfig,
    isConnected,
    isTesting,
    repoInfo,
    error,
    testConnection,
    saveConfig,
    clearConfig,
  };
}

export default useGallery;
