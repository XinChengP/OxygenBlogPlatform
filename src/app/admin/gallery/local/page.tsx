'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import {
  Upload,
  Search,
  Grid,
  List,
  Image as ImageIcon,
  Trash2,
  Copy,
  Check,
  FolderOpen,
  FileImage,
  Calendar,
  HardDrive,
  X,
  ChevronRight,
  ChevronLeft,
  Home,
  RefreshCw,
  Eye,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useGallery } from '@/hooks/useGallery';
import { formatFileSize, formatDateTime, copyToClipboard } from '@/utils/adminUtils';
import { GalleryImage, ImageSource } from '@/types/gallery';
import { AdminConfirm, toast } from '@/components/admin';

/**
 * 目录项接口
 */
interface DirectoryItem {
  name: string;
  path: string;
  type: 'directory' | 'file';
  size?: number;
  modifiedTime?: string;
}

/**
 * 图片数据接口（扩展自 GalleryImage）
 */
interface LocalImage extends GalleryImage {
  size: number;
  /** 图片宽度，本地扫描未读取时为 undefined */
  width?: number;
  /** 图片高度，本地扫描未读取时为 undefined */
  height?: number;
  format: string;
  modifiedTime: string;
}

/**
 * 确认弹窗已统一使用 components/admin/AdminConfirm，
 * 不再在页面内重复实现遮罩、动画与按钮样式。
 */

/**
 * 本地图床管理页面
 * 支持目录浏览、图片预览、删除和批量操作
 */
