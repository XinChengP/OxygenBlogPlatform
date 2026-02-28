import { getAllImages, getAllCategories } from '../../utils/galleryUtils';
import GalleryClient from './GalleryClient';

// 配置为动态渲染，确保每次访问都获取最新数据
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// 画廊页面（服务端组件）
const GalleryPage = async () => {
  // 获取所有图片（强制刷新以获取最新数据）
  const images = await getAllImages({ forceRefresh: true });
  
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