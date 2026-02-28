import { getAllImages, getAllCategories } from '../../utils/galleryUtils';
import GalleryClient from './GalleryClient';

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