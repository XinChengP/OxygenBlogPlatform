// 画廊图片类型定义

// 图片来源类型
export enum ImageSource {
  Local = 'local',
  Remote = 'remote'
}

// 图片信息类型
export interface GalleryImage {
  id: string; // 唯一标识符
  src: string; // 主图片URL（jsDelivr加速）
  fallbackSrc?: string; // 备用图片URL（原始GitHub URL，用于保底）
  thumbnail?: string; // 缩略图URL（可选）
  alt: string; // 图片描述
  source: ImageSource; // 图片来源
  category: string; // 分类名称
  width?: number; // 图片宽度（可选，用于瀑布流布局）
  height?: number; // 图片高度（可选，用于瀑布流布局）
  createdAt?: string; // 创建时间（可选）
  updatedAt?: string; // 更新时间（可选）
}

// 图片分类类型
export interface ImageCategory {
  name: string; // 分类名称
  slug: string; // 分类标识
  count: number; // 图片数量
  source: ImageSource; // 分类来源
}

// 图片加载状态类型
export type ImageLoadStatus = 'loading' | 'loaded' | 'failed';

// 画廊状态类型
export interface GalleryState {
  images: GalleryImage[]; // 所有图片
  categories: ImageCategory[]; // 所有分类
  selectedCategory: string | null; // 当前选中分类
  selectedImage: GalleryImage | null; // 当前选中图片
  isPreviewOpen: boolean; // 预览模态框是否打开
  isLoading: boolean; // 是否正在加载图片
  error: string | null; // 错误信息
}

// 图片预览状态类型
export interface ImagePreviewState {
  currentIndex: number; // 当前预览图片索引
  images: GalleryImage[]; // 预览图片列表
  isOpen: boolean; // 预览是否打开
}

// GitHub图床配置类型
export interface GithubImageConfig {
  owner: string;
  repo: string;
  branch: string;
  path: string;
}
