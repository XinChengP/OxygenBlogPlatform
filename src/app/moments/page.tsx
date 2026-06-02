import React from 'react';
import fs from 'fs';
import path from 'path';
import { getServerMoments, getBlogCount, getServerBlogs, getBlogTotalWordCount } from '@/utils/momentsUtils';
import ClientMomentsPage from '@/components/moments/ClientMomentsPage';
import type { TodoConfig } from '@/types/todo';
import type { Metadata } from 'next';

/**
 * 个人动态页面 SEO 元数据配置
 *
 * 功能说明：
 * 1. 设置独立的页面标题和描述，利于搜索引擎收录
 * 2. 配置 Open Graph 和 Twitter Card 用于社交媒体分享
 * 3. 突出展示生活记录和待办事项
 */
export const metadata: Metadata = {
  /**
   * 页面标题
   */
  title: '个人动态',

  /**
   * 页面描述
   * 用于搜索引擎结果页展示
   */
  description: '查看心想事成的最新动态、生活感悟、待办事项和博客统计。记录日常点滴，分享生活与技术。',

  /**
   * 关键词
   * 帮助搜索引擎理解页面内容
   */
  keywords: ['个人动态', '生活记录', '待办事项', '博客统计', '心想事成', '洛天依'],

  /**
   * Open Graph 配置
   * 用于社交媒体分享
   */
  openGraph: {
    title: '个人动态 | 心想事成的个人博客',
    description: '查看心想事成的最新动态、生活感悟、待办事项和博客统计。',
    type: 'website',
  },

  /**
   * Twitter Card 配置
   */
  twitter: {
    card: 'summary',
    title: '个人动态 | 心想事成的个人博客',
    description: '查看心想事成的最新动态、生活感悟、待办事项和博客统计。',
  },
};

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
