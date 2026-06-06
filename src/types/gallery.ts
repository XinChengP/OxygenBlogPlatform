// 画廊图片类型定义

// 图片来源类型
export enum ImageSource {
  Local = 'local',
  Remote = 'remote'
}

// 通用预览图片类型（用于博客文章等非画廊场景）
export interface PreviewImage {
  id: string; // 唯一标识符
  src: string; // 图片URL
  alt: string; // 图片描述
  category?: string; // 分类名称（可选）
  thumbnail?: string; // 缩略图URL（可选）
}

// 图片信息类型
export interface GalleryImage extends PreviewImage {
  fallbackSrc?: string; // 备用图片URL（原始GitHub URL，用于保底）
  source: ImageSource; // 图片来源
  category: string; // 主分类名称（用于显示在标签页上）
  subCategory?: string; // 子分类名称（可选，用于更细粒度的分类）
  width?: number; // 图片宽度（可选，用于瀑布流布局）
  height?: number; // 图片高度（可选，用于瀑布流布局）
  createdAt: string; // 创建时间
  updatedAt?: string; // 更新时间（可选）
  size?: number; // 文件大小（字节，可选）
}

// 树形分类结构
export interface ImageCategoryTree {
  name: string;           // 分类名称
  slug: string;           // 分类标识
  count: number;          // 图片数量（包含子分类）
  source: ImageSource;    // 分类来源
  subCategories?: ImageCategoryTree[];  // 子分类列表
  parentCategory?: string; // 父分类名称（可选）
  description?: string;    // 分类描述
  icon?: string;           // 分类图标
  sortOrder?: number;      // 排序顺序
}

// 图片分类类型
export interface ImageCategory {
  name: string; // 分类名称
  slug: string; // 分类标识
  count: number; // 图片数量
  source: ImageSource; // 分类来源
  // 新增字段
  subCategories?: ImageCategoryTree[];
  parentCategory?: string;
  description?: string;
  icon?: string;
  sortOrder?: number;
}

// 图片加载状态类型
export type ImageLoadStatus = 'loading' | 'loaded' | 'failed';

// 画廊状态类型
export interface GalleryState {
  images: GalleryImage[]; // 所有图片
  categories: ImageCategoryTree[]; // 所有分类（树形结构）
  selectedCategory: string | null; // 当前选中分类
  selectedSubCategory: string | null; // 当前选中子分类
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
