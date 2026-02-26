import { getAllImages, getAllCategories } from '../../utils/galleryUtils';
import GalleryClient from './GalleryClient';

// 画廊页面（服务端组件）
const GalleryPage = async () => {
  // 获取所有图片
  const images = await getAllImages();
  
  // 获取树形分类结构
  const categories = getAllCategories(images);
  
  return <GalleryClient initialImages={images} initialCategories={categories} />;
};

export default GalleryPage;