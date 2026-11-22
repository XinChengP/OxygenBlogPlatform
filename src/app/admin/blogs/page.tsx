import { getBlogList } from '@/actions/blogActions';
import { categories as presetCategories } from '@/setting/blogSetting';
import BlogsManageClient from './BlogsManageClient';

/**
 * 文章管理页面（服务端组件）
 * 
 * 负责获取初始数据并传递给客户端组件
 * 注意：在静态导出模式下，此页面在构建时预渲染
 */
export default async function BlogsManagePage() {
  let blogs: Awaited<ReturnType<typeof getBlogList>> = [];
  let categories: string[] = [];
  let tags: string[] = [];
  
  try {
    // 获取所有博客数据（包括隐藏的）
    blogs = await getBlogList();
    
    // 获取所有分类和标签（用于筛选器）
    // 将预设分类（去掉'all'）与文章中实际使用的分类合并，确保新添加的分类也能显示
    const usedCategories = [...new Set(blogs.map(blog => blog.category))];
    categories = [...new Set([...presetCategories.filter(c => c !== 'all'), ...usedCategories])];
    tags = [...new Set(blogs.flatMap(blog => blog.tags))];
  } catch (error) {
    // 在静态导出模式下，如果数据获取失败，使用空数组
    console.warn('获取博客数据失败，使用空数据:', error);
    blogs = [];
    categories = [];
    tags = [];
  }
  
  return (
    <BlogsManageClient 
      initialBlogs={blogs}
      initialFilterOptions={{ categories, tags }}
    />
  );
}

// 静态导出配置
export const dynamic = 'force-static';
export const revalidate = false;
