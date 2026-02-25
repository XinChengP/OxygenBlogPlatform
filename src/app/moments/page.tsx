import React from 'react';
import { getServerMoments, getBlogCount, getServerBlogs, getBlogTotalWordCount } from '@/utils/momentsUtils';
import ClientMomentsPage from '@/components/moments/ClientMomentsPage';

// 服务器端组件读取动态数据
const moments = getServerMoments();
const blogCount = getBlogCount();
const blogTotalWordCount = getBlogTotalWordCount();
const blogs = getServerBlogs();

// 计算分类和标签数量
const calculateStats = () => {
  const categories = new Set<string>();
  const tags = new Set<string>();

  blogs.forEach(blog => {
    // 计算分类
    if (blog.category) {
      categories.add(blog.category);
    }
    
    // 计算标签
    if (blog.tags && Array.isArray(blog.tags)) {
      blog.tags.forEach(tag => {
        tags.add(tag);
      });
    }
  });

  return {
    categoryCount: categories.size,
    tagCount: tags.size
  };
};

const { categoryCount, tagCount } = calculateStats();
console.log('Server-side stats:', { categoryCount, tagCount });

// 服务器端组件导出
export default function MomentsPage() {
  return <ClientMomentsPage 
    moments={moments} 
    blogCount={blogCount} 
    blogTotalWordCount={blogTotalWordCount}
    blogs={blogs} 
    categoryCount={categoryCount} 
    tagCount={tagCount} 
  />;
}