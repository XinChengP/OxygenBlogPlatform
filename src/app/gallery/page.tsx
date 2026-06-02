import { getAllImages, getAllCategories } from '../../utils/galleryUtils';
import GalleryClient from './GalleryClient';
import type { Metadata } from 'next';

/**
 * 画廊页面 SEO 元数据配置
 *
 * 功能说明：
 * 1. 设置独立的页面标题和描述，利于搜索引擎收录
 * 2. 配置 Open Graph 和 Twitter Card 用于社交媒体分享
 * 3. 突出展示洛天依相关图片内容
 */
export const metadata: Metadata = {
  /**
   * 页面标题
   */
  title: '画廊',

  /**
   * 页面描述
   * 用于搜索引擎结果页展示
   */
  description: '浏览心想事成的图片画廊，包含洛天依美图、生活照片、技术截图等多种分类。支持分类筛选、图片预览和放大查看。',

  /**
   * 关键词
   * 帮助搜索引擎理解页面内容
   */
  keywords: ['画廊', '图片', '洛天依', '美图', '相册', '心想事成'],

  /**
   * Open Graph 配置
   * 用于社交媒体分享
   */
  openGraph: {
    title: '画廊 | 心想事成的个人博客',
    description: '浏览心想事成的图片画廊，包含洛天依美图、生活照片等多种分类。',
    type: 'website',
  },

  /**
   * Twitter Card 配置
   */
  twitter: {
    card: 'summary_large_image',
    title: '画廊 | 心想事成的个人博客',
    description: '浏览心想事成的图片画廊，包含洛天依美图、生活照片等多种分类。',
  },
};

// 画廊页面（服务端组件）
const GalleryPage = async () => {
  // 获取所有图片
  const images = await getAllImages({ forceRefresh: false });

  // 获取树形分类结构
  const categories = getAllCategories(images);

  // 调试日志：输出分类信息
  console.log('[Gallery Page] 加载的分类:', categories.map(c => ({
    name: c.name,
    count: c.count,
    subCategories: c.subCategories?.map(s => s.name)
  })));

  return <GalleryClient initialImages={images} initialCategories={categories} />;
};

export default GalleryPage;