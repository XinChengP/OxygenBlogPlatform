'use client';

import { GalleryImage } from '../types/gallery';

/**
 * 客户端获取画廊图片的工具函数
 * 从本地存储或API获取画廊图片
 */

// 缓存键
const GALLERY_CACHE_KEY = 'gallery_images_cache';
const GALLERY_CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

/**
 * 获取缓存的画廊图片
 * @returns 缓存的图片数组或null
 */
export const getCachedGalleryImages = (): GalleryImage[] | null => {
  try {
    const cached = localStorage.getItem(GALLERY_CACHE_KEY);
    if (!cached) return null;

    const cacheData = JSON.parse(cached);
    const { images, timestamp } = cacheData;

    // 检查缓存是否过期
    if (Date.now() - timestamp > GALLERY_CACHE_EXPIRY) {
      localStorage.removeItem(GALLERY_CACHE_KEY);
      return null;
    }

    return images;
  } catch (error) {
    console.error('获取缓存画廊图片失败:', error);
    return null;
  }
};

/**
 * 缓存画廊图片
 * @param images 图片数组
 */
export const cacheGalleryImages = (images: GalleryImage[]): void => {
  try {
    const cacheData = {
      images,
      timestamp: Date.now()
    };
    localStorage.setItem(GALLERY_CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error('缓存画廊图片失败:', error);
  }
};

/**
 * 从服务器获取画廊图片
 * @returns 图片数组
 */
export const fetchGalleryImages = async (): Promise<GalleryImage[]> => {
  try {
    const response = await fetch('/gallery/data', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`获取画廊图片失败: ${response.status}`);
    }

    const images = await response.json();
    cacheGalleryImages(images);
    return images;
  } catch (error) {
    console.error('获取画廊图片失败:', error);
    // 尝试从缓存获取
    const cachedImages = getCachedGalleryImages();
    return cachedImages || [];
  }
};

/**
 * 获取画廊图片（优先从缓存获取）
 * @returns 图片数组
 */
export const getGalleryImages = async (): Promise<GalleryImage[]> => {
  // 优先从缓存获取
  const cachedImages = getCachedGalleryImages();
  if (cachedImages) {
    return cachedImages;
  }

  // 缓存不存在，从服务器获取
  return fetchGalleryImages();
};

/**
 * 按分类过滤画廊图片
 * @param images 图片数组
 * @param category 分类名称
 * @returns 过滤后的图片数组
 */
export const filterGalleryImagesByCategory = (
  images: GalleryImage[],
  category: string | null
): GalleryImage[] => {
  if (!category) {
    return images;
  }
  return images.filter(image => image.category === category);
};

/**
 * 获取所有分类
 * @param images 图片数组
 * @returns 分类名称数组
 */
export const getGalleryCategories = (images: GalleryImage[]): string[] => {
  const categories = new Set<string>();
  images.forEach(image => categories.add(image.category));
  return Array.from(categories).sort();
};
