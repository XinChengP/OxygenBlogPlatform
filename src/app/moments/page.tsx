import React from 'react';
import fs from 'fs';
import path from 'path';
import { getServerMoments, getBlogCount, getServerBlogs, getBlogTotalWordCount } from '@/utils/momentsUtils';
import ClientMomentsPage from '@/components/moments/ClientMomentsPage';
import type { TodoConfig } from '@/types/todo';

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

/**
 * 读取待办配置
 */
const getTodoConfig = (): TodoConfig => {
  try {
    const todoPath = path.join(process.cwd(), 'src', 'content', 'todo.json');
    const content = fs.readFileSync(todoPath, 'utf-8');
    return JSON.parse(content) as TodoConfig;
  } catch (error) {
    console.warn('读取待办配置失败，使用默认配置:', error);
    return {
      title: '待办事项',
      items: [],
      showStats: true,
    };
  }
};

const { categoryCount, tagCount } = calculateStats();
const todoConfig = getTodoConfig();
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
    todoConfig={todoConfig}
  />;
}