export default function LocalGalleryPage() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
  const [previewImage, setPreviewImage] = useState<LocalImage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('');
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'warning' | 'info';
  } | null>(null);

  // 使用图床 Hook
  const {
    images,
    loading,
    error,
    refresh,
    copyImageLink: copyLink,
    deleteImage,
    uploadImages,
    uploadProgress,
  } = useGallery({ autoLoad: true });

  // 上传相关状态
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  /**
   * 组件挂载后设置状态
   */
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * 解析图片数据为本地图片格式
   */
  const localImages: LocalImage[] = useMemo(() => {
    return images.map((img) => ({
      ...img,
      size: img.size || 0,
      /*
        本地扫描目前没有读取真实宽高，缺失时保持 undefined，
        由界面显示「未知」。原实现写死 1920×1080，会把假尺寸当成真实信息展示。
      */
      width: img.width,
      height: img.height,
      format: img.src.split('.').pop()?.toUpperCase() || 'PNG',
      // 没有创建时间时显示「-」，不要在每次渲染时伪造当前时间
      modifiedTime: img.updatedAt || img.createdAt || '',
    }));
  }, [images]);

  /**
   * 加载目录数据
   * 从图片数据中动态提取目录，支持递归子目录
   */
  useEffect(() => {
    // 从图片数据中提取目录（支持多级目录结构）
    const dirMap = new Map<string, { count: number; hasSubdirs: boolean }>();
    
    images.forEach(img => {
      const srcPath = img.src.replace(/^\//, ''); // 移除开头的斜杠
      const pathParts = srcPath.split('/');
      
      // 逐级提取目录
      for (let i = 0; i < pathParts.length - 1; i++) {
        const dirPath = pathParts.slice(0, i + 1).join('/');
        const existing = dirMap.get(dirPath) || { count: 0, hasSubdirs: false };
        
        if (i === pathParts.length - 2) {
          // 最后一节是文件名，当前目录包含图片
          existing.count++;
        } else {
          // 还有子目录
          existing.hasSubdirs = true;
        }
        
        dirMap.set(dirPath, existing);
      }
    });
    
    // 转换为目录项数组，排除没有图片的目录
    const dirs: DirectoryItem[] = [];
    dirMap.forEach((info, path) => {
      if (info.count > 0) {
        dirs.push({
          name: path.split('/').pop() || path, // 只显示最后一级目录名
          path: path,
          type: 'directory',
        });
      }
    });
    
    // 按路径深度和名称排序（浅层优先，同层按名称排序）
    dirs.sort((a, b) => {
      const depthA = a.path.split('/').length;
      const depthB = b.path.split('/').length;
      if (depthA !== depthB) return depthA - depthB;
      return a.name.localeCompare(b.name);
    });
    
    setDirectories(dirs);
  }, [images]);

  /**
   * 根据当前路径过滤图片
   * 支持多级目录结构过滤
   */
  const filteredImages = useMemo(() => {
    let filtered = localImages;

    // 按路径过滤（支持多级目录）
    if (currentPath) {
      filtered = filtered.filter(img => {
        // 移除开头的斜杠
        const srcPath = img.src.replace(/^\//, '');
        // 检查路径是否以当前路径开头
        return srcPath.startsWith(currentPath + '/') || srcPath === currentPath;
      });
    }

    // 按搜索词过滤
    if (searchQuery) {
      filtered = filtered.filter(img =>
        img.alt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        img.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [localImages, currentPath, searchQuery]);

  const isDark = resolvedTheme === 'dark';

  /**
   * 切换图片选择状态
   */
  const toggleImageSelection = (id: string) => {
    setSelectedImages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  /**
   * 全选/取消全选
   */
  const toggleSelectAll = () => {
    if (selectedImages.size === filteredImages.length) {
      setSelectedImages(new Set());
    } else {
      setSelectedImages(new Set(filteredImages.map(img => img.id)));
    }
  };

  /**
   * 复制图片链接
   */
  const copyImageLink = async (image: LocalImage) => {
    const success = await copyToClipboard(image.src);
    if (success) {
      setCopiedId(image.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  /**
   * 删除单个图片
   */
  const handleDelete = (image: LocalImage) => {
    setConfirmDialog({
      isOpen: true,
      title: '删除图片',
      message: `确定要删除图片 "${image.alt}" 吗？此操作不可恢复。`,
      variant: 'danger',
      onConfirm: async () => {
        const success = await deleteImage(image.src);
        if (success) {
          toast.success('图片删除成功');
        } else {
          // 原实现失败时没有任何提示，用户会误以为删除成功
          toast.error('图片删除失败，请稍后重试');
        }
        setConfirmDialog(null);
      },
    });
  };

  /**
   * 批量删除
   */
  const handleBatchDelete = () => {
    setConfirmDialog({
      isOpen: true,
      title: '批量删除',
      message: `确定要删除选中的 ${selectedImages.size} 张图片吗？此操作不可恢复。`,
      variant: 'danger',
      onConfirm: async () => {
        let successCount = 0;
        for (const imageId of selectedImages) {
          const image = localImages.find(img => img.id === imageId);
          if (image) {
            const success = await deleteImage(image.src);
            if (success) successCount++;
          }
        }
        if (successCount === selectedImages.size) {
          toast.success(`成功删除 ${successCount} 张图片`);
        } else {
          toast.error(`已删除 ${successCount} 张，${selectedImages.size - successCount} 张删除失败`);
        }
        setSelectedImages(new Set());
        setConfirmDialog(null);
      },
    });
  };

  /**
   * 导航到目录
   */
  const navigateToDirectory = (path: string) => {
    setCurrentPath(path);
    setSelectedImages(new Set());
  };

  /**
   * 返回上级目录
   */
  const navigateUp = () => {
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/'));
  };

  /**
   * 处理文件选择
   * 当用户通过点击选择文件时触发
   */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...imageFiles]);
      }
    }
    // 重置 input 值，允许重复选择相同文件
    e.target.value = '';
  };

  /**
   * 处理文件夹选择
   * 当用户选择整个文件夹时触发，递归收集其中的图片文件
   */
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...imageFiles]);
        toast.success(`已选择文件夹中的 ${imageFiles.length} 张图片`);
      } else {
        toast.error('所选文件夹中没有图片文件');
      }
    }
    // 重置 input 值
    e.target.value = '';
  };

  /**
   * 处理拖拽进入
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  /**
   * 处理拖拽离开
   */
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  /**
   * 处理文件拖放
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      if (imageFiles.length > 0) {
        setSelectedFiles(prev => [...prev, ...imageFiles]);
      } else {
        toast.error('请选择图片文件');
      }
    }
  };

  /**
   * 移除已选文件
   */
  const removeSelectedFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  /**
   * 执行上传
   * 将选中的文件上传到当前目录
   */
  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('请先选择要上传的图片');
      return;
    }

    setIsUploading(true);
    try {
      // 使用当前路径作为上传目标目录
      const targetPath = currentPath || 'uploads';
      const success = await uploadImages(selectedFiles, targetPath);

      if (success) {
        toast.success(`成功上传 ${selectedFiles.length} 张图片`);
        setSelectedFiles([]);
        setShowUploadModal(false);
        refresh();
      } else {
        toast.error('部分图片上传失败，请查看进度详情');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '上传失败');
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * 关闭上传弹窗时重置状态
   */
  const closeUploadModal = () => {
    setShowUploadModal(false);
    setSelectedFiles([]);
    setDragOver(false);
  };

  // 检测是否在 Electron 环境中运行
  const [isElectron, setIsElectron] = useState(false);

  /**
   * 组件挂载后检测运行环境
   * useEffect 确保在客户端挂载后执行，避免 SSR 误判
   */
  useEffect(() => {
    const hasElectronAPI = typeof window !== 'undefined' && !!(window as any).electronAPI;
    setIsElectron(hasElectronAPI);
  }, []);

  /**
   * 打开当前目录对应的本地文件夹
   * 在 Electron 环境下调用主进程打开文件资源管理器
   * 在浏览器环境下复制路径到剪贴板
   */
  const handleOpenLocalFolder = useCallback(() => {
    const folderPath = currentPath || '';
    if (isElectron) {
      // Electron 环境下通过 IPC 打开本地文件夹
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.openLocalFolder) {
        electronAPI.openLocalFolder(folderPath);
        toast.success('正在打开文件夹...');
      } else {
        toast.error('Electron API 不可用');
      }
    } else {
      // 浏览器环境下复制文件夹路径到剪贴板
      const fullPath = folderPath ? `public/${folderPath}` : 'public';
      copyToClipboard(fullPath)
        .then((success) => {
          if (success) {
            toast.success(`路径已复制: ${fullPath}`);
          } else {
            // 如果自动复制失败，使用提示框让用户手动复制
            prompt('请手动复制以下路径:', fullPath);
          }
        })
        .catch(() => {
          prompt('请手动复制以下路径:', fullPath);
        });
    }
  }, [isElectron, currentPath]);

  /**
   * 获取面包屑路径
   */
  const breadcrumbs = useMemo(() => {
    if (!currentPath) return [{ name: 'public', path: '' }];
    const parts = currentPath.split('/');
    const result = [{ name: 'public', path: '' }];
    let accPath = '';
    parts.forEach((part, index) => {
      accPath = accPath ? `${accPath}/${part}` : part;
      result.push({ name: part, path: accPath });
    });
    return result;
  }, [currentPath]);

  // 未挂载时显示加载状态
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#66ccff]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 加载或删除失败的提示：原实现只把 error 存在 state 中，界面完全看不到 */}
      {error && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
            isDark
              ? 'bg-red-900/20 border border-red-800/40 text-red-400'
              : 'bg-red-50 border border-red-200 text-red-600'
          }`}
        >
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {/* 页面标题和操作按钮 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            本地图床
          </h1>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            管理存储在本地服务器的图片资源
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/admin/gallery"
            className={`inline-flex items-center px-4 py-2 rounded-lg border transition-colors ${
              isDark
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            返回
          </Link>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors shadow-md"
          >
            <Upload className="w-5 h-5 mr-2" />
            上传图片
          </button>
        </div>
      </div>

      {/* 目录导航面包屑 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`rounded-xl p-4 backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/50 border border-gray-700/50'
            : 'bg-white/70 border border-gray-200/50'
        } shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sm">
            <Home className={`w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.path}>
                {index > 0 && (
                  <ChevronRight className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                )}
                <button
                  onClick={() => navigateToDirectory(crumb.path)}
                  className={`hover:text-[#66ccff] transition-colors ${
                    index === breadcrumbs.length - 1
                      ? 'text-[#66ccff] font-medium'
                      : isDark
                      ? 'text-gray-300'
                      : 'text-gray-700'
                  }`}
                >
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
          {/* 打开本地文件夹按钮 */}
          <button
            onClick={handleOpenLocalFolder}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              isDark
                ? 'bg-gray-700/50 text-gray-300 hover:bg-gray-700 hover:text-[#66ccff]'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-[#66ccff]'
            }`}
            title={isElectron ? '在文件资源管理器中打开' : '复制路径到剪贴板'}
          >
            <ExternalLink className="w-4 h-4" />
            <span>{isElectron ? '打开文件夹' : '复制路径'}</span>
          </button>
        </div>
      </motion.div>

      {/* 工具栏 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={`rounded-xl p-4 backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/50 border border-gray-700/50'
            : 'bg-white/70 border border-gray-200/50'
        } shadow-lg`}
      >
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* 搜索框 */}
          <div className="relative flex-1 w-full">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="搜索图片名称或分类..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                isDark
                  ? 'bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-[#66ccff]'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-[#66ccff]'
              } focus:outline-none focus:ring-2 focus:ring-[#66ccff]/20 transition-all`}
            />
          </div>

          {/* 视图切换和批量操作 */}
          <div className="flex items-center space-x-2">
            {/* 刷新按钮 */}
            <button
              onClick={refresh}
              disabled={loading}
              className={`p-2 rounded-lg transition-colors ${
                isDark
                  ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
              } disabled:opacity-50`}
              title="刷新"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* 批量操作按钮 */}
            {selectedImages.size > 0 && (
              <button
                onClick={handleBatchDelete}
                className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
              >
                删除选中 ({selectedImages.size})
              </button>
            )}

            {/* 视图切换 */}
            <div className={`flex rounded-lg border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-l-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-[#66ccff] text-white'
                    : isDark
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-r-lg transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#66ccff] text-white'
                    : isDark
                    ? 'text-gray-400 hover:text-white'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 目录列表（仅在根目录显示） */}
      {!currentPath && directories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={`rounded-xl p-4 backdrop-blur-md ${
            isDark
              ? 'bg-gray-800/50 border border-gray-700/50'
              : 'bg-white/70 border border-gray-200/50'
          } shadow-lg`}
        >
          <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            目录列表
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {directories.map((dir) => (
              <button
                key={dir.path}
                onClick={() => navigateToDirectory(dir.path)}
                className={`flex items-center space-x-2 p-3 rounded-lg transition-colors ${
                  isDark
                    ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                }`}
              >
                <FolderOpen className="w-5 h-5 text-[#66ccff]" />
                <span className="text-sm truncate">{dir.name}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* 图片列表 */}
      {viewMode === 'grid' ? (
        // 网格视图
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <AnimatePresence>
            {filteredImages.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2, delay: Math.min(index, 10) * 0.03 }}
                className={`relative group rounded-xl overflow-hidden cursor-pointer ${
                  isDark
                    ? 'bg-gray-800/50 border border-gray-700/50'
                    : 'bg-white/70 border border-gray-200/50'
                } shadow-lg ${selectedImages.has(image.id) ? 'ring-2 ring-[#66ccff]' : ''}`}
                onClick={() => setPreviewImage(image)}
              >
                {/* 图片 */}
                <div className="aspect-square">
                  <img
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    loading="lazy"
                  />
                </div>

                {/* 选择框 */}
                <div
                  className="absolute top-2 left-2 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleImageSelection(image.id);
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.id)}
                    onChange={() => {}}
                    className="w-5 h-5 rounded border-gray-300 text-[#66ccff] focus:ring-[#66ccff]/20 cursor-pointer"
                  />
                </div>

                {/* 操作按钮 */}
                <div className="absolute top-2 right-2 z-10 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyImageLink(image);
                    }}
                    className={`p-1.5 rounded-lg ${
                      copiedId === image.id
                        ? 'bg-green-500 text-white'
                        : isDark
                        ? 'bg-gray-700/80 text-white hover:bg-gray-600'
                        : 'bg-white/80 text-gray-700 hover:bg-gray-100'
                    }`}
                    title="复制链接"
                  >
                    {copiedId === image.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image);
                    }}
                    className={`p-1.5 rounded-lg ${
                      isDark
                        ? 'bg-gray-700/80 text-white hover:bg-red-500'
                        : 'bg-white/80 text-gray-700 hover:bg-red-500 hover:text-white'
                    }`}
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* 图片信息 */}
                <div className={`p-2 ${isDark ? 'bg-gray-800/80' : 'bg-white/80'}`}>
                  <p className={`text-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    {image.alt}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {formatFileSize(image.size)}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        // 列表视图
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={`rounded-xl overflow-hidden backdrop-blur-md ${
            isDark
              ? 'bg-gray-800/50 border border-gray-700/50'
              : 'bg-white/70 border border-gray-200/50'
          } shadow-lg`}
        >
          {/* 表头 */}
          <div className={`flex items-center px-4 py-3 text-sm font-medium ${
            isDark ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-50 text-gray-500'
          } border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            {/* 复选框列 */}
            <div className="w-10 flex-shrink-0 flex items-center">
              <input
                type="checkbox"
                checked={selectedImages.size === filteredImages.length && filteredImages.length > 0}
                onChange={toggleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-[#66ccff] focus:ring-[#66ccff]/20"
              />
            </div>
            {/* 文件名列 */}
            <div className="flex-1 min-w-0">文件名</div>
            {/* 分类列 */}
            <div className="w-24 hidden sm:block flex-shrink-0">分类</div>
            {/* 大小列 */}
            <div className="w-20 hidden md:block flex-shrink-0">大小</div>
            {/* 修改时间列 */}
            <div className="w-32 hidden lg:block flex-shrink-0">修改时间</div>
            {/* 操作列 */}
            <div className="w-20 text-right flex-shrink-0">操作</div>
          </div>

          {/* 列表内容 */}
          <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
            {filteredImages.map((image, index) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index, 10) * 0.03 }}
                className={`flex items-center px-4 py-3 hover:${
                  isDark ? 'bg-gray-700/30' : 'bg-gray-50'
                } transition-colors cursor-pointer`}
                onClick={() => setPreviewImage(image)}
              >
                {/* 复选框列 */}
                <div className="w-10 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={selectedImages.has(image.id)}
                    onChange={() => toggleImageSelection(image.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 rounded border-gray-300 text-[#66ccff] focus:ring-[#66ccff]/20"
                  />
                </div>
                {/* 文件名列 */}
                <div className="flex-1 min-w-0 flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ${
                    isDark ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <img src={image.src} alt={image.alt} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <span className={`truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {image.alt}
                  </span>
                </div>
                {/* 分类列 */}
                <div className="w-24 hidden sm:block flex-shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {image.category}
                  </span>
                </div>
                {/* 大小列 */}
                <div className={`w-20 hidden md:block flex-shrink-0 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {formatFileSize(image.size)}
                </div>
                {/* 修改时间列 */}
                <div className={`w-32 hidden lg:block flex-shrink-0 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {image.modifiedTime ? formatDateTime(image.modifiedTime) : '-'}
                </div>
                {/* 操作列 */}
                <div className="w-20 flex-shrink-0 flex items-center justify-end space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      copyImageLink(image);
                    }}
                    className={`p-1 rounded-lg ${
                      isDark
                        ? 'text-gray-400 hover:text-[#66ccff] hover:bg-gray-700'
                        : 'text-gray-500 hover:text-[#66ccff] hover:bg-gray-100'
                    } transition-colors`}
                    title="复制链接"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image);
                    }}
                    className={`p-1 rounded-lg ${
                      isDark
                        ? 'text-gray-400 hover:text-red-400 hover:bg-gray-700'
                        : 'text-gray-500 hover:text-red-500 hover:bg-gray-100'
                    } transition-colors`}
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 空状态 */}
      {filteredImages.length === 0 && !loading && (
        <div className={`rounded-xl p-12 text-center backdrop-blur-md ${
          isDark
            ? 'bg-gray-800/50 border border-gray-700/50'
            : 'bg-white/70 border border-gray-200/50'
        } shadow-lg`}>
          <div className="text-6xl mb-4">🖼️</div>
          <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            暂无图片
          </h3>
          <p className={`mt-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {searchQuery ? '没有找到符合条件的图片' : '开始上传你的第一张图片吧'}
          </p>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className={`aspect-square rounded-xl animate-pulse ${
                isDark ? 'bg-gray-700' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      )}

      {/* 图片预览弹窗 */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl max-h-[90vh] mx-4"
            >
              {/* 关闭按钮 */}
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 p-2 text-white hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>

              {/* 图片 */}
              <img
                src={previewImage.src}
                alt={previewImage.alt}
                className="max-w-full max-h-[80vh] rounded-lg"
              />

              {/* 图片信息 */}
              <div className={`mt-4 p-4 rounded-lg ${
                isDark ? 'bg-gray-800/90' : 'bg-white/90'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {previewImage.alt}
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {previewImage.width && previewImage.height
                        ? `${previewImage.width} × ${previewImage.height}`
                        : '尺寸未知'} · {previewImage.format} · {formatFileSize(previewImage.size)}
                    </p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      路径: {previewImage.src}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => copyImageLink(previewImage)}
                      className="px-3 py-2 bg-[#66ccff] text-white rounded-lg text-sm hover:bg-[#66ccff]/90"
                    >
                      复制链接
                    </button>
                    <button
                      onClick={() => {
                        setPreviewImage(null);
                        handleDelete(previewImage);
                      }}
                      className="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 上传弹窗 */}
      <AnimatePresence>
        {showUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={closeUploadModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className={`mx-4 p-6 rounded-xl ${
                isDark ? 'bg-gray-800' : 'bg-white'
              } shadow-xl max-w-lg w-full max-h-[80vh] overflow-y-auto`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  上传图片
                </h3>
                <button
                  onClick={closeUploadModal}
                  className={`p-1 rounded-lg ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 上传区域 */}
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragOver
                    ? 'border-[#66ccff] bg-[#66ccff]/5'
                    : isDark
                    ? 'border-gray-600'
                    : 'border-gray-200'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className={`w-12 h-12 mx-auto mb-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                <p className={`mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  拖拽图片到此处，或点击选择
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  支持 JPG、PNG、GIF、WebP 格式，单张最大 10MB
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  id="file-upload"
                  onChange={handleFileSelect}
                />
                <input
                  type="file"
                  /* @ts-expect-error webkitdirectory 是浏览器非标准属性 */
                  webkitdirectory=""
                  directory=""
                  multiple
                  className="hidden"
                  id="folder-upload"
                  onChange={handleFolderSelect}
                />
                <div className="flex items-center justify-center space-x-3 mt-4">
                  <label
                    htmlFor="file-upload"
                    className="inline-block px-4 py-2 bg-[#66ccff] text-white rounded-lg cursor-pointer hover:bg-[#66ccff]/90 transition-colors"
                  >
                    选择图片
                  </label>
                  <label
                    htmlFor="folder-upload"
                    className={`inline-block px-4 py-2 rounded-lg cursor-pointer transition-colors border ${
                      isDark
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400'
                    }`}
                  >
                    选择文件夹
                  </label>
                </div>
              </div>

              {/* 已选文件列表 */}
              {selectedFiles.length > 0 && (
                <div className={`mt-4 rounded-lg border ${
                  isDark ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className={`px-3 py-2 text-sm font-medium border-b ${
                    isDark ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-700'
                  }`}>
                    已选择 {selectedFiles.length} 个文件
                  </div>
                  <div className="max-h-40 overflow-y-auto">
                    {selectedFiles.map((file, index) => {
                      const progress = uploadProgress.find(p => p.fileName === file.name);
                      return (
                        <div
                          key={`${file.name}-${index}`}
                          className={`flex items-center justify-between px-3 py-2 text-sm ${
                            index !== selectedFiles.length - 1 ? (isDark ? 'border-b border-gray-700' : 'border-b border-gray-200') : ''
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0 flex-1">
                            <FileImage className="w-4 h-4 flex-shrink-0 text-[#66ccff]" />
                            <span className={`truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                              {file.name}
                            </span>
                            <span className={`text-xs flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                              {formatFileSize(file.size)}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                            {/* 上传进度或状态 */}
                            {progress && (
                              <span className={`text-xs ${
                                progress.status === 'success' ? 'text-green-500' :
                                progress.status === 'error' ? 'text-red-500' :
                                'text-[#66ccff]'
                              }`}>
                                {progress.status === 'success' ? '成功' :
                                 progress.status === 'error' ? '失败' :
                                 `${progress.progress}%`}
                              </span>
                            )}
                            {/* 删除按钮 */}
                            {!isUploading && (
                              <button
                                onClick={() => removeSelectedFile(index)}
                                className={`p-1 rounded transition-colors ${
                                  isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                                }`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 上传进度条（整体） */}
              {isUploading && selectedFiles.length > 0 && (
                <div className="mt-4">
                  <div className={`w-full h-2 rounded-full overflow-hidden ${
                    isDark ? 'bg-gray-700' : 'bg-gray-200'
                  }`}>
                    <div
                      className="h-full bg-[#66ccff] transition-all duration-300 rounded-full"
                      style={{
                        width: `${Math.round(
                          uploadProgress
                            .filter(p => selectedFiles.some(f => f.name === p.fileName))
                            .reduce((sum, p) => sum + (p.status === 'success' ? 100 : p.progress), 0) /
                            selectedFiles.length
                        )}%`
                      }}
                    />
                  </div>
                  <p className={`text-xs mt-1 text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    正在上传...
                  </p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  onClick={closeUploadModal}
                  disabled={isUploading}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  取消
                </button>
                <button
                  onClick={handleUpload}
                  disabled={isUploading || selectedFiles.length === 0}
                  className="px-4 py-2 bg-[#66ccff] text-white rounded-lg hover:bg-[#66ccff]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isUploading && (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  )}
                  <span>{isUploading ? '上传中...' : '开始上传'}</span>
                </button>
              </div>

              {/* 提示信息 */}
              <div className={`mt-4 p-3 rounded-lg ${
                isDark ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <div className="flex items-start space-x-2">
                  <Info className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    文件将上传到当前目录：{currentPath || 'public/uploads'}。上传完成后会自动刷新图片列表。
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 确认弹窗 */}
      {confirmDialog && (
        <AdminConfirm
          open={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          type={confirmDialog.variant}
        />
      )}
    </div>
  );
}
